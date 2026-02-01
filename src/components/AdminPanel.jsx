import { useState, useEffect } from 'react';

export default function AdminPanel({ onClose }) {
  const [invites, setInvites] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Create invite form state
  const [expiresIn, setExpiresIn] = useState('7d');
  const [emailAllowed, setEmailAllowed] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');

  useEffect(() => {
    fetchInvites();
  }, []);

  async function fetchInvites() {
    try {
      const response = await fetch('/api/admin/invites', {
        credentials: 'include'
      });
      const data = await response.json();
      if (response.ok) {
        setInvites(data.invites || []);
      } else {
        setError(data.error || 'Failed to load invites');
      }
    } catch (_err) {
      setError('Failed to load invites');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateInvite(e) {
    e.preventDefault();
    setIsCreating(true);
    setError('');
    setSuccess('');
    setGeneratedLink('');

    try {
      const response = await fetch('/api/admin/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          expiresIn,
          emailAllowed: emailAllowed || null,
          maxUses: 1
        })
      });

      const data = await response.json();

      if (response.ok) {
        setGeneratedLink(data.inviteUrl);
        setEmailAllowed('');
        fetchInvites();
      } else {
        setError(data.error || 'Failed to create invite');
      }
    } catch (_err) {
      setError('Failed to create invite');
    } finally {
      setIsCreating(false);
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(generatedLink);
      setSuccess('Link copied to clipboard!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (_err) {
      setError('Failed to copy link');
    }
  }

  async function handleRevoke(inviteId) {
    if (!confirm('Are you sure you want to revoke this invite?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/invites/${inviteId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        fetchInvites();
        setSuccess('Invite revoked');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to revoke invite');
      }
    } catch (_err) {
      setError('Failed to revoke invite');
    }
  }

  async function handleDelete(inviteId) {
    if (!confirm('Are you sure you want to permanently delete this invite?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/invites/${inviteId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        fetchInvites();
        setSuccess('Invite deleted');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete invite');
      }
    } catch (_err) {
      setError('Failed to delete invite');
    }
  }

  function formatDate(dateStr) {
    // Handle SQLite datetime format (no timezone) by appending Z for UTC
    const normalized = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + 'Z';
    return new Date(normalized).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  function getStatusBadge(status) {
    const styles = {
      active: 'bg-green-900/50 text-green-300 border-green-700',
      expired: 'bg-gray-800 text-gray-400 border-gray-700',
      exhausted: 'bg-blue-900/50 text-blue-300 border-blue-700',
      revoked: 'bg-red-900/50 text-red-300 border-red-700'
    };
    return (
      <span className={`px-2 py-0.5 text-xs rounded border ${styles[status] || styles.expired}`}>
        {status}
      </span>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-start justify-center z-50 overflow-y-auto">
      <div className="w-full max-w-lg mx-4 my-8 bg-gray-900 rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white">Admin Panel</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Create Invite Section */}
          <section>
            <h3 className="text-lg font-semibold text-white mb-4">Create Invite</h3>
            <form onSubmit={handleCreateInvite} className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">
                  Expires In
                </label>
                <select
                  value={expiresIn}
                  onChange={(e) => setExpiresIn(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="24h">24 hours</option>
                  <option value="7d">7 days</option>
                  <option value="30d">30 days</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={emailAllowed}
                  onChange={(e) => setEmailAllowed(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  placeholder="user@example.com"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isCreating}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-medium rounded-lg transition-colors text-lg"
              >
                {isCreating ? 'Generating...' : 'Generate Invite Link'}
              </button>
            </form>

            {/* Generated Link Display */}
            {generatedLink && (
              <div className="mt-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
                <p className="text-gray-400 text-sm mb-2">Your invite link:</p>
                <div className="bg-gray-950 p-3 rounded text-sm text-gray-300 break-all mb-3">
                  {generatedLink}
                </div>
                <button
                  onClick={handleCopyLink}
                  className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors text-lg flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  Copy Link
                </button>
              </div>
            )}
          </section>

          {/* Status Messages */}
          {error && (
            <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-green-900/50 border border-green-700 rounded-lg text-green-300 text-sm">
              {success}
            </div>
          )}

          {/* Active Invites Section */}
          <section>
            <h3 className="text-lg font-semibold text-white mb-4">Invites</h3>
            {isLoading ? (
              <p className="text-gray-400">Loading...</p>
            ) : invites.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No invites yet</p>
            ) : (
              <div className="space-y-3">
                {invites.map((invite) => (
                  <div
                    key={invite.id}
                    className="p-3 bg-gray-800 rounded-lg border border-gray-700"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getStatusBadge(invite.status)}
                          <span className="text-gray-400 text-sm">
                            {invite.uses}/{invite.max_uses} used
                          </span>
                        </div>
                        {invite.email_allowed && (
                          <p className="text-sm text-gray-400 truncate">
                            For: {invite.email_allowed}
                          </p>
                        )}
                        <p className="text-xs text-gray-500">
                          Created {formatDate(invite.created_at)} &bull; Expires {formatDate(invite.expires_at)}
                        </p>
                      </div>
                      {invite.status === 'active' && (
                        <button
                          onClick={() => handleRevoke(invite.id)}
                          className="px-3 py-1 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded transition-colors text-sm"
                        >
                          Revoke
                        </button>
                      )}
                      {invite.status === 'revoked' && (
                        <button
                          onClick={() => handleDelete(invite.id)}
                          className="px-3 py-1 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded transition-colors text-sm"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
