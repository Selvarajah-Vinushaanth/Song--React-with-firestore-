import React from 'react';
import { screen } from '@testing-library/react';
import MetaphorCreator from './MetaphorCreator';
import { renderWithProviders } from '../test-utils/renderWithProviders';

jest.mock('axios', () => ({ post: jest.fn(async () => ({ data: { metaphors: ['X is like Y.'] } })) }));

describe('MetaphorCreator', () => {
  test('renders header text', () => {
    global.__AUTH_MOCK__ = { currentUser: { uid: 'u1' } };
    renderWithProviders(<MetaphorCreator />);
    expect(screen.getByText(/Metaphor/i)).toBeInTheDocument();
  });
});
