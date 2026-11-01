import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Login from '../components/Login';
import { login } from '../services/auth';

vi.mock('../services/auth', () => ({ login: vi.fn() }));

const renderLogin = () => render(
  <MemoryRouter initialEntries={['/login']}>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<div>Home page</div>} />
    </Routes>
  </MemoryRouter>
);

const fill = async (username, password) => {
  await userEvent.type(screen.getByLabelText('Username'), username);
  await userEvent.type(screen.getByLabelText('Password'), password);
  await userEvent.click(screen.getByRole('button', { name: 'Sign In' }));
};

describe('Login', () => {
  beforeEach(() => login.mockReset());

  test('signs in and goes home', async () => {
    login.mockResolvedValue({ success: true });
    renderLogin();
    await fill(' user1 ', 'secret');
    expect(login).toHaveBeenCalledWith('user1', 'secret');
    expect(await screen.findByText('Home page')).toBeInTheDocument();
  });

  test('shows the server message on failure', async () => {
    login.mockResolvedValue({ success: false, error: 'Username or password is incorrect' });
    renderLogin();
    await fill('user1', 'wrong');
    expect(await screen.findByText('Username or password is incorrect')).toBeInTheDocument();
    expect(screen.queryByText('Home page')).not.toBeInTheDocument();
  });

  test('blank-looking input is not sent', async () => {
    renderLogin();
    await fill('   ', '   ');
    expect(login).not.toHaveBeenCalled();
    expect(screen.getByText('Please enter username and password')).toBeInTheDocument();
  });

  test('already signed in goes straight home', async () => {
    localStorage.setItem('meeting_app_token', 't');
    renderLogin();
    expect(await screen.findByText('Home page')).toBeInTheDocument();
  });
});

describe('Login password visibility', () => {
  test('eye button shows and hides the password', async () => {
    renderLogin();
    const password = screen.getByLabelText('Password');
    expect(password).toHaveAttribute('type', 'password');
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(password).toHaveAttribute('type', 'text');
    await userEvent.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(password).toHaveAttribute('type', 'password');
  });
});
