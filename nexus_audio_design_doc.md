# 📄 Nexus Audio: Project Design Document

**Project Name:** Nexus Audio (Windows Edition)  
**Version:** 1.0  
**Status:** Planning Phase  
**Author:** [Your Name]  
**Target Platform:** Windows (Local Host Web Application)

---

## 1. System Architecture

Nexus Audio operates on a **Local Client-Server Architecture**. This hybrid approach allows the app to have the power of a Python backend (for scraping and processing) while using the lightweight, modern UI capabilities of a Web Browser.

### A. The Backend (The Brain)
* **Technology:** Python (Flask Framework).
* **Role:**
    * Acts as the central control unit.
    * Executes search algorithms across multiple platforms (YouTube, SoundCloud, etc.).
    * Manages the SQLite database (Reading/Writing user data).
    * **Crucial:** Runs the "Proxy Server" to bypass CORS restrictions, effectively tunneling audio streams from external servers to the local browser.

### B. The Frontend (The Interface)
* **Technology:** HTML5, CSS3 (Custom Flat Dark Theme), Vanilla JavaScript.
* **Role:**
    * Displays the User Interface (Sidebar, Player, Search Results).
    * Captures user inputs (clicks, search queries).
    * Plays audio using the browser's native HTML5 Audio Engine.
    * Communicates with the backend via asynchronous API calls (Fetch API).

### C. The Bridge (API Layer)
* **Format:** JSON (JavaScript Object Notation).
* **Function:** The Frontend asks questions (Requests), and the Backend gives answers (Responses).
    * *Frontend:* "Search for 'Numb' by Linkin Park."
    * *Backend:* "Here is a list of 5 results from YouTube and 3 from SoundCloud."

---

## 2. Feature Specifications

### A. Universal Search (The "Aggregator")
* **Goal:** Provide a unified search experience where users don't need to choose a source manually.
* **Mechanism:**
    * **Parallel Processing:** When a query is received, the backend spawns multiple "threads" (independent workers).
    * **Worker A** searches YouTube Music.
    * **Worker B** searches SoundCloud.
    * **Worker C** searches the Local Database.
    * **Aggregation:** The results are gathered, duplicates are removed, and a standardized list is sent to the UI.

### B. The Proxy Engine (Stream Tunneling)
* **Goal:** Enable playback of audio streams that normally block browser requests (CORS errors).
* **Mechanism:**
    1.  The browser requests a song from *localhost*: `http://127.0.0.1:5000/stream?url=REAL_EXTERNAL_LINK`
    2.  The Python server receives this request.
    3.  Python (masquerading as a legitimate user) requests the audio data from the external server (e.g., Google/YouTube).
    4.  Python receives the audio chunks and immediately passes them to the browser.
    5.  **Result:** The browser believes it is playing a local file, bypassing all security blocks.

### C. Live Lyrics System
* **Goal:** Enhance the listening experience with synchronized or static lyrics.
* **Mechanism:**
    * **Metadata Extraction:** The app identifies the `Artist` and `Track Name` of the currently playing song.
    * **API Lookup:** It queries a lyrics provider (e.g., LRCLIB or Genius).
    * **Display Logic:**
        * If **Synced Lyrics** (Time-stamped) are found: The UI highlights lines in real-time.
        * If **Plain Lyrics** are found: The UI displays a scrollable text panel.

---

## 3. Database Schema

We will use **SQLite** for data persistence. It is serverless and stores data in a single file (`nexus.db`).

### Table 1: `tracks`
*Stores metadata to prevent re-fetching known songs.*
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | INTEGER PK | Unique ID for internal tracking. |
| `external_id` | TEXT | The ID from the source (e.g., YouTube Video ID). |
| `title` | TEXT | Song title. |
| `artist` | TEXT | Artist name. |
| `duration` | INTEGER | Length of the song in seconds. |
| `source` | TEXT | Origin (e.g., 'youtube', 'soundcloud'). |
| `thumbnail_url` | TEXT | Link to the album art. |

### Table 2: `playlists`
*Stores user-created collections.*
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | INTEGER PK | Unique Playlist ID. |
| `name` | TEXT | Name of the playlist (e.g., "Gym"). |
| `created_at` | DATETIME | Timestamp of creation. |

### Table 3: `playlist_items`
*Links songs to playlists (Many-to-Many relationship).*
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | INTEGER PK | Unique Item ID. |
| `playlist_id` | INTEGER | Foreign Key linking to `playlists`. |
| `track_id` | INTEGER | Foreign Key linking to `tracks`. |
| `order_index` | INTEGER | Position of the song in the playlist. |

---

## 4. Step-by-Step Implementation Roadmap

### Phase 1: The Foundation
* **Objective:** Set up the environment and "Hello World".
* **Steps:**
    1.  Install Python 3.x and VS Code.
    2.  Create project folder structure (`/static`, `/templates`, `/modules`).
    3.  Install dependencies: `pip install flask requests yt_dlp`.
    4.  Create `app.py` and run a basic Flask server.
    5.  Create `index.html` and verify it loads in the browser.

### Phase 2: Core Backend Logic (Search)
* **Objective:** Successfully fetch data from the internet.
* **Steps:**
    1.  Create `modules/youtube.py`. Implement `search(query)` using `yt_dlp` logic.
    2.  Create `modules/soundcloud.py`. Implement basic scraping or API usage.
    3.  Create the **Aggregator Function** in `app.py` to call both modules and merge lists.
    4.  Test by printing results to the Python console.

### Phase 3: The Audio Bridge (Proxy)
* **Objective:** Establish the audio stream tunnel.
* **Steps:**
    1.  Implement the `/stream_proxy` endpoint in Flask.
    2.  Write the logic to fetch audio chunks from external URLs using `requests`.
    3.  Configure Headers to spoof a real browser (User-Agent).
    4.  Test by feeding a YouTube URL into the proxy and trying to play it in a simple HTML `<audio>` tag.

### Phase 4: UI Development
* **Objective:** Build the "Nexus" look and feel.
* **Steps:**
    1.  Implement the **Sidebar** and **Player Bar** layout using CSS Grid.
    2.  Style the application with a "Flat Dark" theme (Dark background, light text).
    3.  Use JavaScript to dynamically generate "Song Cards" from the JSON search results.
    4.  Connect the UI Play button to the Audio Element.

### Phase 5: Advanced Integration
* **Objective:** Add Database and Lyrics.
* **Steps:**
    1.  Initialize the SQLite database (`nexus.db`).
    2.  Create "Add to Library" buttons in the UI that save data to the DB.
    3.  Implement the Lyrics API fetcher and create the sliding Lyrics Panel in the UI.

---

## 5. Technology Stack Summary

| Component | Technology Used | Reason |
| :--- | :--- | :--- |
| **Language** | Python 3.10+ | Powerful libraries, easy syntax, robust networking. |
| **Web Server** | Flask | Lightweight, minimal setup, easy to debug. |
| **Database** | SQLite3 | Native to Python, zero configuration, fast for local apps. |
| **Scraper** | `yt-dlp` | The industry standard for handling video/audio extraction reliably. |
| **Frontend** | HTML5 / JS | Universal compatibility, easy to style, no compilation needed. |
| **Styling** | CSS3 (Flex/Grid) | Native layout engines are now powerful enough to avoid Bootstrap. |
| **Networking** | `requests` | Simple, human-friendly HTTP library for Python. |
