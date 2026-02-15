import { useState } from 'react';
import { getPosterUrl } from '../utils/posterUrl';

export default function MovieCard({ movie, onClick, index = 0 }) {
  const posterUrl = getPosterUrl(movie.Poster);
  const hasPoster = posterUrl !== null;
  const [loaded, setLoaded] = useState(false);

  return (
    <button
      onClick={onClick}
      style={{ animationDelay: `${Math.min(index * 50, 500)}ms` }}
      className="group relative overflow-hidden rounded-xl bg-gray-800 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/20 focus:outline-none focus:ring-2 focus:ring-blue-500 animate-fade-in-up opacity-0"
    >
      <div className="aspect-[2/3] overflow-hidden relative">
        {(!hasPoster || !loaded) && (
          <div className={`absolute inset-0 bg-gray-700 flex items-center justify-center ${hasPoster ? 'animate-pulse' : ''}`}>
            <div className="text-center p-4">
              <svg className="w-12 h-12 mx-auto text-gray-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
              </svg>
              {!hasPoster && <span className="text-gray-400 text-sm">{movie.Title}</span>}
            </div>
          </div>
        )}
        {hasPoster && (
          <img
            src={posterUrl}
            alt={movie.Title}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-110 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          />
        )}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
        <h3 className="text-white font-bold text-lg leading-tight">{movie.Title}</h3>
        <p className="text-gray-300 text-sm mt-1">{movie.Year}</p>
      </div>
    </button>
  );
}
