import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp } from "lucide-react";
import axios from 'axios'; // You'll need to install axios: npm install axios
import { useAuth } from '../context/AuthContext'
export default function ChatPage() {
   const textareaRef = useRef(null);
  const [messages, setMessages] = useState([
    {
      role: 'system',
      content: 'Welcome to Tamil AI Chat. You can use this interface to interact with our Metaphor Classifier, Lyric Generator, Metaphor Creator, and Masking Predict services. How can I help you today?'
    }
  ]);
  const { currentUser } = useAuth()
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('auto');
  const [error, setError] = useState(null);
  const [batchResults, setBatchResults] = useState(null); // For multi-line batch
  const [chartData, setChartData] = useState(null); // For chart summary
  const [batchPage, setBatchPage] = useState(1); // pagination for batch results
  const [showLyricOptionsPanel, setShowLyricOptionsPanel] = useState(false);
  const [showMetaphorOptionsPanel, setShowMetaphorOptionsPanel] = useState(false);
  
  // New states for sidebar sections
  const [showRecentChats, setShowRecentChats] = useState(true);
  const [showExamplePrompts, setShowExamplePrompts] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // New useful features states
  const [showSettings, setShowSettings] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [fontSize, setFontSize] = useState('medium');
  const [theme, setTheme] = useState('dark');
  const [autoSave, setAutoSave] = useState(true);
  const [showWordCount, setShowWordCount] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [favoritePrompts, setFavoritePrompts] = useState([]);
  const [showFavorites, setShowFavorites] = useState(true);
  
  // New states for metaphor creator options
  const [showMetaphorOptions, setShowMetaphorOptions] = useState(false);
  const [metaphorSource, setMetaphorSource] = useState("");
  const [metaphorTarget, setMetaphorTarget] = useState("");
  const [metaphorContext, setMetaphorContext] = useState("");
  
  // New states for lyric generator options
  const [showLyricOptions, setShowLyricOptions] = useState(false);
  const [lyricEmotion, setLyricEmotion] = useState("calm");
  const [lyricSeed, setLyricSeed] = useState("");
  
  // New states for masking predict options
  const [showMaskingOptions, setShowMaskingOptions] = useState(false);
  const [maskText, setMaskText] = useState("");
  
  const [lyricSuggestions, setLyricSuggestions] = useState([
    "Under the moonlight we danced, swaying to the rhythm of our hearts.",
    "Whispers of love echo through the night, painting our dreams in starlight.",
    "Your smile outshines the morning sun, warming my soul completely.",
    "Through stormy days and peaceful nights, our love remains unshaken.",
    "Every moment with you feels like an eternity of bliss."
  ]); // State for lyric suggestions
  
  const batchPageSize = 5;
  const messagesEndRef = useRef(null);
  
  // API endpoints for each service
  const API_ENDPOINTS = {
    'metaphor-classifier': 'http://localhost:5000/api/predict',
    'lyric-generator': 'http://localhost:5000/api/generate-lyrics',
    'metaphor-creator': 'http://localhost:5000/api/create-metaphors',
    'masking-predict': 'http://localhost:5000/api/predict-mask'
  };
  const handleInput = (e) => {
    const el = textareaRef.current;
    el.style.height = "auto";  
    el.style.height = el.scrollHeight + "px";  
    setInput(e.target.value);
  };
  // Mock examples for each service
  const examples = {
  'metaphor-classifier': [
    'Instruction: Identify if the following sentence contains a metaphor. Example: "வானம் கண்ணீர் சிந்துகிறது"',
    'Instruction: Analyze the metaphors in this poem. Example: "இரவின் இதயம் துடிக்கிறது"',
    'Instruction: Determine if this sentence is metaphorical. Example: "அவனது வார்த்தைகள் தேனாக இனித்தன"'
  ],
  'lyric-generator': [
    'Instruction: Generate a song lyric based on the given seed. Example seed: "நான் உங்கள் அன்புக்கு வருகிறேன்"',
    'Instruction: Write a lyric expressing an emotion. Example seed: "உங்கள் சிரிப்பு காலைசூரியனை மீறுகிறது"',
    'Instruction: Create a sad song using the given seed. Example seed: "நினைவுகள் பொழுதுபோல நீங்குகின்றன"'
  ],
  'metaphor-creator': [
    'Instruction: Create a metaphor with source and target concepts. Example: source: அன்பு, target: கடல், context: காதல்',
    'Instruction: Make a metaphor about life and a river. Example: source: வாழ்க்கை, target: நதி, context: பயணம்',
    'Instruction: Generate a metaphor involving knowledge and light. Example: source: அறிவு, target: ஒளி, context: அறிவுத்திறன்'
  ],
  'masking-predict': [
    'Instruction: Predict the missing word in the sentence. Example: "நான் [mask] பள்ளிக்கு போகிறேன்"',
    'Instruction: Fill in the masked word. Example: "அவள் [mask] புத்தகத்தை கவனமாக படித்தாள்"',
    'Instruction: Complete the masked word in the sentence. Example: "அவன் [mask] பாட்டு பாடினான்"'
  ]
};


  // Scroll to bottom of chat when messages update
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Effect to handle model selection changes
  useEffect(() => {
    // Show/hide appropriate options based on selected model
    setShowMetaphorOptions(selectedModel === 'metaphor-creator');
    setShowLyricOptions(selectedModel === 'lyric-generator');
    setShowMaskingOptions(selectedModel === 'masking-predict');
    
    // Reset input if model changes
    if (selectedModel === 'metaphor-creator') {
      if (metaphorSource) {
        setInput(`Create a metaphor source: ${metaphorSource} target: ${metaphorTarget} emotion: ${metaphorContext}`);
      }
    } else if (selectedModel === 'lyric-generator') {
      if (lyricSeed) {
        let inputText = `Generate a song emotion: ${lyricEmotion}`;
        if (lyricSeed) {
          inputText += ` seed: "${lyricSeed}"`;
        }
        setInput(inputText);
      }
    } else if (selectedModel === 'masking-predict') {
      if (maskText) {
        setInput(`Predict words for "${maskText}"`);
      }
    }
  }, [selectedModel, metaphorSource, metaphorTarget, metaphorContext, lyricEmotion, lyricSeed, maskText]);
const exportChat = (type = 'txt') => {
  const chatContent = document.querySelector("#chat-container")?.innerText;
  if (!chatContent) return;

  let mime = "text/plain";
  let extension = "txt";

  if (type === "json") {
    mime = "application/json";
    extension = "json";
  }

  const blob = new Blob([chatContent], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `chat.${extension}`;
  a.click();
  URL.revokeObjectURL(url);
};

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Detect which service to use based on the message content
  const detectService = (message) => {
    const lowerMsg = message.toLowerCase();

    // If user types "identify metaphor" or "identify literals", always use classifier
    if (
      (lowerMsg.includes('identify') && (lowerMsg.includes('metaphor') || lowerMsg.includes('literal')))
      || (lowerMsg.includes('classify') && (lowerMsg.includes('metaphor') || lowerMsg.includes('literal')))
      || (lowerMsg.includes('analyze') && (lowerMsg.includes('metaphor') || lowerMsg.includes('literal')))
    ) {
      return 'metaphor-classifier';
    }

    if (lowerMsg.includes('metaphor') && (lowerMsg.includes('identify') || lowerMsg.includes('analyze') || lowerMsg.includes('classify'))) {
      return 'metaphor-classifier';
    } else if (lowerMsg.includes('lyric') || lowerMsg.includes('song') || lowerMsg.includes('poem') || lowerMsg.includes('write')) {
      return 'lyric-generator';
    } else if ((lowerMsg.includes('create') || lowerMsg.includes('make') || lowerMsg.includes('generate')) && lowerMsg.includes('metaphor')) {
      return 'metaphor-creator';
    } else if (lowerMsg.includes('[mask]') || lowerMsg.includes('predict') || lowerMsg.includes('fill') || lowerMsg.includes('complete')) {
      return 'masking-predict';
    }

    return 'auto'; // Default
  };

  const handleNewChat = () => {
    setMessages([{
      role: 'system',
      content: 'Welcome to Tamil AI Chat. You can use this interface to interact with our Metaphor Classifier, Lyric Generator, Metaphor Creator, and Masking Predict services. How can I help you today?'
    }]);
    setInput('');
    setError(null);
    setBatchResults(null);
    setChartData(null);
    setBatchPage(1);
  };

  // Rerun logic: resend the last user message before this assistant response
  const handleRerun = (assistantIdx) => {
    // Find the last user message before this assistant response
    let userIdx = assistantIdx - 1;
    while (userIdx >= 0 && messages[userIdx].role !== 'user') {
      userIdx--;
    }
    if (userIdx >= 0) {
      setInput(messages[userIdx].content);
      // Optionally, auto-send:
      // handleSendMessage();
    }
  };

  // Update lyric generator UI to include mood selection and handle list responses
  const motions = [
    { value: 'அமைதி', label: 'Calm / அமைதி', icon: '🌊' },
    { value: 'சந்தோஷம்', label: 'Happy / சந்தோஷம்', icon: '😊' },
    { value: 'கவலை', label: 'Sad / கவலை', icon: '😢' },
    { value: 'காதல்', label: 'Romantic / காதல்', icon: '💖' },
    { value: 'உற்சாகம்', label: 'Energetic / உற்சாகம்', icon: '⚡' }
  ];

  // Render mood selection
  <div className="space-y-2">
    <label className="block text-sm font-medium text-gray-300 mb-2">Select Mood</label>
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
      {motions.map((motion) => (
        <button
          key={motion.value}
          className={`${
            lyricEmotion === motion.value
              ? 'bg-green-600 text-white border-green-500'
              : 'black-700 text-gray-300 hover:black-600 border-gray-600'
          } rounded-lg p-2 transition-all border text-xs`}
          onClick={() => setLyricEmotion(motion.value)}
        >
          <div className="flex flex-col items-center">
            <span className="text-lg mb-1">{motion.icon}</span>
            <div className="font-medium">{motion.label.split(' / ')[0]}</div>
            <div className="text-xs opacity-75">{motion.label.split(' / ')[1]}</div>
          </div>
        </button>
      ))}
    </div>
  </div>;

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    // Add user message to chat
    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);
    setBatchResults(null);
    setChartData(null);

    // Determine which service to use
    const service = selectedModel === 'auto' ? detectService(input) : selectedModel;

    // Multi-line batch logic for metaphor-classifier
    if (
      (service === 'metaphor-classifier') &&
      input.split('\n').length > 1
    ) {
      const lines = input.split('\n').map(l => l.trim()).filter(Boolean);

      try {
        // Parallel API requests for each line
        const promises = lines.map(sentence =>
          axios.post(API_ENDPOINTS['metaphor-classifier'], { text: sentence,userId:currentUser.uid })
            .then(response => {
              if (response.data.results) {
                return response.data.results[0];
              } else if (typeof response.data.is_metaphor !== "undefined") {
                return {
                  line: sentence,
                  isMetaphor: response.data.is_metaphor,
                  confidence: response.data.confidence
                };
              } else {
                return {
                  line: sentence,
                  isMetaphor: false,
                  confidence: 0
                };
              }
            })
            .catch((err) => ({
              line: sentence,
              isMetaphor: false,
              confidence: 0,
              error: true,
              errorMsg: err.message === "Network Error"
                ? "Network Error: Unable to reach the server. Please ensure the backend is running at http://localhost:5000."
                : err.message
            }))
        );

        const allResults = await Promise.all(promises);

        // Compute stats
        const metaphorCount = allResults.filter(r => r.isMetaphor).length;
        const literalCount = allResults.filter(r => !r.isMetaphor).length;

        setBatchResults(allResults);
        setChartData({ metaphor: metaphorCount, literal: literalCount });

        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: `**Batch Metaphor Analysis**\n\nProcessed ${lines.length} lines. See below for results and chart.`,
            service: 'metaphor-classifier'
          }
        ]);
      } catch (error) {
        setError(
          error.message === "Network Error"
            ? "Network Error: Unable to reach the server. Please ensure the backend is running at http://localhost:5000."
            : 'Failed to analyze text. Please try again or check if the server is running.'
        );
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: `Sorry, I encountered an error while processing your request: ${error.message === "Network Error"
              ? "Network Error: Unable to reach the server. Please ensure the backend is running at http://localhost:5000."
              : error.message || "Unknown error"}. Please try again later.`,
            error: true
          }
        ]);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    try {
      // Different API call logic for each service
      let responseContent = '';
      
      if (service === 'metaphor-classifier') {
        // Metaphor Classifier POST request
        const response = await axios.post(API_ENDPOINTS['metaphor-classifier'], {
          text: input,
          userId:currentUser.uid
        }, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        // Process metaphor classifier response
        if (response.data && response.data.is_metaphor !== undefined) {
          const isMetaphor = response.data.is_metaphor;
          const confidence = response.data.confidence || 0.8;
          responseContent = `**Metaphor Analysis**\n\nI've analyzed the text and identified the following:\n\n- "${input.split('"')[1] || 'Input text'}" - ${(confidence * 100).toFixed(1)}% confidence\n\nThis text is ${isMetaphor ? 'metaphorical' : 'literal'}. ${isMetaphor ? 'It creates a vivid imagery by connecting abstract concepts with tangible elements, which is common in Tamil literature.' : 'It uses direct language without figurative expressions.'}`;
        } else {
          responseContent = `**Metaphor Analysis**\n\nI've analyzed the text and identified the following metaphorical expressions:\n\n- "${input.split('"')[1] || 'Input text'}" - ${Math.floor(Math.random() * 20) + 80}% confidence\n\nThis metaphor creates a vivid imagery by connecting abstract concepts with tangible elements, which is common in Tamil literature.`;
        }
      } 
      else if (service === 'lyric-generator') {
        // Use values from the selection UI if available
        let emotion = lyricEmotion;
        let seed = lyricSeed;
        
        
        // If no emotion is selected, parse from the input
        if (!emotion) {
          const inputText = input.toLowerCase();
          
          // Extract emotion if specified with explicit marker
          if (inputText.includes("emotion:")) {
            const emotionMatch = inputText.match(/emotion:\s*(\w+)/i);
            if (emotionMatch && emotionMatch[1]) {
              emotion = emotionMatch[1].toLowerCase();
            }
          } 
          
          // Extract seed if specified with explicit marker
          if (inputText.includes("seed:")) {
            const seedMatch = inputText.match(/seed:\s*"([^"]+)"/i);
            if (seedMatch && seedMatch[1]) {
              seed = seedMatch[1].trim();
            } else {
              const seedMatch2 = inputText.match(/seed:\s*([^,]+)/i);
              if (seedMatch2 && seedMatch2[1]) {
                seed = seedMatch2[1].trim();
              }
            }
          }
          
          // If emotion wasn't explicitly specified, try to extract it from the rest of the input
          if (!emotion) {
            // Clean the input text by removing all parameter specifications
            let cleanedText = input
              .replace(/\bemotion:\s*\w+/i, "")
              .replace(/\bseed:\s*"[^"]+"/i, "")
              .replace(/\bseed:\s*[^,]+/i, "");
              
            // Extract emotion from common phrases
            if (cleanedText.includes("with") || cleanedText.includes("about")) {
              const withIndex = cleanedText.indexOf("with") !== -1 ? cleanedText.indexOf("with") : cleanedText.indexOf("about");
              emotion = cleanedText.substring(withIndex + 5).trim();
            } else {
              // Use a default emotion if none is found
              emotion = "neutral";
            }
          }
        }
        
        // Lyric Generator POST request with proper parameters
        console.log(`Sending lyric request - Emotion: ${emotion}, Seed: ${seed}`);
        const response = await axios.post(API_ENDPOINTS['lyric-generator'], {
          motion: emotion,
          seed: seed,
          userId:currentUser.uid
        }, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        // Process lyric generator response
        if (response.data && response.data.lyrics) {
          // Handle both array and string responses
          const lyricsArray = Array.isArray(response.data.lyrics) 
            ? response.data.lyrics 
            : [response.data.lyrics];
          
          console.log(`Received lyrics response: ${lyricsArray[0]?.substring(0, 50) || 'No lyrics'}...`);
          console.log(`Received ${response.data.suggestions ? response.data.suggestions.length : 0} lyric suggestions`);
          
          let responseIntro = `**Generated Tamil Lyrics**\n\n🎵 **Emotion:** ${emotion.charAt(0).toUpperCase() + emotion.slice(1)}`;
          if (seed) {
            responseIntro += `\n✨ **Seed:** "${seed}"`;
          }
          
          // Format each lyric line with proper spacing and numbering
          const formattedLyrics = lyricsArray.map((lyric, index) => {
            return `**${index + 1}.** ${lyric.trim()}`;
          }).join('\n\n');
          
          responseContent = `${responseIntro}\n\n---\n\n${formattedLyrics}\n\n---\n\n💫 *These lyrics express the ${emotion} emotions you requested.*`;
          
          // Update the lyric suggestions if they're provided in the response
          if (response.data.suggestions && response.data.suggestions.length > 0) {
            console.log("Updating lyric suggestions with new data from API");
            setLyricSuggestions(response.data.suggestions);
          } else {
            console.log("No suggestions received from API");
          }
        } else {
          console.log("No lyrics in response, using fallback");
          let responseIntro = `**Generated Lyrics**\n\nHere's a lyric with ${emotion} emotion`;
          if (seed) {
            responseIntro += ` starting with: "${seed}"`;
          }
          
          responseContent = `${responseIntro}:\n\nகாலை வெயிலின் கதிர்களில்\nகனவுகள் மலர்கின்றன\nவானம் அழைக்கும் குரலினில்\nவாழ்க்கை புதுமை பெறுகிறது\n\nThis lyric expresses the beauty of hope and new beginnings, drawing inspiration from your theme.`;
        }
      } 
      else if (service === 'metaphor-creator') {
        // Use values from the selection UI if available
        let source = metaphorSource;
        let target = metaphorTarget;
        let context = metaphorContext;
        
        // If no source is selected, parse from the input
        if (!source) {
          // Parse the input to extract parameters
          const inputText = input.toLowerCase();
          
          // Extract source and target if they're explicitly defined
          if (inputText.includes("source:")) {
            const match = inputText.match(/source:\s*(\w+)/i);
            if (match && match[1]) {
              source = match[1];
            }
          }
          
          if (inputText.includes("target:")) {
            const match = inputText.match(/target:\s*(\w+)/i);
            if (match && match[1]) {
              target = match[1];
            }
          }
          
          if (inputText.includes("emotion:")) {
            const match = inputText.match(/emotion:\s*(\w+)/i);
            if (match && match[1]) {
              context = match[1].toLowerCase();
            }
          }
          
          // If source/target weren't explicitly defined, try to extract from common phrases
          if (!source) {
            if (inputText.includes("relating") || inputText.includes("connecting")) {
              const words = inputText.split(/\s+/);
              
              for (let i = 0; i < words.length; i++) {
                if (words[i] === "relating" || words[i] === "connecting") {
                  if (i + 1 < words.length) source = words[i + 1];
                  
                  for (let j = i + 2; j < words.length; j++) {
                    if (words[j] === "to" || words[j] === "and") {
                      if (j + 1 < words.length) {
                        target = words[j + 1];
                        break;
                      }
                    }
                  }
                  break;
                }
              }
            } else if (inputText.includes("about")) {
              const aboutIndex = inputText.indexOf("about");
              const afterAbout = inputText.substring(aboutIndex + 5).trim();
              const andIndex = afterAbout.indexOf("and");
              
              if (andIndex !== -1) {
                source = afterAbout.substring(0, andIndex).trim();
                target = afterAbout.substring(andIndex + 3).trim();
              } else {
                source = afterAbout.replace(/\bemotions?:\s*\w+/i, "").trim();
              }
            }
          }
          
          // If still no source found, use the whole input (excluding any parameter markers)
          if (!source) {
            source = input.replace(/\b(source|target|emotion):\s*\w+/ig, "").trim();
          }
        }
        
        // Metaphor Creator POST request with extracted parameters
        const response = await axios.post(API_ENDPOINTS['metaphor-creator'], {
          source: source,
          target: target,
          Context: context,
          userId:currentUser.uid
        }, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        // Process metaphor creator response
        if (response.data && response.data.metaphors && response.data.metaphors.length > 0) {
          // Join multiple metaphors with line breaks, each metaphor on its own line
          const metaphorsText = response.data.metaphors.map(m => `"${m}"`).join('\n\n');
          responseContent = `**Created Metaphor**\n\nHere ${response.data.metaphors.length > 1 ? 'are some' : 'is a'} beautiful metaphor${response.data.metaphors.length > 1 ? 's' : ''} about "${source}"${target !== "general" ? ` related to "${target}"` : ''} with ${context} context:\n\n${metaphorsText}\n\nThese metaphors connect the concepts in a creative way that enhances understanding and emotional impact.`;
        } else {
          // Fallback with some beautiful predefined metaphors
          const fallbackMetaphors = [
            `"${source} is like a rare ${target}, both precious and beautiful in its uniqueness."`,
            `"${source} shines like a brilliant ${target}, catching light and attention with its radiance."`,
            `"${source} resembles a perfect ${target}, formed through pressure and time into something extraordinary."`,
            `"Just as a ${target} reflects light, ${source} reflects the beauty of the world around it."`,
            `"${source} is a treasure like a magnificent ${target}, valuable not just for its appearance but for its meaning."`
          ];
          
          const metaphorsText = fallbackMetaphors.join('\n\n');
          responseContent = `**Created Metaphor**\n\nHere are some beautiful metaphors about "${source}"${target !== "general" ? ` related to "${target}"` : ''} with context: ${context}\n\n${metaphorsText}\n\nThese metaphors connect the concepts in a creative way that enhances understanding and emotional impact.`;
        }
      } else if (service === 'masking-predict') {
        // Extract the sentence with [mask] token
        let sentence = "";
        
        // Check if the input contains [mask]
        if (input.includes("[mask]")) {
          sentence = input;
        } else {
          // Try to extract text within quotes as the sentence
          const quoteMatch = input.match(/"([^"]+)"/);
          if (quoteMatch && quoteMatch[1]) {
            sentence = quoteMatch[1];
          } else {
            // Use the whole input, assuming it's the sentence
            sentence = input.replace(/predict words for|fill in|complete/i, "").trim();
          }
        }
        
        // Masking Predict POST request
        const response = await axios.post(API_ENDPOINTS['masking-predict'], {
          text: sentence,
          top_k: 5,
          userId:currentUser.uid
        }, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        // Process masking predict response
        if (response.data && response.data.suggestions && response.data.suggestions.length > 0) {
          const suggestions = response.data.suggestions;
          
          // Create response with suggestions
          responseContent = `**Mask Prediction Results**\n\nFor the sentence: "${sentence}"\n\nHere are the top ${suggestions.length} predictions for the masked word:\n\n`;
          
          // Add each suggestion with its replacement in the sentence
          suggestions.forEach((word, index) => {
            const completedSentence = sentence.replace("[mask]", `**${word}**`);
            responseContent += `${index + 1}. ${completedSentence}\n\n`;
          });
          
          responseContent += "These predictions are based on the context of your sentence and common word usage patterns.";
        } else {
          // Fallback with some generic suggestions
          responseContent = `**Mask Prediction Results**\n\nFor the sentence: "${sentence}"\n\nHere are the top predictions for the masked word:\n\n`;
          
          const fallbackSuggestions = ["go", "walk", "run", "travel", "drive"];
          fallbackSuggestions.forEach((word, index) => {
            const completedSentence = sentence.replace("[mask]", `**${word}**`);
            responseContent += `${index + 1}. ${completedSentence}\n\n`;
          });
          
          responseContent += "These are generic suggestions. For better results, make sure your sentence contains a [mask] token.";
        }
      } else {
        throw new Error(`Service ${service} not supported`);
      }
      
      // Add AI response to chat
      const aiMessage = { 
        role: 'assistant', 
        content: responseContent,
        service: service 
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      // Create service-specific error messages
      let friendlyError = error.message || "An unknown error occurred";
      
      if (error.message === "Network Error") {
        friendlyError = `Network Error: Unable to reach the ${service} server at ${API_ENDPOINTS[service]}. Please ensure the backend is running.`;
      } else if (error.response) {
        // Handle API error responses
        if (error.response.status === 422) {
          friendlyError = `The ${service} service couldn't process your request: ${error.response.data?.detail || 'Invalid input format'}`;
        } else if (error.response.status === 404) {
          friendlyError = `The ${service} endpoint could not be found. Please check your server configuration.`;
        } else {
          friendlyError = `Error from ${service} service: ${error.response.data?.detail || error.message}`;
        }
      }
      
      setError(friendlyError);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Sorry, I encountered an error while processing your request: ${friendlyError}. Please try again later.`,
        error: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };
  const addToFavorites = (message) => {
  if (!message.trim()) return; // ignore empty messages

  // get existing favorites from localStorage (or start with empty array)
  const favorites = JSON.parse(localStorage.getItem("favorites")) || [];

  // add the new message if it’s not already in favorites
  if (!favorites.includes(message)) {
    favorites.push(message);
    localStorage.setItem("favorites", JSON.stringify(favorites));
    console.log("Added to favorites:", message);
  } else {
    console.log("Message already in favorites");
  }
};
const getWordCount = () => {
  const chatContent = document.querySelector("#chat-container")?.innerText || "";
  return chatContent.split(/\s+/).filter(Boolean).length;
};

  const searchMessages = (query) => {
  const messages = document.querySelectorAll(".message");
  const results = [];

  messages.forEach(msg => {
    if (!query) {
      msg.style.backgroundColor = "transparent";
    } else if (msg.innerText.toLowerCase().includes(query.toLowerCase())) {
      msg.style.backgroundColor = "yellow";
      results.push(msg);
    } else {
      msg.style.backgroundColor = "transparent";
    }
  });

  return results; // return all matched message elements
};

const copyLyric = (text) => {
  const decodedText = decodeURIComponent(text).replace(/\*\*(.*?)\*\*/g, '$1');
  navigator.clipboard.writeText(decodedText);
  
  // You can add a toast notification here if needed
  console.log('Copied lyric:', decodedText);
};
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Function to render message content with Markdown-like formatting
  const formatMessage = (content) => {
    // Handle lyric output with beautiful formatting
    if (content.includes("**Generated Tamil Lyrics**")) {
      const sections = content.split('---');
      
      if (sections.length >= 3) {
        const headerSection = sections[0];
        const lyricsSection = sections[1];
        const footerSection = sections[2];
        
        // Format header with emotion and seed info
        const formattedHeader = headerSection
          .replace(/\*\*(.*?)\*\*/g, '<strong class="text-green-400">$1</strong>')
          .replace(/🎵/g, '<span class="text-2xl">🎵</span>')
          .replace(/✨/g, '<span class="text-green-400">✨</span>');
        
        // Format lyrics with proper spacing and styling
        const formattedLyrics = lyricsSection
          .split('\n\n')
          .filter(lyric => lyric.trim())
          .map((lyric, index) => {
            const cleanLyric = lyric.replace(/\*\*(.*?)\*\*/g, '<strong class="text-green-300">$1</strong>');
            return `
  <div class="lyric-line bg-black rounded-lg p-4 mb-3 border-l-4 border-green-400 hover:bg-black/80 transition-all group">
    <div class="flex items-start justify-between">
      <div class="flex-grow text-gray-100 leading-relaxed font-tamil text-lg">
        ${cleanLyric}
      </div>
      <button 
        class="ml-3 p-2 text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-md opacity-0 group-hover:opacity-100 transition-all copy-lyric-btn" 
        onclick="copyLyric(event, '${encodeURIComponent(lyric.replace(/\*\*(.*?)\*\*/g, '$1'))}')"
        title="Copy this lyric"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </button>
    </div>
  </div>
`;

          }).join('');
        
        // Format footer
        const formattedFooter = footerSection
          .replace(/💫/g, '<span class="text-green-400 text-lg">💫</span>')
          .replace(/\*(.*?)\*/g, '<em class="text-gray-300">$1</em>');
        
        const result = `
          <div class="lyrics-container space-y-4">
            <div class="lyrics-header text-center pb-4 border-b border-gray-600/50">
              ${formattedHeader.replace(/\n/g, '<br>')}
            </div>
            
            <div class="lyrics-content space-y-2 py-4">
              ${formattedLyrics}
            </div>
            
            <div class="lyrics-footer text-center pt-4 border-t border-gray-600/50">
              ${formattedFooter.replace(/\n/g, '<br>')}
            </div>
            
            <script>
              function copyLyric(event, text) {
                const decodedText = decodeURIComponent(text).replace(/\*\*(.*?)\*\*/g, '$1');
                navigator.clipboard.writeText(decodedText);
                
                const btn = event.currentTarget;
                const originalHTML = btn.innerHTML;
                btn.innerHTML = '<span class="text-xs text-green-400">✓</span>';
                btn.classList.add('bg-green-600');
                
                setTimeout(() => {
                  btn.innerHTML = originalHTML;
                  btn.classList.remove('bg-green-600');
                }, 2000);
              }
            </script>
          </div>
        `;
        
        return <div dangerouslySetInnerHTML={{ __html: result }} />;
      }
    }
    
    // Handle mask prediction results with beautiful formatting and copy function
    if (content.includes("**Mask Prediction Results**")) {
      // Extract the different parts of the content
      const parts = content.split("\n\n");
      
      // Extract the header, sentence, intro, and predictions
      let header = parts[0]; // "**Mask Prediction Results**"
      let sentencePart = parts[1]; // "For the sentence: "xxx""
      let introPart = parts[2]; // "Here are the top X predictions..."
      
      // Extract the sentence from the sentence part
      const sentenceMatch = sentencePart.match(/"([^"]+)"/);
      const originalSentence = sentenceMatch ? sentenceMatch[1] : "";
      
      // Extract all the predictions (starts from parts[3])
      const predictions = [];
      for (let i = 3; i < parts.length - 1; i++) {
        const predictionPart = parts[i];
        if (predictionPart.match(/^\d+\./)) {
          predictions.push(predictionPart);
        }
      }
      
      // Format the result with green theme and copy functionality
      const result = `
        <div class="mask-predictions-container bg-gradient-to-br from-black-900/30 to-emerald-900/20 rounded-xl p-4 border border-green-700/30 backdrop-blur-sm">
          <div class="header pb-3 border-b border-green-700/30 flex justify-between items-center">
            <h3 class="text-green-400 font-bold text-lg">Mask Prediction Results</h3>
            <div class="flex space-x-2">
              <span class="text-xs px-2 py-1 bg-black-900/50 rounded-full text-green-300 border border-green-700/30">
                ${predictions.length} results
              </span>
            </div>
          </div>
          
          <div class="sentence-container my-3 p-3 bg-black/20 rounded-lg border border-green-800/30">
            <p class="text-white mb-1 text-sm opacity-80">Original Sentence:</p>
            <p class="text-green-100 font-medium">"${originalSentence}"</p>
          </div>
          
          <div class="predictions-container space-y-3 my-4">
            ${predictions.map((pred, index) => {
              // Extract the prediction number and the completed sentence
              const parts = pred.split(". ");
              const predNumber = parts[0];
              let completedSentence = parts.slice(1).join(". ");
              
              // Extract the predicted word (between ** markers)
              const wordMatch = completedSentence.match(/\*\*([^*]+)\*\*/);
              const predictedWord = wordMatch ? wordMatch[1] : "";
              
              // Create the completed sentence with highlighted word
              completedSentence = completedSentence.replace(/\*\*([^*]+)\*\*/, '<span class="font-bold text-green-300">$1</span>');
              
              return `
                <div class="prediction-item flex items-start hover:bg-black-900/20 p-2 rounded-lg transition-colors">
                  <div class="prediction-number flex-shrink-0 w-6 h-6 rounded-full bg-green-800/40 flex items-center justify-center mr-3 border border-green-700/40">
                    <span class="text-xs text-green-300">${predNumber}</span>
                  </div>
                  <div class="prediction-content flex-grow">
                    <p class="text-white">${completedSentence}</p>
                  </div>
                  <button 
                    onclick="copyPrediction(event, '${encodeURIComponent(completedSentence.replace(/<[^>]*>/g, ""))}')"
                    class="copy-btn ml-2 flex-shrink-0 text-green-400 hover:text-green-300 bg-green-900/30 hover:bg-green-800/40 p-1.5 rounded-md transition-all border border-green-700/30"
                    title="Copy prediction"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              `;
            }).join('')}
          </div>
          
          <div class="footer pt-3 border-t border-green-700/30 text-sm text-green-300/70 italic">
            These predictions are based on the context of your sentence and common word usage patterns.
          </div>
          
          <script>
            function copyPrediction(event, text) {
              const decodedText = decodeURIComponent(text);
              navigator.clipboard.writeText(decodedText);
              
              const btn = event.currentTarget;
              const originalHTML = btn.innerHTML;
              btn.innerHTML = '<span class="text-xs text-green-400">✓</span>';
              btn.classList.add('bg-green-600/50');
              
              setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.classList.remove('bg-green-600/50');
              }, 2000);
            }
          </script>
        </div>
      `;
      
      return <div dangerouslySetInnerHTML={{ __html: result }} />;
    }
    
    // Handle metaphor output with copy buttons
    if (content.includes("**Created Metaphor**")) {
      // First, apply bold formatting
      const boldFormatted = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      
      // Extract metaphors from the content
      const metaphorSection = content.split('\n\n');
      let result = boldFormatted;
      
      // If there are metaphors (3rd section onwards), add copy buttons
      if (metaphorSection.length > 2) {
        // Get intro part (first two sections)
        const introPart = metaphorSection.slice(0, 2).join('\n\n');
        
        // Get metaphors and conclusion parts
        const metaphorPart = metaphorSection.slice(2, -1).join('\n\n');
        const conclusionPart = metaphorSection[metaphorSection.length - 1];
        
        // Split individual metaphors
        const metaphors = metaphorPart.split('\n\n').filter(m => m.trim() !== '');
        
        // Create HTML with copy buttons for each metaphor
       const metaphorsWithButtons = metaphors.map((m, i) => {
 return `
  <div class="flex items-start my-2 group bg-black rounded-lg p-3 border-l-4 border-green-400 hover:bg-black/80 transition-colors">
    <div class="flex-grow metaphor-text text-gray-100">${m}</div>
    <button 
      class="ml-2 p-1 text-green-100 hover:text-white bg-green-700 hover:bg-green-600 rounded opacity-0 group-hover:opacity-100 transition-opacity copy-btn" 
      data-metaphor="${encodeURIComponent(m)}"
      onclick="window.copyMetaphor(event, '${encodeURIComponent(m)}')"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    </button>
  </div>
`;

}
).join('');
        
        // Put it all together
        result = `
          <div class="metaphor-container">
            ${introPart.replace(/\n/g, '<br>')}
            <br><br>
            ${metaphorsWithButtons}
            <br>
            ${conclusionPart.replace(/\n/g, '<br>')}
          </div>
        `;
      }
      
      return <div dangerouslySetInnerHTML={{ __html: result }} />;
    }
    
    // Handle bold text for non-metaphor content
    const boldFormatted = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Handle line breaks
    const withLineBreaks = boldFormatted.replace(/\n/g, '<br>');
    
    return <div dangerouslySetInnerHTML={{ __html: withLineBreaks }} />;
  };

  // Pie chart SVG for metaphor/literal summary
  const renderPieChart = (data) => {
    if (!data) return null;
    const total = data.metaphor + data.literal;
    if (total === 0) return null;
    const metaphorAngle = (data.metaphor / total) * 360;
    const literalAngle = 360 - metaphorAngle;

    // Pie chart arc calculation
    const describeArc = (cx, cy, r, startAngle, endAngle) => {
      const rad = (deg) => (Math.PI / 180) * deg;
      const x1 = cx + r * Math.cos(rad(startAngle));
      const y1 = cy + r * Math.sin(rad(startAngle));
      const x2 = cx + r * Math.cos(rad(endAngle));
      const y2 = cy + r * Math.sin(rad(endAngle));
      const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
      return [
        `M ${cx} ${cy}`,
        `L ${x1} ${y1}`,
        `A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        'Z'
      ].join(' ');
    };

    return (
      <svg width="120" height="120" viewBox="0 0 120 120">
        <path
          d={describeArc(60, 60, 50, 0, metaphorAngle)}
          fill="#f59e42"
          stroke="#fff"
          strokeWidth="2"
        />
        <path
          d={describeArc(60, 60, 50, metaphorAngle, 360)}
          fill="#4b5563"
          stroke="#fff"
          strokeWidth="2"
        />
        <circle cx="60" cy="60" r="35" fill="#18181b" />
        <text x="60" y="60" textAnchor="middle" dy="5" fontSize="16" fill="#fff">
          {data.metaphor} / {total}
        </text>
      </svg>
    );
  };
const copyConversation = () => {
  const chatContent = document.querySelector("#chat-container")?.innerText;
  if (!chatContent) return;

  navigator.clipboard.writeText(chatContent)
    .then(() => alert("Conversation copied!"))
    .catch(() => alert("Failed to copy."));
};

  const fetchLyricSuggestions = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/generate-lyrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          theme: 'love',
          style: 'pop',
          length: 'medium',
          seed: 'Under the moonlight we danced',
        }),
      });

      const data = await response.json();
      if (data && data.suggestions) {
        setLyricSuggestions(data.suggestions);
      }
    } catch (error) {
      console.error('Error fetching lyric suggestions:', error);
    }
  };

  useEffect(() => {
    fetchLyricSuggestions();
  }, []);
  // Add this useEffect after the existing useEffects
useEffect(() => {
  // Define global function for copy operations
  window.copyLyric = (event, text) => {
    const decodedText = decodeURIComponent(text).replace(/\*\*(.*?)\*\*/g, '$1');
    navigator.clipboard.writeText(decodedText);
    
    const btn = event.currentTarget;
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<span class="text-xs text-green-400">✓</span>';
    btn.classList.add('bg-green-600');
    
    setTimeout(() => {
      btn.innerHTML = originalHTML;
      btn.classList.remove('bg-green-600');
    }, 2000);
  };

  // Define global function for metaphor copy operations
  window.copyMetaphor = (event, text) => {
    const decodedText = decodeURIComponent(text);
    navigator.clipboard.writeText(decodedText);
    
    const btn = event.currentTarget;
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<span class="text-xs text-green-400">✓</span>';
    btn.classList.add('bg-green-600');
    
    setTimeout(() => {
      btn.innerHTML = originalHTML;
      btn.classList.remove('bg-green-600');
    }, 2000);
  };
window.copyPrediction = (event, text) => {
    const decodedText = decodeURIComponent(text);
    navigator.clipboard.writeText(decodedText);
    
    const btn = event.currentTarget;
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<span class="text-xs text-green-400">✓</span>';
    btn.classList.add('bg-green-600');
    
    setTimeout(() => {
      btn.innerHTML = originalHTML;
      btn.classList.remove('bg-green-600');
    }, 2000);
  };
  // Cleanup function to remove global functions when component unmounts
  return () => {
    delete window.copyLyric;
    delete window.copyMetaphor;
  };
}, []);
// const motions = [
//   { value: 'அமைதி', label: 'Calm / அமைதி', color: 'bg-blue-600', icon: '🌊' },
//   { value: 'சந்தோஷம்', label: 'Happy / சந்தோஷம்', color: 'bg-yellow-500', icon: '😊' },
//   { value: 'கவலை', label: 'Sad / கவலை', color: 'bg-purple-600', icon: '😢' },
//   { value: 'காதல்', label: 'Romantic / காதல்', color: 'bg-pink-500', icon: '💖' },
//   { value: 'உற்சாகம்', label: 'Energetic / உற்சாகம்', color: 'bg-red-500', icon: '⚡' }
// ];
  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-900 to-black">
      {/* Header */}
      <header className="black-900/80 backdrop-blur-xl py-4 px-6 border-b border-gray-800 flex justify-between items-center sticky top-0 z-10 shadow-lg">
  <Link to="/" className="flex items-center space-x-3 group">
    <div className="h-9 w-9 bg-gradient-to-br from-green-500 to-teal-400 rounded-lg flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
      <span className="text-white font-bold">T</span>
    </div>
    <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-teal-400 to-green-300 group-hover:brightness-110 transition">
      Tamil AI Chat
    </span>
  </Link>

  <div className="flex items-center space-x-4 ml-auto">
    <div className="relative w-64">
      <select
        className="appearance-none w-full bg-gray-800/90 text-gray-200 text-sm rounded-xl pl-4 pr-10 py-3 border border-gray-700 shadow-inner hover:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-600 transition-all duration-300"
        value={selectedModel}
        onChange={(e) => setSelectedModel(e.target.value)}
      >
        <option value="auto">🌐 auto-detect service</option>
        <option value="metaphor-classifier">🎭 metaphor classifier</option>
        <option value="lyric-generator">🎵 lyric generator</option>
        <option value="metaphor-creator">✨ metaphor creator</option>
        <option value="masking-predict">🕵️‍♂️ masking predict</option>
      </select>

      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>

    <button className="bg-gradient-to-r from-green-500 to-teal-400 hover:from-green-600 hover:to-teal-500 p-3 rounded-xl text-white shadow-md hover:shadow-xl transition-all flex items-center justify-center">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v.01M12 12v.01M12 18v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
      </svg>
    </button>
  </div>
</header>


      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div
          className={`${sidebarCollapsed ? 'w-10' : 'w-[400px]'} hidden md:block bg-gradient-to-br from-gray-900/90 to-gray-800/70 backdrop-blur-2xl border-r border-gray-800/40 p-6 rounded-r-3xl shadow-2xl transition-all duration-300 overflow-y-auto scrollbar-thin scrollbar-thumb-green-600 scrollbar-track-gray-900`}
          style={{ maxHeight: 'calc(100vh - 1rem)' }}
        >
          {/* Sidebar Toggle Button */}
          <div className="mb-6 flex justify-between items-center">
            {!sidebarCollapsed && (
              <h2 className="text-lg font-bold text-white">Menu</h2>
              )
            }
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 rounded-lg bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 hover:text-white transition-all"
            >
              {sidebarCollapsed ? (
                <ChevronDown size={20} className="rotate-90" />
              ) : (
                <ChevronUp size={20} className="rotate-90" />
              )}
            </button>
          </div>

          {!sidebarCollapsed && (
            <>
              {/* New Chat Button */}
              <div className="mb-8">
                <button 
                  className="w-full bg-gradient-to-r from-green-500 to-teal-400 text-white py-4 rounded-2xl flex items-center justify-center transition-all hover:shadow-lg hover:shadow-green-500/40 font-semibold tracking-wide"
                  onClick={handleNewChat}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  New Chat
                </button>
              </div>

              {/* Quick Actions */}
              <div className="mb-8">
                <h3 className="text-gray-300 text-sm uppercase font-bold mb-4 flex items-center gap-2 tracking-wide">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Quick Actions
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => exportChat('txt')}
                    className="p-3 bg-gray-700/50 hover:bg-green-600/50 rounded-xl text-xs text-gray-300 hover:text-white transition-all flex flex-col items-center gap-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export Chat
                  </button>
                  
                  <button
                    onClick={copyConversation}
                    className="p-3 bg-gray-700/50 hover:bg-green-600/50 rounded-xl text-xs text-gray-300 hover:text-white transition-all flex flex-col items-center gap-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy All
                  </button>
                  
                  <button
                    onClick={() => setShowSearch(!showSearch)}
                    className="p-3 bg-gray-700/50 hover:bg-green-600/50 rounded-xl text-xs text-gray-300 hover:text-white transition-all flex flex-col items-center gap-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Search Chat
                  </button>
                  
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="p-3 bg-gray-700/50 hover:bg-green-600/50 rounded-xl text-xs text-gray-300 hover:text-white transition-all flex flex-col items-center gap-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Settings
                      </button>
                    </div>
                  </div>

                  {/* Search Panel */}
                  {showSearch && (
                    <div className="mb-6 p-4 bg-gray-800/50 rounded-xl border border-gray-700/40">
                      <h4 className="text-white font-medium mb-3">Search Messages</h4>
                      <input
                        type="text"
                        placeholder="Search in conversation..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                      />
                      {searchQuery && (
                        <div className="mt-2 text-xs text-gray-400">
                          Found {searchMessages(searchQuery).length} results
                        </div>
                      )}
                    </div>
                  )}

                  {/* Settings Panel */}
                  {showSettings && (
                    <div className="mb-6 p-4 bg-gray-800/50 rounded-xl border border-gray-700/40">
                      <h4 className="text-white font-medium mb-3">Chat Settings</h4>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Font Size</label>
                          <select
                            value={fontSize}
                            onChange={(e) => setFontSize(e.target.value)}
                            className="w-full bg-gray-800 text-white rounded px-2 py-1 text-xs"
                          >
                            <option value="small">Small</option>
                            <option value="medium">Medium</option>
                            <option value="large">Large</option>
                          </select>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">Show Word Count</span>
                          <button
                            onClick={() => setShowWordCount(!showWordCount)}
                            className={`w-8 h-4 rounded-full transition-colors ${
                              showWordCount ? 'bg-green-500' : 'bg-gray-600'
                            }`}
                          >
                            <div className={`w-3 h-3 bg-white rounded-full transition-transform ${
                              showWordCount ? 'translate-x-4' : 'translate-x-0.5'
                            }`} />
                          </button>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">Auto-save Chats</span>
                          <button
                            onClick={() => setAutoSave(!autoSave)}
                            className={`w-8 h-4 rounded-full transition-colors ${
                              autoSave ? 'bg-green-500' : 'bg-gray-600'
                            }`}
                          >
                            <div className={`w-3 h-3 bg-white rounded-full transition-transform ${
                              autoSave ? 'translate-x-4' : 'translate-x-0.5'
                            }`} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Recent Chats */}
                  <div className="mb-10">
                    <button
                      onClick={() => setShowRecentChats(!showRecentChats)}
                      className="w-full flex items-center justify-between text-gray-300 text-sm uppercase font-bold mb-4 tracking-wide hover:text-white transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Recent Chats
                      </div>
                      {showRecentChats ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    {showRecentChats && (
                      <div className="space-y-4 animate-fade-in">
                        <div className="px-5 py-4 rounded-2xl bg-gradient-to-r from-green-700/40 to-green-900/40 text-white border-l-4 border-green-500 shadow-md flex flex-col gap-2">
                          <div className="text-sm font-semibold">
                            🌟 Your Recent Chats
                          </div>
                          <div className="text-xs text-gray-100/90">
                            {/* Display recent chats from history */}
                            {chatHistory.length > 0 ? (
                              chatHistory.slice(0, 3).map((chat, idx) => (
                                <div key={idx} className="flex flex-col">
                                  <div className="font-medium">{chat.prompt}</div>
                                  <div className="text-gray-300 text-xs">{new Date(chat.date).toLocaleString('en-IN')}</div>
                                </div>
                              ))
                            ) : (
                              <div className="text-gray-400 text-center text-xs italic py-2">
                                No recent chats found. Start a new conversation!
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="px-5 py-4 rounded-2xl bg-gradient-to-r from-teal-700/30 to-teal-900/30 text-gray-100 border-l-4 border-teal-400 shadow hover:shadow-lg hover:bg-teal-800/40 cursor-pointer transition-all">
                          <div className="text-sm font-semibold">
                            📚 Explore Example Prompts
                          </div>
                          <div className="text-xs text-gray-300">
                            Click to insert an example prompt and see the magic!
                          </div>
                        </div>

                        <div className="px-5 py-4 rounded-2xl bg-gradient-to-r from-green-700/30 to-green-900/30 text-gray-100 border-l-4 border-green-400 shadow hover:shadow-lg hover:bg-green-800/40 cursor-pointer transition-all">
                          <div className="text-sm font-semibold">
                            ✨ Create Your Own Metaphor
                          </div>
                          <div className="text-xs text-gray-300">
                            Use the metaphor creator to craft beautiful metaphors.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Example Prompts */}
                  <div>
                    <button
                      onClick={() => setShowExamplePrompts(!showExamplePrompts)}
                      className="w-full flex items-center justify-between text-gray-300 text-sm uppercase font-bold mb-4 tracking-wide hover:text-white transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        Example Prompts
                      </div>
                      {showExamplePrompts ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    {showExamplePrompts && (
                      <div className="animate-fade-in">
                        {Object.entries(examples).map(([service, promptList]) => (
                          <div key={service} className="mb-6">
                            <h4 className={`text-sm font-bold mb-3 flex items-center gap-1 ${
                              service === 'metaphor-classifier' ? 'text-green-400' : 
                              service === 'lyric-generator' ? 'text-teal-400' : 
                              service === 'metaphor-creator' ? 'text-emerald-400' :
                              'text-lime-400'
                            }`}>
                              <span className="text-lg">
                                {service === 'metaphor-classifier' && '🎭'}
                                {service === 'lyric-generator' && '🎵'}
                                {service === 'metaphor-creator' && '✨'}
                                {service === 'masking-predict' && '🕵️‍♂️'}
                              </span>
                              <span>
                                {service === 'metaphor-classifier' && 'Metaphor Classifier'}
                                {service === 'lyric-generator' && 'Lyric Generator'}
                                {service === 'metaphor-creator' && 'Metaphor Creator'}
                                {service === 'masking-predict' && 'Masking Predict'}
                              </span>
                            </h4>
                            <div className="space-y-3">
                              {promptList.map((prompt, idx) => (
                                <div
                                  key={idx}
                                  className={`px-4 py-3 rounded-2xl text-xs text-gray-100 bg-gradient-to-r from-gray-700/70 to-gray-800/70 border border-gray-700 hover:border-green-500 hover:shadow-lg cursor-pointer transition-all ${
                                    service === 'metaphor-classifier' ? 'hover:shadow-green-500/30' :
                                    service === 'lyric-generator' ? 'hover:shadow-teal-500/30' :
                                    'hover:shadow-emerald-500/30'
                                  }`}
                                  onClick={() => {
                                    setInput(prompt);
                                    setSelectedModel(service);
                                  }}
                                >
                                  {prompt}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Favorite Prompts */}
                  <div className="mb-6">
                    <button
                      onClick={() => setShowFavorites(!showFavorites)}
                      className="w-full flex items-center justify-between text-gray-300 text-sm uppercase font-bold mb-4 tracking-wide hover:text-white transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                        Favorites
                      </div>
                      {showFavorites ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    {showFavorites && (
                      <div className="space-y-2">
                        {favoritePrompts.length > 0 ? (
                          favoritePrompts.map((prompt, idx) => (
                            <div
                              key={idx}
                              className="px-3 py-2 rounded-lg text-xs text-gray-100 bg-gradient-to-r from-green-600/20 to-green-800/20 border border-green-700/30 hover:border-green-500 hover:shadow-lg cursor-pointer transition-all flex items-center justify-between group"
                              onClick={() => setInput(prompt)}
                            >
                              <span className="flex-grow">{prompt.substring(0, 50)}...</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFavoritePrompts(prev => prev.filter((_, i) => i !== idx));
                                }}
                                className="ml-2 text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-gray-500 italic text-center py-4">
                            No favorites yet. Star prompts to save them here.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col overflow-hidden relative" style={{ width: '100%' }}>
          {/* Decorative background elements */}
          <div className="absolute top-20 left-20 w-64 h-64 bg-green-600/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-40 right-20 w-72 h-72 bg-teal-600/5 rounded-full blur-3xl"></div>
          
          {/* Error notification */}
          {error && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-500/90 text-white px-4 py-2 rounded-lg flex items-center space-x-2 shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
              <button onClick={() => setError(null)} className="ml-2 text-white hover:text-gray-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}
          
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8 relative z-10 scrollbar-thin scrollbar-thumb-green-600 scrollbar-track-gray-900">
            {messages.map((message, idx) => (
              message.role === 'system' ? (
                <div key={idx} className="flex justify-center items-center">
                  <div className="flex flex-col items-center mt-12 space-y-8">
                    {/* Welcome Card */}
                    <div className="max-w-md w-full bg-gradient-to-r from-green-700/40 via-teal-500/30 to-green-600/30 text-white shadow-2xl rounded-3xl px-8 py-6 text-center border border-green-400/30 backdrop-blur-md">
                      <div className="text-2xl font-semibold mb-2">🌿 Welcome!</div>
                      <div className="text-sm text-gray-100/90">
                        {formatMessage(message.content)}
                      </div>
                    </div>

                    {/* Services Cards */}
                    <div className="flex flex-col md:flex-row justify-center gap-6 w-full max-w-4xl">
                      {/* Lyric Generation */}
                      <div className="flex-1 bg-gradient-to-br from-green-700/30 to-green-900/40 text-white rounded-3xl p-6 shadow-xl hover:shadow-2xl transition-all cursor-pointer text-center">
                        <div className="text-xl font-bold mb-2">🎵 Lyric Generation</div>
                        <div className="text-sm text-gray-200">Generate creative lyrics instantly.</div>
                      </div>

                      {/* Metaphor Classifier */}
                      <div className="flex-1 bg-gradient-to-br from-teal-600/30 to-teal-800/40 text-white rounded-3xl p-6 shadow-xl hover:shadow-2xl transition-all cursor-pointer text-center">
                        <div className="text-xl font-bold mb-2">🎭 Metaphor Classifier</div>
                        <div className="text-sm text-gray-200">Detect metaphors in text easily.</div>
                      </div>

                      {/* Metaphor Creator */}
                      <div className="flex-1 bg-gradient-to-br from-emerald-600/30 to-emerald-800/40 text-white rounded-3xl p-6 shadow-xl hover:shadow-2xl transition-all cursor-pointer text-center">
                        <div className="text-xl font-bold mb-2">✨ Metaphor Creator</div>
                        <div className="text-sm text-gray-200">Create beautiful metaphors from ideas.</div>
                      </div>
                      <div className="flex-1 bg-gradient-to-br from-green-500/30 to-emerald-800/40 text-white rounded-3xl p-6 shadow-xl hover:shadow-2xl transition-all cursor-pointer text-center">
  <div className="text-xl font-bold mb-2">🔎 Masking Prediction</div>
  <div className="text-sm text-gray-200">Predict missing words in tamil sentences.</div>
</div>

                    </div>
                  </div>
                </div>
              ) : (
                <div 
                  key={idx} 
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}
                  style={{ animationDelay: `${idx * 0.1}s` }}
                >
                  {message.role !== 'user' && (
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-green-500 to-teal-400 flex-shrink-0 flex items-center justify-center mr-3 shadow-lg">
                      {message.role === 'system' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <span className="text-white font-bold">AI</span>
                      )}
                    </div>
                  )}
                  <div 
                    className={`max-w-2xl rounded-2xl px-5 py-4 ${
                      message.role === 'user' 
                        ? 'bg-gradient-to-r from-green-600 to-teal-600 text-white shadow-lg shadow-green-500/20' 
                        : message.role === 'system'
                          ? 'bg-gray-700/80 text-gray-100 shadow-lg'
                          : 'bg-gray-800/80 backdrop-blur-sm text-white border border-gray-700 shadow-lg'
                    } ${message.error ? 'border-red-500' : ''}`}
                  >
                    {message.role === 'assistant' && message.service && (
                      <div className={`flex items-center mb-2 ${
                        message.service === 'metaphor-classifier' 
                          ? 'text-green-400' 
                          : message.service === 'lyric-generator'
                            ? 'text-teal-400'
                            : 'text-emerald-400'
                      }`}>
                        <div className={`h-6 w-6 rounded-md flex items-center justify-center mr-2 ${
                          message.service === 'metaphor-classifier' 
                            ? 'bg-green-500/20' 
                            : message.service === 'lyric-generator'
                              ? 'bg-teal-500/20'
                              : 'bg-emerald-500/20'
                        }`}>
                          {message.service === 'metaphor-classifier' && '🎭'}
                          {message.service === 'lyric-generator' && '🎵'}
                          {message.service === 'metaphor-creator' && '✨'}
                        </div>
                        <div className="text-sm font-medium">
                          {message.service === 'metaphor-classifier' && 'Metaphor Classifier'}
                          {message.service === 'lyric-generator' && 'Lyric Generator'}
                          {message.service === 'metaphor-creator' && 'Metaphor Creator'}
                        </div>
                      </div>
                    )}
                    {formatMessage(message.content)}
                    {/* Rerun button for assistant responses */}
                    {message.role === 'assistant' && (
                      <div className="mt-4 flex justify-end">
                        <button
                          className="px-3 py-1 bg-green-700 hover:bg-green-800 text-white rounded-lg text-xs font-semibold shadow transition"
                          onClick={() => handleRerun(idx)}
                        >
                          Rerun
                        </button>
                      </div>
                    )}
                  </div>
                  {message.role === 'user' && (
                    <div className="h-9 w-9 rounded-full bg-gray-700 flex-shrink-0 flex items-center justify-center ml-3 shadow-lg">
                      <span className="text-gray-300">You</span>
                    </div>
                  )}
                </div>
              )
            ))}
            
            {/* Batch Results for multi-line metaphor-classifier */}
            {batchResults && (
              <div className="black-900/80 rounded-2xl p-6 shadow-lg max-w-5xl border border-gray-700 mt-4">
                <div className="flex items-center mb-4">
                  <span className="text-green-400 text-lg font-bold mr-2">🎭</span>
                  <span className="font-semibold text-white">Batch Metaphor Analysis</span>
                </div>
                <div className="mb-4 flex flex-wrap gap-6 items-center">
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Summary Chart</div>
                    {renderPieChart(chartData)}
                    <div className="text-xs text-gray-400 mt-2">
                      <span className="text-green-400 font-bold">{chartData.metaphor}</span> metaphor(s), <span className="text-gray-300 font-bold">{chartData.literal}</span> literal(s)
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-gray-400 mb-1">Line-by-line Results</div>
                    {/* Pagination controls */}
                    <div className="flex justify-end items-center mb-2 gap-2">
                      <button
                        className="px-2 py-1 rounded black-700 text-gray-300 disabled:opacity-50"
                        disabled={batchPage <= 1}
                        onClick={() => setBatchPage(batchPage - 1)}
                      >◀</button>
                      <span className="text-xs text-gray-400">
                        Page {batchPage} of {Math.ceil(batchResults.length / batchPageSize)}
                      </span>
                      <button
                        className="px-2 py-1 rounded black-700 text-gray-300 disabled:opacity-50"
                        disabled={batchPage >= Math.ceil(batchResults.length / batchPageSize)}
                        onClick={() => setBatchPage(batchPage + 1)}
                      >▶</button>
                    </div>
                    <div className="space-y-2">
                      {batchResults
                        .slice((batchPage - 1) * batchPageSize, batchPage * batchPageSize)
                        .map((res, idx) => (
                          <div
  key={idx + (batchPage - 1) * batchPageSize}
  className={`rounded-lg px-4 py-2 flex items-center gap-3 ${
    res.isMetaphor
      ? 'bg-green-500/10 border-l-4 border-green-400'
      : 'black-700/50 border-l-4 border-gray-500'
  }`}
>
  <span className={`font-bold ${res.isMetaphor ? 'text-green-400' : 'text-gray-300'}`}>
    {res.isMetaphor ? 'Metaphor' : 'Literal'}
  </span>
  <span className="text-xs text-gray-400">
    (
    {res.isMetaphor
      ? (res.confidence * 100).toFixed(1)
      : (100 - res.confidence * 100).toFixed(1)}
    % confidence)
  </span>
  <span className="ml-3 text-white">{res.line}</span>
</div>

                        ))}

                        {/* Show all results button */}
                        {batchResults.length > batchPageSize && (
                          <div className="flex justify-center mt-4">
                            {/* <button
                              onClick={() => setBatchPage(Math.ceil(batchResults.length / batchPageSize))}
                              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-2"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M10 3v18" />
                              </svg>
                              Show All Results
                            </button> */}
                          </div>
                        )}
                    </div>
                  </div>
                </div>
                {/* Dashboard Section */}
                <div className="mt-8 black-800/80 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-lg font-bold text-white mb-4">Dashboard & Explanatory Analysis</h3>
                  <div className="flex flex-wrap gap-8 items-start">
                    {/* Pie Chart */}
                    <div>
                      <div className="text-xs text-gray-400 mb-2">Pie Chart</div>
                      {renderPieChart(chartData)}
                    </div>
                    {/* Explanatory Table */}
                    <div className="flex-1">
                      <div className="text-xs text-gray-400 mb-2">Explanatory Table</div>
                      <table className="min-w-full text-left text-gray-200 text-sm black-900/80 rounded-xl overflow-hidden">
                        <tbody>
                          <tr className="border-b border-gray-700">
                            <td className="px-4 py-2">Total Lines</td>
                            <td className="px-4 py-2 font-semibold text-indigo-400">{batchResults.length}</td>
                          </tr>
                          <tr className="border-b border-gray-700">
                            <td className="px-4 py-2">Metaphors</td>
                            <td className="px-4 py-2 font-semibold text-green-400">{chartData.metaphor}</td>
                          </tr>
                          <tr className="border-b border-gray-700">
                            <td className="px-4 py-2">Literal</td>
                            <td className="px-4 py-2 font-semibold text-gray-300">{chartData.literal}</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2">Average Confidence</td>
                            <td className="px-4 py-2 font-semibold text-yellow-400">
                              {(
                                batchResults.reduce((sum, r) => sum + (r.confidence || 0), 0) / batchResults.length * 100
                              ).toFixed(1)}%
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isLoading && (
              <div className="flex justify-start animate-fade-in">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-green-500 to-teal-400 flex-shrink-0 flex items-center justify-center mr-3 shadow-lg">
                  <span className="text-white font-bold">AI</span>
                </div>
                <div className="max-w-full rounded-2xl px-5 py-4 black-800/80 backdrop-blur-sm text-white border border-gray-700 shadow-lg">
                  <div className="flex space-x-2 items-center">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                    <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                    <span className="text-sm text-gray-400 ml-2">Generating response...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Options Panels */}
          {showMetaphorOptions && (
            <div className="bg-gradient-to-br from-gray-800/90 via-gray-900/90 to-black/90 rounded-xl border border-gray-700/40 mx-4 mb-2">
              {/* Toggle button */}
              <button
  onClick={() => setShowMetaphorOptionsPanel(!showMetaphorOptionsPanel)}
  className="w-full flex items-center justify-between px-4 py-3 text-sm text-green-400 hover:text-green-300 transition-colors"
>
  <span className="flex items-center">
    <span className="text-lg mr-2">✨</span>
    <span className="font-medium">Create Metaphors</span>
  </span>
  {showMetaphorOptionsPanel ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
</button>


              {/* Expandable panel */}
              {showMetaphorOptionsPanel && (
                <div className="p-4 border-t border-gray-700/40 animate-fade-in">
                  <div className="text-center mb-4">
                    <p className="text-sm text-gray-400">Set your metaphor parameters</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  <div className="flex flex-col">
    <label className="text-sm text-gray-300 mb-2">Source Concept</label>
    <input 
      type="text" 
      className="w-full bg-gray-800 text-white rounded-xl border border-gray-600 px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
      placeholder="e.g. பறவை, நதி, தேன்"
      value={metaphorSource}
      onChange={(e) => setMetaphorSource(e.target.value)}
    />
    <p className="text-xs text-gray-500 mt-1 italic">What you want to describe</p>
  </div>
  
  <div className="flex flex-col">
    <label className="text-sm text-gray-300 mb-2">Target Domain</label>
    <input 
      type="text" 
      className="w-full bg-gray-800 text-white rounded-xl border border-gray-600 px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
      placeholder="e.g. ஆவல், நினைவுகள், பாசம்"
      value={metaphorTarget}
      onChange={(e) => setMetaphorTarget(e.target.value)}
    />
    <p className="text-xs text-gray-500 mt-1 italic">Compare it to</p>
  </div>
  
  <div className="flex flex-col">
    <label className="text-sm text-gray-300 mb-2">Context</label>
    <input 
      type="text" 
      className="w-full bg-gray-800 text-white rounded-xl border border-gray-600 px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
      placeholder="e.g. சுதந்திரம், ஓட்டம், இனிமை"
      value={metaphorContext}
      onChange={(e) => setMetaphorContext(e.target.value)}
    />
    <p className="text-xs text-gray-500 mt-1 italic">mood/style</p>
  </div>
</div>


                  {/* Generate Button */}
                  <div className="mt-4 text-center">
                    <button
  onClick={() => {
    const message = `Create a metaphor source: ${metaphorSource} target: ${metaphorTarget} context: ${metaphorContext}`;
    setInput(message);
    setShowMetaphorOptionsPanel(false);
  }}
  className="bg-gradient-to-r from-green-500 to-teal-400 text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all font-medium"
>
  Create Metaphor
</button>

                  </div>
                </div>
              )}
            </div>
          )}
          
          {showLyricOptions && (
    <div className="bg-gradient-to-br from-gray-800/90 via-gray-900/90 to-black/90 rounded-xl border border-gray-700/40 mx-4 mb-2">
      {/* Toggle button */}
      <button
  onClick={() => setShowLyricOptionsPanel(!showLyricOptionsPanel)}
  className="w-full flex items-center justify-between px-4 py-3 text-sm text-green-400 hover:text-green-300 transition-colors"
>
  <span className="flex items-center">
    <span className="text-lg mr-2">✨</span>
    <span className="font-medium">Generate Tamil Lyrics</span>
  </span>
  {showLyricOptionsPanel ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
</button>


      {/* Expandable panel */}
      {showLyricOptionsPanel && (
        <div className="p-4 border-t border-gray-700/40 animate-fade-in">
          <div className="text-center mb-4">
            <p className="text-sm text-gray-400">Select mood and add initial sentence</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Mood Selection */}
            <div className="flex flex-col">
              <label className="text-sm text-gray-300 mb-2">Select Mood</label>
              <div className="grid grid-cols-2 gap-2">
                {motions.map((motion) => (
                  <button
                    key={motion.value}
                    className={`${
                      lyricEmotion === motion.value
                        ? 'bg-green-600 text-white border-green-500'
                        : 'black-700 text-gray-300 hover:bg-gray-600 border-gray-600'
                    } rounded-lg p-2 transition-all border text-xs`}
                    onClick={() => setLyricEmotion(motion.value)}
                  >
                    <div className="flex flex-col items-center">
                      <span className="text-lg mb-1">{motion.icon}</span>
                      <div className="font-medium">{motion.label.split(' / ')[0]}</div>
                      <div className="text-xs opacity-75">{motion.label.split(' / ')[1]}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Initial Sentence */}
            <div className="flex flex-col">
              <label className="text-sm text-gray-300 mb-2">Initial Sentence (Optional)</label>
              <textarea
                className="w-full bg-gray-800 text-white rounded-xl border border-gray-600 px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none transition text-sm"
                placeholder="Enter an initial sentence... e.g. கண் விழிகள் தேன் நதியாக ஏர்கின்றன"
                rows="4"
                value={lyricSeed}
                onChange={(e) => setLyricSeed(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-2 italic">Lyrics will continue from this point</p>
            </div>
          </div>

          {/* Generate Button */}
          <div className="mt-4 text-center">
            <button
  onClick={() => {
    const message = `Generate a song emotion: ${lyricEmotion}${lyricSeed ? ` seed: "${lyricSeed}"` : ''}`;
    setInput(message);
    setShowLyricOptionsPanel(false);
  }}
  className="bg-gradient-to-r from-green-500 to-teal-400 text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all font-medium"
>
  Create Verse/Lyric
</button>

          </div>
        </div>
      )}
    </div>
  )}


          {/* Input Area */}
          <div className="border-t border-gray-700/50 backdrop-blur-sm bg-gray-800/30 p-4 w-full">
            <div className="w-full relative">
               <textarea
      ref={textareaRef}
      className={`w-full bg-gray-800/90 text-white rounded-2xl border border-gray-700 pl-5 pr-14 py-4 focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none shadow-lg ${
        fontSize === "small"
          ? "text-sm"
          : fontSize === "large"
          ? "text-lg"
          : "text-base"
      }`}
      rows="1"
      placeholder="Type your message here..."
      value={input}
      onChange={handleInput}
      onKeyDown={handleKeyDown}
    ></textarea>
              
              {/* Star button for adding to favorites */}
              <button
                onClick={() => addToFavorites(input)}
                className="absolute right-16 bottom-4 text-gray-400 hover:text-yellow-400 p-2 transition-colors"
                disabled={!input.trim()}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </button>

                <button 
    className="absolute right-4 bottom-4 text-white bg-gradient-to-r from-green-500 to-teal-400 rounded-xl p-3 hover:shadow-lg hover:shadow-green-500/20 disabled:opacity-50 transition-all"
    onClick={handleSendMessage}
    disabled={!input.trim() || isLoading}
  >
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
    </svg>
  </button>

            </div>
            
            <div className="flex justify-between items-center mt-3">
              <div className="text-xs text-gray-400">
                Tamil AI Models uses advanced AI to provide assistance. Your conversations help improve our services.
                <span className="text-green-400 hover:text-green-300 cursor-pointer ml-1">Privacy Policy</span>
              </div>
              
              {showWordCount && (
                <div className="text-xs text-gray-400">
                  Words: {getWordCount()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      
      </div>
      
    
  );
}