import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';

// KeyboardShortcutsContext minimal mock to control help visibility and shortcuts
const KeyboardShortcutsContext = React.createContext({
  shortcuts: [],
  registerPageShortcuts: () => () => {},
  showShortcutsHelp: false,
  setShowShortcutsHelp: () => {},
});

export function withKeyboardShortcuts(ui, { value } = {}) {
  const v = {
    shortcuts: [],
    registerPageShortcuts: () => () => {},
    showShortcutsHelp: false,
    setShowShortcutsHelp: () => {},
    ...value,
  };
  return (
    <KeyboardShortcutsContext.Provider value={v}>
      {ui}
    </KeyboardShortcutsContext.Provider>
  );
}

export function renderWithProviders(ui, { route = '/', keyboard = {}, ...renderOptions } = {}) {
  window.history.pushState({}, 'Test page', route);
  const wrapped = withKeyboardShortcuts(ui, { value: keyboard });
  return render(<MemoryRouter initialEntries={[route]}>{wrapped}</MemoryRouter>, renderOptions);
}

export { KeyboardShortcutsContext };
