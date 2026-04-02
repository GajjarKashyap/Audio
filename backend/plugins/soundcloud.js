const axios = require("axios");

let clientId = null;

async function fetchClientId() {
  try {
    const html = await axios.get("https://soundcloud.com", { timeout: 8000 });
    const scripts = [...html.data.matchAll(/src="(https:\/\/a-v2\.sndcdn\.com\/assets\/[^"]+\.js)"/g)].map((m) => m[1]);

    for (const scriptUrl of scripts.slice(-3)) {
      const js = await axios.get(scriptUrl, { timeout: 8000 });
      const match = js.data.match(/client_id:"([a-zA-Z0-9]+)"/);
      if (match) {
        return match[1];
      }
    }
  } catch {
    return null;
  }
  return null;
}

async function getClientId() {
  if (!clientId) {
    clientId = await fetchClientId();
  }
  return clientId;
}

async function searchSongs(query) {
  try {
    const id = await getClientId();
    if (!id) {
      return [];
    }

    const res = await axios.get("https://api-v2.soundcloud.com/search/tracks", {
      params: { q: query, client_id: id, limit: 10 },
      timeout: 8000
    });

    return res.data.collection.map((track) => ({
      id: String(track.id),
      title: track.title,
      artist: track.user?.username || "Unknown",
      thumbnail: track.artwork_url || "",
      duration: Math.floor(track.duration / 1000),
      source: "soundcloud"
    }));
  } catch {
    return [];
  }
}

async function getStreamUrl(id) {
  try {
    const cid = await getClientId();
    if (!cid) {
      return { url: null };
    }

    const res = await axios.get(`https://api-v2.soundcloud.com/tracks/${id}`, {
      params: { client_id: cid },
      timeout: 8000
    });

    const progressive = res.data.media?.transcodings?.find(
      (t) => t.format?.protocol === "progressive"
    );
    if (!progressive) {
      return { url: null };
    }

    const streamRes = await axios.get(progressive.url, {
      params: { client_id: cid },
      timeout: 8000
    });

    return { url: streamRes.data.url };
  } catch {
    return { url: null };
  }
}

module.exports = { name: "soundcloud", searchSongs, getStreamUrl };
