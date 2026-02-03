import * as cheerio from 'cheerio';

export async function fetchImdbRating(imdbId) {
  const url = `https://www.imdb.com/title/${imdbId}/`;

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
    return null;
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // Extract __NEXT_DATA__ JSON
  const nextDataScript = $('#__NEXT_DATA__').html();
  if (!nextDataScript) {
    console.error('Could not find __NEXT_DATA__ script');
    return null;
  }

  let nextData;
  try {
    nextData = JSON.parse(nextDataScript);
  } catch (e) {
    console.error('Failed to parse __NEXT_DATA__ JSON:', e);
    return null;
  }

  // Navigate to the rating data
  const aboveTheFold = nextData?.props?.pageProps?.aboveTheFoldData;
  const ratingsSummary = aboveTheFold?.ratingsSummary;
  const certificate = aboveTheFold?.certificate;
  const plot = aboveTheFold?.plot?.plotText?.plainText;

  return {
    rating: ratingsSummary?.aggregateRating || null,
    voteCount: ratingsSummary?.voteCount || null,
    mpaaRating: certificate?.rating || null,
    plot: plot || null
  };
}
