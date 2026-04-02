const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function test() {
  try {
    // Test Method 0 (sp_dc via get_access_token)
    console.log('--- Testing sp_dc token grab ---');
    if (fs.existsSync(path.join(__dirname, 'data', 'spotify_sp_dc.txt'))) {
      const sp_dc = fs.readFileSync(path.join(__dirname, 'data', 'spotify_sp_dc.txt'), 'utf8').trim();
      try {
        const r0 = await axios.get('https://open.spotify.com/get_access_token?reason=transport&productType=web_player', {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'cookie': 'sp_dc=' + sp_dc
          },
          timeout: 8000
        });
        console.log('Method 0 SUCCESS! Token starts with:', r0.data.accessToken.substring(0, 10));
      } catch (e) {
        console.log('Method 0 FAILED:', e.response ? e.response.status : e.message);
      }
    } else {
      console.log('sp_dc missing');
    }

    // Test Method 2 (embed token)
    console.log('--- Testing embed token grab ---');
    let token = null;
    try {
      const r = await axios.get('https://open.spotify.com/embed/track/0duXPhS37SY', {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      const match = r.data.match(/"accessToken":"([^"]+)"/);
      if (match) {
        token = match[1];
        console.log('Method 2 Token extracted! starts with:', token.substring(0, 10));
      } else {
        console.log('Method 2 Regex failed to find token');
      }
    } catch (e) {
      console.log('Method 2 Embed fetch failed:', e.response ? e.response.status : e.message);
    }

    if (token) {
      console.log('--- Testing API call with token ---');
      try {
        const r2 = await axios.get('https://api.spotify.com/v1/tracks/0duXPhS37SY', {
          headers: { Authorization: 'Bearer ' + token }
        });
        console.log('API SUCCESS! Track:', r2.data.name);
      } catch (e) {
        console.log('API FAILED:', e.response ? e.response.status : e.message);
      }
    }
  } catch (e) {
    console.log('Global error', e.message);
  }
}
test();
