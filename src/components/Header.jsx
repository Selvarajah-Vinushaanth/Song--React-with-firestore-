import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useKeyboardShortcuts } from '../context/KeyboardShortcutsContext';

export default function Header() {
  const { currentUser, logout } = useAuth();
  const { setShowShortcutsHelp } = useKeyboardShortcuts();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const defaultUserImage =
    'https://ui-avatars.com/api/?name=' +
    encodeURIComponent(currentUser?.displayName || currentUser?.email || 'User') +
    '&background=6366f1&color=fff&size=150';

  const getProfileImageUrl = () => {
    if (currentUser?.photoURL) return currentUser.photoURL;
    return defaultUserImage;
  };

  function handleImageError(e) {
    if (e.target.src !== defaultUserImage) {
      e.target.src = defaultUserImage;
    }
  }

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isActive = (path) => location.pathname === path;

  async function handleLogout() {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  }

  return (
    <header className="relative bg-gradient-to-r from-gray-950 via-gray-900 to-gray-800 border-b border-white/10 shadow-xl backdrop-blur-xl">
      {/* Decorative accents */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff10_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:20px_20px] opacity-[0.08]"></div>
        <div className="absolute inset-x-0 -top-24 h-40 bg-gradient-to-b from-purple-600/15 to-transparent blur-2xl"></div>
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-purple-500/40 to-transparent"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="flex justify-between h-20 items-center">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link to="/" className="group flex items-center gap-3">
              <div className="h-10 w-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg ring-1 ring-white/10 group-hover:ring-purple-400/40 transition-all duration-300 group-hover:scale-105">
                <span className="text-white font-extrabold text-xl drop-shadow">T</span>
              </div>
              <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-300 via-fuchsia-300 to-pink-300 drop-shadow-sm">
                Tamil AI
              </span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex items-center space-x-4 sm:space-x-6">
            {/* <Link 
              to="/" 
              className={`px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 ${
                isActive('/') 
                  ? 'bg-purple-500/20 text-purple-300 shadow-inner' 
                  : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
              }`}
            >
              Home
            </Link> */}
            
            {currentUser ? (
              <>
                {/* <Link 
                  to="/chat" 
                  className={`px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 ${
                    isActive('/chat') 
                      ? 'bg-purple-500/20 text-purple-300 shadow-inner' 
                      : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                  }`}
                >
                  Chat
                </Link> */}
                
                {/* API Keys */}
                <Link
                  to="/api-keys"
                  className={`relative px-4 py-3 rounded-xl text-sm sm:text-base font-medium transition-all duration-200 border ${
                    isActive('/api-keys')
                      ? 'bg-white/10 text-white border-white/10 shadow-inner'
                      : 'text-gray-300 hover:text-white hover:bg-white/5 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v-1l1-1 1-1-2.257-2.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd" />
                    </svg>
                    <span>API Keys</span>
                  </div>
                  {isActive('/api-keys') && (
                    <span className="absolute -bottom-[1px] inset-x-4 h-[2px] bg-gradient-to-r from-purple-400 to-pink-400 rounded-full"></span>
                  )}
                </Link>

                {/* Dashboard */}
                <Link
                  to="/dashboard"
                  className={`relative px-4 py-3 rounded-xl text-sm sm:text-base font-medium transition-all duration-200 border ${
                    isActive('/dashboard')
                      ? 'bg-white/10 text-white border-white/10 shadow-inner'
                      : 'text-gray-300 hover:text-white hover:bg-white/5 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                      <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
                    </svg>
                    <span>Dashboard</span>
                  </div>
                  {isActive('/dashboard') && (
                    <span className="absolute -bottom-[1px] inset-x-4 h-[2px] bg-gradient-to-r from-purple-400 to-pink-400 rounded-full"></span>
                  )}
                </Link>

                {/* Shortcuts */}
                <button
                  onClick={() => setShowShortcutsHelp(true)}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm sm:text-base font-medium transition-all duration-200 text-indigo-300 hover:text-white bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-700/30 hover:border-indigo-600/40 shadow-sm hover:shadow-indigo-500/10"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                  <span>Shortcuts</span>
                  <kbd className="ml-1 px-1.5 py-0.5 text-xs bg-indigo-800/80 rounded">?</kbd>
                </button>

                {/* Profile */}
                <Link
                  to="/profile"
                  className={`flex items-center gap-3 px-3 sm:px-4 py-2.5 rounded-xl text-sm sm:text-base font-medium transition-all duration-200 ${
                    isActive('/profile')
                      ? 'bg-white/10 text-white border border-white/10'
                      : 'text-gray-300 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="hidden sm:flex flex-col items-end mr-1">
                    <span className="text-sm font-medium">{currentUser.displayName || 'User Profile'}</span>
                    <span className="text-xs text-gray-400">
                      {currentUser.email && currentUser.email.length > 18
                        ? `${currentUser.email.substring(0, 15)}...`
                        : currentUser.email}
                    </span>
                  </div>
                  <div className="h-9 w-9 rounded-full overflow-hidden border border-purple-500/60 ring-2 ring-purple-500/20 hover:ring-purple-400/30 transition-all shadow-md">
                    <img
                      className="h-full w-full object-cover"
                      src={getProfileImageUrl()}
                      alt={currentUser.displayName || 'User profile'}
                      onError={handleImageError}
                    />
                  </div>
                </Link>

                {/* Sign out */}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm sm:text-base font-medium transition-all duration-300 text-red-300 hover:text-white bg-gradient-to-r from-red-700/15 to-red-900/15 hover:from-red-600/30 hover:to-red-800/30 border border-red-700/30 hover:border-red-600/50 shadow-sm hover:shadow-red-500/10"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                  </svg>
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowShortcutsHelp(true)}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm sm:text-base font-medium transition-all duration-200 text-indigo-300 hover:text-white bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-700/30 hover:border-indigo-600/40"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                  <span>Shortcuts</span>
                  <kbd className="ml-1 px-1.5 py-0.5 text-xs bg-indigo-800/80 rounded">?</kbd>
                </button>
                <Link
                  to="/login"
                  className="px-4 py-3 rounded-xl text-sm sm:text-base font-medium transition-all duration-200 text-gray-300 hover:text-white hover:bg-white/5 border border-transparent"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-5 py-3 rounded-xl text-sm sm:text-base font-medium shadow-md hover:shadow-purple-500/20 transition-all"
                >
                  Sign Up
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
