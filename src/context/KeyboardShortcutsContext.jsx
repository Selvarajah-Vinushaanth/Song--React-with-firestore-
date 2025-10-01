import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

const KeyboardShortcutsContext = createContext();

export function useKeyboardShortcuts() {
  return useContext(KeyboardShortcutsContext);
}

export function KeyboardShortcutsProvider({ children }) {
  const [shortcuts, setShortcuts] = useState([]);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const navigate = useNavigate();

  // Initialize shortcuts with useCallback to prevent recreating on every render
  const initializeShortcuts = useCallback(() => {
    const globalShortcuts = [
      { key: 'h', description: 'Go to Home', action: () => navigate('/') },
      { key: 'l', description: 'Go to Lyrics Generator', action: () => navigate('/lyric-generator') },
      { key: 'm', description: 'Go to Metaphor Classifier', action: () => navigate('/metaphor-classifier') },
      { key: 'c', description: 'Go to Metaphor Creator', action: () => navigate('/metaphor-creator') },
      { key: 'p', description: 'Go to Masking Predict', action: () => navigate('/masking-predict') },
      { key: 'a', description: 'Go to Chat', action: () => navigate('/chat') },
      { key: 'u', description: 'Go to Profile', action: () => navigate('/profile') },
      { key: 'd', description: 'Go to Dashboard', action: () => navigate('/dashboard') },
      { key: 's', description: 'Go to Subscription', action: () => navigate('/subscription') },
      { key: 'k', description: 'Go to API Keys', action: () => navigate('/api-keys') },
      { key: 'r', description: 'Refresh Page', action: () => window.location.reload() },
      { key: 'o', description: 'Go to Admin Page(Admin access only)', action: () => navigate('/admin') },
      { key: '?', description: 'Show/Hide Keyboard Shortcuts', action: () => setShowShortcutsHelp(prev => !prev) },
    ];
    setShortcuts(globalShortcuts);
  }, [navigate, setShowShortcutsHelp]);

  // Initialize shortcuts on mount
  useEffect(() => {
    initializeShortcuts();
  }, [initializeShortcuts]);

  // Register event listeners for keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger shortcuts when typing in input fields
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return;
      }

      // Don't trigger shortcuts with modifier keys (except for ? which might need Shift)
      if ((e.ctrlKey || e.altKey || e.metaKey) && e.key !== '?') {
        return;
      }

      // Find and execute matching shortcut
      const shortcut = shortcuts.find(s => s.key === e.key.toLowerCase());
      if (shortcut) {
        e.preventDefault();
        shortcut.action();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);

  // Add custom shortcuts for specific pages
  const registerPageShortcuts = useCallback((pageShortcuts) => {
    setShortcuts(currentShortcuts => [...currentShortcuts, ...pageShortcuts]);
    return () => {
      setShortcuts(currentShortcuts => 
        currentShortcuts.filter(shortcut => 
          !pageShortcuts.some(pageShortcut => pageShortcut.key === shortcut.key)
        )
      );
    };
  }, []);

  const value = useMemo(() => ({
    shortcuts,
    registerPageShortcuts,
    showShortcutsHelp,
    setShowShortcutsHelp
  }), [shortcuts, registerPageShortcuts, showShortcutsHelp, setShowShortcutsHelp]);

  return (
    <KeyboardShortcutsContext.Provider value={value}>
      {children}
    </KeyboardShortcutsContext.Provider>
  );
}