const { execFile } = require("child_process");
const { promisify } = require("util");
const fs = require("fs");
const path = require("path");

const execFileAsync = promisify(execFile);

// Shared cookies if user linked Youtube
const COOKIES_PATH = path.join(__dirname, "..", "data", "cookies.txt");

function getCookieArgs() {
  if (fs.existsSync(COOKIES_PATH)) {
    return ["--cookies", COOKIES_PATH];
  }
  return [];
}

function decodeText(value = "") {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

async function tryYtDlp(id) {
  const commands = ["yt-dlp", "yt-dlp.exe"];

  for (const command of commands) {
    try {
      const { stdout } = await execFileAsync(
        command,
        [
          "-f", "ba/b",
          "--get-url",
          "--no-warnings",
          "--no-check-certificate",
          "--geo-bypass",
          "--js-runtimes", `node:${process.execPath}`,
          ...getCookieArgs(),
          "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          `https://music.youtube.com/watch?v=${id}`
        ],
        { timeout: 25000 }
      );

      const url = stdout.trim().split(/\r?\n/).find(Boolean);
      if (url) {
        return { url };
      }
    } catch (error) {
      continue;
    }
  }

  return null;
}

module.exports = {
  async search(query) {
    if (!query) {
      return [];
    }

    try {
      // Use yt-dlp using standard ytsearch prefix
      const maxResults = 12;
      const { stdout } = await execFileAsync("yt-dlp", ["ytsearch" + maxResults + ":" + query, "--dump-json", "--flat-playlist", "--no-warnings"], { timeout: 15000 });
      const lines = stdout.trim().split("\n").filter(Boolean);
      
      return lines.map((line) => {
        const item = JSON.parse(line);
        return {
          id: item.id,
          title: decodeText(item.title) || "Unknown",
          // YouTube Music correctly maps artist string in most extractions, fallback to empty string
          artist: decodeText(item.uploader || item.channel || item.artist) || "YT Music Entry",
          // Use high quality default fallback
          thumbnail: item.thumbnail || `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
          duration: item.duration || 0,
          source: "YoutubeMusicProvider"
        };
      });
    } catch (err) {
      console.error("[youtube-music] search failed:", err.message);
      return [];
    }
  },

  async stream(id) {
    const ytdlpResult = await tryYtDlp(id);
    if (ytdlpResult?.url) {
      return ytdlpResult;
    }

    throw new Error("Could not extract stream URL for YouTube Music from yt-dlp");
  }
};
