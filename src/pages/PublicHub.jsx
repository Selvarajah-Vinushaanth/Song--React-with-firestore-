import React, { useState, useEffect } from 'react';
import { collection, getDocs, orderBy, query, where, limit, startAfter, doc, updateDoc, increment } from 'firebase/firestore';
import { db, useAuth } from '../context/AuthContext';
import { Heart, MessageCircle, Search, Filter, User, Calendar, Tag, Eye, X, Share2, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'react-toastify';
import Header from '../components/Header';

// Add CSS animations
const styles = `
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes slideInFromLeft {
    from {
      opacity: 0;
      transform: translateX(-30px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  @keyframes glow {
    0%, 100% {
      box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
    }
    50% {
      box-shadow: 0 0 30px rgba(59, 130, 246, 0.6);
    }
  }
  
  @keyframes pulse {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.05);
    }
  }
  
  @keyframes countUp {
    from {
      transform: translateY(10px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.6s ease-out forwards;
  }
  
  .animate-slideInLeft {
    animation: slideInFromLeft 0.5s ease-out forwards;
  }
  
  .content-grid {
    opacity: 1;
    transition: opacity 0.3s ease-in-out;
  }
  
  .content-grid.loading {
    opacity: 0.5;
  }
  
  .enhanced-card {
    position: relative;
    background: linear-gradient(145deg, rgba(30, 41, 59, 0.8), rgba(51, 65, 85, 0.6));
    backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    overflow: hidden;
  }
  
  .enhanced-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(45deg, transparent, rgba(59, 130, 246, 0.1), transparent);
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
  }
  
  .enhanced-card:hover {
    transform: translateY(-8px) scale(1.02);
    border-color: rgba(59, 130, 246, 0.4);
    box-shadow: 
      0 20px 40px rgba(0, 0, 0, 0.3),
      0 0 30px rgba(59, 130, 246, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }
  
  .enhanced-card:hover::before {
    opacity: 1;
  }
  
  .enhanced-card:hover .card-content {
    transform: translateZ(20px);
  }
  
  .card-content {
    position: relative;
    z-index: 2;
    transition: transform 0.3s ease;
  }
  
  .service-badge {
    position: relative;
    overflow: hidden;
    background: linear-gradient(45deg, rgba(59, 130, 246, 0.2), rgba(147, 51, 234, 0.2));
    backdrop-filter: blur(8px);
    border: 1px solid rgba(59, 130, 246, 0.3);
    transition: all 0.3s ease;
  }
  
  .service-badge::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s ease;
  }
  
  .service-badge:hover::before {
    left: 100%;
  }
  
  .like-button {
    position: relative;
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }
  
  .like-button:hover {
    transform: scale(1.1);
  }
  
  .like-button.liked {
    animation: pulse 0.6s ease-in-out;
  }
  
  .stats-counter {
    animation: countUp 0.5s ease-out forwards;
  }
  
  .search-input {
    background: linear-gradient(145deg, rgba(30, 41, 59, 0.8), rgba(51, 65, 85, 0.6));
    backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: all 0.3s ease;
  }
  
  .search-input:focus {
    border-color: rgba(59, 130, 246, 0.5);
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.2);
  }
  
  .filter-chip {
    background: linear-gradient(45deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1));
    border: 1px solid rgba(59, 130, 246, 0.3);
    transition: all 0.3s ease;
    cursor: pointer;
  }
  
  .filter-chip:hover {
    background: linear-gradient(45deg, rgba(59, 130, 246, 0.2), rgba(147, 51, 234, 0.2));
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(59, 130, 246, 0.3);
  }
  
  .content-skeleton {
    background: linear-gradient(90deg, rgba(255, 255, 255, 0.1) 25%, rgba(255, 255, 255, 0.2) 50%, rgba(255, 255, 255, 0.1) 75%);
    background-size: 200% 100%;
    animation: loading 2s infinite;
  }
  
  @keyframes loading {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.type = 'text/css';
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
}

const PublicHub = () => {
  const { currentUser } = useAuth();
  const [publicContent, setPublicContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [contentUpdating, setContentUpdating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedService, setSelectedService] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [likedItems, setLikedItems] = useState(new Set());
  const [selectedContent, setSelectedContent] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const services = [
    { value: 'all', label: 'All Services', color: 'gray' },
    { value: 'lyric-generator', label: 'Lyric Generator', color: 'blue' },
    { value: 'metaphor-creator', label: 'Metaphor Creator', color: 'pink' },
    { value: 'metaphor-classifier', label: 'Metaphor Classifier', color: 'green' },
    { value: 'masking-predict', label: 'Masking Predict', color: 'purple' }
  ];

  // Load user's liked items when component mounts
  useEffect(() => {
    const loadUserLikes = async () => {
      if (!currentUser) return;
      
      try {
        // Get user's liked items from localStorage or implement a separate likes collection
        const userLikes = localStorage.getItem(`userLikes_${currentUser.uid}`);
        if (userLikes) {
          setLikedItems(new Set(JSON.parse(userLikes)));
        }
      } catch (error) {
        console.error('Error loading user likes:', error);
      }
    };
    
    loadUserLikes();
  }, [currentUser]);

  const sortOptions = [
    { value: 'recent', label: 'Most Recent' },
    { value: 'popular', label: 'Most Popular' },
    { value: 'liked', label: 'Most Liked' }
  ];

  const fetchPublicContent = async () => {
    try {
      console.log('Fetching content with service filter:', selectedService, 'search:', searchTerm);
      
      // Check cache first for faster loading - include search term in cache key
      const searchKey = searchTerm ? `_search_${searchTerm.toLowerCase().replace(/\s+/g, '_')}` : '';
      const cacheKey = `publicHub_${selectedService}_${sortBy}${searchKey}`;
      const cachedData = localStorage.getItem(cacheKey);
      const cacheTime = localStorage.getItem(`${cacheKey}_time`);
      const now = Date.now();
      
      // Use cache if less than 2 minutes old and set loading to false immediately
      if (cachedData && cacheTime && (now - parseInt(cacheTime)) < 120000) {
        const cached = JSON.parse(cachedData);
        setPublicContent(cached);
        setTotalPages(Math.ceil(cached.length / 12));
        setLoading(false);
        console.log('Using cached data:', cached.length, 'items');
        return; // Exit early, don't fetch fresh data if cache is recent
      }
      
      // Only show loading if we don't have cached data
      if (!cachedData) {
        setLoading(true);
      } else {
        setContentUpdating(true);
      }
      
      // First get all content without service filter
      let q = collection(db, 'publicHub');

      // Apply sorting
      switch (sortBy) {
        case 'popular':
          q = query(q, orderBy('views', 'desc'));
          break;
        case 'liked':
          q = query(q, orderBy('likes', 'desc'));
          break;
        default:
          q = query(q, orderBy('createdAt', 'desc'));
      }

      const querySnapshot = await getDocs(q);
      let allContent = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        allContent.push({ id: doc.id, ...data });
      });

      console.log('All fetched content:', allContent.length, allContent.map(c => ({id: c.id, service: c.service})));

      // Apply service filter in JavaScript
      let serviceFilteredContent = allContent;
      if (selectedService !== 'all') {
        serviceFilteredContent = allContent.filter(content => content.service === selectedService);
        console.log(`Filtered to ${selectedService}:`, serviceFilteredContent.length, serviceFilteredContent.map(c => ({id: c.id, service: c.service})));
      }

      // Apply search filter
      let filteredContent = serviceFilteredContent;
      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        console.log('Applying search filter for:', searchTerm);
        console.log('Before search filter:', serviceFilteredContent.length, 'items');
        
        filteredContent = serviceFilteredContent.filter(data => {
          const matchesTitle = data.title?.toLowerCase().includes(searchLower);
          const matchesContent = data.content?.toLowerCase().includes(searchLower);
          const matchesUser = data.userName?.toLowerCase().includes(searchLower);
          const matchesTags = data.tags?.some(tag => tag.toLowerCase().includes(searchLower));
          
          return matchesTitle || matchesContent || matchesUser || matchesTags;
        });
        
        console.log('After search filter:', filteredContent.length, 'items matching:', searchTerm);
      }

      console.log('Final filtered content:', filteredContent.length);
      
      // Only update content if it's different from current content to prevent glitches
      if (JSON.stringify(filteredContent) !== JSON.stringify(publicContent)) {
        setPublicContent(filteredContent);
        setTotalPages(Math.ceil(filteredContent.length / 12));
      }
      
      // Cache the results
      localStorage.setItem(cacheKey, JSON.stringify(filteredContent));
      localStorage.setItem(`${cacheKey}_time`, now.toString());
      
    } catch (error) {
      console.error('Error fetching public content:', error);
      toast.error('Failed to load public content');
    } finally {
      setLoading(false);
      setContentUpdating(false);
    }
  };

  useEffect(() => {
    fetchPublicContent();
  }, [selectedService, sortBy]);

  // Debounced search effect
  useEffect(() => {
    const delaySearch = setTimeout(() => {
      setCurrentPage(1); // Reset to first page when searching
      fetchPublicContent();
    }, searchTerm ? 500 : 0); // Only delay if there's a search term
    
    return () => clearTimeout(delaySearch);
  }, [searchTerm]);

  // Remove the separate searchTerm useEffect since it's now handled above

  const handleLike = async (contentId) => {
    if (!currentUser) {
      toast.error('Please login to like content');
      return;
    }

    // Check if already liked
    if (likedItems.has(contentId)) {
      toast.info('You have already liked this content!');
      return;
    }

    try {
      const contentRef = doc(db, 'publicHub', contentId);
      
      // Optimistically update UI first
      setPublicContent(prev => prev.map(content => 
        content.id === contentId 
          ? { 
              ...content, 
              likes: (content.likes || 0) + 1
            }
          : content
      ));

      // Like - increment likes
      await updateDoc(contentRef, {
        likes: increment(1)
      });
      
      // Update liked items state and save to localStorage
      const newLikedItems = new Set(likedItems).add(contentId);
      setLikedItems(newLikedItems);
      
      // Save to localStorage for persistence
      localStorage.setItem(`userLikes_${currentUser.uid}`, JSON.stringify([...newLikedItems]));
      
      toast.success('Liked!');
    } catch (error) {
      console.error('Error updating like:', error);
      toast.error('Failed to update like');
      // Revert optimistic update on error
      fetchPublicContent();
    }
  };

  const handleView = async (contentId) => {
    if (!currentUser) return;
    
    try {
      const contentRef = doc(db, 'publicHub', contentId);
      await updateDoc(contentRef, {
        views: increment(1)
      });
      
      // Find and set the selected content for modal
      const content = publicContent.find(item => item.id === contentId);
      if (content) {
        setSelectedContent({
          ...content,
          views: (content.views || 0) + 1
        });
        setModalOpen(true);
      }
    } catch (error) {
      console.error('Error updating view count:', error);
    }
  };

  const handleShare = async (content) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: content.title || 'Amazing AI Content',
          text: content.content,
          url: window.location.href
        });
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(content.content);
        toast.success('Content copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      toast.error('Failed to share content');
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      toast.success('Copied to clipboard!');
      
      // Reset the copy success state after 2 seconds
      setTimeout(() => {
        setCopySuccess(false);
      }, 2000);
    } catch (error) {
      console.error('Error copying:', error);
      toast.error('Failed to copy');
    }
  };



  const getServiceColor = (service) => {
    const serviceInfo = services.find(s => s.value === service);
    return serviceInfo ? serviceInfo.color : 'gray';
  };

  const getServiceLabel = (service) => {
    const serviceInfo = services.find(s => s.value === service);
    return serviceInfo ? serviceInfo.label : service;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black flex flex-col relative overflow-hidden">
        {/* Grid pattern background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        
        {/* Enhanced background decorative elements */}
        <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-r from-violet-600/20 to-purple-600/20 rounded-full blur-3xl animate-pulse opacity-70"></div>
        <div
          className="absolute bottom-40 right-20 w-80 h-80 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 rounded-full blur-3xl animate-pulse opacity-70"
          style={{ animationDelay: "2s" }}
        ></div>
        <div
          className="absolute top-60 right-40 w-64 h-64 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-full blur-3xl animate-pulse opacity-70"
          style={{ animationDelay: "1s" }}
        ></div>

        {/* Header */}
        <Header />
        
        <div className="flex-1 p-4 relative z-10">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-white mb-2">Public Hub</h1>
              <p className="text-gray-300">Discover and share amazing AI-generated content from our community</p>
            </div>
            
            {/* Loading state in content area only */}
            <div className="text-center py-20">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-white mt-4">Loading public content...</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="relative text-center py-16 text-gray-400 border-t border-gray-800/50 mt-auto backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
          <div className="relative z-10">
            <p className="mb-6 text-lg font-medium">
              <span className="text-white">Tamil AI Models</span> &copy; 2025 | Created by
              <span className="text-violet-400 font-semibold"> Group-23</span>
            </p>
            <div className="flex justify-center space-x-8 mt-8">
              {[
                {
                  icon: "M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z",
                  color: "hover:text-violet-400",
                  label: "GitHub",
                },
                {
                  icon: "M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84",
                  color: "hover:text-emerald-400",
                  label: "Twitter",
                },
                {
                  icon: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z",
                  color: "hover:text-pink-400",
                  label: "Instagram",
                },
              ].map((social, idx) => (
                <a
                  key={idx}
                  href="#"
                  className={`group text-gray-500 ${social.color} transition-all duration-300 transform hover:scale-110`}
                >
                  <span className="sr-only">{social.label}</span>
                  <div className="relative">
                    <div className="absolute inset-0 bg-current opacity-20 rounded-full blur-lg scale-150 group-hover:opacity-40 transition-opacity duration-300"></div>
                    <svg className="relative h-7 w-7" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" d={social.icon} clipRule="evenodd" />
                    </svg>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <>
      {/* Content Preview Modal */}
      {modalOpen && selectedContent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-white/10 shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-white/10 p-6 rounded-t-2xl backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="service-badge px-4 py-2 rounded-full text-sm font-semibold">
                    <span className={`text-${getServiceColor(selectedContent.service)}-300`}>
                      {getServiceLabel(selectedContent.service)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 text-gray-400 text-sm">
                    <div className="flex items-center space-x-1">
                      <Eye className="w-4 h-4" />
                      <span>{selectedContent.views || 0}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Heart className="w-4 h-4" />
                      <span>{selectedContent.likes || 0}</span>
                    </div>
                    <div className="text-gray-500">
                      {selectedContent.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-gray-400 hover:text-white" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-8">
              {/* Title */}
              {selectedContent.title && (
                <h2 className="text-3xl font-bold text-white mb-6 leading-tight">
                  {selectedContent.title}
                </h2>
              )}

              {/* Content */}
              <div className="bg-slate-900/50 rounded-xl p-6 mb-6 border border-white/10">
                <div className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {selectedContent.content}
                </div>
              </div>

              {/* Tags */}
              {selectedContent.tags && selectedContent.tags.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-400 mb-3">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedContent.tags.map((tag, index) => (
                      <span 
                        key={index} 
                        className="px-3 py-1 bg-gradient-to-r from-slate-700/50 to-slate-600/50 text-gray-300 text-sm rounded-full flex items-center border border-slate-600/50"
                      >
                        <Tag className="w-3 h-3 mr-2" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Author Info */}
              <div className="flex items-center justify-between pt-6 border-t border-white/10">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-white font-medium">
                      {selectedContent.userName || 'Anonymous'}
                    </h4>
                    <p className="text-gray-400 text-sm">Content Creator</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => copyToClipboard(selectedContent.content)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all transform hover:scale-105 ${
                      copySuccess 
                        ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white' 
                        : 'bg-gradient-to-r from-slate-700 to-slate-600 hover:from-blue-600 hover:to-purple-600 text-white'
                    }`}
                  >
                    {copySuccess ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleShare(selectedContent)}
                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl transition-all transform hover:scale-105"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Share</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLike(selectedContent.id);
                    }}
                    className={`like-button flex items-center space-x-2 px-4 py-2 rounded-xl transition-all font-medium ${
                      likedItems.has(selectedContent.id) 
                        ? 'bg-gradient-to-r from-red-500/20 to-pink-500/20 text-red-400 border border-red-500/40' 
                        : 'bg-gradient-to-r from-slate-700 to-slate-600 text-gray-400 hover:from-red-500/20 hover:to-pink-500/20 hover:text-red-400 border border-slate-600'
                    } ${likedItems.has(selectedContent.id) ? 'liked' : ''}`}
                    disabled={likedItems.has(selectedContent.id)}
                  >
                    <Heart 
                      className={`w-4 h-4 transition-transform ${likedItems.has(selectedContent.id) ? 'fill-current' : ''}`} 
                    />
                    <span>{selectedContent.likes || 0}</span>
                    {likedItems.has(selectedContent.id) && <span className="text-xs">Liked</span>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black flex flex-col relative overflow-hidden">
      {/* Grid pattern background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      
      {/* Enhanced background decorative elements */}
      <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-r from-violet-600/20 to-purple-600/20 rounded-full blur-3xl animate-pulse opacity-70"></div>
      <div
        className="absolute bottom-40 right-20 w-80 h-80 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 rounded-full blur-3xl animate-pulse opacity-70"
        style={{ animationDelay: "2s" }}
      ></div>
      <div
        className="absolute top-60 right-40 w-64 h-64 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-full blur-3xl animate-pulse opacity-70"
        style={{ animationDelay: "1s" }}
      ></div>

      {/* Header */}
      <Header />
      
      <div className="flex-1 p-4 relative z-10">
        <div className="max-w-8xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Public Hub</h1>
            <p className="text-gray-300">Discover and share amazing AI-generated content from our community</p>
          </div>

        {/* Enhanced Search and Filters */}
        <div className="bg-gradient-to-r from-slate-800/80 via-slate-700/80 to-slate-800/80 backdrop-blur-xl rounded-2xl p-8 mb-8 border border-white/10 shadow-2xl animate-slideInLeft">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
            {/* Search Section */}
            <div className="lg:col-span-5">
              <label className="block text-sm font-medium text-gray-300 mb-2">Search Content</label>
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 transition-colors group-hover:text-blue-400" />
                <input
                  type="text"
                  placeholder="Search by title, content, user, or tags..."
                  value={searchTerm}
                  onChange={(e) => {
                    console.log('Search input changed:', e.target.value);
                    setSearchTerm(e.target.value);
                  }}
                  className="w-full pl-12 pr-4 py-3 search-input rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Service Filter Section */}
            <div className="lg:col-span-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">Filter by Service</label>
              <div className="relative group">
                <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 transition-colors group-hover:text-blue-400" />
                <select
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 search-input rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none cursor-pointer"
                >
                  {services.map(service => (
                    <option key={service.value} value={service.value} className="bg-slate-800 text-white">
                      {service.label}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Sort Section */}
            <div className="lg:col-span-3">
              <label className="block text-sm font-medium text-gray-300 mb-2">Sort by</label>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-4 py-3 search-input rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none cursor-pointer"
                >
                  {sortOptions.map(option => (
                    <option key={option.value} value={option.value} className="bg-slate-800 text-white">
                      {option.label}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Filter Chips */}
          <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-white/10">
            <span className="text-sm font-medium text-gray-300">Quick Filters:</span>
            {['Popular', 'Recent', 'Most Liked'].map((filter) => (
              <button
                key={filter}
                onClick={() => {
                  if (filter === 'Popular') setSortBy('popular');
                  else if (filter === 'Recent') setSortBy('recent');
                  else if (filter === 'Most Liked') setSortBy('liked');
                }}
                className="filter-chip px-4 py-2 rounded-full text-sm font-medium text-gray-300 hover:text-white transition-all"
              >
                {filter}
              </button>
            ))}
          </div>

          {/* Stats Bar */}
          <div className="flex justify-between items-center mt-6 pt-6 border-t border-white/10">
            <div className="text-sm text-gray-400">
              Showing <span className="text-blue-400 font-semibold stats-counter">{publicContent.length}</span> content items
              {searchTerm && (
                <span> matching "<span className="text-white font-medium">{searchTerm}</span>"</span>
              )}
              {/* Debug info */}
              <div className="text-xs text-gray-500 mt-1">
                Current page: {currentPage}, Search: "{searchTerm}", Service: {selectedService}
              </div>
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-400">
              <span className="flex items-center">
                <Eye className="w-4 h-4 mr-1" />
                {publicContent.reduce((total, item) => total + (item.views || 0), 0)} total views
              </span>
              <span className="flex items-center">
                <Heart className="w-4 h-4 mr-1" />
                {publicContent.reduce((total, item) => total + (item.likes || 0), 0)} total likes
              </span>
            </div>
          </div>
        </div>

        {/* Enhanced Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 transition-all duration-300 ease-in-out relative">
          {/* Loading overlay for content updates */}
          {contentUpdating && (
            <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl">
              <div className="flex flex-col items-center space-y-3">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
                <p className="text-white text-sm">Updating content...</p>
              </div>
            </div>
          )}
          
          {publicContent
            .slice((currentPage - 1) * 12, currentPage * 12)
            .map((content, index) => (
            <div 
              key={content.id} 
              className="enhanced-card rounded-2xl p-6 cursor-pointer group"
              onClick={() => handleView(content.id)}
              style={{ 
                animationDelay: `${index * 100}ms`,
                animation: `fadeIn 0.8s ease-out ${index * 100}ms both`
              }}
            >
              <div className="card-content">
                {/* Enhanced Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="service-badge px-4 py-2 rounded-full text-sm font-semibold">
                    <span className={`text-${getServiceColor(content.service)}-300`}>
                      {getServiceLabel(content.service)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2 text-gray-400 text-sm group-hover:text-gray-300 transition-colors">
                      <Eye className="w-4 h-4" />
                      <span className="stats-counter font-medium">{content.views || 0}</span>
                    </div>
                    <div className="w-2 h-2 bg-gray-600 rounded-full opacity-50"></div>
                    <div className="text-gray-400 text-sm group-hover:text-gray-300 transition-colors">
                      {content.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently'}
                    </div>
                  </div>
                </div>

                {/* Enhanced Title */}
                {content.title && (
                  <h3 className="text-xl font-bold text-white mb-4 line-clamp-2 group-hover:text-blue-100 transition-colors leading-tight">
                    {content.title}
                  </h3>
                )}

                {/* Enhanced Content Preview */}
                <div className="text-gray-300 text-sm mb-6 line-clamp-4 leading-relaxed group-hover:text-gray-200 transition-colors">
                  {content.content}
                </div>

                {/* Enhanced Tags */}
                {content.tags && content.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {content.tags.slice(0, 3).map((tag, tagIndex) => (
                      <span 
                        key={tagIndex} 
                        className="px-3 py-1 bg-gradient-to-r from-slate-700/50 to-slate-600/50 text-gray-300 text-xs rounded-full flex items-center border border-slate-600/50 hover:border-blue-500/50 transition-all group-hover:text-white"
                        style={{ animationDelay: `${(index * 100) + (tagIndex * 50)}ms` }}
                      >
                        <Tag className="w-3 h-3 mr-1" />
                        {tag}
                      </span>
                    ))}
                    {content.tags.length > 3 && (
                      <span className="px-3 py-1 bg-gradient-to-r from-slate-700/50 to-slate-600/50 text-gray-300 text-xs rounded-full border border-slate-600/50">
                        +{content.tags.length - 3} more
                      </span>
                    )}
                  </div>
                )}

                {/* Enhanced Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  {/* Enhanced User Info */}
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-gray-300 text-sm font-medium group-hover:text-white transition-colors">
                        {content.userName || 'Anonymous'}
                      </span>
                      <span className="text-gray-500 text-xs">
                        Content Creator
                      </span>
                    </div>
                  </div>

                  {/* Enhanced Actions */}
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLike(content.id);
                      }}
                      className={`like-button flex items-center space-x-2 px-4 py-2 rounded-full transition-all font-medium text-sm ${
                        likedItems.has(content.id) 
                          ? 'bg-gradient-to-r from-red-500/20 to-pink-500/20 text-red-400 border border-red-500/40 shadow-lg shadow-red-500/20' 
                          : 'bg-gradient-to-r from-slate-700/50 to-slate-600/50 text-gray-400 hover:from-red-500/20 hover:to-pink-500/20 hover:text-red-400 border border-slate-600/50 hover:border-red-500/40 hover:shadow-lg hover:shadow-red-500/20'
                      } ${likedItems.has(content.id) ? 'liked' : ''}`}
                      disabled={likedItems.has(content.id)}
                    >
                      <Heart 
                        className={`w-4 h-4 transition-transform ${likedItems.has(content.id) ? 'fill-current scale-110' : 'hover:scale-110'}`} 
                      />
                      <span className="stats-counter">{content.likes || 0}</span>
                      {likedItems.has(content.id) && (
                        <span className="text-xs bg-red-500/20 px-2 py-0.5 rounded-full">Liked</span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Interaction Indicator */}
                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center border border-blue-500/30">
                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Enhanced Empty State */}
        {publicContent.length === 0 && !loading && (
          <div className="text-center py-20">
            <div className="max-w-md mx-auto">
              <div className="relative mb-8">
                <div className="w-24 h-24 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center mx-auto border border-blue-500/30 backdrop-blur-sm">
                  <MessageCircle className="w-12 h-12 text-blue-400" />
                </div>
                <div className="absolute inset-0 bg-blue-500/10 rounded-full blur-xl animate-pulse"></div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">No Content Found</h3>
              <p className="text-gray-400 mb-8 leading-relaxed">
                {searchTerm ? (
                  <>No content matches your search "<span className="text-white font-medium">{searchTerm}</span>". Try different keywords or browse all content.</>
                ) : (
                  "Be the first to share your amazing AI-generated content with the community!"
                )}
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-medium transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  Clear Search
                </button>
              )}
            </div>
          </div>
        )}

        {/* Enhanced Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center mt-12 space-x-2">
            {/* Previous Button */}
            <button
              onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className={`px-4 py-2 rounded-xl transition-all font-medium ${
                currentPage === 1
                  ? 'bg-slate-700/50 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-slate-700 to-slate-600 text-white hover:from-blue-600 hover:to-purple-600 transform hover:scale-105 shadow-lg hover:shadow-xl'
              }`}
            >
              Previous
            </button>

            {/* Page Numbers */}
            <div className="flex space-x-2">
              {[...Array(Math.min(totalPages, 5))].map((_, index) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = index + 1;
                } else if (currentPage <= 3) {
                  pageNum = index + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + index;
                } else {
                  pageNum = currentPage - 2 + index;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-12 h-12 rounded-xl transition-all font-medium transform hover:scale-105 ${
                      currentPage === pageNum
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30'
                        : 'bg-gradient-to-r from-slate-700 to-slate-600 text-gray-300 hover:from-slate-600 hover:to-slate-500 hover:text-white shadow-lg hover:shadow-xl'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            {/* Next Button */}
            <button
              onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`px-4 py-2 rounded-xl transition-all font-medium ${
                currentPage === totalPages
                  ? 'bg-slate-700/50 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-slate-700 to-slate-600 text-white hover:from-blue-600 hover:to-purple-600 transform hover:scale-105 shadow-lg hover:shadow-xl'
              }`}
            >
              Next
            </button>

            {/* Page Info */}
            <div className="ml-6 text-sm text-gray-400">
              Page <span className="text-white font-medium">{currentPage}</span> of <span className="text-white font-medium">{totalPages}</span>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Footer */}
      <footer className="relative text-center py-16 text-gray-400 border-t border-gray-800/50 mt-auto backdrop-blur-sm">
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
        <div className="relative z-10">
          <p className="mb-6 text-lg font-medium">
            <span className="text-white">Tamil AI Models</span> &copy; 2025 | Created by
            <span className="text-violet-400 font-semibold"> Group-23</span>
          </p>
          <div className="flex justify-center space-x-8 mt-8">
            {[
              {
                icon: "M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z",
                color: "hover:text-violet-400",
                label: "GitHub",
              },
              {
                icon: "M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84",
                color: "hover:text-emerald-400",
                label: "Twitter",
              },
              {
                icon: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z",
                color: "hover:text-pink-400",
                label: "Instagram",
              },
            ].map((social, idx) => (
              <a
                key={idx}
                href="#"
                className={`group text-gray-500 ${social.color} transition-all duration-300 transform hover:scale-110`}
              >
                <span className="sr-only">{social.label}</span>
                <div className="relative">
                  <div className="absolute inset-0 bg-current opacity-20 rounded-full blur-lg scale-150 group-hover:opacity-40 transition-opacity duration-300"></div>
                  <svg className="relative h-7 w-7" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d={social.icon} clipRule="evenodd" />
                  </svg>
                </div>
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
    </>
  );
};

export default PublicHub;