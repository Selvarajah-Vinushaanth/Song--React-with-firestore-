import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import Login from './Login';
import { renderWithProviders } from '../test-utils/renderWithProviders';

describe('Login', () => {
  test('renders and submits form', async () => {
    const login = jest.fn(async () => {});
    global.__AUTH_MOCK__ = { currentUser: null, login };

    renderWithProviders(<Login />);
    fireEvent.change(screen.getByPlaceholderText(/Email address/i), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: 'secret' } });

    fireEvent.click(screen.getByRole('button', { name: /Sign in/i }));

    expect(login).toHaveBeenCalled();
  });
});
