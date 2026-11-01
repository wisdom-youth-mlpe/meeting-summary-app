import React, { useState, useEffect } from 'react';
import { login } from '../services/auth';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="login-page">
      <header className="login-band">
        <div className="login-band-inner">
          <h1>Wisdom MLP E Meetings</h1>
          <p>ലോഗിൻ ചെയ്യുക</p>
        </div>
      </header>

      <main className="login-sheet">
        <img src="/wisdom-youth-logo.png" alt="Wisdom Youth" className="login-logo" />

        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              autoComplete="username"
              required
              autoFocus
              disabled={loading}
            />
          </div>

          <div className="login-field">
            <label htmlFor="password">Password</label>
            <div className="login-password">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoComplete="current-password"
                required
                disabled={loading}
              />
              <button
                type="button"
                className="login-reveal"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                  {showPassword && <line x1="3" y1="3" x2="21" y2="21" />}
                </svg>
              </button>
            </div>
          </div>

          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>
      </main>

      <style>{`
        .login-page {
          min-height: 100vh;
          background: var(--mist);
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        /* Slate band carries the app name, like the header inside the app */
        .login-band {
          width: 100%;
          background: var(--slate-deep);
          color: var(--surface);
          padding: 56px 16px 72px;
        }

        .login-band-inner {
          max-width: 400px;
          margin: 0 auto;
        }

        .login-band h1 {
          margin: 0;
          padding: 0;
          color: var(--surface);
          font-size: 2.3rem;
          line-height: 1.05;
          font-weight: 700;
          font-variation-settings: 'wdth' 80;
          text-align: left;
        }

        .login-band p {
          margin: 10px 0 0;
          color: #B9C4C9;
          font-size: 1.05rem;
        }

        /* White sheet rises over the band */
        .login-sheet {
          width: calc(100% - 32px);
          max-width: 400px;
          margin-top: -40px;
          background: var(--surface);
          border-radius: var(--radius-md);
          box-shadow: inset 0 3px 0 var(--paddy), 0 1px 2px rgba(38, 50, 58, 0.08);
          padding: 20px 20px 24px;
          animation: settle-in 0.35s ease-out both;
        }

        .login-logo {
          display: block;
          width: 112px;
          height: auto;
          margin: -6px 0 10px -10px;
        }

        .login-field {
          margin-bottom: 14px;
        }

        .login-field label {
          display: block;
          margin-bottom: 4px;
          font-weight: 600;
          color: var(--slate);
        }

        .login-field input {
          width: 100%;
          min-height: 44px;
          background: var(--mist);
          font-size: 16px; /* stops iPhone zooming into the field */
        }

        .login-field input:focus {
          background: var(--surface);
          border-color: var(--slate);
        }

        .login-password {
          position: relative;
        }

        .login-password input {
          padding-right: 44px;
        }

        .login-reveal {
          position: absolute;
          top: 0;
          right: 0;
          height: 100%;
          width: 44px;
          min-height: 0;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          color: var(--stone);
          box-shadow: none;
        }

        .login-reveal:hover:not(:disabled) {
          background: transparent;
          color: var(--slate);
        }

        .login-submit {
          width: 100%;
          margin-top: 8px;
          min-height: 44px;
          background: var(--paddy);
          color: var(--surface);
          font-weight: 600;
          font-size: 1.05rem;
        }

        .login-submit:hover:not(:disabled) {
          background: var(--paddy-deep);
        }

        @media (min-width: 700px) {
          .login-band {
            padding: 96px 16px 88px;
          }

          .login-band h1 {
            font-size: 2.8rem;
          }
        }
      `}</style>
    </div>
  );
};

export default Login;

