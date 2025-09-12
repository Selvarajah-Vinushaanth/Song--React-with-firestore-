import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import { KeyboardShortcutsProvider } from './context/KeyboardShortcutsContext';
import KeyboardShortcutsHelp from './components/KeyboardShortcutsHelp';

// Import page components
import HomePage from './pages/HomePage';
import MetaphorClassifier from './pages/MetaphorClassifier';
import LyricGenerator from './pages/LyricGenerator';
import MetaphorCreator from './pages/MetaphorCreator';
import ChatPage from './pages/ChatPage';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard';
import MaskingPredict from './pages/MaskingPredict';
import ApiKeys from './pages/ApiKeys';

// Private Route component
function PrivateRoute({ children }) {
  const { currentUser } = useAuth();
  
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <KeyboardShortcutsProvider>
          <KeyboardShortcutsHelp />
          <div className="App">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              
              {/* Protected Routes */}
              <Route 
                path="/metaphor-classifier" 
                element={
                  <PrivateRoute>
                    <MetaphorClassifier />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/lyric-generator" 
                element={
                  <PrivateRoute>
                    <LyricGenerator />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/metaphor-creator" 
                element={
                  <PrivateRoute>
                    <MetaphorCreator />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/chat" 
                element={
                  <PrivateRoute>
                    <ChatPage />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/profile" 
                element={
                  <PrivateRoute>
                    <Profile />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/dashboard" 
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/masking-predict" 
                element={
                  <PrivateRoute>
                    <MaskingPredict />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/api-keys" 
                element={
                  <PrivateRoute>
                    <ApiKeys />
                  </PrivateRoute>
                } 
              />
            </Routes>
          </div>
        </KeyboardShortcutsProvider>
      </Router>
    </AuthProvider>
  );
}

export default App;
