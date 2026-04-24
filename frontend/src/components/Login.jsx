import React, { useState, useEffect } from 'react';
import { login } from '../services/auth';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already logged in
    const token = localStorage.getItem('meeting_app_token');
    if (token) {
      navigate('/');
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!username.trim() || !password.trim()) {
      setError('Please enter username and password');
      setLoading(false);
      return;
    }

    try {
      const result = await login(username.trim(), password);

      if (result.success) {
        // Redirect to home page
        navigate('/');
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError('Login failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="container login-container">
        <div className="login-header">
          <h1>Wisdom MLP E Meetings</h1>
          <p>ലോഗിൻ ചെയ്യുക</p>
        </div>

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              required
              autoFocus
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              disabled={loading}
            />
          </div>

          <div className="submit-section">
            <button
              type="submit"
              className="submit-button"
              disabled={loading}
              style={{ width: '100%' }}
            >
              {loading ? 'Logging in...' : 'Sign In'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .login-wrapper {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--gray-100);
          padding: var(--space-md);
        }

        .login-container {
          max-width: 440px !important;
          margin: 0 !important;
          box-shadow: var(--shadow-lg);
          border: 1px solid var(--gray-200);
          padding: var(--space-2xl) var(--space-xl) !important;
        }

        .login-header {
          text-align: center;
          margin-bottom: var(--space-xl);
        }

        .login-header h1 {
          font-size: 2.5rem;
          color: var(--primary);
          margin-bottom: var(--space-xs);
          padding-bottom: 0;
          text-align: center;
        }

        .login-header p {
          color: var(--gray-500);
          font-weight: 500;
          font-size: 0.95rem;
        }

        .login-form .form-group {
          background: transparent;
          padding: 0;
          border: none;
          margin-bottom: var(--space-lg);
        }

        .login-form .submit-section {
          margin-top: var(--space-xl);
          padding-top: 0;
          border-top: none;
        }

        @media (max-width: 640px) {
          .login-container {
            padding: var(--space-xl) var(--space-md) !important;
          }
          
          .login-header h1 {
            font-size: 2rem;
          }
        }
      `}</style>
    </div>
  );
};

export default Login;

