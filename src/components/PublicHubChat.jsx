import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import io from 'socket.io-client';
import { 
  Send, 
  Users, 
  Smile, 
  Heart, 
  MoreVertical,
  UserCheck,
  MessageSquare,
  Clock,
  Shield,
  Zap,
  Star,
  Sparkles,
  Music,
  Volume2
} from 'lucide-react';
import { toast } from 'react-toastify';

const PublicHubChat = () => {
  const { currentUser } = useAuth();
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const chatContainerRef = useRef(null);
  const messageInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  

  // Emoji list for reactions (removed empty strings)
  const emojis = ['😀','😄','😁','😂','🤣','😊','😍','❤️','👍','👎','🎉','🔥','👏','🎵','🎶','✨','💫','🌟','🎤'];

  // Sound notification function
  const playNotificationSound = () => {
    try {
      const audio = new Audio('/sounds/message-notification-190034.mp3');
      audio.volume = 0.3;
      audio.play().catch(e => console.log('Sound play failed:', e));
    } catch (error) {
      console.log('Sound notification not available');
    }
  };

  // Initialize socket connection
  useEffect(() => {
    if (!currentUser) return;

    const SOCKET_URL = process.env.NODE_ENV === 'production' 
      ? 'https://project-community-chat-1.onrender.com' 
      : 'http://localhost:5001';

    const socketInstance = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
    });

    setSocket(socketInstance);

    // Connection events
    socketInstance.on('connect', () => {
      console.log('Connected to chat server');
      setIsConnected(true);
      
      // Join the chat with user info
      socketInstance.emit('user:join', {
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Anonymous',
        userEmail: currentUser.email,
        avatar: currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName || currentUser.email || 'User')}&background=6366f1&color=fff`
      });

      // Request message history
      socketInstance.emit('messages:history', { roomId: 'public-hub', limit: 50 });
    });

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from chat server');
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setIsConnected(false);
      toast.error('Failed to connect to chat server');
    });

    // Message events
    socketInstance.on('message:new', (message) => {
      setMessages(prev => {
        const newMessages = [...prev, message];
        return newMessages;
      });
      
      // Immediate scroll for new messages
      setTimeout(() => {
        forceScrollToBottom();
      }, 50);
      
      // Play notification sound for messages from others
      if (message.userId !== currentUser.uid) {
        playNotificationSound();
      }
    });

    socketInstance.on('messages:history', (historyMessages) => {
      setMessages(historyMessages);
      setIsLoading(false);
      // Multiple scroll attempts to ensure it works
      setTimeout(() => scrollToBottom(), 100);
      setTimeout(() => scrollToBottom(), 300);
      setTimeout(() => scrollToBottom(), 500);
    });

    socketInstance.on('message:liked', (data) => {
      setMessages(prev => prev.map(msg => 
        msg.firebaseId === data.messageId 
          ? { ...msg, likes: data.likes }
          : msg
      ));
    });

    // User events
    socketInstance.on('users:list', (users) => {
      setOnlineUsers(users);
    });

    socketInstance.on('user:joined', (userData) => {
      setOnlineUsers(prev => [...prev, userData]);
      toast.success(`${userData.userName} joined the chat`, {
        position: "bottom-right",
        autoClose: 3000,
      });
    });

    socketInstance.on('user:left', (userData) => {
      setOnlineUsers(prev => prev.filter(user => user.userId !== userData.userId));
      toast.info(`${userData.userName} left the chat`, {
        position: "bottom-right",
        autoClose: 3000,
      });
    });

    // Typing events
    socketInstance.on('typing:start', (userData) => {
      setTypingUsers(prev => {
        if (!prev.find(user => user.userId === userData.userId)) {
          return [...prev, userData];
        }
        return prev;
      });
    });

    socketInstance.on('typing:stop', (userData) => {
      setTypingUsers(prev => prev.filter(user => user.userId !== userData.userId));
    });

    // Error handling
    socketInstance.on('error', (error) => {
      console.error('Socket error:', error);
      toast.error(error.message || 'An error occurred');
    });

    return () => {
      socketInstance.disconnect();
    };
  }, [currentUser]);

  // Auto-scroll when messages change
  useEffect(() => {
    if (messages.length > 0 && !isLoading) {
      // Use a small delay to ensure DOM is updated
      const timeoutId = setTimeout(() => {
        forceScrollToBottom();
      }, 100);
      
      // Also try smooth scroll after a longer delay
      const smoothScrollId = setTimeout(() => {
        scrollToBottom();
      }, 300);
      
      return () => {
        clearTimeout(timeoutId);
        clearTimeout(smoothScrollId);
      };
    }
  }, [messages, isLoading]);

  const scrollToBottom = () => {
    // Only scroll within the chat container, never the page
    if (chatContainerRef.current) {
      const container = chatContainerRef.current;
      
      // Smooth scroll to bottom within container only
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    }
    
    // Secondary method using messagesEndRef
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest',  // Changed from 'end' to 'nearest'
        inline: 'nearest'
      });
    }
  };

  // Force scroll to bottom (for immediate scrolling within container only)
  const forceScrollToBottom = () => {
    if (chatContainerRef.current) {
      const container = chatContainerRef.current;
      // Immediate scroll without animation, only within container
      container.scrollTop = container.scrollHeight;
    }
    
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'auto', 
        block: 'nearest',  // Changed from 'end' to 'nearest'
        inline: 'nearest'
      });
    }
  };

  const sendMessage = (e) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling
    
    if (!newMessage.trim() || !socket || !isConnected) return;

    const messageContent = newMessage.trim();
    
    socket.emit('message:send', {
      content: messageContent,
      type: 'text',
      roomId: 'public-hub'
    });

    setNewMessage('');
    stopTyping();
    
    // Keep focus on input to prevent page scroll
    if (messageInputRef.current) {
      messageInputRef.current.focus();
    }
    
    // Force immediate scroll to bottom within chat container only
    setTimeout(() => {
      forceScrollToBottom();
    }, 50);
    
    // Also try smooth scroll after a delay
    setTimeout(() => {
      scrollToBottom();
    }, 200);
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);

    if (!isTyping && socket && isConnected) {
      setIsTyping(true);
      socket.emit('typing:start', { roomId: 'public-hub' });
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 1000);
  };

  const stopTyping = () => {
    if (isTyping && socket && isConnected) {
      setIsTyping(false);
      socket.emit('typing:stop', { roomId: 'public-hub' });
    }
  };

  const likeMessage = (messageId, currentLikes = []) => {
    if (!socket || !isConnected) return;

    const isLiked = currentLikes.includes(currentUser.uid);
    socket.emit('message:like', {
      messageId,
      action: isLiked ? 'unlike' : 'like'
    });
  };

  const addEmoji = (emoji) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  useEffect(() => {
    if (!showEmojiPicker) return;
    const handleClickOutside = (e) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-gradient-to-br from-gray-900/90 via-purple-900/50 to-pink-900/30 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl w-full">
        <div className="text-center p-12">
          <div className="relative mb-8">
            <div className="w-24 h-24 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full flex items-center justify-center mx-auto border border-purple-500/30 backdrop-blur-sm">
              <Shield className="h-12 w-12 text-purple-400" />
            </div>
            <div className="absolute inset-0 bg-purple-500/10 rounded-full blur-xl animate-pulse"></div>
          </div>
          <h3 className="text-2xl font-semibold text-white mb-4">Join the Conversation</h3>
          <p className="text-gray-400 mb-6 text-lg">Please log in to connect with the Tamil music community</p>
          <div className="flex items-center justify-center gap-3 text-purple-400">
            <Sparkles className="h-5 w-5" />
            <span className="text-lg">Share your musical journey</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="relative bg-gradient-to-br from-gray-900/95 via-purple-900/30 to-pink-900/20 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/10 overflow-hidden w-full"
      style={{ 
        overscrollBehavior: 'contain',
        touchAction: 'pan-y',
        contain: 'layout style paint'
      }}
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-40 h-40 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-gradient-to-r from-yellow-600/10 to-orange-600/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Chat Header */}
      <div className="relative bg-gradient-to-r from-purple-600/30 via-pink-600/20 to-purple-600/30 backdrop-blur-xl border-b border-white/10 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                <MessageSquare className="h-6 w-6 text-white" />
              </div>
              {isConnected && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full border-2 border-gray-900 flex items-center justify-center">
                  <Zap className="h-2 w-2 text-white" />
                </div>
              )}
            </div>
            <div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Tamil Music Community
              </h3>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'} animate-pulse`}></div>
                <p className="text-sm text-gray-300">
                  {isConnected ? `${onlineUsers.length} musicians online` : 'Connecting to community...'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Online users preview */}
            <div className="flex items-center gap-2">
              <div className="flex -space-x-3">
                {onlineUsers.slice(0, 4).map((user, index) => (
                  <div key={user.userId} className="relative">
                    <img
                      src={user.avatar}
                      alt={user.userName}
                      className="w-10 h-10 rounded-full border-3 border-white/20 shadow-lg hover:scale-110 transition-transform cursor-pointer"
                      title={user.userName}
                    />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full border-2 border-gray-900"></div>
                  </div>
                ))}
                {onlineUsers.length > 4 && (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 border-3 border-white/20 flex items-center justify-center shadow-lg">
                    <span className="text-xs font-bold text-white">+{onlineUsers.length - 4}</span>
                  </div>
                )}
              </div>
              {isConnected && (
                <div className="flex items-center gap-1 px-3 py-1 bg-green-500/20 rounded-full border border-green-500/30">
                  <Volume2 className="h-4 w-4 text-green-400" />
                  <span className="text-xs text-green-400 font-medium">Live</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div 
        ref={chatContainerRef}
        tabIndex={-1}  
        className="relative h-[600px] overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-transparent via-gray-900/20 to-gray-800/30 backdrop-blur-sm scroll-smooth"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#6366f1 transparent',
          scrollBehavior: 'smooth',
          containIntrinsicSize: '100%',  // Prevent layout shifts
          overscrollBehavior: 'contain'  // Prevent scroll chaining to parent
        }}
        onScroll={(e) => {
          // Prevent event bubbling to parent containers
          e.stopPropagation();
        }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 w-12 h-12 border-4 border-pink-500/20 border-b-pink-500 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <div className="p-8">
              <div className="relative mb-6">
                <div className="w-20 h-20 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full flex items-center justify-center mx-auto border border-purple-500/30 backdrop-blur-sm">
                  <Music className="h-10 w-10 text-purple-400" />
                </div>
                <div className="absolute inset-0 bg-purple-500/10 rounded-full blur-xl animate-pulse"></div>
              </div>
              <h4 className="text-lg font-semibold text-white mb-2">Start the Conversation</h4>
              <p className="text-gray-400 text-sm">Be the first to share your musical thoughts!</p>
              <div className="flex items-center justify-center gap-2 mt-4 text-sm text-purple-400">
                <Sparkles className="h-4 w-4" />
                <span>Connect with fellow Tamil music creators</span>
              </div>
            </div>
          </div>
        ) : (
          messages.map((message, index) => {
            const isOwnMessage = message.userId === currentUser.uid;
            const showAvatar = index === 0 || messages[index - 1].userId !== message.userId;
            const isConsecutive = index > 0 && messages[index - 1].userId === message.userId;
            
            return (
              <div
                key={message.id || message.firebaseId}
                className={`flex gap-4 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} group transition-all duration-300 hover:scale-[1.02]`}
              >
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {showAvatar ? (
                    <div className="relative">
                      <img
                        src={message.avatar}
                        alt={message.userName}
                        className="w-12 h-12 rounded-2xl border-2 border-white/10 shadow-lg hover:border-purple-400/50 transition-all duration-300"
                      />
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full border-2 border-gray-900"></div>
                    </div>
                  ) : (
                    <div className="w-12 h-12"></div>
                  )}
                </div>

                {/* Message Content */}
                <div className={`flex-1 max-w-lg ${isOwnMessage ? 'text-right' : 'text-left'}`}>
                  {showAvatar && (
                    <div className={`flex items-center gap-3 mb-2 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                      <span className="text-sm font-semibold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                        {message.userName}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimestamp(message.timestamp)}
                      </span>
                    </div>
                  )}
                  
                  <div
                    className={`relative group/message rounded-3xl p-4 shadow-lg backdrop-blur-sm border transition-all duration-300 hover:shadow-xl ${
                      isOwnMessage
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white border-white/10 hover:from-purple-500 hover:to-pink-500'
                        : 'bg-gradient-to-r from-gray-800/80 to-gray-700/80 text-gray-100 border-white/10 hover:from-gray-700/80 hover:to-gray-600/80'
                    } ${isConsecutive ? 'mt-1' : 'mt-0'}`}
                  >
                    <p className="text-sm leading-relaxed break-words">{message.content}</p>
                    
                    {/* Message Actions */}
                    <div className={`absolute top-2 ${isOwnMessage ? 'left-2' : 'right-2'} opacity-0 group-hover/message:opacity-100 transition-all duration-200`}>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => likeMessage(message.firebaseId, message.likes)}
                          className="p-1.5 rounded-full bg-black/20 hover:bg-black/40 transition-all duration-200 hover:scale-110"
                          title="Like message"
                        >
                          <Heart 
                            className={`h-3 w-3 transition-all duration-200 ${
                              message.likes?.includes(currentUser.uid) 
                                ? 'text-red-400 fill-current scale-110' 
                                : 'text-gray-400 hover:text-red-400'
                            }`} 
                          />
                        </button>
                      </div>
                    </div>

                    {/* Like Count */}
                    {message.likes && message.likes.length > 0 && (
                      <div className={`absolute -bottom-2 ${isOwnMessage ? 'left-3' : 'right-3'} 
                        bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full px-2 py-1 flex items-center gap-1 shadow-lg animate-pulse`}>
                        <Heart className="h-3 w-3 fill-current" />
                        <span className="font-medium">{message.likes.length}</span>
                      </div>
                    )}

                    {/* Message glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-pink-600/10 rounded-3xl opacity-0 group-hover/message:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Typing Indicators */}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-gray-800/50 to-gray-700/50 backdrop-blur-sm rounded-2xl border border-white/10 mx-4">
            <div className="flex -space-x-2">
              {typingUsers.slice(0, 3).map((user) => (
                <img
                  key={user.userId}
                  src={user.avatar}
                  alt={user.userName}
                  className="w-6 h-6 rounded-full border-2 border-white/20"
                />
              ))}
            </div>
            <div className="flex items-center gap-2 text-purple-400 text-sm">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <span className="font-medium">
                {typingUsers.length === 1 
                  ? `${typingUsers[0].userName} is typing...`
                  : `${typingUsers.length} people are typing...`
                }
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="relative border-t border-white/10 p-8 bg-gradient-to-r from-gray-800/50 via-gray-900/30 to-gray-800/50 backdrop-blur-xl">
        <form 
          onSubmit={sendMessage} 
          className="flex items-center gap-6"
          // removed overflow hidden to allow emoji picker to render outside
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage(e);
            }
          }}
        >
          {/* Emoji Picker Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-3 text-gray-400 hover:text-yellow-400 transition-all duration-300 rounded-2xl hover:bg-yellow-400/10 border border-transparent hover:border-yellow-400/30 group"
            >
              <Smile className="h-5 w-5 group-hover:scale-110 transition-transform" />
            </button>
            
            {showEmojiPicker && (
              <div
                ref={emojiPickerRef}
                className="absolute bottom-full mb-3 left-0 bg-gradient-to-br from-gray-800/95 to-gray-900/95 border border-white/20 rounded-2xl p-4 shadow-2xl z-50 backdrop-blur-xl min-w-[280px]"
              >
                <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-yellow-400" />
                  Choose an emoji
                </h4>
                <div className="grid grid-cols-8 gap-2 max-h-48 overflow-y-auto">
                  {emojis.map((emoji, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => addEmoji(emoji)}
                      className="p-2 hover:bg-white/10 rounded-xl text-xl transition-all duration-200 hover:scale-125 hover:bg-gradient-to-r hover:from-purple-500/20 hover:to-pink-500/20 flex items-center justify-center"
                      title={`Add ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(false)}
                    className="w-full text-xs text-gray-400 hover:text-white transition-colors py-1"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Message Input */}
          <div className="flex-1 relative">
            <input
              ref={messageInputRef}
              type="text"
              value={newMessage}
              onChange={handleTyping}
              onBlur={stopTyping}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(e);
                }
              }}
              placeholder={isConnected ? "Share your musical thoughts..." : "Connecting..."}
              disabled={!isConnected}
              className="w-full bg-gradient-to-r from-gray-700/50 to-gray-800/50 border border-white/20 rounded-2xl px-6 py-5 pr-20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 backdrop-blur-sm transition-all duration-300 text-base"
              maxLength={500}
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-300 bg-gray-900/70 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-sm shadow-lg">
              <span className={`font-medium ${newMessage.length > 450 ? 'text-yellow-400' : newMessage.length > 480 ? 'text-orange-400' : 'text-gray-300'}`}>
                {newMessage.length}
              </span>
              <span className="text-gray-400">/500</span>
            </div>
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!newMessage.trim() || !isConnected}
            className="group relative p-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/25 disabled:hover:scale-100 disabled:hover:shadow-none"
          >
            <Send className="h-5 w-5 group-hover:rotate-12 transition-transform duration-300" />
            <div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </button>
        </form>

        {/* Connection Status */}
        {!isConnected && (
          <div className="flex items-center justify-center mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-2xl backdrop-blur-sm">
            <div className="flex items-center gap-2 text-sm text-red-400">
              <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
              <Clock className="h-4 w-4" />
              <span className="font-medium">Reconnecting to the community...</span>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Users className="h-3 w-3" />
            <span>{onlineUsers.length} online musicians</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Star className="h-3 w-3 text-yellow-400" />
              <span>Tamil Music Hub</span>
            </div>
            {isConnected && (
              <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded-full border border-green-500/30">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-400 font-medium">Connected</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicHubChat;