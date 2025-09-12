import React from 'react';
import { useKeyboardShortcuts } from '../context/KeyboardShortcutsContext';

export default function KeyboardShortcutsHelp() {
  const { shortcuts, showShortcutsHelp, setShowShortcutsHelp } = useKeyboardShortcuts();

  if (!showShortcutsHelp) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-gray-800/90 border border-gray-700/70 rounded-xl shadow-2xl p-6 md:p-8 max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Keyboard Shortcuts</h2>
          <button
            onClick={() => setShowShortcutsHelp(false)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <p className="text-gray-300 mb-6">
          Press any of these keys to quickly navigate or perform actions. Shortcuts are disabled when typing in text fields.
        </p>
        
        <div className="max-h-[50vh] overflow-y-auto scrollbar-hide pr-2">
          <div className="grid grid-cols-1 gap-2">
            {shortcuts.map((shortcut, index) => (
              <div key={index} className="flex items-center p-3 border border-gray-700 rounded-lg bg-gray-900/50 hover:bg-gray-800/70 transition-colors">
                <div className="flex-shrink-0 mr-4">
                  <kbd className="px-3 py-1.5 text-sm font-bold text-gray-800 bg-gray-200 rounded-lg shadow">
                    {shortcut.key.toUpperCase()}
                  </kbd>
                </div>
                <div className="text-gray-200">{shortcut.description}</div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="mt-8 pt-4 border-t border-gray-700">
          <p className="text-gray-400 text-sm">
            Tip: Press <kbd className="px-2 py-1 text-xs font-bold text-gray-800 bg-gray-200 rounded">?</kbd> anytime to show or hide this help menu.
          </p>
        </div>
      </div>
    </div>
  );
}