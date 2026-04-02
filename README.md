# ॐ Omstream - Premium Music Streaming Aggregator

![Omstream Banner](https://img.shields.io/badge/Architecture-Node.js%20%2F%20React-8A2BE2?style=for-the-badge) ![Design](https://img.shields.io/badge/Design-Golden%20Ratio%20%CF%95-FFD700?style=for-the-badge) ![Status](https://img.shields.io/badge/Status-Production%20Ready-green?style=for-the-badge)

**Omstream** is a professional-grade, high-performance music application that aggregates tracks from **Spotify**, **YouTube Music**, and **JioSaavn** into a single, unified interface. Built with mathematical precision using the **Golden Ratio ($\phi = 1.618$)**, it offers a premium, ad-free listening experience with mathematically rounded aesthetics.

---

## ✨ Key Features

- **🕉️ ॐ Branding & Aesthetic:** A deeply curated visual identity featuring the Hindu 'Om' symbol as the primary brand mark, set within a sophisticated dark-mode UI.
- **📐 Golden Ratio Foundation:** Every component, from the 38/62 split sidebar to the modular typography scale, is derived from the $\phi$ sequence for maximum visual harmony.
- **⚡ Velocity Search Caching:** Implements an intelligent in-memory backend cache reducing repeat search latencies from 8 seconds to **1ms**.
- **🎧 High-Fidelity Extraction:** Utilizes advanced `yt-dlp` piping with native Node.js JS-runtime solving to unblock Premium 256kbps AAC audio streams.
- **🔐 Secure Account Linking:** Seamless Puppeteer-automated authentication for Spotify and YouTube Music, bypassing "Insecure Browser" blocks via User-Agent spoofing.
- **🔄 Universal Fallback Engine:** Smart resolution logic that automatically switches between providers to ensure your song always plays, even if one source is restricted.

---

## 🛠️ Architecture

### **Backend (Node.js/Express)**
- **Plugin Architecture:** Decoupled adapter system for easy provider integration.
- **Stream Proxy:** Efficient byte-range request handling for stable, seekable audio streaming.
- **Account Automation:** Headless browser automation for session token extraction.

### **Frontend (Vite/React)**
- **Vanilla CSS Tokens:** Custom design system built with CSS variables for high performance.
- **Responsive Player:** Custom HTML5 audio implementation with real-time buffering and loading visualizations.

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js v18+**
- **yt-dlp** (Must be in your system PATH)

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/GajjarKashyap/Audio.git
cd Audio

# Initialize the system using the unified starter
start.bat
```

### 3. Setup
- Open `http://localhost:5173` in your browser.
- Link your **Spotify** and **YouTube Music** accounts via the premium navigation pill to unlock high-definition audio and personalized search results.

---

## 👨‍💻 Developer & Attribution
- **Developer:** Kashyap Gajjar
- **Project Type:** High-Performance Music Aggregator
- **License:** Educational / Private Use

---
*Inspired by the harmony of sound and mathematics.*
