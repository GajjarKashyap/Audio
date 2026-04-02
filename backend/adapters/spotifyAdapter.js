const axios = require("axios");
const fs = require("fs");
const path = require("path");

let token = null;
let tokenExpiry = 0;

function toYouTubeBackfill(items = []) {
  return items.map((track) => ({
    ...track,
    source: "SpotifyProvider"
  }));
}

async function searchViaYoutube(query, context = {}) {
  const youtubeAdapter =
    context.dependencies?.YoutubeProvider || context.manager?.getPluginByName("YoutubeProvider")?.adapter;

  if (!youtubeAdapter) {
    return [];
  }

  const results = await youtubeAdapter.search(query, context);
  return toYouTubeBackfill(results);
}

// Try multiple token methods
async function fetchToken() {
  // Method 0: Using user's linked sp_dc Cookie
  const spotifyCookiePath = path.join(__dirname, "..", "data", "spotify_sp_dc.txt");
  if (fs.existsSync(spotifyCookiePath)) {
    try {
      const sp_dc = fs.readFileSync(spotifyCookiePath, "utf-8").trim();
      const resp = await axios.get("https://open.spotify.com/get_access_token?reason=transport&productType=web_player", {
        headers: {
          "User-Agent": "Mozilla/5.0",
          cookie: `sp_dc=${sp_dc}`
        },
        timeout: 8000
      });
      if (resp.data?.accessToken) {
        token = resp.data.accessToken;
        tokenExpiry = Date.now() + (resp.data.accessTokenExpirationTimestampMs - Date.now()) * 0.9;
        return;
      }
    } catch {}
  }

  // Method 1: Spotify open access token (public web player)
  try {
    const resp = await axios.get(
      "https://open.spotify.com/get_access_token?reason=transport&productType=embed",

      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json",
          "Origin": "https://open.spotify.com",
          "Referer": "https://open.spotify.com/"
        },
        timeout: 8000
      }
    );
    if (resp.data?.accessToken) {
      token = resp.data.accessToken;
      tokenExpiry = Date.now() + 3500000; // ~58 min
      return;
    }
  } catch {}

  // Method 2: Spotify embed token (most reliable, no auth needed)
  try {
    const embedResp = await axios.get(
      "https://open.spotify.com/embed/track/4PTG3Z6ehGkBFwjybzWkR8",
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        },
        timeout: 8000
      }
    );
    const match = embedResp.data.match(/"accessToken":"([^"]+)"/);
    if (match?.[1]) {
      token = match[1];
      tokenExpiry = Date.now() + 3500000;
      return;
    }
  } catch {}

  throw new Error("Could not get Spotify token");
}

async function getToken() {
  if (!token || Date.now() > tokenExpiry) {
    await fetchToken();
  }
  return token;
}

async function getTrack(id) {
  const accessToken = await getToken();
  const response = await axios.get(`https://api.spotify.com/v1/tracks/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    timeout: 8000
  });

  return response.data;
}

module.exports = {
  async search(query, context = {}) {
    try {
      const accessToken = await getToken();
      const response = await axios.get("https://api.spotify.com/v1/search", {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { q: query, type: "track", limit: 10 },
        timeout: 8000
      });

      return response.data.tracks.items.map((track) => ({
        id: track.id,
        title: track.name,
        artist: track.artists.map((artist) => artist.name).join(", "),
        thumbnail: track.album?.images?.[0]?.url || "",
        duration: Math.floor(track.duration_ms / 1000),
        source: "SpotifyProvider"
      }));
    } catch (error) {
      return searchViaYoutube(query, context);
    }
  },

  async stream(id, context = {}) {
    // If id is not 22 chars, it's definitely a YouTube fallback ID from searchViaYoutube
    if (id.length !== 22) {
      return { youtubeId: id };
    }

    try {
      const track = await getTrack(id);
      const youtubeAdapter = context.dependencies?.YoutubeProvider;

      if (!youtubeAdapter) {
        throw new Error("YoutubeProvider dependency missing");
      }

      const searchQuery = `${track.name} ${track.artists.map((artist) => artist.name).join(" ")} audio`;
      const candidates = await youtubeAdapter.search(searchQuery);
      const first = candidates[0];

      if (!first?.id) {
        throw new Error("No playable match found");
      }

      // Return youtubeId so /play can use yt-dlp direct pipe (avoids 403)
      return { youtubeId: first.id };
    } catch (e) {
      return { youtubeId: id };
    }
  },

  async metadata(id) {
    try {
      const track = await getTrack(id);
      return {
        id: track.id,
        title: track.name,
        artist: track.artists.map((artist) => artist.name).join(", "),
        thumbnail: track.album?.images?.[0]?.url || "",
        duration: Math.floor(track.duration_ms / 1000),
        source: "SpotifyProvider"
      };
    } catch (error) {
      return null;
    }
  }
};
