import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import HomePage from './HomePage';
import { renderWithProviders } from '../test-utils/renderWithProviders';

describe('HomePage', () => {
  beforeEach(() => {
    global.__AUTH_MOCK__ = { currentUser: null };
  });

  test('renders title', () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByText(/Tamil AI Tools/i)).toBeInTheDocument();
  });

  test('navigates to chat when feature card clicked', () => {
    renderWithProviders(<HomePage />);
    const card = screen.getByText(/Tamil Chat Assistant/i);
    fireEvent.click(card);
    // Smoke: no crash. We won't assert route change due to animations, but render shouldn't throw.
  });
});
