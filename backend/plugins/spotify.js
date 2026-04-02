const axios = require("axios");

let token = null;
let tokenExpiry = 0;

async function fetchToken() {
  try {
    const res = await axios.get("https://open.spotify.com/get_access_token?reason=transport&productType=web_player", {
      headers: {
        "User-Agent": "Mozilla/5.0",
        cookie: "sp_t=1"
      },
      timeout: 8000
    });
    token = res.data.accessToken;
    tokenExpiry = Date.now() + (res.data.accessTokenExpirationTimestampMs - Date.now()) * 0.9;
  } catch {
    token = null;
  }
}

async function getToken() {
  if (!token || Date.now() > tokenExpiry) {
    await fetchToken();
  }
  return token;
}

async function searchSongs(query) {
  try {
    const t = await getToken();
    if (!t) {
      return [];
    }

    const res = await axios.get("https://api.spotify.com/v1/search", {
      headers: { Authorization: `Bearer ${t}` },
      params: { q: query, type: "track", limit: 10 },
      timeout: 8000
    });

    return res.data.tracks.items.map((track) => ({
      id: track.id,
      title: track.name,
      artist: track.artists.map((a) => a.name).join(", "),
      thumbnail: track.album?.images?.[0]?.url || "",
      duration: Math.floor(track.duration_ms / 1000),
      source: "spotify"
    }));
  } catch {
    return [];
  }
}

async function getStreamUrl(id) {
  const preview = `https://p.scdn.co/mp3-preview/${id}`;
  return { url: preview };
}

module.exports = { name: "spotify", searchSongs, getStreamUrl };
