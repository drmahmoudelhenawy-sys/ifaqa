const https = require('https');
const http = require('http');

async function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function testStream(url) {
  return new Promise((resolve) => {
    try {
      const mod = url.startsWith('https') ? https : http;
      const req = mod.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        let icy = Object.entries(res.headers).filter(([k]) => k.startsWith('icy-'));
        let info = {
          url,
          status: res.statusCode,
          contentType: res.headers['content-type'],
          location: res.headers['location'],
          icy: icy.length ? Object.fromEntries(icy) : undefined
        };
        res.destroy();
        resolve(info);
      });
      req.on('error', (e) => resolve({ url, error: e.message }));
      req.setTimeout(6000, () => {
        req.destroy();
        resolve({ url, error: 'TIMEOUT' });
      });
    } catch(e) {
      resolve({ url, error: e.message });
    }
  });
}

async function main() {
  console.log('Searching for streams...');
  const page = await fetchPage('https://onlineradiobox.com/eg/quran/');
  
  // Find station stream json endpoint
  // OnlineRadioBox uses /json/station/{id}/stream or similar
  const idMatch = page.match(/station_id\s*=\s*['"]?(\d+)['"]?/i) || page.match(/\/(\d+)\.v\d+\.png/);
  console.log('Station ID match:', idMatch ? idMatch[1] : 'none');

  // Let's test OnlineRadioBox stream endpoints
  const streamInfo = await fetchPage('https://onlineradiobox.com/json/eg/quran/play?platform=web');
  console.log('Stream info response:', streamInfo);
}

main().catch(console.error);
