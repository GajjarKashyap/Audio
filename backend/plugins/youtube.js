const { exec } = require("child_process");
const { promisify } = require("util");

const execAsync = promisify(exec);

async function searchSongs(query) {
  try {
    const cmd = `yt-dlp "ytsearch10:${query}" --dump-json --flat-playlist --no-warnings`;
    const { stdout } = await execAsync(cmd, { timeout: 15000 });

    const lines = stdout.trim().split("\n").filter(Boolean);
    return lines.map((line) => {
      const item = JSON.parse(line);
      return {
        id: item.id,
        title: item.title || "Unknown",
        artist: item.uploader || item.channel || "Unknown",
        thumbnail: item.thumbnail || `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
        duration: item.duration || 0,
        source: "youtube"
      };
    });
  } catch {
    return [];
  }
}

async function getStreamUrl(id) {
  try {
    const cmd = `yt-dlp -f bestaudio --get-url "https://www.youtube.com/watch?v=${id}" --no-warnings`;
    const { stdout } = await execAsync(cmd, { timeout: 20000 });
    return { url: stdout.trim() };
  } catch {
    return { url: null };
  }
}

module.exports = { name: "youtube", searchSongs, getStreamUrl };
