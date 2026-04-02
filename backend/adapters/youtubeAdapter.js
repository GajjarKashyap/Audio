const axios = require("axios");
const { execFile } = require("child_process");
const { promisify } = require("util");
const ytdl = require("@distube/ytdl-core");
const fs = require("fs");
const path = require("path");

const execFileAsync = promisify(execFile);

const COOKIES_PATH = path.join(__dirname, "..", "data", "cookies.txt");

// Get cookie args for yt-dlp (if user has linked their account)
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

function toSeconds(lengthText) {
  if (!lengthText) {
    return 0;
  }

  return lengthText
    .split(":")
    .map(Number)
    .reduce((total, part) => total * 60 + part, 0);
}

function parseVideos(html) {
  const marker = "var ytInitialData = ";
  const start = html.indexOf(marker);

  if (start === -1) {
    return [];
  }

  const afterMarker = html.slice(start + marker.length);
  const end = afterMarker.indexOf(";</script>");

  if (end === -1) {
    return [];
  }

  const jsonText = afterMarker.slice(0, end);
  const data = JSON.parse(jsonText);
  const sections =
    data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];

  const items = [];

  for (const section of sections) {
    const contents = section?.itemSectionRenderer?.contents || [];

    for (const item of contents) {
      const video = item?.videoRenderer;

      if (!video?.videoId) {
        continue;
      }

      const title = video.title?.runs?.map((part) => part.text).join("") || "Unknown title";
      const artist =
        video.ownerText?.runs?.map((part) => part.text).join("") ||
        video.longBylineText?.runs?.map((part) => part.text).join("") ||
        "Unknown artist";
      const thumbnail = video.thumbnail?.thumbnails?.at(-1)?.url || "";
      const durationText = video.lengthText?.simpleText || "";

      items.push({
        id: video.videoId,
        title: decodeText(title),
        artist: decodeText(artist),
        thumbnail,
        duration: toSeconds(durationText),
        source: "YoutubeProvider"
      });
    }
  }

  return items;
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
          `https://www.youtube.com/watch?v=${id}`
        ],
        { timeout: 25000 }
      );

      const url = stdout.trim().split(/\r?\n/).find(Boolean);
      if (url) {
        return { url };
      }
    } catch (error) {
      console.error(`[tryYtDlp] execFileAsync failed for ${command}:`, error.message);
      continue;
    }
  }

  return null;
}

function pickBestAudioFormat(formats = []) {
  const normalized = formats
    .filter((format) => format.hasAudio && format.url)
    .map((format) => ({
      format,
      score:
        (format.mimeType?.includes("mp4") ? 3 : format.mimeType?.includes("webm") ? 2 : 1) +
        (format.audioBitrate || format.bitrate || 0) / 1000
    }));

  if (!normalized.length) {
    return null;
  }

  return normalized.sort((left, right) => right.score - left.score)[0].format;
}

async function searchWithYtDlp(query, maxResults = 10) {
  try {
    const cmd = `yt-dlp "ytsearch${maxResults}:${query}" --dump-json --flat-playlist --no-warnings`;
    const { stdout } = await execFileAsync("yt-dlp", ["ytsearch" + maxResults + ":" + query, "--dump-json", "--flat-playlist", "--no-warnings"], { timeout: 15000 });
    const lines = stdout.trim().split("\n").filter(Boolean);
    return lines.map((line) => {
      const item = JSON.parse(line);
      return {
        id: item.id,
        title: decodeText(item.title) || "Unknown",
        artist: decodeText(item.uploader || item.channel) || "Unknown",
        thumbnail: item.thumbnail || `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
        duration: item.duration || 0,
        source: "YoutubeProvider"
      };
    });
  } catch (err) {
    console.error("[youtube] yt-dlp search failed:", err.message);
    return [];
  }
}

module.exports = {
  async search(query) {
    if (!query) {
      return [];
    }

    try {
      // Primary: Scraping for speed
      const response = await axios.get("https://www.youtube.com/results", {
        params: { search_query: query },
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html"
        },
        timeout: 5000
      });

      const items = parseVideos(response.data);
      if (items.length > 0) {
        return items.slice(0, 12);
      }
    } catch (err) {
      console.warn("[youtube] Scraping failed, falling back to yt-dlp", err.message);
    }

    // Secondary: yt-dlp for reliability
    return await searchWithYtDlp(query);
  },

  async stream(id) {
    const ytdlpResult = await tryYtDlp(id);
    if (ytdlpResult?.url) {
      return ytdlpResult;
    }

    try {
      const info = await ytdl.getInfo(`https://www.youtube.com/watch?v=${id}`);
      const format = pickBestAudioFormat(info.formats);

      if (!format?.url) {
        throw new Error("Failed to find any playable formats");
      }

      return { url: format.url };
    } catch (error) {
      throw new Error(error.message || "Failed to find any playable formats");
    }
  },

  async metadata(id) {
    const info = await ytdl.getBasicInfo(`https://www.youtube.com/watch?v=${id}`);
    return {
      id,
      title: info.videoDetails?.title || "Unknown title",
      artist: info.videoDetails?.author?.name || "Unknown artist",
      duration: Number(info.videoDetails?.lengthSeconds || 0),
      source: "YoutubeProvider"
    };
  },

  // Direct pipe: yt-dlp handles all headers/cookies/auth internally
  // Returns a child process whose stdout is the audio stream
  streamDirect(id) {
    const { spawn } = require("child_process");
    const args = [
      "-f", "ba/b",
      "-o", "-",
      "--no-warnings",
      "--no-check-certificate",
      "--geo-bypass",
      "--js-runtimes", `node:${process.execPath}`,
      ...getCookieArgs(),
      "--quiet",
      "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      `https://www.youtube.com/watch?v=${id}`
    ];

    const proc = spawn("yt-dlp", args, { stdio: ["ignore", "pipe", "pipe"] });
    return proc;
  }
};
