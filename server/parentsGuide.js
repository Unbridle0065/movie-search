const GRAPHQL_URL = 'https://graphql.imdb.com/';

const CATEGORY_MAP = {
  'NUDITY': 'Sex & Nudity',
  'VIOLENCE': 'Violence & Gore',
  'PROFANITY': 'Profanity',
  'ALCOHOL': 'Alcohol, Drugs & Smoking',
  'FRIGHTENING': 'Frightening & Intense Scenes'
};

const PARENTS_GUIDE_QUERY = `
  query ParentsGuide($id: ID!) {
    title(id: $id) {
      parentsGuide {
        categories {
          category {
            id
            text
          }
          severity {
            text
          }
          guideItems(first: 50) {
            total
            edges {
              node {
                text {
                  plainText
                }
                isSpoiler
              }
            }
          }
        }
      }
    }
  }
`;

export async function fetchParentsGuide(imdbId) {
  const link = `https://www.imdb.com/title/${imdbId}/parentalguide`;

  try {
    const response = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      body: JSON.stringify({
        query: PARENTS_GUIDE_QUERY,
        variables: { id: imdbId }
      })
    });

    if (!response.ok) {
      console.error(`IMDB GraphQL returned ${response.status}`);
      return { error: 'Unable to fetch parents guide', link };
    }

    const json = await response.json();
    const categories = json?.data?.title?.parentsGuide?.categories || [];

    if (categories.length === 0) {
      return { error: 'No parents guide data available', link };
    }

    const guide = {};

    for (const cat of categories) {
      const id = cat.category?.id;
      if (!id || !CATEGORY_MAP[id]) continue;

      const edges = cat.guideItems?.edges || [];
      const nonSpoilerItems = [];
      let spoilerCount = 0;

      for (const edge of edges) {
        if (edge.node?.isSpoiler) {
          spoilerCount++;
        } else {
          const text = edge.node?.text?.plainText;
          if (text) {
            nonSpoilerItems.push(text);
          }
        }
      }

      guide[id.toLowerCase()] = {
        name: CATEGORY_MAP[id],
        severity: cat.severity?.text || 'Unknown',
        items: nonSpoilerItems,
        spoilerCount
      };
    }

    // Ensure all categories exist even if empty
    for (const [id, name] of Object.entries(CATEGORY_MAP)) {
      const key = id.toLowerCase();
      if (!guide[key]) {
        guide[key] = {
          name,
          severity: 'Unknown',
          items: [],
          spoilerCount: 0
        };
      }
    }

    guide.link = link;
    return guide;
  } catch (error) {
    console.error('Error fetching parents guide:', error);
    return { error: 'Unable to fetch parents guide', link };
  }
}
