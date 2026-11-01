import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';

const renderAt = (props) => render(
  <MemoryRouter initialEntries={['/secret']}>
    <Routes>
      <Route path="/secret" element={<ProtectedRoute {...props}><div>Secret</div></ProtectedRoute>} />
      <Route path="/login" element={<div>Login page</div>} />
      <Route path="/form" element={<div>Form page</div>} />
    </Routes>
  </MemoryRouter>
);

const signIn = (user) => {
  localStorage.setItem('meeting_app_token', 'token');
  localStorage.setItem('meeting_app_user', JSON.stringify(user));
};

describe('ProtectedRoute', () => {
  test('sends signed-out users to login', () => {
    renderAt({});
    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  test('shows the page to a signed-in user', () => {
    signIn({ roles: ['zone_admin'] });
    renderAt({});
    expect(screen.getByText('Secret')).toBeInTheDocument();
  });

  test('missing role sends the user to their default page', () => {
    signIn({ roles: ['zone_admin'] });
    renderAt({ requiredRole: 'admin' });
    expect(screen.getByText('Form page')).toBeInTheDocument();

    renderAt({ requiredAnyRole: ['admin', 'district_admin'] });
    expect(screen.getAllByText('Form page')).toHaveLength(2);
  });
});
