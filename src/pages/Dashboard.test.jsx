import React from 'react';
import { screen } from '@testing-library/react';
import Dashboard from './Dashboard';
import { renderWithProviders } from '../test-utils/renderWithProviders';

describe('Dashboard', () => {
  test('prompts login when no user', () => {
    global.__AUTH_MOCK__ = { currentUser: null };
    renderWithProviders(<Dashboard />);
    expect(screen.getByText(/Please log in to view your dashboard/i)).toBeInTheDocument();
  });

  test('renders dashboard heading when user exists', () => {
    global.__AUTH_MOCK__ = { currentUser: { uid: 'u1', email: 't@e.com' } };
    renderWithProviders(<Dashboard />);
    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
  });
});
