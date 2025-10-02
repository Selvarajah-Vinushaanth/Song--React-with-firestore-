import React, { useState, useEffect } from 'react';
import { collection, getDocs, orderBy, query, where, limit, startAfter, doc, updateDoc, increment } from 'firebase/firestore';
import { db, useAuth } from '../context/AuthContext';
import { Heart, MessageCircle, Search, Filter, User, Calendar, Tag, Eye } from 'lucide-react';
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
  
  .animate-fadeIn {
    animation: fadeIn 0.6s ease-out forwards;
  }
  
  .content-grid {
    opacity: 1;
    transition: opacity 0.3s ease-in-out;
  }
  
  .content-grid.loading {
    opacity: 0.5;
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
      console.log('Fetching content with service filter:', selectedService);
      
      // Check cache first for faster loading
      const cacheKey = `publicHub_${selectedService}_${sortBy}`;
      const cachedData = localStorage.getItem(cacheKey);
      const cacheTime = localStorage.getItem(`${cacheKey}_time`);
      const now = Date.now();
      
      // Use cache if less than 2 minutes old and set loading to false immediately
      if (cachedData && cacheTime && (now - parseInt(cacheTime)) < 120000) {
        const cached = JSON.parse(cachedData);
        setPublicContent(cached);
        setTotalPages(Math.ceil(cached.length / 10));
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
        filteredContent = serviceFilteredContent.filter(data => 
          data.title?.toLowerCase().includes(searchLower) ||
          data.content?.toLowerCase().includes(searchLower) ||
          data.userName?.toLowerCase().includes(searchLower) ||
          data.tags?.some(tag => tag.toLowerCase().includes(searchLower))
        );
      }

      console.log('Final filtered content:', filteredContent.length);
      
      // Only update content if it's different from current content to prevent glitches
      if (JSON.stringify(filteredContent) !== JSON.stringify(publicContent)) {
        setPublicContent(filteredContent);
        setTotalPages(Math.ceil(filteredContent.length / 10));
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

  useEffect(() => {
    if (searchTerm) {
      const delaySearch = setTimeout(() => {
        fetchPublicContent();
      }, 500);
      return () => clearTimeout(delaySearch);
    } else {
      fetchPublicContent();
    }
  }, [searchTerm]);

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
    } catch (error) {
      console.error('Error updating view count:', error);
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

        {/* Search and Filters */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 mb-8 border border-white/20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Service Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
              >
                {services.map(service => (
                  <option key={service.value} value={service.value} className="bg-gray-800">
                    {service.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value} className="bg-gray-800">
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-all duration-300 ease-in-out relative">
          {/* Loading overlay for content updates */}
          {contentUpdating && (
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          )}
          
          {publicContent
            .slice((currentPage - 1) * 10, currentPage * 10)
            .map((content) => (
            <div 
              key={content.id} 
              className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 cursor-pointer transform opacity-100 animate-fadeIn"
              onClick={() => handleView(content.id)}
              style={{ animationDelay: `${publicContent.indexOf(content) * 50}ms` }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-medium bg-${getServiceColor(content.service)}-500/20 text-${getServiceColor(content.service)}-300 border border-${getServiceColor(content.service)}-500/30`}>
                  {getServiceLabel(content.service)}
                </span>
                <div className="flex items-center space-x-2 text-gray-400 text-sm">
                  <Eye className="w-4 h-4" />
                  <span>{content.views || 0}</span>
                </div>
              </div>

              {/* Title */}
              {content.title && (
                <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
                  {content.title}
                </h3>
              )}

              {/* Content Preview */}
              <div className="text-gray-300 text-sm mb-4 line-clamp-4">
                {content.content}
              </div>

              {/* Tags */}
              {content.tags && content.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {content.tags.slice(0, 3).map((tag, index) => (
                    <span key={index} className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded-full flex items-center">
                      <Tag className="w-3 h-3 mr-1" />
                      {tag}
                    </span>
                  ))}
                  {content.tags.length > 3 && (
                    <span className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded-full">
                      +{content.tags.length - 3} more
                    </span>
                  )}
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                {/* User Info */}
                <div className="flex items-center space-x-2 text-gray-400 text-sm">
                  <User className="w-4 h-4" />
                  <span>{content.userName || 'Anonymous'}</span>
                  <Calendar className="w-4 h-4 ml-2" />
                  <span>{content.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently'}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLike(content.id);
                    }}
                    className={`flex items-center space-x-2 px-3 py-1 rounded-full transition-all ${
                      likedItems.has(content.id) 
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                        : 'bg-gray-700/50 text-gray-400 hover:bg-red-500/20 hover:text-red-400 border border-gray-600'
                    }`}
                    disabled={likedItems.has(content.id)}
                  >
                    <Heart 
                      className={`w-4 h-4 ${likedItems.has(content.id) ? 'fill-current' : ''}`} 
                    />
                    <span className="text-sm font-medium">{content.likes || 0}</span>
                    {likedItems.has(content.id) && (
                      <span className="text-xs">Liked</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {publicContent.length === 0 && !loading && (
          <div className="text-center py-20">
            <div className="text-gray-400 mb-4">
              <MessageCircle className="w-16 h-16 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No public content found</h3>
              <p>Be the first to share your amazing AI-generated content!</p>
            </div>
          </div>
        )}

        {/* Pagination (if needed) */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-8 space-x-2">
            {[...Array(totalPages)].map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentPage(index + 1)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  currentPage === index + 1
                    ? 'bg-blue-500 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                {index + 1}
              </button>
            ))}
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
  );
};

export default PublicHub;