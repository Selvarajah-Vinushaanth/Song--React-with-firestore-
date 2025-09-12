import React, { createContext, useContext, useEffect, useState } from 'react';
import { getFirestore } from 'firebase/firestore';
import { 
  getAuth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  updateProfile 
} from 'firebase/auth';
import { initializeApp } from 'firebase/app';

// Your Firebase configuration - replace with your actual config
const firebaseConfig = {
  apiKey: "AIzaSyD2y1V5Tr0DdiPcc1uMrZ5LrdNlpvRh168",
  authDomain: "song-writing-assistant-4cd39.firebaseapp.com",
  projectId: "song-writing-assistant-4cd39",
  storageBucket: "song-writing-assistant-4cd39.firebasestorage.app",
  messagingSenderId: "74799529758",
  appId: "1:74799529758:web:472dd9b8b7b1c8af60930f",
  measurementId: "G-ZPT2GX1FB3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const db = getFirestore(app);

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}
export { db, auth };
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sign up function
  function signup(email, password) {
    return createUserWithEmailAndPassword(auth, email, password);
  }

  // Login function
  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  // Logout function
  function logout() {
    return signOut(auth);
  }

  // Google sign in
  function signInWithGoogle() {
    return signInWithPopup(auth, googleProvider);
  }

  // Reset password
  function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  // Update profile
  function updateUserProfile(user, data) {
    return updateProfile(user, data);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    signup,
    login,
    logout,
    signInWithGoogle,
    resetPassword,
    updateUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
