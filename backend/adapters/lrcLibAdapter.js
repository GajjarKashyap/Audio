const axios = require("axios");

module.exports = {
  async lyrics(trackName, artistName, duration) {
    try {
      const response = await axios.get("https://lrclib.net/api/get", {
        params: {
          track_name: trackName,
          artist_name: artistName,
          duration: duration
        },
        timeout: 5000
      });

      if (response.status === 200) {
        return {
          plain: response.data.plainLyrics,
          synced: response.data.syncedLyrics,
          found: true
        };
      }
    } catch (error) {
      return { found: false, error: error.message };
    }
    return { found: false };
  }
};
