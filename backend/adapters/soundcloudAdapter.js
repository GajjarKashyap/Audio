const axios = require("axios");

let clientId = null;

async function fetchClientId() {
  const html = await axios.get("https://soundcloud.com", {
    timeout: 8000,
    headers: { "User-Agent": "Mozilla/5.0" }
  });

  const scripts = [...html.data.matchAll(/src="(https:\/\/a-v2\.sndcdn\.com\/assets\/[^"]+\.js)"/g)].map((match) => match[1]);

  for (const scriptUrl of scripts.slice(-6).reverse()) {
    try {
      const js = await axios.get(scriptUrl, { timeout: 8000 });
      const match = js.data.match(/client_id:"([a-zA-Z0-9]+)"/);
      if (match) {
        return match[1];
      }
    } catch (error) {
      continue;
    }
  }

  throw new Error("SoundCloud client id not found");
}

async function getClientId() {
  if (!clientId) {
    clientId = await fetchClientId();
  }

  return clientId;
}

module.exports = {
  async search(query) {
    const id = await getClientId();
    const response = await axios.get("https://api-v2.soundcloud.com/search/tracks", {
      params: { q: query, client_id: id, limit: 12 },
      timeout: 8000
    });

    return (response.data?.collection || [])
      .filter((track) => track?.streamable)
      .map((track) => ({
        id: String(track.id),
        title: track.title || "Unknown title",
        artist: track.user?.username || "Unknown artist",
        thumbnail: track.artwork_url || track.user?.avatar_url || "",
        duration: Math.round((track.duration || 0) / 1000),
        source: "SoundcloudProvider"
      }));
  },

  async stream(id) {
    const client = await getClientId();
    const trackResponse = await axios.get(`https://api-v2.soundcloud.com/tracks/${id}`, {
      params: { client_id: client },
      timeout: 8000
    });

    const media = trackResponse.data?.media?.transcodings || [];
    const candidate =
      media.find((item) => item.format?.protocol === "progressive") ||
      media.find((item) => item.format?.protocol === "hls");

    if (!candidate?.url) {
      throw new Error("Stream not found");
    }

    const streamResponse = await axios.get(candidate.url, {
      params: { client_id: client },
      timeout: 8000
    });

    return { url: streamResponse.data?.url };
  },

  async metadata(id) {
    const client = await getClientId();
    const response = await axios.get(`https://api-v2.soundcloud.com/tracks/${id}`, {
      params: { client_id: client },
      timeout: 8000
    });

    const track = response.data || {};
    return {
      id: String(track.id || id),
      title: track.title || "Unknown title",
      artist: track.user?.username || "Unknown artist",
      thumbnail: track.artwork_url || track.user?.avatar_url || "",
      duration: Math.round((track.duration || 0) / 1000),
      source: "SoundcloudProvider"
    };
  }
};
