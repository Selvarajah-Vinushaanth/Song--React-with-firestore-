import React from 'react';
import { screen } from '@testing-library/react';
import ForgotPassword from './ForgotPassword';
import { renderWithProviders } from '../test-utils/renderWithProviders';

describe('ForgotPassword', () => {
  test('renders forgot password', () => {
    renderWithProviders(<ForgotPassword />);
    expect(screen.getByText(/Password/i)).toBeInTheDocument();
  });
});
