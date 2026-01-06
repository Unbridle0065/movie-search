import * as cheerio from 'cheerio';

const CATEGORY_MAP = {
  'NUDITY': 'Sex & Nudity',
  'VIOLENCE': 'Violence & Gore',
  'PROFANITY': 'Profanity',
  'ALCOHOL': 'Alcohol, Drugs & Smoking',
  'FRIGHTENING': 'Frightening & Intense Scenes'
};

export async function fetchParentsGuide(imdbId) {
  const url = `https://www.imdb.com/title/${imdbId}/parentalguide`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
    }
  });

  if (!response.ok) {
    console.error(`IMDB returned ${response.status} for ${url}`);
    return { error: 'Unable to fetch parents guide', link: url };
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // Extract __NEXT_DATA__ JSON
  const nextDataScript = $('#__NEXT_DATA__').html();
  if (!nextDataScript) {
    console.error('Could not find __NEXT_DATA__ script');
    return { error: 'Unable to parse parents guide', link: url };
  }

  let nextData;
  try {
    nextData = JSON.parse(nextDataScript);
  } catch (e) {
    console.error('Failed to parse __NEXT_DATA__ JSON:', e);
    return { error: 'Unable to parse parents guide', link: url };
  }

  // Navigate to the parental guide data
  const pageProps = nextData?.props?.pageProps;
  const categories = pageProps?.contentData?.data?.title?.parentsGuide?.categories || [];
  const nonSpoilerCategories = pageProps?.contentData?.data?.title?.parentsGuide?.nonSpoilerCategories || [];

  const guide = {};

  // Build severity map from categories
  const severityMap = {};
  for (const cat of categories) {
    const id = cat.category?.id;
    const severity = cat.severity?.text || 'Unknown';
    if (id) {
      severityMap[id] = severity;
    }
  }

  // Get items from nonSpoilerCategories
  for (const cat of nonSpoilerCategories) {
    const id = cat.category?.id;
    if (!id || !CATEGORY_MAP[id]) continue;

    const items = [];
    const edges = cat.guideItems?.edges || [];

    for (const edge of edges) {
      const text = edge.node?.text?.plaidHtml;
      if (text) {
        // Clean up HTML entities and tags
        const cleanText = text
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/<[^>]*>/g, '');
        items.push(cleanText);
      }
    }

    guide[id.toLowerCase()] = {
      name: CATEGORY_MAP[id],
      severity: severityMap[id] || 'Unknown',
      items
    };
  }

  // Ensure all categories exist even if empty
  for (const [id, name] of Object.entries(CATEGORY_MAP)) {
    const key = id.toLowerCase();
    if (!guide[key]) {
      guide[key] = {
        name,
        severity: severityMap[id] || 'Unknown',
        items: []
      };
    }
  }

  guide.link = url;
  return guide;
}
