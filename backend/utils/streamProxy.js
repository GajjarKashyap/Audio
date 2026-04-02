const axios = require("axios");

async function proxyStream(req, res) {
  const url = decodeURIComponent(req.query.url);
  const rangeHeader = req.headers["range"];

  try {
    const urlObj = new URL(url);
    const isYoutube = urlObj.hostname.includes("googlevideo.com") || urlObj.hostname.includes("youtube.com");
    const isSaavn = urlObj.hostname.includes("jiosaavn.com") || urlObj.hostname.includes("saavn.com");

    const commonUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    
    const headers = {
      "User-Agent": commonUA,
      "Range": rangeHeader || "bytes=0-",
      "Accept": "*/*",
      "Connection": "keep-alive"
    };

    // --- Dynamic Strategy ---
    if (isYoutube) {
      // YouTube/GoogleVideo URLs are IP-bound and often REJECT custom Referers with 403
      delete headers.Referer;
      delete headers.Origin;
    } else if (isSaavn) {
      headers.Referer = "https://www.jiosaavn.com/";
      headers.Origin = "https://www.jiosaavn.com/";
    } else {
      headers.Referer = urlObj.origin;
    }

    const response = await axios({
      method: "get",
      url,
      responseType: "stream",
      headers,
      timeout: 25000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      validateStatus: () => true
    });

    const success = response.status >= 200 && response.status < 400;
    
    res.status(success ? response.status : 502);
    res.set({
      "Content-Type": response.headers["content-type"] || "audio/webm",
      "Accept-Ranges": "bytes",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Range",
      "Access-Control-Expose-Headers": "Content-Range, Content-Length",
      "Cache-Control": "public, max-age=3600"
    });

    if (response.headers["content-length"]) {
      res.set("Content-Length", response.headers["content-length"]);
    }

    if (response.headers["content-range"]) {
      res.set("Content-Range", response.headers["content-range"]);
    }

    if (!success) {
      console.error(`[proxy] upstream failure ${response.status} for: ${urlObj.hostname}`);
      res.json({ error: `Provider returned ${response.status}` });
      response.data.destroy();
      return;
    }

    response.data.pipe(res);
  } catch (err) {
    console.error("[proxy] pipeline error:", err.message);
    res.status(500).json({ error: "Stream proxy failure" });
  }
}

module.exports = proxyStream;
