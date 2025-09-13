import React from 'react';
import { screen } from '@testing-library/react';
import Signup from './Signup';
import { renderWithProviders } from '../test-utils/renderWithProviders';

describe('Signup', () => {
  test('renders sign up heading', () => {
    renderWithProviders(<Signup />);
    expect(screen.getByText(/Sign/i)).toBeInTheDocument();
  });
});
