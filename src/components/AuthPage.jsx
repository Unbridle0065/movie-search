import { useState, useEffect, useCallback } from 'react';

export default function AuthPage({ onLogin, initialToken }) {
  const [mode, setMode] = useState(initialToken ? 'signup' : 'login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [token, setToken] = useState(initialToken || '');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [inviteInfo, setInviteInfo] = useState(null);
  const [isValidatingToken, setIsValidatingToken] = useState(!!initialToken);

  const validateToken = useCallback(async function(tokenToValidate) {
    setIsValidatingToken(true);
    setError('');

    try {
      const response = await fetch('/api/invite/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token: tokenToValidate })
      });

      const data = await response.json();
      setInviteInfo(data);

      if (data.valid) {
        setToken(tokenToValidate);
        if (data.emailRequired) {
          setEmail(data.emailRequired);
        }
      } else {
        setError(getInvalidReason(data.reason));
      }
    } catch (_err) {
      setError('Failed to validate invite. Please try again.');
    } finally {
      setIsValidatingToken(false);
    }
  }, []);

  // Validate token on mount if provided
  useEffect(() => {
    if (initialToken) {
      validateToken(initialToken);
    }
  }, [initialToken, validateToken]);

  function getInvalidReason(reason) {
    switch (reason) {
      case 'expired': return 'This invite has expired';
      case 'exhausted': return 'This invite has already been used';
      case 'revoked': return 'This invite has been revoked';
      default: return 'Invalid invite token';
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (mode === 'signup') {
      // Validate passwords match
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setIsLoading(false);
        return;
      }

      // Validate token first if not already validated
      if (!inviteInfo?.valid) {
        setError('Please enter a valid invite token');
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ token, username, email, password })
        });

        const data = await response.json();

        if (response.ok) {
          onLogin(false); // Not admin
        } else {
          setError(data.error || 'Signup failed');
        }
      } catch (_err) {
        setError('Network error. Please try again.');
      }
    } else {
      // Login
      try {
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
          onLogin(data.isAdmin);
        } else {
          setError(data.error || 'Login failed');
        }
      } catch (_err) {
        setError('Network error. Please try again.');
      }
    }

    setIsLoading(false);
  }

  async function handleTokenBlur() {
    if (token && token.length === 64 && !inviteInfo?.valid) {
      await validateToken(token);
    }
  }

  if (isValidatingToken) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-gray-400">Validating invite...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Movie Search</h1>
          <p className="text-gray-400">Search movies and view ratings & parental guidance</p>
        </div>

        {/* Tab Switcher - only show if no invite token was provided */}
        {!initialToken && (
          <div className="flex mb-6 bg-gray-900 rounded-lg p-1">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); }}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'login'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(''); }}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'signup'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Sign Up
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-xl p-8 shadow-xl">
          {mode === 'signup' && (
            <>
              {/* Invite Token Input */}
              <div className="mb-6">
                <label htmlFor="token" className="block text-gray-400 text-sm mb-2">
                  Invite Code
                </label>
                <input
                  id="token"
                  type="text"
                  value={token}
                  onChange={(e) => {
                    setToken(e.target.value);
                    setInviteInfo(null);
                  }}
                  onBlur={handleTokenBlur}
                  className={`w-full px-4 py-3 bg-gray-800 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all ${
                    inviteInfo?.valid
                      ? 'border-green-500 focus:border-green-500 focus:ring-green-500/20'
                      : 'border-gray-700 focus:border-blue-500 focus:ring-blue-500/20'
                  }`}
                  placeholder="Paste your invite code"
                  required
                  disabled={!!initialToken && inviteInfo?.valid}
                />
                {inviteInfo?.valid && (
                  <p className="mt-2 text-green-400 text-sm">Valid invite - expires {new Date(inviteInfo.expiresAt).toLocaleDateString()}</p>
                )}
              </div>
            </>
          )}

          <div className="mb-6">
            <label htmlFor="username" className="block text-gray-400 text-sm mb-2">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              placeholder="Enter username"
              required
            />
          </div>

          {mode === 'signup' && (
            <div className="mb-6">
              <label htmlFor="email" className="block text-gray-400 text-sm mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-50"
                placeholder="Enter email"
                required
                disabled={!!inviteInfo?.emailRequired}
              />
              {inviteInfo?.emailRequired && (
                <p className="mt-2 text-gray-500 text-sm">Email is pre-set by invite</p>
              )}
            </div>
          )}

          <div className="mb-6">
            <label htmlFor="password" className="block text-gray-400 text-sm mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              placeholder={mode === 'signup' ? '8+ chars, uppercase, lowercase, number' : 'Enter password'}
              required
              minLength={mode === 'signup' ? 8 : undefined}
            />
          </div>

          {mode === 'signup' && (
            <div className="mb-6">
              <label htmlFor="confirmPassword" className="block text-gray-400 text-sm mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                placeholder="Confirm password"
                required
              />
            </div>
          )}

          {error && (
            <div className="mb-6 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || (mode === 'signup' && !inviteInfo?.valid)}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
          >
            {isLoading
              ? (mode === 'signup' ? 'Creating account...' : 'Signing in...')
              : (mode === 'signup' ? 'Create Account' : 'Sign In')
            }
          </button>
        </form>
      </div>
    </div>
  );
}
