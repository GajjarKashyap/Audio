const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

const COOKIES_DIR = path.join(__dirname, "data");
if (!fs.existsSync(COOKIES_DIR)) {
  fs.mkdirSync(COOKIES_DIR, { recursive: true });
}

function findBrowser() {
  const paths = [
    process.env["PROGRAMFILES"] + "\\Google\\Chrome\\Application\\chrome.exe",
    process.env["PROGRAMFILES(X86)"] + "\\Google\\Chrome\\Application\\chrome.exe",
    process.env.LOCALAPPDATA + "\\Google\\Chrome\\Application\\chrome.exe",
    process.env["PROGRAMFILES"] + "\\Microsoft\\Edge\\Application\\msedge.exe",
    process.env["PROGRAMFILES(X86)"] + "\\Microsoft\\Edge\\Application\\msedge.exe",
  ];
  return paths.find((p) => fs.existsSync(p)) || null;
}

async function linkAccount(provider) {
  const browserPath = findBrowser();
  if (!browserPath) {
    throw new Error("Could not find Chrome or Edge.");
  }

  const browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: false,
    ignoreDefaultArgs: ["--enable-automation"],
    args: [
      "--no-sandbox",
      "--disable-blink-features=AutomationControlled"
    ],
  });

  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

  if (provider === "youtube") {
    await page.goto("https://accounts.google.com/ServiceLogin?continue=https://music.youtube.com/");
    
    // Poll until SAPISID is found in cookies
    while (true) {
      const cookies = await page.cookies("https://music.youtube.com");
      if (cookies.some(c => c.name === "SAPISID")) {
        // Logged in!
        await page.goto("https://music.youtube.com/", { waitUntil: "networkidle2" });
        const finalCookies = await page.cookies("https://music.youtube.com");
        
        // Export to Netscape format
        const lines = ["# Netscape HTTP Cookie File", "# Generated for YouTube", ""];
        for (const c of finalCookies) {
          const domain = c.domain.startsWith(".") ? c.domain : "." + c.domain;
          const flag = "TRUE";
          const securePath = c.path || "/";
          const secure = c.secure ? "TRUE" : "FALSE";
          const expiry = c.expires ? Math.floor(c.expires) : "0";
          lines.push(`${domain}\t${flag}\t${securePath}\t${secure}\t${expiry}\t${c.name}\t${c.value}`);
        }
        fs.writeFileSync(path.join(COOKIES_DIR, "cookies.txt"), lines.join("\n"), "utf-8");
        break;
      }
      await new Promise(r => setTimeout(r, 2000));
    }
  } 
  else if (provider === "spotify") {
    await page.goto("https://accounts.spotify.com/en/login?continue=https://open.spotify.com/");
    
    // Poll until sp_dc is found in cookies
    while (true) {
      const cookies = await page.cookies("https://open.spotify.com");
      const sp_dc = cookies.find(c => c.name === "sp_dc");
      if (sp_dc) {
        // Export just the sp_dc value, or the whole list
        fs.writeFileSync(path.join(COOKIES_DIR, "spotify_sp_dc.txt"), sp_dc.value, "utf-8");
        break;
      }
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  await browser.close();
  return { success: true };
}

module.exports = { linkAccount };
