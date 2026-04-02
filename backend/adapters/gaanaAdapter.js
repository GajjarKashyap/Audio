const axios = require("axios");

function stripTags(value = "") {
  return value.replace(/<[^>]+>/g, "").trim();
}

function decodeEntities(value = "") {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function parseSearchResults(html) {
  const stateMatch = html.match(/window\.__PRELOADED_STATE__\s*=\s*(\{[\s\S]*?\})\s*<\/script>/);

  if (stateMatch) {
    try {
      const state = JSON.parse(stateMatch[1]);
      const entities = state?.entity;
      const rawSongs = Object.values(entities?.tracks || {});

      const mappedSongs = rawSongs
        .filter((song) => song?.seokey)
        .slice(0, 12)
        .map((song) => ({
          id: song.seokey,
          title: decodeEntities(stripTags(song.title || "Unknown title")),
          artist:
            song.primaryartist?.map((artist) => artist.name).filter(Boolean).join(", ") ||
            "Unknown artist",
          thumbnail: song.atw?.replace("size_m", "size_l") || song.artwork || "",
          duration: parseInt(song.duration || "0", 10),
          source: "GaanaProvider"
        }));

      if (mappedSongs.length) {
        return mappedSongs;
      }
    } catch (error) {
      // Fall through to HTML parsing.
    }
  }

  const items = [];
  const songPattern =
    /<a[^>]+href="\/song\/([^"]+)"[^>]*>(.*?)<\/a>[\s\S]{0,500}?<a[^>]+(?:class="[^"]*sng_art[^"]*"|href="\/artist\/[^"]+")?[^>]*>(.*?)<\/a>/gi;
  let match;

  while ((match = songPattern.exec(html)) && items.length < 12) {
    const [, slug, rawTitle, rawArtist] = match;
    items.push({
      id: slug,
      title: decodeEntities(stripTags(rawTitle)) || "Unknown title",
      artist: decodeEntities(stripTags(rawArtist)) || "Unknown artist",
      thumbnail: "",
      duration: 0,
      source: "GaanaProvider"
    });
  }

  return items;
}

async function fetchSongPage(slug) {
  const response = await axios.get(`https://gaana.com/song/${slug}`, {
    timeout: 8000,
    headers: { "User-Agent": "Mozilla/5.0" }
  });

  return response.data;
}

module.exports = {
  async search(query) {
    const response = await axios.get(`https://gaana.com/search/${encodeURIComponent(query)}`, {
      timeout: 8000,
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    return parseSearchResults(response.data);
  },

  async stream(id, context = {}) {
    const metadata = await this.metadata(id);
    const youtubeAdapter = context.manager?.getPluginByName("YoutubeProvider")?.adapter;

    if (!youtubeAdapter || !metadata) {
      throw new Error("Stream not found");
    }

    const candidates = await youtubeAdapter.search(`${metadata.title} ${metadata.artist} audio`, context);
    const first = candidates[0];

    if (!first?.id) {
      throw new Error("Stream not found");
    }

    return youtubeAdapter.stream(first.id, context);
  },

  async metadata(id) {
    const html = await fetchSongPage(id);
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    const imageMatch = html.match(/"og:image" content="([^"]+)"/i);
    const artistMatch = html.match(/"seokey":"[^"]+","name":"([^"]+)"/i);
    const durationMatch = html.match(/"duration":"([^"]+)"/i);

    return {
      id,
      title: decodeEntities(stripTags(titleMatch?.[1] || "Unknown title")),
      artist: decodeEntities(stripTags(artistMatch?.[1] || "Unknown artist")),
      thumbnail: imageMatch?.[1] || "",
      duration: parseInt(durationMatch?.[1] || "0", 10),
      source: "GaanaProvider"
    };
  }
};
