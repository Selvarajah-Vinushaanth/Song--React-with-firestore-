import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import LyricGenerator from './LyricGenerator';
import { renderWithProviders } from '../test-utils/renderWithProviders';

// Mock axios for API calls
jest.mock('axios', () => ({ post: jest.fn(async () => ({ data: { lyrics: ['Line one.', 'Line two.'] } })) }));

describe('LyricGenerator', () => {
  test('renders and generates lyrics (mocked)', async () => {
    global.__AUTH_MOCK__ = { currentUser: { uid: 'u1' } };
    renderWithProviders(<LyricGenerator />);

    // Click Generate Lyrics button
    fireEvent.click(screen.getByRole('button', { name: /Generate Lyrics/i }));

    await waitFor(() => {
      expect(screen.getByText(/Generated Lyrics/i)).toBeInTheDocument();
      expect(screen.getByText(/Line one./i)).toBeInTheDocument();
    });
  });
});
