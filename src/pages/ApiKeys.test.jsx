import React from 'react';
import { screen } from '@testing-library/react';
import ApiKeys from './ApiKeys';
import { renderWithProviders } from '../test-utils/renderWithProviders';

describe('ApiKeys', () => {
  test('renders API Keys heading', () => {
    global.__AUTH_MOCK__ = { currentUser: { uid: 'u1' } };
    renderWithProviders(<ApiKeys />);
    expect(screen.getByText(/API Keys/i)).toBeInTheDocument();
  });
});
