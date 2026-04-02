const axios = require("axios");

const BASE = "https://www.jiosaavn.com/api.php";

function mapSong(item) {
  const primaryArtists = item.more_info?.artistMap?.primary_artists || [];
  const fallbackArtist = primaryArtists.map((artist) => artist.name).filter(Boolean).join(", ");

  return {
    id: item.id,
    title: item.title?.replace(/&amp;/g, "&") || "Unknown title",
    artist: fallbackArtist || item.subtitle || "Unknown artist",
    thumbnail: item.image?.replace("150x150", "500x500") || "",
    duration: parseInt(item.more_info?.duration || "0", 10),
    source: "SaavnProvider"
  };
}

async function getYoutubeAdapter(context = {}) {
  return context.manager?.getPluginByName("YoutubeProvider")?.adapter || null;
}

module.exports = {
  async search(query) {
    const response = await axios.get(BASE, {
      params: {
        __call: "search.getResults",
        _format: "json",
        _marker: "0",
        api_version: "4",
        ctx: "web6dot0",
        q: query,
        n: "12",
        p: "1"
      },
      timeout: 8000
    });

    const results = response.data?.results || [];
    return results.map(mapSong);
  },

  async stream(id, context = {}) {
    try {
      const response = await axios.get(BASE, {
        params: {
          __call: "song.getDetails",
          _format: "json",
          _marker: "0",
          api_version: "4",
          ctx: "web6dot0",
          pids: id
        },
        timeout: 8000
      });

      const song = response.data?.[id] || Object.values(response.data || {})[0];
      
      // Try multiple URL fields that JioSaavn uses
      const directUrl = 
        song?.encrypted_media_url ||
        song?.more_info?.encrypted_media_url || // kept as fallback for old format
        song?.media_preview_url ||
        song?.more_info?.media_preview_url ||
        song?.vlink ||
        song?.more_info?.vlink ||
        song?.["320kbps"] ||
        song?.more_info?.["320kbps"] ||
        song?.perma_url;

      if (directUrl && directUrl.startsWith("http")) {
        // Convert preview quality to high quality if possible
        const highQualityUrl = directUrl
          .replace("preview.saavncdn.com", "aac.saavncdn.com")
          .replace("_96_p.mp4", "_320.mp4")
          .replace("_96.mp4", "_320.mp4");
        return { url: highQualityUrl };
      }
    } catch (error) {
      console.error("[saavn] stream lookup failed:", error.message);
    }

    // Last resort: return YouTube video ID for direct pipe streaming
    const metadata = await this.metadata(id);
    const youtubeAdapter = await getYoutubeAdapter(context);

    if (!youtubeAdapter || !metadata) {
      throw new Error("Stream not found");
    }

    const candidates = await youtubeAdapter.search(`${metadata.title} ${metadata.artist} audio`, context);
    const first = candidates[0];
    if (!first?.id) {
      throw new Error("Stream not found");
    }

    // Return youtubeId so /play can use yt-dlp direct pipe (avoids 403)
    return { youtubeId: first.id };
  },

  async metadata(id) {
    const response = await axios.get(BASE, {
      params: {
        __call: "song.getDetails",
        _format: "json",
        _marker: "0",
        api_version: "4",
        ctx: "web6dot0",
        pids: id
      },
      timeout: 8000
    });

    const song = response.data?.[id] || {};
    return {
      id,
      title: (song.song || song.title || "Unknown title").replace(/&amp;/g, "&"),
      artist: song.primary_artists || song.singers || song.subtitle || "Unknown artist",
      duration: parseInt(song.duration || "0", 10),
      source: "SaavnProvider"
    };
  }
};
