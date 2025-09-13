import React from 'react';
import { screen } from '@testing-library/react';
import Profile from './Profile';
import { renderWithProviders } from '../test-utils/renderWithProviders';

describe('Profile', () => {
  test('shows profile when logged in', () => {
    global.__AUTH_MOCK__ = { currentUser: { uid: 'u1', email: 't@e.com', displayName: 'User' }, updateUserProfile: jest.fn(), logout: jest.fn() };
    renderWithProviders(<Profile />);
    expect(screen.getByText(/Profile/i)).toBeInTheDocument();
  });
});
