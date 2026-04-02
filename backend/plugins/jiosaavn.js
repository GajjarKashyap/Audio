const axios = require("axios");

const BASE = "https://www.jiosaavn.com/api.php";

async function searchSongs(query) {
  try {
    const res = await axios.get(BASE, {
      params: {
        __call: "search.getResults",
        _format: "json",
        _marker: "0",
        api_version: "4",
        ctx: "web6dot0",
        query,
        n: "10",
        p: "1"
      },
      timeout: 8000
    });

    const results = res.data?.results || [];
    return results.map((item) => ({
      id: item.id,
      title: item.title?.replace(/&amp;/g, "&") || "Unknown",
      artist: item.more_info?.singers || item.subtitle || "Unknown",
      thumbnail: item.image?.replace("150x150", "500x500") || "",
      duration: parseInt(item.more_info?.duration || "0"),
      source: "jiosaavn"
    }));
  } catch {
    return [];
  }
}

async function getStreamUrl(id) {
  try {
    const res = await axios.get(BASE, {
      params: {
        __call: "song.generateAuthToken",
        _format: "json",
        _marker: "0",
        api_version: "4",
        ctx: "web6dot0",
        bitrate: "320",
        url: `https://www.jiosaavn.com/song/x/${id}`
      },
      timeout: 8000
    });

    const url = res.data?.auth_url;
    return { url: url || null };
  } catch {
    return { url: null };
  }
}

module.exports = { name: "jiosaavn", searchSongs, getStreamUrl };
