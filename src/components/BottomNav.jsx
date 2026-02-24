export default function BottomNav({ activeView, onViewChange }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 z-40">
      <div className="flex">
        <button
          onClick={() => onViewChange('search')}
          className={`flex-1 flex flex-col items-center py-3 px-4 transition-colors ${
            activeView === 'search'
              ? 'text-blue-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="text-xs font-medium">Search</span>
        </button>

        <button
          onClick={() => onViewChange('trending')}
          className={`flex-1 flex flex-col items-center py-3 px-4 transition-colors ${
            activeView === 'trending'
              ? 'text-blue-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" strokeWidth={2} />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" />
          </svg>
          <span className="text-xs font-medium">Explore</span>
        </button>

        <button
          onClick={() => onViewChange('watchlist')}
          className={`flex-1 flex flex-col items-center py-3 px-4 transition-colors ${
            activeView === 'watchlist'
              ? 'text-blue-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          <span className="text-xs font-medium">My Movies</span>
        </button>
      </div>
    </nav>
  );
}
