import React from 'react';
import { screen } from '@testing-library/react';
import MaskingPredict from './MaskingPredict';
import { renderWithProviders } from '../test-utils/renderWithProviders';

describe('MaskingPredict', () => {
  test('renders page container', () => {
    global.__AUTH_MOCK__ = { currentUser: { uid: 'u1' } };
    renderWithProviders(<MaskingPredict />);
    // Smoke test: presence of a heading or button unique to the page (fallback to generic text)
    expect(screen.getByText(/Masking/i)).toBeInTheDocument();
  });
});
