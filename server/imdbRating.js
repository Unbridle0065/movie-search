import { fetchWithTimeout } from './fetchWithTimeout.js';

const GRAPHQL_URL = 'https://graphql.imdb.com/';

const TITLE_RATING_QUERY = `
  query TitleRating($id: ID!) {
    title(id: $id) {
      ratingsSummary { aggregateRating, voteCount }
      certificate { rating }
      plot { plotText { plainText } }
    }
  }
`;

export async function fetchImdbRating(imdbId) {
  try {
    const response = await fetchWithTimeout(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      body: JSON.stringify({
        query: TITLE_RATING_QUERY,
        variables: { id: imdbId }
      })
    });

    if (!response.ok) {
      console.error(`IMDB GraphQL returned ${response.status} for rating query on ${imdbId}`);
      return null;
    }

    const json = await response.json();
    const title = json?.data?.title;

    if (!title) {
      return null;
    }

    return {
      rating: title.ratingsSummary?.aggregateRating || null,
      voteCount: title.ratingsSummary?.voteCount || null,
      mpaaRating: title.certificate?.rating || null,
      plot: title.plot?.plotText?.plainText || null
    };
  } catch (error) {
    console.error(`IMDB rating fetch error for ${imdbId}:`, error.message);
    return null;
  }
}
