import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import Header from './Header';
import { renderWithProviders } from '../test-utils/renderWithProviders';

// We rely on setupTests jest.mock for useAuth

describe('Header', () => {
  test('renders Login and Signup when logged out', () => {
    global.__AUTH_MOCK__ = { currentUser: null };
    renderWithProviders(<Header />);
    expect(screen.getByText(/Login/i)).toBeInTheDocument();
    expect(screen.getByText(/Sign Up/i)).toBeInTheDocument();
  });

  test('renders profile and sign out when logged in', () => {
    global.__AUTH_MOCK__ = {
      currentUser: { uid: 'u1', email: 'test@example.com', displayName: 'Test User' },
      logout: jest.fn(),
    };
    renderWithProviders(<Header />);
    expect(screen.getByText(/Profile/i)).toBeInTheDocument();
    expect(screen.getByText(/Sign Out/i)).toBeInTheDocument();
  });

  test('opens shortcuts help via button', () => {
    global.__AUTH_MOCK__ = { currentUser: null };
    const setShowShortcutsHelp = jest.fn();
    renderWithProviders(<Header />, { keyboard: { setShowShortcutsHelp } });
    const btn = screen.getByText(/Shortcuts/i);
    fireEvent.click(btn);
    expect(setShowShortcutsHelp).toHaveBeenCalledWith(true);
  });
});
