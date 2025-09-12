import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';

export default function Profile() {
  const { currentUser, logout, updateUserProfile } = useAuth();
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [photoURL, setPhotoURL] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

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
    </div>
  );
}
