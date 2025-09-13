import React from 'react';
import { screen } from '@testing-library/react';
import MetaphorClassifier from './MetaphorClassifier';
import { renderWithProviders } from '../test-utils/renderWithProviders';

jest.mock('axios', () => ({ post: jest.fn(async () => ({ data: { results: [{ line: 'foo', isMetaphor: true, confidence: 0.9 }] } })) }));

describe('MetaphorClassifier', () => {
  test('renders classifier UI', () => {
    global.__AUTH_MOCK__ = { currentUser: { uid: 'u1' } };
    renderWithProviders(<MetaphorClassifier />);
    expect(screen.getByText(/Metaphor/i)).toBeInTheDocument();
  });
});
