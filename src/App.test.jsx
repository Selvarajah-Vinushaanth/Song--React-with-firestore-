import React from 'react';
import { screen } from '@testing-library/react';
import App from './App';
import { renderWithProviders } from './test-utils/renderWithProviders';

// Smoke test to ensure router renders and HomePage appears

describe('App', () => {
  test('renders HomePage route', () => {
    renderWithProviders(<App />, { route: '/' });
    expect(screen.getByText(/Tamil AI Tools/i)).toBeInTheDocument();
  });
});
