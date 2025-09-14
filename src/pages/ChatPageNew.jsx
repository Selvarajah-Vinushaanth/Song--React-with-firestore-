import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Send, 
  Zap, 
  Crown, 
  AlertTriangle, 
  Settings, 
  Download,
  Copy,
  RefreshCw,
  Sparkles,
  Music,
  Search,
  Star,
  History,
  Clock,
  MessageCircle,
  Trash2
} from "lucide-react";
import axios from 'axios';
import { usePayment } from '../context/PaymentContext';
import { useAuth } from '../context/AuthContext';
import TokenDisplay, { TokenDisplayCompact } from '../components/TokenDisplay';
import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
  deleteDoc, 
  doc, 
  orderBy, 
  query, 
  limit, 
  serverTimestamp,
  where,
  setDoc
} from 'firebase/firestore';
import { db } from '../context/AuthContext';

export default function ChatPage() {
  const { currentUser } = useAuth();
  const { 
    userSubscription, 
    remainingTokens, 
    checkTokensAvailable, 
    consumeTokens, 
    SERVICE_TOKEN_COSTS,
    SUBSCRIPTION_PLANS 
  } = usePayment();
  
  const textareaRef = useRef(null);
  const messagesEndRef = useRef(null);
  
  // Core chat state
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content: 'welcome_cards', // Special identifier for welcome cards
      service: 'system',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Chat features
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  // Chat history management
  const [chatHistory, setChatHistory] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [currentChatTitle, setCurrentChatTitle] = useState('New Chat');
  
  // API configuration
  const API_BASE = 'http://localhost:5000/api';
  const API_ENDPOINTS = {
    'metaphor-classifier': `${API_BASE}/predict`,
    'lyric-generator': `${API_BASE}/generate-lyrics`,
    'metaphor-creator': `${API_BASE}/create-metaphors`,
    'masking-predict': `${API_BASE}/predict-mask`
  };
  
  // Service detection
  const detectService = (text) => {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('metaphor') && (lowerText.includes('identify') || lowerText.includes('analyze') || lowerText.includes('classify'))) {
      return 'metaphor-classifier';
    }
    if (lowerText.includes('lyric') || lowerText.includes('song') || lowerText.includes('poem') || lowerText.includes('write')) {
      return 'lyric-generator';
    }
    if ((lowerText.includes('create') || lowerText.includes('generate')) && lowerText.includes('metaphor')) {
      return 'metaphor-creator';
    }
    if (lowerText.includes('[mask]') || lowerText.includes('predict') || lowerText.includes('fill') || lowerText.includes('complete')) {
      return 'masking-predict';
    }
    
    return 'metaphor-classifier'; // Default
  };

  // Auto-resize textarea
  const handleTextareaChange = (e) => {
    const newValue = e.target.value;
    console.log('Input changed:', newValue); // Debug log
    setInput(newValue);
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  };

  // Send message with token checking
  const handleSendMessage = async () => {
    console.log('handleSendMessage called with input:', input);
    
    if (!input.trim() || isLoading) {
      console.log('Message sending blocked:', { inputEmpty: !input.trim(), isLoading });
      return;
    }
    
    const service = detectService(input);
    console.log('Detected service:', service);
    
    // Check tokens before processing
    if (!checkTokensAvailable(service)) {
      const cost = SERVICE_TOKEN_COSTS[service] || 1;
      setError(`Insufficient tokens! You need ${cost} tokens to use ${service}. Please upgrade your plan.`);
      setShowUpgradeModal(true);
      return;
    }

    // Add user message
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: input.trim(),
      service: 'user',
      timestamp: new Date()
    };
    
    console.log('User message created:', userMessage);
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);
    
    try {
      // Consume tokens
      await consumeTokens(service);
      
      // Make API call
      let response;
      let responseContent = '';
      
      switch (service) {
        case 'metaphor-classifier':
          response = await axios.post(API_ENDPOINTS[service], { text: userMessage.content });
          const isMetaphor = response.data.is_metaphor;
          const confidence = (response.data.confidence * 100).toFixed(1);
          responseContent = `🎭 **Metaphor Analysis**

**Text:** "${userMessage.content}"

**Result:** ${isMetaphor ? '✨ Metaphorical' : '📝 Literal'}
**Confidence:** ${confidence}%

${isMetaphor ? 
  'This text contains metaphorical language that creates vivid imagery by connecting abstract concepts with concrete elements.' : 
  'This text appears to be literal language without metaphorical expressions.'
}`;
          break;
          
        case 'lyric-generator':
          // Extract emotion and seed from input
          let emotion = 'calm';
          let seed = userMessage.content;
          
          const emotionMatch = userMessage.content.match(/emotion:\s*(\w+)/i);
          if (emotionMatch) emotion = emotionMatch[1];
          
          const seedMatch = userMessage.content.match(/seed:\s*"([^"]+)"/i);
          if (seedMatch) seed = seedMatch[1];
          
          response = await axios.post(API_ENDPOINTS[service], {
            motion: emotion,
            seed: seed,
            count: 1
          });
          
          responseContent = `🎵 **Generated Lyrics**

**Theme:** ${emotion} • **Seed:** ${seed}

${response.data.lyrics[0] || 'Beautiful lyrics have been generated based on your input.'}

*Cost: 3 tokens*`;
          break;
          
        case 'metaphor-creator':
          // Extract parameters
          let source = 'love';
          let target = 'ocean';
          
          const sourceMatch = userMessage.content.match(/source:\s*(\w+)/i);
          if (sourceMatch) source = sourceMatch[1];
          
          const targetMatch = userMessage.content.match(/target:\s*(\w+)/i);
          if (targetMatch) target = targetMatch[1];
          
          response = await axios.post(API_ENDPOINTS[service], {
            source: source,
            target: target,
            Context: 'positive',
            count: 2
          });
          
          responseContent = `✨ **Created Metaphors**

**Source:** ${source} • **Target:** ${target}

${response.data.metaphors?.join('\n\n') || 
  `"${source} flows like a gentle ${target}, bringing depth and meaning to everything it touches."

"Like a vast ${target}, ${source} holds mysteries and treasures waiting to be discovered."`
}

*Cost: 2 tokens*`;
          break;
          
        case 'masking-predict':
          const maskText = userMessage.content.includes('[mask]') ? userMessage.content : `I [mask] to school every day`;
          
          response = await axios.post(API_ENDPOINTS[service], {
            text: maskText,
            top_k: 3
          });
          
          responseContent = `🕵️‍♂️ **Text Completion**

**Original:** ${maskText}

**Suggestions:**
${response.data.suggestions?.map((suggestion, index) => `${index + 1}. ${suggestion}`).join('\n') || 
  '1. go\n2. walk\n3. travel'
}

*Cost: 1 token*`;
          break;
          
        default:
          responseContent = `I understand you want to explore "${userMessage.content}". Let me analyze this for metaphorical content.`;
      }
      
      // Add assistant response
      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: responseContent,
        service: service,
        tokensUsed: SERVICE_TOKEN_COSTS[service] || 1,
        timestamp: new Date()
      };
      
      const updatedMessages = [...messages, userMessage, assistantMessage];
      setMessages(updatedMessages);

      // Update title quickly in UI then persist
      setCurrentChatTitle(generateChatTitle(updatedMessages.filter(m => m.content !== 'welcome_cards')));

      // Save chat to Firestore after successful response
      await saveChatToFirestore(updatedMessages);
      
    } catch (error) {
      console.error('API Error:', error);
      
      let errorMessage = 'Sorry, I encountered an error. Please try again.';
      if (error.message.includes('Network Error')) {
        errorMessage = 'Unable to connect to the server. Please ensure the backend is running.';
      } else if (error.message.includes('token')) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      const errorMessage_obj = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `⚠️ ${errorMessage}`,
        error: true,
        timestamp: new Date()
      };
      
      const updatedMessagesWithError = [...messages, userMessage, errorMessage_obj];
      setMessages(updatedMessagesWithError);
      
      // Save even error conversations
      await saveChatToFirestore(updatedMessagesWithError);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle keyboard events
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Utility functions
  const copyMessage = (content) => {
    navigator.clipboard.writeText(content);
  };

  const exportChat = () => {
    const chatContent = messages
      .filter(m => m.role !== 'system')
      .map(m => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n');
    
    const blob = new Blob([chatContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tamil-ai-chat.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const newChat = async () => {
    console.log('Creating new conversation...');
    
    // First, save the current chat if it has content
    if (currentChatId && messages.filter(m => m.role === 'user').length > 0) {
      try {
        console.log('Saving current chat before creating new one...');
        await saveChatToFirestore(messages);
        console.log('Current chat saved successfully');
      } catch (err) {
        console.error('Failed to save current chat:', err);
      }
    }

    // Reset current chat state to welcome cards
    setMessages([{
      id: 1,
      role: 'assistant',
      content: 'welcome_cards',
      service: 'system',
      timestamp: new Date()
    }]);
    setError(null);
    setCurrentChatId(null);
    setCurrentChatTitle('New Conversation');
    
    // Create new chat entry in Firestore if user is logged in
    if (currentUser) {
      try {
        const newChatData = {
          userId: currentUser.uid,
          title: 'New Conversation',
          messages: [], // Start with empty messages array
          messageCount: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          service: 'general'
        };
        
        console.log('Creating new chat entry in Firestore...');
        const docRef = await addDoc(collection(db, 'chatHistory'), newChatData);
        
        setCurrentChatId(docRef.id);
        console.log('New chat created with ID:', docRef.id);
        
        // Refresh chat history to show the new conversation
        await fetchChatHistory();
        
      } catch (error) {
        console.error('Error creating new chat:', error);
      }
    }
  };

  const loadChatFromHistory = async (chatId) => {
    if (!currentUser) return;
    
    // Save current chat before switching if it has content
    if (currentChatId && messages.filter(m => m.role === 'user').length > 0) {
      try {
        console.log('Saving current chat before switching...');
        await saveChatToFirestore(messages);
        console.log('Current chat saved successfully');
      } catch (err) {
        console.error('Failed to save current chat:', err);
      }
    }
    
    console.log('Loading chat from history:', chatId);
    setIsLoadingHistory(true);
    
    try {
      // Fetch the complete chat document from Firestore
      const chatDoc = await getDoc(doc(db, 'chatHistory', chatId));
      
      if (chatDoc.exists()) {
        const chatData = chatDoc.data();
        console.log('Chat document found:', chatData.title);
        
        // Check if messages exist and are properly formatted
        if (chatData.messages && Array.isArray(chatData.messages)) {
          // Convert timestamps back to Date objects if they're Firestore timestamps
          const restoredMessages = chatData.messages.map(msg => ({
            ...msg,
            id: msg.id || Date.now() + Math.random(), // Ensure each message has an ID
            timestamp: msg.timestamp?.toDate ? msg.timestamp.toDate() : 
                      (typeof msg.timestamp === 'object' && msg.timestamp.seconds) ? 
                      new Date(msg.timestamp.seconds * 1000) : new Date(msg.timestamp)
          }));
          
          // If no messages or only system messages, show welcome cards
          if (restoredMessages.length === 0) {
            const welcomeMessage = {
              id: 1,
              role: 'assistant',
              content: 'welcome_cards',
              service: 'system',
              timestamp: new Date()
            };
            setMessages([welcomeMessage]);
            console.log('No messages found, showing welcome cards');
          } else {
            setMessages(restoredMessages);
            console.log(`Loaded ${restoredMessages.length} messages from chat history`);
          }
          
          setCurrentChatId(chatId);
          setCurrentChatTitle(chatData.title || 'Chat');
          setError(null);
        } else {
          console.log('No messages found in chat, showing welcome cards');
          // No messages found, show welcome cards
          const welcomeMessage = {
            id: 1,
            role: 'assistant',
            content: 'welcome_cards',
            service: 'system',
            timestamp: new Date()
          };
          setMessages([welcomeMessage]);
          setCurrentChatId(chatId);
          setCurrentChatTitle(chatData.title || 'Chat');
        }
      } else {
        console.error('Chat document not found:', chatId);
        setError('Chat not found');
        // Create a new chat as fallback
        newChat();
      }
    } catch (error) {
      console.error('Error loading chat from history:', error);
      setError('Failed to load chat: ' + error.message);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Firestore chat history functions
  const saveChatToFirestore = async (messages, chatTitle = null) => {
    console.log('Attempting to save chat to Firestore...', { 
      hasUser: !!currentUser, 
      messageCount: messages.length,
      currentChatId 
    });
    
    if (!currentUser) {
      console.log('No current user, skipping save');
      return false;
    }
    
    // Filter out welcome_cards messages for storage
    const messagesToSave = messages.filter(msg => msg.content !== 'welcome_cards');
    console.log('Messages to save after filtering:', messagesToSave.length);
    
    if (messagesToSave.length === 0) {
      console.log('No messages to save after filtering');
      return false;
    }
    
    try {
      // Generate title from first user message if not provided
      const generatedTitle = chatTitle || generateChatTitle(messagesToSave);
      
      // Create the chat data with explicit serverTimestamp for updatedAt
      const chatData = {
        userId: currentUser.uid,
        title: generatedTitle,
        messages: messagesToSave.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          service: msg.service,
          tokensUsed: msg.tokensUsed || 0,
          timestamp: msg.timestamp || new Date(),
          error: msg.error || false
        })),
        updatedAt: serverTimestamp(),
        messageCount: messagesToSave.length
      };

      console.log('Chat data prepared with title:', generatedTitle);

      if (currentChatId) {
        // Update existing chat
        console.log('Updating existing chat:', currentChatId);
        
        // Don't overwrite createdAt on update
        await setDoc(doc(db, 'chatHistory', currentChatId), chatData, { merge: true });
        console.log('Chat updated in Firestore:', currentChatId);
        
        // Update the chat history immediately for better UX
        setChatHistory(prev => {
          // If the chat is already in history, update it
          const existing = prev.find(chat => chat.id === currentChatId);
          if (existing) {
            return prev.map(chat => 
              chat.id === currentChatId 
                ? { 
                    ...chat, 
                    title: generatedTitle, 
                    messageCount: messagesToSave.length,
                    updatedAt: new Date() // Use a local date for immediate UI update
                  } 
                : chat
            ).sort((a, b) => {
              // Keep most recently updated at top
              const aTime = a.id === currentChatId ? new Date() : (a.updatedAt?.toDate?.() || a.updatedAt || new Date(0));
              const bTime = b.id === currentChatId ? new Date() : (b.updatedAt?.toDate?.() || b.updatedAt || new Date(0));
              return bTime - aTime;
            });
          }
          return prev;
        });
      } else {
        // Create new chat
        console.log('Creating new chat in Firestore...');
        chatData.createdAt = serverTimestamp(); // Add createdAt for new chats
        const docRef = await addDoc(collection(db, 'chatHistory'), chatData);
        const newChatId = docRef.id;
        setCurrentChatId(newChatId);
        console.log('New chat created in Firestore:', newChatId);
        
        // Add the new chat to the history immediately for better UX
        setChatHistory(prev => [{
          id: newChatId,
          ...chatData,
          createdAt: new Date(), // Use a local date for immediate UI update
          updatedAt: new Date() // Use a local date for immediate UI update
        }, ...prev]);
      }
      
      // Update local title
      setCurrentChatTitle(generatedTitle);

      // Schedule a full refresh to ensure consistency with database
      setTimeout(() => {
        fetchChatHistory();
      }, 1000);
      
      return true;
    } catch (error) {
      console.error('Error saving chat to Firestore:', error);
      console.error('Error details:', error.message, error.code);
      return false;
    }
  };

  const fetchChatHistory = async () => {
    console.log('🚀 fetchChatHistory called - currentUser:', currentUser?.uid);
    if (!currentUser) {
      console.log('❌ No current user, aborting fetch');
      return;
    }
    
    setIsLoadingHistory(true);
    console.log('⏳ Starting chat history fetch...');
    
    try {
      // Try the optimized query first
      const q = query(
        collection(db, 'chatHistory'),
        where('userId', '==', currentUser.uid),
        orderBy('updatedAt', 'desc'),
        limit(20)
      );
      
      console.log('📤 Executing Firestore query...');
      const querySnapshot = await getDocs(q);
      const history = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Enhanced logging for debugging
        console.log(`Processing chat document: ${doc.id}`, {
          title: data.title,
          messageCount: data.messageCount,
          updatedAt: data.updatedAt,
          hasTimestamp: !!data.updatedAt
        });

        // Ensure we're extracting valid data
        if (data) {
          history.push({
            id: doc.id,
            ...data,
            // Normalize timestamps to prevent rendering issues
            createdAt: data.createdAt || null,
            updatedAt: data.updatedAt || null
          });
        }
      });
      
      setChatHistory(history);
      console.log('✅ Chat history fetched (with ordering):', history.length, 'chats');
      console.log('📋 Chat history data:', history.map(chat => ({ 
        id: chat.id, 
        title: chat.title,
        messageCount: chat.messageCount,
        updatedAt: chat.updatedAt ? 'Has timestamp' : 'No timestamp'
      })));
    } catch (error) {
      console.warn('Firestore index not available, using fallback query:', error.message);
      
      // Fallback query without ordering (doesn't require index)
      try {
        const qFallback = query(
          collection(db, 'chatHistory'),
          where('userId', '==', currentUser.uid),
          limit(50) // Get more since we'll sort manually
        );
        
        const querySnapshot = await getDocs(qFallback);
        const history = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          history.push({
            id: doc.id,
            ...data
          });
        });
        
        // Sort manually by updatedAt (most recent first)
        history.sort((a, b) => {
          const aTime = a.updatedAt?.toDate?.() || a.updatedAt || new Date(0);
          const bTime = b.updatedAt?.toDate?.() || b.updatedAt || new Date(0);
          return bTime - aTime;
        });
        
        // Limit to 20 after sorting
        const limitedHistory = history.slice(0, 20);
        
        setChatHistory(limitedHistory);
        console.log('✅ Chat history fetched (fallback with manual sort):', limitedHistory.length, 'chats');
        console.log('📋 Fallback chat history data:', limitedHistory.map(chat => ({ id: chat.id, title: chat.title })));
        
        // Show user-friendly message about creating the index
        if (error.message.includes('index')) {
          console.info('💡 To improve performance, create a Firestore index at:', error.message.match(/https:\/\/[^\s]+/)?.[0]);
        }
        
      } catch (fallbackError) {
        console.error('Error with fallback fetch:', fallbackError);
        setChatHistory([]); // Set empty array on complete failure
      }
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // const loadChatFromHistory = async (chatId) => {
  //   if (!currentUser) return;
    
  //   // Save current chat before switching if it has content
  //   if (currentChatId && messages.filter(m => m.role === 'user').length > 0) {
  //     try {
  //       console.log('Saving current chat before switching...');
  //       await saveChatToFirestore(messages);
  //       console.log('Current chat saved successfully');
  //     } catch (err) {
  //       console.error('Failed to save current chat:', err);
  //     }
  //   }
    
  //   console.log('Loading chat from history:', chatId);
  //   setIsLoadingHistory(true);
    
  //   try {
  //     // Fetch the complete chat document from Firestore
  //     const chatDoc = await getDoc(doc(db, 'chatHistory', chatId));
      
  //     if (chatDoc.exists()) {
  //       const chatData = chatDoc.data();
  //       console.log('Chat document found:', chatData.title);
        
  //       // Check if messages exist and are properly formatted
  //       if (chatData.messages && Array.isArray(chatData.messages)) {
  //         // Convert timestamps back to Date objects if they're Firestore timestamps
  //         const restoredMessages = chatData.messages.map(msg => ({
  //           ...msg,
  //           id: msg.id || Date.now() + Math.random(), // Ensure each message has an ID
  //           timestamp: msg.timestamp?.toDate ? msg.timestamp.toDate() : 
  //                     (typeof msg.timestamp === 'object' && msg.timestamp.seconds) ? 
  //                     new Date(msg.timestamp.seconds * 1000) : new Date(msg.timestamp)
  //         }));
          
  //         // If no messages or only system messages, show welcome cards
  //         if (restoredMessages.length === 0) {
  //           const welcomeMessage = {
  //             id: 1,
  //             role: 'assistant',
  //             content: 'welcome_cards',
  //             service: 'system',
  //             timestamp: new Date()
  //           };
  //           setMessages([welcomeMessage]);
  //           console.log('No messages found, showing welcome cards');
  //         } else {
  //           setMessages(restoredMessages);
  //           console.log(`Loaded ${restoredMessages.length} messages from chat history`);
  //         }
          
  //         setCurrentChatId(chatId);
  //         setCurrentChatTitle(chatData.title || 'Chat');
  //         setError(null);
  //       } else {
  //         console.log('No messages found in chat, showing welcome cards');
  //         // No messages found, show welcome cards
  //         const welcomeMessage = {
  //           id: 1,
  //           role: 'assistant',
  //           content: 'welcome_cards',
  //           service: 'system',
  //           timestamp: new Date()
  //         };
  //         setMessages([welcomeMessage]);
  //         setCurrentChatId(chatId);
  //         setCurrentChatTitle(chatData.title || 'Chat');
  //       }
  //     } else {
  //       console.error('Chat document not found:', chatId);
  //       setError('Chat not found');
  //       // Create a new chat as fallback
  //       newChat();
  //     }
  //   } catch (error) {
  //     console.error('Error loading chat from history:', error);
  //     setError('Failed to load chat: ' + error.message);
  //   } finally {
  //     setIsLoadingHistory(false);
  //   }
  // };

  const deleteChatFromHistory = async (chatId) => {
    if (!currentUser) return;
    
    try {
      await deleteDoc(doc(db, 'chatHistory', chatId));
      await fetchChatHistory();
      
      // If current chat was deleted, start new chat
      if (currentChatId === chatId) {
        newChat();
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  const generateChatTitle = (messages) => {
    // Filter out system messages and welcome cards
    const userMessages = messages.filter(msg => 
      msg.role === 'user' && 
      msg.content !== 'welcome_cards'
    );
    
    if (userMessages.length > 0) {
      const firstMessage = userMessages[0].content;
      return firstMessage.length > 30 
        ? firstMessage.substring(0, 30) + '...' 
        : firstMessage;
    }
    return 'New Chat';
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load chat history when user changes
  useEffect(() => {
    if (currentUser) {
      fetchChatHistory();
    } else {
      setChatHistory([]);
      setCurrentChatId(null);
      setCurrentChatTitle('New Chat');
    }
  }, [currentUser]);

  // Debug: Log whenever chatHistory changes
  useEffect(() => {
    console.log('🔄 chatHistory state changed:', {
      length: chatHistory?.length || 0,
      data: chatHistory?.slice(0, 2).map(chat => ({ id: chat.id, title: chat.title })) || 'No data',
      fullFirstChat: chatHistory?.[0] || 'No first chat'
    });
  }, [chatHistory]);

  // Service examples
  const examples = [
    {
      service: 'metaphor-classifier',
      text: 'Identify metaphors in "வானம் கண்ணீர் சிந்துகிறது"',
      icon: '🎭',
      cost: 1
    },
    {
      service: 'lyric-generator', 
      text: 'Generate a romantic song about moonlight',
      icon: '🎵',
      cost: 3
    },
    {
      service: 'metaphor-creator',
      text: 'Create a metaphor source: love target: ocean',
      icon: '✨',
      cost: 2
    },
    {
      service: 'masking-predict',
      text: 'I [mask] to school every day',
      icon: '🕵️‍♂️',
      cost: 1
    }
  ];

  const currentPlan = userSubscription ? SUBSCRIPTION_PLANS[userSubscription.planId] : SUBSCRIPTION_PLANS.free;

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white overflow-hidden">
      {/* Modern Header with Glass Effect */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link to="/dashboard" className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                Tamil AI Chat
              </Link>
              <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-white/5 rounded-full border border-white/10">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <span className="text-sm font-medium text-gray-300">Powered by Advanced AI</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <TokenDisplayCompact />
              <Link
                to="/subscription"
                className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 transition-all duration-300 shadow-lg hover:shadow-purple-500/25"
              >
                <Crown className="w-4 h-4 inline mr-2" />
                Upgrade Pro
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="h-[calc(100vh-81px)] flex">
        
        {/* Enhanced Sidebar */}
        <div className="w-80 bg-black/20 backdrop-blur-xl border-r border-white/10 p-6 flex flex-col">
          {/* Token Display */}
          <div className="mb-6">
            <TokenDisplay />
          </div>
          
          {/* New Chat Button */}
          <button
            onClick={newChat}
            className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white py-3.5 px-6 rounded-xl font-semibold transition-all duration-300 mb-6 shadow-lg hover:shadow-emerald-500/25"
          >
            <RefreshCw className="w-5 h-5 inline mr-3" />
            New Conversation
            {currentChatId && <span className="ml-2 text-xs bg-white/20 px-2 py-1 rounded">Active</span>}
          </button>
          
          {/* Chat History Section - IMPROVED */}
          <div className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10 mb-6 flex-1 overflow-hidden">
            <h3 className="font-bold text-lg mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-purple-400" />
                <span>Recent Chats</span>
                <span className="text-xs text-gray-400">({chatHistory?.length || 0})</span>
              </div>
              <button 
                onClick={fetchChatHistory}
                className="text-xs bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 px-2 py-1 rounded transition-all"
                title="Refresh chat history"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </h3>
            
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-3 text-sm text-cyan-300">Loading chats...</span>
              </div>
            ) : (chatHistory && Array.isArray(chatHistory) && chatHistory.length > 0) ? (
              <div className="space-y-2 overflow-y-auto max-h-[calc(100%-3rem)] pr-1">
                {chatHistory.filter(chat => chat && chat.id).map((chat, index) => (
                  <div
                    key={`${chat.id}-${index}`}
                    className={`group p-3 rounded-lg border transition-all duration-300 cursor-pointer hover:shadow-md ${
                      currentChatId === chat.id
                        ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-cyan-400/50 shadow-lg'
                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                    }`}
                    onClick={() => loadChatFromHistory(chat.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <MessageCircle className={`w-3 h-3 ${currentChatId === chat.id ? 'text-cyan-400' : 'text-gray-400'} flex-shrink-0`} />
                          <span className={`text-sm font-medium truncate ${currentChatId === chat.id ? 'text-cyan-300' : 'text-gray-200'}`}>
                            {chat.title || 'Untitled Chat'}
                          </span>
                          {currentChatId === chat.id && (
                            <span className="text-[10px] bg-cyan-500/30 text-cyan-300 px-1.5 py-0.5 rounded-full">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                          <Clock className="w-3 h-3" />
                          <span>
                            {chat.updatedAt?.toDate?.() 
                              ? new Date(chat.updatedAt.toDate()).toLocaleDateString() 
                              : typeof chat.updatedAt === 'object' && chat.updatedAt?.seconds
                                ? new Date(chat.updatedAt.seconds * 1000).toLocaleDateString()
                                : chat.updatedAt instanceof Date 
                                  ? chat.updatedAt.toLocaleDateString()
                                  : 'Recent'}
                          </span>
                          <span>•</span>
                          <span>{chat.messageCount || 0} message{chat.messageCount !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('Are you sure you want to delete this chat?')) {
  deleteChatFromHistory(chat.id);
}

                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-all"
                        title="Delete chat"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <MessageCircle className="w-8 h-8 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium">No chat history yet</p>
                <p className="text-xs mt-1">Start a conversation to see it here</p>
                
                {!currentUser && (
                  <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm">
                    <p className="text-blue-300 font-medium">Sign in to save your chats</p>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Enhanced Plan Info */}
          <div className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10 mb-6 shadow-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="text-3xl">{currentPlan.icon}</div>
              <div>
                <div className="font-bold text-lg">{currentPlan.name}</div>
                <div className="text-sm text-cyan-400 font-medium">${currentPlan.price}/month</div>
              </div>
            </div>
            <div className="bg-black/20 rounded-lg px-3 py-2">
              <div className="text-xs text-gray-300 font-medium">
                {currentPlan.tokens.toLocaleString()} tokens included
              </div>
            </div>
          </div>
          
          {/* Enhanced Example Prompts */}
          <div className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10 mb-4 overflow-hidden">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-3">
              <Star className="w-5 h-5 text-yellow-400" />
              Quick Start
            </h3>
            <div className="space-y-3 overflow-y-auto max-h-48">
              {examples.map((example, index) => (
                <button
                  key={index}
                  onClick={() => setInput(example.text)}
                  disabled={!checkTokensAvailable(example.service)}
                  className={`w-full text-left p-4 rounded-xl text-sm transition-all duration-300 ${
                    checkTokensAvailable(example.service)
                      ? 'bg-gradient-to-br from-white/5 to-white/10 hover:from-white/10 hover:to-white/15 border border-white/10 hover:border-cyan-400/50 hover:shadow-lg hover:shadow-cyan-500/10'
                      : 'bg-red-500/10 border border-red-500/30 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{example.icon}</span>
                    <span className="font-semibold text-xs bg-cyan-500/20 text-cyan-300 px-2 py-1 rounded-full">
                      {example.cost} token{example.cost > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="text-gray-200 font-medium leading-relaxed">{example.text}</div>
                  {!checkTokensAvailable(example.service) && (
                    <div className="text-xs text-red-400 mt-2 font-medium">
                      Insufficient tokens: need {example.cost}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
          
          {/* Enhanced Export Button */}
          <button
            onClick={exportChat}
            className="w-full bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white py-3 px-6 rounded-xl transition-all duration-300 shadow-lg"
          >
            <Download className="w-4 h-4 inline mr-3" />
            Export Conversation
          </button>
        </div>

        {/* Enhanced Main Chat Area */}
        <div className="flex-1 flex flex-col bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl border border-white/10 m-6 ml-0 rounded-2xl overflow-hidden shadow-2xl">
          
          {/* Current Chat Title Header - IMPROVED */}
          <div className="px-8 py-4 border-b border-white/10 bg-black/20 backdrop-blur-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageCircle className="w-4 h-4 text-cyan-400" />
              <div className="text-lg font-semibold text-gray-100 truncate">
                {currentChatTitle || 'New Conversation'}
              </div>
              {currentChatId && (
                <div className="text-xs bg-cyan-500/20 text-cyan-300 px-2 py-1 rounded-full">
                  ID: {currentChatId.substring(0, 6)}...
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={newChat}
                className="text-xs bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 px-3 py-1.5 rounded transition-all flex items-center gap-2"
              >
                <RefreshCw className="w-3 h-3" />
                <span>New Chat</span>
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-8 space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-5 duration-500`}
              >
                {message.role === 'assistant' && (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                    <Sparkles className="w-5 h-5" />
                  </div>
                )}
                
                <div className={`max-w-[75%] ${message.role === 'user' ? 'order-2' : ''}`}>
                  <div
                    className={`p-6 rounded-2xl shadow-lg ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-blue-500/25'
                        : message.error
                        ? 'bg-red-500/10 border border-red-500/20 text-red-300 shadow-red-500/10'
                        : 'bg-gradient-to-br from-white/10 to-white/5 border border-white/10 backdrop-blur-sm shadow-black/20'
                    }`}
                  >
                    {message.content === 'welcome_cards' ? (
                      // Welcome Service Cards
                      <div className="space-y-6">
                        <div className="text-center mb-8">
                          <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mb-4">
                            Welcome to Tamil AI Chat! 🎭✨
                          </h2>
                          <p className="text-gray-300 text-lg">
                            Choose from our powerful AI services to get started
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Metaphor Classifier Card */}
                          <button
                            onClick={() => setInput('Identify metaphors in "வானம் கண்ணீர் சிந்துகிறது"')}
                            disabled={!checkTokensAvailable('metaphor-classifier')}
                            className={`p-6 rounded-xl text-left transition-all duration-300 ${
                              checkTokensAvailable('metaphor-classifier')
                                ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-400/30 hover:border-purple-400/50 hover:shadow-lg hover:shadow-purple-500/20'
                                : 'bg-red-500/10 border border-red-500/30 opacity-50 cursor-not-allowed'
                            }`}
                          >
                            <div className="flex items-center gap-4 mb-4">
                              <div className="text-4xl">🎭</div>
                              <div>
                                <h3 className="font-bold text-xl text-purple-300">Metaphor Classifier</h3>
                                <p className="text-purple-200/80 text-sm">Identify metaphors in text</p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-300 text-sm">Analyze literary devices</span>
                              <span className="bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-xs font-medium">
                                1 token
                              </span>
                            </div>
                          </button>

                          {/* Lyric Generator Card */}
                          <button
                            onClick={() => setInput('Generate a romantic song about moonlight')}
                            disabled={!checkTokensAvailable('lyric-generator')}
                            className={`p-6 rounded-xl text-left transition-all duration-300 ${
                              checkTokensAvailable('lyric-generator')
                                ? 'bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-400/30 hover:border-blue-400/50 hover:shadow-lg hover:shadow-blue-500/20'
                                : 'bg-red-500/10 border border-red-500/30 opacity-50 cursor-not-allowed'
                            }`}
                          >
                            <div className="flex items-center gap-4 mb-4">
                              <div className="text-4xl">🎵</div>
                              <div>
                                <h3 className="font-bold text-xl text-blue-300">Lyric Generator</h3>
                                <p className="text-blue-200/80 text-sm">Create beautiful song lyrics</p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-300 text-sm">Compose poetry & songs</span>
                              <span className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-xs font-medium">
                                3 tokens
                              </span>
                            </div>
                          </button>

                          {/* Metaphor Creator Card */}
                          <button
                            onClick={() => setInput('Create a metaphor source: love target: ocean')}
                            disabled={!checkTokensAvailable('metaphor-creator')}
                            className={`p-6 rounded-xl text-left transition-all duration-300 ${
                              checkTokensAvailable('metaphor-creator')
                                ? 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-400/30 hover:border-emerald-400/50 hover:shadow-lg hover:shadow-emerald-500/20'
                                : 'bg-red-500/10 border border-red-500/30 opacity-50 cursor-not-allowed'
                            }`}
                          >
                            <div className="flex items-center gap-4 mb-4">
                              <div className="text-4xl">✨</div>
                              <div>
                                <h3 className="font-bold text-xl text-emerald-300">Metaphor Creator</h3>
                                <p className="text-emerald-200/80 text-sm">Generate custom metaphors</p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-300 text-sm">Create vivid comparisons</span>
                              <span className="bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full text-xs font-medium">
                                2 tokens
                              </span>
                            </div>
                          </button>

                          {/* Masking Predict Card */}
                          <button
                            onClick={() => setInput('I [mask] to school every day')}
                            disabled={!checkTokensAvailable('masking-predict')}
                            className={`p-6 rounded-xl text-left transition-all duration-300 ${
                              checkTokensAvailable('masking-predict')
                                ? 'bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-400/30 hover:border-orange-400/50 hover:shadow-lg hover:shadow-orange-500/20'
                                : 'bg-red-500/10 border border-red-500/30 opacity-50 cursor-not-allowed'
                            }`}
                          >
                            <div className="flex items-center gap-4 mb-4">
                              <div className="text-4xl">🕵️‍♂️</div>
                              <div>
                                <h3 className="font-bold text-xl text-orange-300">Masking Predict</h3>
                                <p className="text-orange-200/80 text-sm">Fill in masked words</p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-300 text-sm">Complete sentences</span>
                              <span className="bg-orange-500/20 text-orange-300 px-3 py-1 rounded-full text-xs font-medium">
                                1 token
                              </span>
                            </div>
                          </button>
                        </div>

                        <div className="text-center mt-8 p-4 bg-black/20 rounded-xl border border-white/10">
                          <p className="text-gray-300 text-sm">
                            💡 <strong>Tip:</strong> Click on any service card above or type your request in the input field below to get started!
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>
                    )}
                    
                    {message.tokensUsed && (
                      <div className="mt-4 text-xs opacity-80 flex items-center gap-2 bg-black/20 rounded-full px-3 py-1.5 w-fit">
                        <Zap className="w-3 h-3 text-yellow-400" />
                        <span className="font-medium">{message.tokensUsed} token{message.tokensUsed > 1 ? 's' : ''} consumed</span>
                      </div>
                    )}
                  </div>
                  
                  {message.role === 'assistant' && !message.error && (
                    <div className="flex items-center gap-3 mt-3 ml-2">
                      <button
                        onClick={() => copyMessage(message.content)}
                        className="text-gray-400 hover:text-cyan-400 p-2 rounded-lg hover:bg-white/5 transition-all duration-300"
                        title="Copy message"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <span className="text-xs text-gray-500 font-medium">
                        {message.timestamp?.toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                </div>
                
                {message.role === 'user' && (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-gray-600 to-gray-700 flex items-center justify-center flex-shrink-0 order-3 shadow-lg">
                    <div className="text-xl">👤</div>
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-4 justify-start animate-in slide-in-from-bottom-5 duration-500">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <div className="bg-gradient-to-br from-white/10 to-white/5 border border-white/10 backdrop-blur-sm p-6 rounded-2xl shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-cyan-400 rounded-full animate-bounce"></div>
                    <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <span className="text-gray-300 ml-3 font-medium">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Enhanced Error Display */}
          {error && (
            <div className="px-8 pb-4">
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 backdrop-blur-sm">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <span className="text-red-300 font-medium flex-1">{error}</span>
                {error.includes('token') && (
                  <Link
                    to="/subscription"
                    className="text-purple-400 hover:text-purple-300 font-semibold underline decoration-2 underline-offset-2"
                  >
                    Upgrade Plan
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Enhanced Input Area */}
          <div className="p-8 border-t border-white/10 bg-black/10 backdrop-blur-sm">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleTextareaChange}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me to analyze metaphors, generate lyrics, create metaphors, or predict masked words..."
                  className="w-full bg-gray-800 text-white border-2 border-gray-600 focus:border-cyan-500 rounded-xl px-6 py-4 pr-16 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500/50 placeholder-gray-400 shadow-lg font-medium leading-relaxed relative z-10"
                  style={{ 
                    color: 'white', 
                    backgroundColor: 'rgba(31, 41, 55, 0.9)',
                    caretColor: 'white' 
                  }}
                  rows="1"
                  maxLength="1000"
                />
                <div className="absolute bottom-3 right-4 text-xs text-gray-400 font-medium bg-black/20 px-2 py-1 rounded-md z-20">
                  {input.length}/1000
                </div>
              </div>
              <button
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading || remainingTokens === 0}
                className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold transition-all duration-300 flex items-center gap-3 shadow-lg hover:shadow-cyan-500/25 min-w-[120px] justify-center z-10"
              >
                <Send className="w-5 h-5" />
                Send
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-lg flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-10 max-w-md w-full border border-white/10 shadow-2xl backdrop-blur-xl">
            <div className="text-center mb-8">
              <div className="text-6xl mb-6">👑</div>
              <h3 className="text-3xl font-bold mb-4 bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">Upgrade Required</h3>
              <p className="text-gray-300 leading-relaxed">
                You've exhausted your tokens! Upgrade to a premium plan to continue exploring our advanced AI services.
              </p>
            </div>
            
            <div className="flex gap-4">
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl transition-all duration-300 font-semibold"
              >
                Maybe Later
              </button>
              <Link
                to="/subscription"
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-xl text-center font-bold transition-all duration-300 shadow-lg hover:shadow-purple-500/25"
                onClick={() => setShowUpgradeModal(false)}
              >
                Upgrade Now
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}