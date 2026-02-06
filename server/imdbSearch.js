import { fetchWithTimeout } from './fetchWithTimeout.js';

const GRAPHQL_URL = 'https://graphql.imdb.com/';

const SEARCH_QUERY = `
  query Search($query: String!) {
    mainSearch(first: 20, options: { searchTerm: $query, type: TITLE, titleSearchOptions: { type: MOVIE } }) {
      edges {
        node {
          entity {
            ... on Title {
              id
              titleText { text }
              releaseYear { year }
              titleType { text }
              primaryImage { url }
            }
          }
        }
      }
    }
  }
`;

export async function searchImdb(query) {
  const response = await fetchWithTimeout(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    body: JSON.stringify({
      query: SEARCH_QUERY,
      variables: { query }
    })
  });

  if (!response.ok) {
    throw new Error(`IMDB GraphQL returned ${response.status}`);
  }

  const json = await response.json();
  const edges = json?.data?.mainSearch?.edges || [];

  return edges
    .map(edge => edge.node?.entity)
    .filter(entity => entity?.id && entity?.titleText?.text)
    .map(entity => ({
      Title: entity.titleText.text,
      Year: entity.releaseYear?.year?.toString() || 'N/A',
      imdbID: entity.id,
      Type: 'movie',
      Poster: entity.primaryImage?.url || 'N/A'
    }));
}
