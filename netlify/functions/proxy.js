const https = require('https');
const { URL } = require('url');

// Only allow fetching from trusted news domains
const ALLOWED_HOSTS = ['news.google.com'];

exports.handler = async (event) => {
  const targetUrl = event.queryStringParameters?.url;
  if (!targetUrl) {
    return { statusCode: 400, body: 'Missing url parameter' };
  }

  let parsed;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return { statusCode: 400, body: 'Invalid URL' };
  }

  if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
    return { statusCode: 403, body: 'Domain not allowed' };
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
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'text/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=180',
          },
          body,
        });
      });
    });

    req.on('error', (e) => resolve({ statusCode: 502, body: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ statusCode: 504, body: 'Timeout' }); });
    req.end();
  });
};
