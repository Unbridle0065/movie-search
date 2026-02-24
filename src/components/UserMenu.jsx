import { useState, useRef, useEffect } from 'react';

export default function UserMenu({ email, isAdmin, onLogout, onOpenAdmin }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="p-2 text-gray-400 hover:text-white transition-colors"
        aria-label="User menu"
        title="User menu"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-gray-800 rounded-lg shadow-lg border border-gray-700 overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-gray-700">
            <p className="text-sm text-gray-300 truncate">{email}</p>
          </div>

          {isAdmin && (
            <button
              onClick={() => { setOpen(false); onOpenAdmin(); }}
              className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
            >
              Invites
            </button>
          )}

          <button
            onClick={() => { setOpen(false); onLogout(); }}
            className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-gray-700 transition-colors"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
