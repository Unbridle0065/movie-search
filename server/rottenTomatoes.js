import * as cheerio from 'cheerio';
import { fetchWithTimeout } from './fetchWithTimeout.js';

export async function fetchRottenTomatoesScores(movieTitle, year) {
  // Create a URL-friendly slug from the movie title
  const slug = movieTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

  // Try direct URL first, then search
  const urls = [
    `https://www.rottentomatoes.com/m/${slug}_${year}`,
    `https://www.rottentomatoes.com/m/${slug}`,
  ];

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
  };

  for (const url of urls) {
    try {
      const response = await fetchWithTimeout(url, { headers, timeout: 10000 });
      if (response.status === 403) {
        console.warn(`RT blocked (403) for ${url}`);
        return { error: 'blocked', criticScore: null, audienceScore: null, url: null };
      }
      if (response.status === 429) {
        console.warn(`RT rate limited (429) for ${url}`);
        return { error: 'rate_limited', criticScore: null, audienceScore: null, url: null };
      }
      if (!response.ok) continue;

      const html = await response.text();
      const scores = extractScores(html);

      if (scores.criticScore || scores.audienceScore) {
        return { ...scores, url };
      }
    } catch (e) {
      if (e.name === 'AbortError') {
        console.warn(`RT timeout for ${url}`);
      } else {
        console.error(`Failed to fetch ${url}:`, e.message);
      }
    }
  }

  // Fallback: search for the movie
  try {
    const searchUrl = `https://www.rottentomatoes.com/search?search=${encodeURIComponent(movieTitle)}`;
    const searchResponse = await fetchWithTimeout(searchUrl, { headers, timeout: 10000 });

    if (searchResponse.status === 403) {
      console.warn('RT blocked (403) on search');
      return { error: 'blocked', criticScore: null, audienceScore: null, url: null };
    }
    if (searchResponse.status === 429) {
      console.warn('RT rate limited (429) on search');
      return { error: 'rate_limited', criticScore: null, audienceScore: null, url: null };
    }

    if (searchResponse.ok) {
      const searchHtml = await searchResponse.text();
      const $search = cheerio.load(searchHtml);

      // Find movie link
      let movieUrl = null;
      $search('search-page-media-row').each((_, el) => {
        const $el = $search(el);
        const resultYear = $el.attr('release-year');
        if (resultYear && Math.abs(parseInt(resultYear) - parseInt(year)) <= 1) {
          const link = $el.find('a[href*="/m/"]').attr('href');
          if (link && !movieUrl) {
            movieUrl = link.startsWith('http') ? link : `https://www.rottentomatoes.com${link}`;
          }
        }
      });

      if (movieUrl) {
        const movieResponse = await fetchWithTimeout(movieUrl, { headers, timeout: 10000 });
        if (movieResponse.ok) {
          const html = await movieResponse.text();
          const scores = extractScores(html);
          return { ...scores, url: movieUrl };
        }
      }
    }
  } catch (e) {
    if (e.name === 'AbortError') {
      console.warn('RT timeout on search');
    } else {
      console.error('RT search failed:', e.message);
    }
  }

  return { error: 'not_found', criticScore: null, audienceScore: null, url: null };
}

function extractScores(html) {
  let criticScore = null;
  let audienceScore = null;

  // Method 1: Extract from JSON in the page (most reliable)
  // Look for "criticsScore":{"score":"XX"} and "audienceScore":{"score":"XX"}
  const criticMatch = html.match(/"criticsScore":\s*\{[^}]*"score"\s*:\s*"(\d+)"/);
  const audienceMatch = html.match(/"audienceScore":\s*\{[^}]*"score"\s*:\s*"(\d+)"/);

  if (criticMatch) {
    criticScore = criticMatch[1];
  }
  if (audienceMatch) {
    audienceScore = audienceMatch[1];
  }

  // Method 2: Try score-board attributes
  if (!criticScore || !audienceScore) {
    const $ = cheerio.load(html);
    const scoreBoard = $('score-board, media-scorecard, rt-scorecard').first();

    if (scoreBoard.length) {
      if (!criticScore) {
        criticScore = scoreBoard.attr('tomatometerscore') ||
                      scoreBoard.attr('criticscore') ||
                      scoreBoard.attr('critics-score');
      }
      if (!audienceScore) {
        audienceScore = scoreBoard.attr('audiencescore') ||
                        scoreBoard.attr('audience-score');
      }
    }
  }

  return {
    criticScore: criticScore ? `${criticScore}%` : null,
    audienceScore: audienceScore ? `${audienceScore}%` : null
  };
}
