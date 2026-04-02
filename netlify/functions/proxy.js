const https = require('https');
const { URL } = require('url');

// Only allow fetching from trusted news domains
const ALLOWED_HOSTS = ['news.google.com'];

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

exports.handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }

  const targetUrl = event.queryStringParameters?.url;
  if (!targetUrl) {
    return { statusCode: 400, headers: CORS_HEADERS, body: 'Missing url parameter' };
  }

  let parsed;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return { statusCode: 400, body: 'Invalid URL' };
  }

  if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
    return { statusCode: 403, headers: CORS_HEADERS, body: 'Domain not allowed' };
  }

  return new Promise((resolve) => {
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        'Accept-Language': 'ja,en;q=0.9',
      },
      timeout: 10000,
    };

    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf-8');
        resolve({
          statusCode: 200,
          headers: {
            ...CORS_HEADERS,
            'Content-Type': 'text/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=180',
          },
          body,
        });
      });
    });

    req.on('error', (e) => resolve({ statusCode: 502, headers: CORS_HEADERS, body: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ statusCode: 504, headers: CORS_HEADERS, body: 'Timeout' }); });
    req.end();
  });
};
