require("dotenv").config();
const express = require("express");
const cors = require("cors");
const auth = require("./middleware/auth");
const { PluginManager } = require("./core/pluginManager");
const proxyStream = require("./utils/streamProxy");

const app = express();
const pluginManager = new PluginManager();

// --- 🚀 PERFORMANCE LAYER ---
// URL Cache: Remembers the direct audio link so we don't resolve it every time.
const URL_CACHE = new Map();

app.use(cors());
app.use(express.json());

app.use(auth);

app.get("/plugins", (_req, res) => {
  res.json({
    plugins: pluginManager.getPlugins().filter((plugin) => plugin.enabled && plugin.adapter).map((plugin) => ({
      id: plugin.id,
      name: plugin.name,
      type: plugin.type,
      enabled: plugin.enabled,
      hasAdapter: Boolean(plugin.adapter),
      dependencies: Object.keys(plugin.dependencies || {})
    }))
  });
});

app.get("/search", async (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.json([]);
  }

  const results = await pluginManager.searchAll(query);
  res.json(results);
});

app.get("/recommend", async (req, res) => {
  const { artist, track } = req.query;
  if (!artist || !track) {
    return res.status(400).json({ error: "Missing artist or track" });
  }

  // AI Logic: We search for a "Mix" based on the current song's artist/track
  // This piggybacks on YouTube's recommendation algorithm.
  const query = `${artist} ${track} Mix`;
  console.log(`[AI] Generating recommendations for: ${query}`);

  const results = await pluginManager.searchAll(query);
  // Filter out the exact song
  const filtered = results.filter(r => r.title !== track).slice(0, 8);
  res.json(filtered);
});

app.get("/lyrics", async (req, res) => {
  const { artist, track, duration } = req.query;
  if (!artist || !track) {
    return res.status(400).json({ error: "Missing artist or track" });
  }

  const result = await pluginManager.getLyrics(track, artist, duration);
  res.json(result);
});

app.get("/stream", async (req, res) => {
  const { id, source } = req.query;

  if (!id || !source) {
    return res.status(400).json({ error: "Missing id or source" });
  }

  // CHECK CACHE FIRST (The "Fast Load" Feature)
  const cacheKey = `${source}:${id}`;
  if (URL_CACHE.has(cacheKey)) {
    console.log(`[cache] HIT: ${cacheKey}`);
    return res.json({ url: URL_CACHE.get(cacheKey) });
  }

  try {
    console.log(`[cache] MISS: ${cacheKey}`);
    const result = await pluginManager.getStream(source, id);
    if (result && result.url) {
      URL_CACHE.set(cacheKey, result.url);
      // Auto-clear cache after 1 hour (YouTube links expire)
      setTimeout(() => URL_CACHE.delete(cacheKey), 3600000);
    }
    res.json(result);
  } catch (error) {
    console.error(`[stream] FAILED for ${source}:${id} ->`, error.message);
    res.status(404).json({ error: error.message || "Plugin not found" });
  }
});

app.get("/metadata", async (req, res) => {
  const { id, source } = req.query;

  if (!id || !source) {
    return res.status(400).json({ error: "Missing id or source" });
  }

  const result = await pluginManager.getMetadata(source, id);
  if (!result) {
    return res.status(404).json({ error: "Metadata not found" });
  }

  res.json(result);
});

// --- DIRECT PLAY ENDPOINT ---
// Any source that resolves to YouTube → yt-dlp pipes audio (no 403)
// Sources with direct URLs (SoundCloud, etc.) → axios fetch + pipe
app.get("/play", async (req, res) => {
  const { id, source } = req.query;

  if (!id || !source) {
    return res.status(400).json({ error: "Missing id or source" });
  }

  // Helper: pipe via yt-dlp (handles all YouTube auth internally)
  function pipeViaYtDlp(videoId) {
    console.log(`[play] yt-dlp PIPE: ${videoId} (from ${source})`);
    const ytAdapter = pluginManager.getPluginByName("YoutubeProvider")?.adapter;
    
    if (!ytAdapter?.streamDirect) {
      if (!res.headersSent) res.status(500).json({ error: "YouTube adapter missing" });
      return;
    }

    const proc = ytAdapter.streamDirect(videoId);
    let errorOutput = "";

    proc.stderr.on("data", (chunk) => { errorOutput += chunk.toString(); });

    res.set({
      "Content-Type": "audio/webm",
      "Accept-Ranges": "none",
      "Access-Control-Allow-Origin": "*",
      "Transfer-Encoding": "chunked",
      "Cache-Control": "no-cache"
    });

    proc.stdout.pipe(res);

    proc.on("error", (err) => {
      console.error(`[play] yt-dlp spawn error: ${err.message}`);
      if (!res.headersSent) res.status(500).json({ error: "yt-dlp not found" });
    });

    proc.on("close", (code) => {
      if (code !== 0) console.error(`[play] yt-dlp exit ${code}: ${errorOutput.slice(0, 200)}`);
    });

    req.on("close", () => { proc.kill("SIGTERM"); });
  }

  try {
    // --- All sources: resolve stream first ---
    const cacheKey = `${source}:${id}`;
    let result;

    if (URL_CACHE.has(cacheKey)) {
      console.log(`[play] cache HIT: ${cacheKey}`);
      result = { url: URL_CACHE.get(cacheKey) };
    } else {
      console.log(`[play] resolving: ${cacheKey}`);
      result = await pluginManager.getStream(source, id);
    }

    // If adapter fell back to YouTube, treat it as a YouTube request entirely
    if (result?.youtubeId) {
      console.log(`[play] ${source} → YouTube fallback: ${result.youtubeId}`);
      result = await pluginManager.getStream("YoutubeProvider", result.youtubeId);
    }

    // Otherwise, fetch the direct URL via axios
    if (!result?.url) {
      return res.status(404).json({ error: "No stream URL found" });
    }

    const streamUrl = result.url;
    if (!URL_CACHE.has(cacheKey)) {
      URL_CACHE.set(cacheKey, streamUrl);
      setTimeout(() => URL_CACHE.delete(cacheKey), 3600000);
    }

    const axios = require("axios");
    const urlObj = new URL(streamUrl);
    const rangeHeader = req.headers["range"];

    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "*/*",
      "Connection": "keep-alive"
    };

    if (rangeHeader) headers["Range"] = rangeHeader;

    if (urlObj.hostname.includes("saavn") || urlObj.hostname.includes("jiosaavn")) {
      headers["Referer"] = "https://www.jiosaavn.com/";
    } else {
      headers["Referer"] = urlObj.origin;
    }

    const upstream = await axios({
      method: "get",
      url: streamUrl,
      responseType: "stream",
      headers,
      timeout: 25000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      validateStatus: () => true
    });

    const success = upstream.status >= 200 && upstream.status < 400;

    if (!success) {
      console.error(`[play] upstream ${upstream.status} for ${urlObj.hostname}`);
      URL_CACHE.delete(cacheKey);
      return res.status(502).json({ error: `Provider returned ${upstream.status}` });
    }

    res.status(upstream.status);
    res.set({
      "Content-Type": upstream.headers["content-type"] || "audio/mpeg",
      "Accept-Ranges": "bytes",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Expose-Headers": "Content-Range, Content-Length"
    });

    if (upstream.headers["content-length"]) res.set("Content-Length", upstream.headers["content-length"]);
    if (upstream.headers["content-range"]) res.set("Content-Range", upstream.headers["content-range"]);

    upstream.data.pipe(res);
  } catch (error) {
    console.error(`[play] FAILED for ${source}:${id} ->`, error.message);
    URL_CACHE.delete(`${source}:${id}`);
    if (!res.headersSent) res.status(500).json({ error: error.message || "Stream failed" });
  }
});

app.get("/proxy", proxyStream);

// --- ACCOUNT LINKING (IN-APP) ---
const fs = require("fs");
const path = require("path");
const { linkAccount } = require("./linkApp");

const cookiesPath = path.join(__dirname, "data", "cookies.txt");
const spotifyCookiesPath = path.join(__dirname, "data", "spotify_sp_dc.txt");

app.get("/api/link-status", (req, res) => {
  res.json({
    youtube: fs.existsSync(cookiesPath),
    spotify: fs.existsSync(spotifyCookiesPath)
  });
});

app.post("/api/link", async (req, res) => {
  const { provider } = req.body;
  if (!["youtube", "spotify"].includes(provider)) {
    return res.status(400).json({ error: "Invalid provider" });
  }

  try {
    // Launch puppeteer without blocking the HTTP request immediately
    // since it takes time for user to login
    linkAccount(provider).then(() => {
      console.log(`[auth] Successfully linked ${provider}!`);
    }).catch(e => {
      console.error(`[auth] Auto-link failed for ${provider}:`, e);
    });

    res.json({ success: true, message: `Started linking process for ${provider}. Check popup.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  const linked = fs.existsSync(cookiesPath);
  console.log(`Soundbound backend running on port ${PORT}`);
  if (linked) {
    console.log("[auth] ✅ YouTube account LINKED (cookies.txt found)");
  } else {
    console.log("[auth] ⚠️  YouTube NOT linked — run: node link-account.js");
  }
});
