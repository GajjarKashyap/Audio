# ॐ Omstream - Premium Music Streaming Aggregator

![Omstream Banner](assets/banner.png)

[![Node](https://img.shields.io/badge/Node.js-v18%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Design](https://img.shields.io/badge/Design-Golden%20Ratio%20%CF%95-FFD700?style=for-the-badge)](#philosophy)

**Omstream** is a professional-grade, high-performance music application that aggregates tracks from **Spotify**, **YouTube Music**, and **JioSaavn** into a single, unified interface. Built with mathematical precision using the **Golden Ratio ($\phi = 1.618$)**, it offers a premium, ad-free listening experience with mathematically rounded aesthetics.

---

## 🛠️ Technical Architecture

### 1. System Data Flow
How a user search request is processed and served through the aggregation engine.

```mermaid
graph TD
    User((User)) -->|Search Query| UI[React Frontend]
    UI -->|API Request| API[Express API Gateway]
    API --> Cache{Search Cache}
    
    Cache -->|Hit| Instant[Serve 1ms Results]
    Cache -->|Miss| Dispatch[Multi-Adapter Dispatcher]
    
    Dispatch --> Spotify[Spotify Adapter]
    Dispatch --> YT[YouTube Music Adapter]
    Dispatch --> Saavn[JioSaavn Adapter]
    
    Spotify & YT & Saavn -->|JSON Meta| Aggregator[Result Aggregator]
    Aggregator -->|Normalize| API
    API -->|Optimized JSON| UI
```

### 2. High-Fidelity Streaming Pipeline
Technique used to bypass provider restrictions and pipe high-quality audio directly to the user.

```mermaid
sequenceDiagram
    participant U as User Browser
    participant P as Omstream Proxy
    participant E as Provider Endpoint (YT/Spotify)
    participant D as yt-dlp Engine

    U->>P: Request Stream (track_id)
    P->>D: Extract Direct URL (AAC/MP3)
    D-->>P: Return Signed URL
    P->>E: HTTP GET (Range: bytes=0-)
    E-->>P: 206 Partial Content (Audio Stream)
    P-->>U: Pipe Audio Buffer (0ms Delay)
```

### 3. Source Resolution & Fallback
The logic behind selecting the "best" playback source for a given track.

```mermaid
graph LR
    A[Track Request] --> B{Spotify Match?}
    B -->|Yes| C[High Quality Source]
    B -->|No| D{YT Music Match?}
    D -->|Yes| E[Medium Quality Source]
    D -->|No| F{Saavn Match?}
    F -->|Yes| G[Fallback Source]
    F -->|No| H[Error: Track Not Found]
```

---

## ✨ Key Features

- **📐 Golden Ratio Foundation:** UI spacing and typography derived from the $\phi$ sequence ($1.618$) for maximum visual harmony.
- **⚡ Velocity Search Caching:** Intelligent in-memory backend cache reducing repeat search latencies from 8 seconds to **1ms**.
- **🎧 High-Fidelity Extraction:** Utilizes advanced `yt-dlp` piping to unblock Premium 256kbps AAC audio streams.
- **🔐 Secure Account Automation:** Seamless Puppeteer-automated authentication for provider account linking.

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

### 3. Setup & Use
- Open [http://localhost:5173](http://localhost:5173) in your browser.
- Link your accounts via the premium navigation pill to unlock personalized results.

---

## 📐 Philosophy
Omstream is an experiment in **Visual Harmony**. By applying the Golden Ratio to UI spacing and typography, we create an interface that mirrors the mathematical beauty found in nature and music.

---

## 👨‍💻 Developer & Attribution
- **Developer:** Kashyap Gajjar
- **Project Type:** High-Performance Music Aggregator
- **License:** Educational / Private Use

*Inspired by the harmony of sound and mathematics.*
