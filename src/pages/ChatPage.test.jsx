import React from 'react';
import { screen } from '@testing-library/react';
import ChatPage from './ChatPage';
import { renderWithProviders } from '../test-utils/renderWithProviders';

jest.mock('axios', () => ({ post: jest.fn(async () => ({ data: {} })) }));

describe('ChatPage', () => {
  test('renders welcome system message', () => {
    renderWithProviders(<ChatPage />);
    expect(screen.getByText(/Welcome to Tamil AI Chat/i)).toBeInTheDocument();
  });
});
