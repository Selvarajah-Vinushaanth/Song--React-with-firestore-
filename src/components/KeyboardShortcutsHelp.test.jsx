import React from 'react';
import { screen } from '@testing-library/react';
import KeyboardShortcutsHelp from './KeyboardShortcutsHelp';
import { renderWithProviders } from '../test-utils/renderWithProviders';

describe('KeyboardShortcutsHelp', () => {
  test('hidden when showShortcutsHelp is false', () => {
    renderWithProviders(<KeyboardShortcutsHelp />, { keyboard: { showShortcutsHelp: false, shortcuts: [] } });
    expect(screen.queryByText(/Keyboard Shortcuts/i)).toBeNull();
  });

  test('renders shortcuts when visible', () => {
    const shortcuts = [
      { key: 'h', description: 'Go to Home', action: () => {} },
      { key: 'd', description: 'Go to Dashboard', action: () => {} },
    ];
    renderWithProviders(<KeyboardShortcutsHelp />, { keyboard: { showShortcutsHelp: true, shortcuts } });
    expect(screen.getByText(/Keyboard Shortcuts/i)).toBeInTheDocument();
    expect(screen.getByText(/Go to Home/i)).toBeInTheDocument();
    expect(screen.getByText(/Go to Dashboard/i)).toBeInTheDocument();
  });
});
