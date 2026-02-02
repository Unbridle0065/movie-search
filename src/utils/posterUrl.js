/**
 * Returns a proxied URL for movie poster images.
 * This routes images through our backend to bypass browser tracking protection
 * that blocks third-party CDN requests (TMDB, Amazon) in private browsing.
 */
export function getPosterUrl(originalUrl) {
  if (!originalUrl || originalUrl === 'N/A') {
    return null;
  }

  return `/api/poster-proxy?url=${encodeURIComponent(originalUrl)}`;
}
