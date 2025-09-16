import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePayment } from '../context/PaymentContext';
import Header from '../components/Header';

export default function Profile() {
  const { currentUser, logout, updateUserProfile } = useAuth();
  const { remainingTokens: tokens, userSubscription: subscription } = usePayment();
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [photoURL, setPhotoURL] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  // Helper function to get plan display name (same as in Header.jsx)
  const getPlanDisplayName = (subscription) => {
    if (!subscription || !subscription.planId) return 'Free';
    
    const planMap = {
      'free': 'Free',
      'basic': 'Basic', 
      'pro': 'Pro',
      'enterprise': 'Enterprise'
    };
    
    return planMap[subscription.planId] || 'Free';
  };

  const currentPlan = getPlanDisplayName(subscription);

  // Default user image URL
  const defaultUserImage = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(currentUser?.displayName || currentUser?.email || 'User') + '&background=6366f1&color=fff&size=150';

  // Get Google profile image or use current photoURL
  const getProfileImageUrl = () => {
    // First priority: uploaded/custom photoURL
    if (photoURL && !photoURL.includes('ui-avatars.com')) {
      return photoURL;
    }
    
    // Second priority: Google profile photo from Firebase Auth
    if (currentUser?.photoURL) {
      return currentUser.photoURL;
    }
    
    // Third priority: default generated avatar
    return defaultUserImage;
  };

  // Initialize photoURL with Google profile image if available
  React.useEffect(() => {
    if (currentUser?.photoURL) {
      setPhotoURL(currentUser.photoURL);
    }
  }, [currentUser?.photoURL]);

  async function handleLogout() {
    setError('');

    try {
      await logout();
      navigate('/login');
    } catch (err) {
      setError('Failed to log out');
      console.error(err);
    }
  }

  async function handleUpdateProfile(e) {
    e.preventDefault();
    
    if (!displayName.trim()) {
      return setError('Display name cannot be empty');
    }

    try {
      setError('');
      setLoading(true);
      
      // Update the user profile with new data
      await updateUserProfile(currentUser, { 
        displayName,
        photoURL: photoURL || currentUser?.photoURL
      });
      
      // Force a refresh of the auth state to update the header immediately
      // This is handled by the AuthContext's onAuthStateChanged listener
      
      setMessage('Profile updated successfully');
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError('Failed to update profile');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }
  
  function handleImageClick() {
    fileInputRef.current.click();
  }
  
  async function handleImageChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.includes('image')) {
      return setError('Please select an image file');
    }
    
    try {
      setUploadingImage(true);
      setError('');
      
      // Create a temporary URL for preview
      const imageUrl = URL.createObjectURL(file);
      setPhotoURL(imageUrl);
      
      // In a real app, you would:
      // 1. Upload file to Firebase Storage
      // 2. Get permanent URL
      // 3. Update user profile with permanent URL
      
      // For now, simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // After successful upload in a real app:
      // await updateUserProfile(currentUser, { photoURL: permanentUrl });
      
    } catch (err) {
      setError('Failed to upload image');
      console.error(err);
    } finally {
      setUploadingImage(false);
    }
  }

  function handleImageError(e) {
    // If Google image fails, try default avatar
    if (e.target.src !== defaultUserImage) {
      e.target.src = defaultUserImage;
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 text-gray-100 flex flex-col relative overflow-hidden">
      {/* Grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      {/* Decorative gradient circles */}
      <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 rounded-full blur-3xl animate-pulse opacity-70"></div>
      <div className="absolute bottom-40 right-20 w-80 h-80 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 rounded-full blur-3xl animate-pulse opacity-70" style={{ animationDelay: "2s" }}></div>
      <div className="absolute top-60 right-40 w-64 h-64 bg-gradient-to-r from-purple-600/20 to-indigo-600/20 rounded-full blur-3xl animate-pulse opacity-70" style={{ animationDelay: "1s" }}></div>
      
      <Header />
      
      <div className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl w-full">
          <div className="bg-gradient-to-br from-gray-800/90 via-gray-800/80 to-gray-900/90 shadow-2xl rounded-2xl overflow-hidden border border-gray-700/50 backdrop-blur-md relative">
            {/* Top curved design element */}
            <div className="absolute top-0 inset-x-0 h-3 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
            
            <button 
              onClick={() => navigate('/')}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-700/50 transition-colors backdrop-blur-sm z-10"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="px-6 py-10 sm:p-10">
              <div className="text-center">
                <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">User Profile</h1>
                <p className="text-gray-400 mt-2">Manage your account settings and preferences</p>
              </div>

              {error && (
                <div className="mt-6 bg-red-900/30 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl relative backdrop-blur-sm" role="alert">
                  <span className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {error}
                  </span>
                </div>
              )}

              {message && (
                <div className="mt-6 bg-emerald-900/30 border border-emerald-500/50 text-emerald-200 px-4 py-3 rounded-xl relative backdrop-blur-sm" role="alert">
                  <span className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {message}
                  </span>
                </div>
              )}

              <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1">
                  <div className="bg-gray-900/50 p-8 rounded-2xl border border-gray-700/50 flex flex-col items-center backdrop-blur-sm hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300">
                    <div 
                      className="relative group cursor-pointer w-36 h-36 rounded-full overflow-hidden border-4 border-purple-500/50 shadow-lg shadow-purple-500/20 transition-transform hover:scale-105 duration-300"
                      onClick={handleImageClick}
                    >
                      {uploadingImage ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500"></div>
                        </div>
                      ) : (
                        <>
                          <img
                            src={getProfileImageUrl()}
                            alt="Profile"
                            className="h-full w-full object-cover"
                            onError={handleImageError}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300">
                            <div className="text-white transform translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                    <h3 className="text-xl font-bold text-white mt-6">{displayName || 'User'}</h3>
                    <p className="text-gray-400 text-sm mt-2 text-center break-all px-4">
                      {currentUser?.email}
                    </p>
                    
                    <div className="w-full mt-8 space-y-4">
                      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-3 flex items-center">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center mr-3">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-gray-400 mb-1">Member Since</p>
                          <p className="text-sm text-white">
                            {currentUser?.metadata?.creationTime 
                              ? new Date(currentUser.metadata.creationTime).toLocaleDateString(undefined, {
                                  year: 'numeric', 
                                  month: 'long', 
                                  day: 'numeric'
                                }) 
                              : 'N/A'}
                          </p>
                        </div>
                      </div>
                      
                      {/* Token Display */}
                      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-3 flex items-center">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center mr-3">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-gray-400 mb-1">Token Balance</p>
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-semibold ${
                              tokens <= 10 ? 'text-red-400' : 
                              tokens <= 50 ? 'text-yellow-400' : 
                              'text-emerald-400'
                            }`}>
                              {tokens || 0} tokens
                            </p>
                            <span className="text-xs text-gray-500">•</span>
                            <span className="text-xs text-gray-400">
                              {currentPlan} Plan
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center px-6 py-3 rounded-xl text-white bg-gradient-to-r from-red-600/30 to-red-800/30 hover:from-red-600 hover:to-red-700 border border-red-600/30 hover:border-red-500/70 transition-all duration-300 group backdrop-blur-sm"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 group-hover:animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign Out
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="md:col-span-2">
                  <div className="space-y-8">
                    <div className="bg-gray-900/50 p-8 rounded-2xl border border-gray-700/50 backdrop-blur-sm hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-300">
                      <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 flex items-center mb-6">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mr-3 shadow-lg">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        Account Information
                      </h2>
                      
                      <form onSubmit={handleUpdateProfile} className="space-y-6">
                        <div>
                          <label htmlFor="displayName" className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Display Name
                          </label>
                          <input
                            type="text"
                            id="displayName"
                            className="block w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl shadow-inner placeholder-gray-400 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all duration-300 backdrop-blur-sm"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="Enter your display name"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            Email Address
                          </label>
                          <div className="flex items-center px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl shadow-inner text-gray-300 sm:text-sm backdrop-blur-sm">
                            <span className="flex-grow">{currentUser?.email}</span>
                            <span className="ml-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-900/30 text-emerald-300 border border-emerald-700/50 backdrop-blur-sm">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Verified
                            </span>
                          </div>
                        </div>

                        <div className="pt-6">
                          <button
                            type="submit"
                            disabled={loading}
                            className="w-full inline-flex justify-center items-center px-6 py-4 border border-transparent shadow-xl text-base font-medium rounded-xl text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300 transform hover:scale-[1.02]"
                          >
                            {loading ? (
                              <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Updating Profile...
                              </>
                            ) : (
                              <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Update Profile
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    </div>
                    
                    <div className="bg-gray-900/50 p-8 rounded-2xl border border-gray-700/50 backdrop-blur-sm hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300">
                      <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 flex items-center mb-6">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mr-3 shadow-lg">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                        Security
                      </h2>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 flex items-center">
                          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center mr-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-white">Password</h3>
                            <p className="text-xs text-gray-400 mt-1">Change your password</p>
                          </div>
                        </div>
                        
                        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 flex items-center">
                          <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center mr-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-white">Two-factor authentication</h3>
                            <p className="text-xs text-gray-400 mt-1">Set up 2FA security</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-center mt-8 text-gray-400 text-sm">
            &copy; {new Date().getFullYear()} Tamil AI - Group-23 | All rights reserved
          </div>
        </div>
      </div>
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
