let isPlaying = false;
const audioPlayer = document.getElementById('audioPlayer');
const progressBar = document.getElementById('progressBar');
const playIcon = document.getElementById('playIcon');

// State
let playQueue = [];
let currentQueueIndex = -1;
let searchTimeout = null;

// Audio FX Globals
let audioContext, audioSource;
let eqFilters = []; // 10-Band EQ
let pannerNode, analyser;
let isBassEnabled = false; // Kept for legacy toggle, or reuse for EQ preset?
let isRainEnabled = false;

// Lyrics State
let syncedLyrics = [];
let hasSyncedLyrics = false;

// --- 1. THE TRAP (Anti-Copy Startup) ---
window.onload = function () {
    const splash = document.getElementById('k-splash-screen');
    const fill = document.querySelector('.loading-bar .fill');

    // Fake Loading Animation
    if (fill) {
        setTimeout(() => fill.style.width = "30%", 500);
        setTimeout(() => fill.style.width = "70%", 1500);
        setTimeout(() => fill.style.width = "100%", 3500);
    }

    // The Lock: App only starts after 5 seconds
    setTimeout(() => {
        if (splash) {
            splash.style.opacity = '0';
            splash.style.transition = 'opacity 1s';
            setTimeout(() => splash.remove(), 1000);
        }

        // ACTUAL APP START
        initProtectedApp();

    }, 5000);
};

function initProtectedApp() {
    console.log("K-Sonic Engine Started - Licensed to Kashayap Gajjar");
    setupShortcuts();

    // Auto-focus search
    const input = document.getElementById('searchInput');
    if (input) input.focus();

    // Load Playlists Sidebar
    loadPlaylistsSidebar();

    // Theme Engine Init
    const savedTheme = localStorage.getItem('k-sonic-theme') || 'green';
    setTheme(savedTheme);

    // Progress Bar Interaction
    const progressContainer = document.getElementById('progressContainer');
    if (progressContainer) {
        progressContainer.addEventListener('click', function (e) {
            const width = this.clientWidth;
            const clickX = e.offsetX;
            const duration = audioPlayer.duration;
            audioPlayer.currentTime = (clickX / width) * duration;
        });
    }
}

// --- THEME ENGINE ---
function toggleTheme() {
    const themes = ['green', 'blue', 'purple', 'red', 'gold'];
    const current = localStorage.getItem('k-sonic-theme') || 'green';
    let idx = themes.indexOf(current);
    idx = (idx + 1) % themes.length;
    setTheme(themes[idx]);
}

function setTheme(colorName) {
    const root = document.documentElement;
    localStorage.setItem('k-sonic-theme', colorName);

    let colorHex = '#1DB954'; // Green
    if (colorName === 'blue') colorHex = '#2E77D0';
    if (colorName === 'purple') colorHex = '#B026FF';
    if (colorName === 'red') colorHex = '#FF0050';
    if (colorName === 'gold') colorHex = '#FFD700';

    // Update CSS Variables
    // We update specific elements because CSS vars are minimal in this build
    // But let's inject a style tag for consistency

    let style = document.getElementById('theme-style');
    if (!style) {
        style = document.createElement('style');
        style.id = 'theme-style';
        document.head.appendChild(style);
    }

    style.innerHTML = `
        :root { --accent: ${colorHex}; }
        .splash-title { background: linear-gradient(to right, #fff, ${colorHex}); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
        .music-waves span { background: ${colorHex}; }
        .loading-bar .fill { background: ${colorHex}; }
        .btn-create-pl { background: linear-gradient(135deg, ${colorHex}, #fff); }
        .icon-btn.active { color: ${colorHex}; text-shadow: 0 0 5px ${colorHex}; }
        .progress-fill { background: ${colorHex}; }
        .hero-banner { box-shadow: 0 10px 30px ${colorHex}40; } /* 40% opacity */
        .control-buttons .play-btn:hover { background: ${colorHex}; box-shadow: 0 0 20px ${colorHex}; }
    `;

    showToast(`Theme set to ${colorName.toUpperCase()}`);
}

// --- 2. AUDIO ENGINE (10-Band EQ) ---
function initAudioEngine() {
    if (!audioContext) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioContext();

        const audioEl = document.getElementById('audioPlayer');
        audioSource = audioContext.createMediaElementSource(audioEl);

        analyser = audioContext.createAnalyser();
        analyser.fftSize = 128; // Chunkier visualizer

        // 10-Band EQ Frequencies
        const frequencies = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000];
        eqFilters = frequencies.map(freq => {
            const filter = audioContext.createBiquadFilter();
            filter.type = 'peaking';
            filter.frequency.value = freq;
            filter.Q.value = 1;
            filter.gain.value = 0; // Flat start
            return filter;
        });

        pannerNode = audioContext.createStereoPanner();

        // Connect Chain: Source -> EQ1 -> EQ2 ... -> EQ10 -> Panner -> Visualizer -> Dest
        let prevNode = audioSource;
        eqFilters.forEach(filter => {
            prevNode.connect(filter);
            prevNode = filter;
        });

        prevNode.connect(pannerNode);
        pannerNode.connect(analyser);
        analyser.connect(audioContext.destination);

        drawVisualizer();
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
}

function toggleBass() {
    initAudioEngine();
    isBassEnabled = !isBassEnabled;
    const btn = document.getElementById('btnBass');

    // Simple Bass Boost implementation using the first few bands of EQ
    if (isBassEnabled) {
        // Boost 60Hz and 170Hz
        eqFilters[0].gain.value = 15;
        eqFilters[1].gain.value = 10;
        btn.classList.add('active');
        showToast('Bass Boost MAX');
    } else {
        eqFilters[0].gain.value = 0;
        eqFilters[1].gain.value = 0;
        btn.classList.remove('active');
        showToast('Bass Boost OFF');
    }
}

function toggleRain() {
    const rain = document.getElementById('rainAudio');
    const btn = document.getElementById('btnRain');
    if (!rain) return;

    if (rain.paused) {
        rain.volume = 0.3; // Subtle background
        rain.play();
        btn.classList.add('active');
        showToast('🌧️ Lo-Fi Rain Mode ON');
    } else {
        rain.pause();
        btn.classList.remove('active');
        showToast('Lo-Fi Rain Mode OFF');
    }
}

// --- 3. PLAYLIST MANAGEMENT ---

async function createNewPlaylistUI() {
    const name = prompt("Enter playlist name:");
    if (!name) return;

    try {
        const res = await fetch('/api/playlists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name })
        });
        const data = await res.json();
        if (data.success) {
            showToast(`Created playlist: ${name}`);
            loadPlaylistsSidebar();
        } else {
            showToast(`Error: ${data.error}`);
        }
    } catch (e) { console.error(e); }
}

function toggleSidebar() {
    const drawer = document.getElementById('sideDrawer');
    const back = document.getElementById('drawerBackdrop');
    if (drawer && back) {
        drawer.classList.toggle('open');
        back.classList.toggle('open');
    }
}

async function loadPlaylistsSidebar() {
    const list = document.getElementById('sidebarPlaylists');
    if (!list) return;

    // Keep list clean
    list.innerHTML = '<div style="padding:10px; color:#666;">Loading...</div>';

    try {
        const res = await fetch('/api/playlists');
        const playlists = await res.json();

        list.innerHTML = '';

        if (playlists.length === 0) {
            list.innerHTML = '<div style="padding:10px; color:#666;">No playlists yet.</div>';
            return;
        }

        playlists.forEach(pl => {
            const li = document.createElement('li');
            li.innerHTML = `<i class="fas fa-list"></i> ${pl.name}`;
            li.onclick = () => {
                loadPlaylistContent(pl.id, pl.name);
                toggleSidebar(); // Close on select
            };
            list.appendChild(li);
        });
    } catch (e) {
        list.innerHTML = '<div style="padding:10px; color:#d44;">Error loading.</div>';
    }
}

// Open "Add to Playlist" Modal
let songToAdd = null;

function openPlaylistModal(song, event) {
    if (event) event.stopPropagation();
    songToAdd = song;

    const modal = document.getElementById('playlistModal');
    const list = document.getElementById('modalList');
    const title = modal.querySelector('h3');
    title.textContent = "Add to Playlist";

    modal.style.display = 'flex';
    list.innerHTML = 'Loading...';

    fetch('/api/playlists')
        .then(r => r.json())
        .then(playlists => {
            list.innerHTML = '';
            playlists.forEach(pl => {
                const item = document.createElement('div');
                item.className = 'playlist-item';
                item.innerHTML = `<i class="fas fa-list-ul"></i> ${pl.name}`;
                item.onclick = () => confirmAddToPlaylist(pl.id);
                list.appendChild(item);
            });
        });
}

function closeModal() {
    document.getElementById('playlistModal').style.display = 'none';
}

async function confirmAddToPlaylist(pid) {
    if (!songToAdd) return;
    try {
        const res = await fetch(`/api/playlists/${pid}/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(songToAdd)
        });
        const data = await res.json();
        if (data.success) {
            showToast("Added to playlist!");
            closeModal();
        } else {
            showToast(data.error);
        }
    } catch (e) { console.error(e); }
}

async function loadPlaylistContent(pid, pname) {
    const resultsArea = document.getElementById('resultsArea');
    resultsArea.innerHTML = `<h2 style="grid-column:1/-1">${pname}</h2><div class="skeleton"></div>`;

    const res = await fetch(`/api/playlists/${pid}`);
    const data = await res.json();

    resultsArea.innerHTML = `<h2 style="grid-column:1/-1; margin-bottom:20px;">${pname}</h2>`; // Header

    if (data.songs.length === 0) {
        resultsArea.innerHTML += '<p style="grid-column:1/-1; color:#777;">This playlist is empty.</p>';
        return;
    }

    // Render Songs using existing logic logic?
    // We need to replicate card creation or separate it.

    data.songs.forEach(song => {
        // Create Card
        const card = document.createElement('div');
        card.className = 'song-card';
        const songJson = JSON.stringify(song).replace(/"/g, '&quot;');
        const thumbUrl = song.thumbnail ? song.thumbnail : '/static/default.jpg';

        card.innerHTML = `
            <div class="img-box" onclick="playSong(${songJson})">
                <img src="${thumbUrl}" onerror="this.src='/static/default.jpg'">
            </div>
            <div class="card-content">
                <div class="card-title">${song.title}</div>
                <div class="card-artist">${song.artist}</div>
                <div class="card-actions" style="margin-top:5px; display:flex; gap:10px;">
                    <button onclick="openPlaylistModal(${songJson}, event)" class="btn-cancel" style="padding:2px 8px; font-size:12px;">+</button>
                </div>
            </div>
        `;
        resultsArea.appendChild(card);
    });
}

// --- 4. MAP PICKER ---
function toggleMapPicker() {
    const countries = ['Japan', 'Brazil', 'Korea', 'India', 'USA', 'UK'];
    const choice = prompt("Enter Country for Top 50:\n" + countries.join(", "));
    if (choice) {
        performSearch(`Top 50 ${choice}`);
        showToast(`Identifying hits from ${choice}...`);
    }
}


// --- EXISTING LOGIC (Updated to work with new features) ---
function handleInput(event) {
    const query = event.target.value;
    clearTimeout(searchTimeout);

    if (!query) {
        const resArea = document.getElementById('resultsArea');
        if (resArea) resArea.innerHTML = '<div class="welcome-placeholder"><i class="fas fa-music"></i><p>Start searching to play music</p></div>';
        return;
    }

    // Spotify Detection Stub
    if (query.includes('open.spotify.com/track')) {
        showToast("Detecting Spotify Link... (BETA)");
    }

    searchTimeout = setTimeout(() => {
        performSearch(query);
    }, 500);
}

async function performSearch(query) {
    const resultsArea = document.getElementById('resultsArea');
    showSkeleton();

    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();

        resultsArea.innerHTML = '';

        if (data.results && data.results.length > 0) {
            data.results.forEach(song => {
                const card = document.createElement('div');
                card.className = 'song-card';
                const songJson = JSON.stringify(song).replace(/"/g, '&quot;');
                const thumbUrl = song.thumbnail || '/static/default.jpg';

                // Updated with "+" Button
                card.innerHTML = `
                    <div class="img-box" onclick="playSong(${songJson})">
                        <img src="${thumbUrl}" onerror="this.src='/static/default.jpg'">
                    </div>
                    <div class="card-content">
                        <div class="card-title" title="${song.title}">${song.title}</div>
                        <div class="card-artist" title="${song.artist}">${song.artist}</div>
                        <div style="margin-top:5px;">
                            <button onclick="openPlaylistModal(${songJson}, event)" class="icon-btn" title="Add to Playlist" style="color:#aaa; border:1px solid #444; border-radius:4px; padding:2px 6px;">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                    </div>
                `;
                resultsArea.appendChild(card);
            });
        } else {
            resultsArea.innerHTML = '<div style="grid-column:1/-1; text-align:center; margin-top:50px;">No results found.</div>';
        }

    } catch (error) {
        console.error(error);
        resultsArea.innerHTML = '<div style="grid-column:1/-1; text-align:center; color: #ff5555; margin-top:50px;">Search failed.</div>';
    }
}

function showSkeleton() {
    const resultsArea = document.getElementById('resultsArea');
    if (!resultsArea) return;
    resultsArea.innerHTML = '';
    for (let i = 0; i < 10; i++) {
        const skel = document.createElement('div');
        skel.className = 'song-card skeleton-card';
        skel.innerHTML = `<div class="skeleton skeleton-img"></div><div class="skeleton skeleton-text"></div>`;
        resultsArea.appendChild(skel);
    }
}

function playSong(song) {
    playQueue = [song];
    currentQueueIndex = 0;
    loadAndPlay(song);
}

function loadAndPlay(song) {
    initAudioEngine();
    updatePlayerUI(song);

    const proxyUrl = `/stream?url=${encodeURIComponent(song.url)}&id=${song.id}`;

    audioPlayer.src = proxyUrl;
    audioPlayer.play().catch(e => console.error("Playback error:", e));

    isPlaying = true;
    updatePlayPauseButton();

    getRecommendations(song.artist, song.title);
    fetchLyrics(song.title, song.artist, song.duration);
    showToast(`Playing: ${song.title}`);
}

async function getRecommendations(artist, title) {
    const recSection = document.getElementById('recommendationSection');
    const recRow = document.getElementById('recRow');
    if (!recSection || !recRow) return;

    recRow.innerHTML = '<div style="color:#666; padding:10px;">Finding similar songs...</div>';
    recSection.classList.remove('hidden');

    try {
        const res = await fetch(`/api/recommend?artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(title)}`);
        const data = await res.json();
        recRow.innerHTML = '';
        data.recommendations.forEach(song => {
            const div = document.createElement('div');
            div.className = 'song-card';
            const songJson = JSON.stringify(song).replace(/"/g, '&quot;');
            div.innerHTML = `
                <div class="img-box" onclick="playSong(${songJson})">
                    <img src="${song.thumbnail}" onerror="this.src='/static/default.jpg'">
                </div>
                <div class="card-title" style="font-size:14px;">${song.title}</div>
            `;
            recRow.appendChild(div);
        });
    } catch (e) {
        console.error("AI Rec Failed", e);
        recSection.classList.add('hidden');
    }
}

function updatePlayerUI(song) {
    const titleEl = document.getElementById('npTitle');
    const artistEl = document.getElementById('npArtist');
    if (titleEl) titleEl.textContent = song.title;
    if (artistEl) artistEl.textContent = song.artist;

    const npImg = document.getElementById('npImg');
    if (npImg) {
        npImg.src = song.thumbnail || '/static/default.jpg';
    }
}

function togglePlay() {
    if (audioPlayer.src) {
        if (isPlaying) {
            audioPlayer.pause();
        } else {
            audioPlayer.play();
        }
        isPlaying = !isPlaying;
        updatePlayPauseButton();
    }
}

function updatePlayPauseButton() {
    if (playIcon) {
        playIcon.className = isPlaying ? "fas fa-pause" : "fas fa-play";
    }
}

function playNext() {
    if (currentQueueIndex < playQueue.length - 1) {
        currentQueueIndex++;
        loadAndPlay(playQueue[currentQueueIndex]);
    } else {
        showToast("Queue finished.");
        isPlaying = false;
        updatePlayPauseButton();
    }
}

function playPrev() {
    if (currentQueueIndex > 0) {
        currentQueueIndex--;
        loadAndPlay(playQueue[currentQueueIndex]);
    } else {
        audioPlayer.currentTime = 0;
    }
}

function audioEnded() {
    if (currentQueueIndex < playQueue.length - 1) {
        playNext();
    } else {
        isPlaying = false;
        updatePlayPauseButton();
        if (progressBar) progressBar.style.width = '0%';
    }
}

function updateProgress() {
    if (audioPlayer.duration) {
        const currentTime = audioPlayer.currentTime;
        const percentage = (currentTime / audioPlayer.duration) * 100;
        if (progressBar) progressBar.style.width = percentage + '%';
        if (hasSyncedLyrics) syncLyrics(currentTime);
    }
}

function setVolume(val) {
    audioPlayer.volume = val;
}

// --- VISUALIZER ---
// --- VISUALIZER ---
let isFullScreenVisualizer = false;

function toggleFullScreenVisualizer() {
    const canvas = document.getElementById('visualizer');
    if (!canvas) return;
    isFullScreenVisualizer = !isFullScreenVisualizer;

    if (isFullScreenVisualizer) {
        canvas.classList.add('visualizer-fullscreen');
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen();
        }
    } else {
        canvas.classList.remove('visualizer-fullscreen');
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

function drawVisualizer() {
    const canvas = document.getElementById('visualizer');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    analyser.fftSize = 256; // Detailed
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function renderFrame() {
        requestAnimationFrame(renderFrame);
        analyser.getByteFrequencyData(dataArray);

        // Dynamic Resize
        if (isFullScreenVisualizer) {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        } else {
            canvas.width = window.innerWidth;
            canvas.height = 80;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength);
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            // Height logic based on mode
            const barHeight = isFullScreenVisualizer
                ? (dataArray[i] / 255) * canvas.height * 0.8
                : dataArray[i] / 3;

            // Simple white/transparent style
            ctx.fillStyle = isFullScreenVisualizer
                ? `hsl(${i * 2}, 100%, 50%)`  // Rainbow in FS
                : `rgba(255, 255, 255, 0.1)`; // Subtle in footer

            ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
            x += barWidth;
        }
    }
    renderFrame();
}

// --- 5. SLEEP TIMER ---
let sleepTimerId = null;

function openTimerModal() {
    document.getElementById('timerModal').style.display = 'flex';
}
function closeTimerModal() {
    document.getElementById('timerModal').style.display = 'none';
}

function setSleepTimer(minutes) {
    clearTimeout(sleepTimerId);
    closeTimerModal();
    showToast(`💤 Sleep Timer set: ${minutes}m`);

    sleepTimerId = setTimeout(() => {
        triggerSleepShutdown();
    }, minutes * 60 * 1000);
}

async function triggerSleepShutdown() {
    let vol = audioPlayer.volume;
    const fade = setInterval(() => {
        if (vol > 0.05) {
            vol -= 0.05;
            audioPlayer.volume = vol;
        } else {
            clearInterval(fade);
            audioPlayer.pause();
            fetch('/api/shutdown', { method: 'POST' });
            document.body.innerHTML = `
                <div style="display:flex; justify-content:center; align-items:center; height:100vh; background:black; color:white; flex-direction:column;">
                    <h1>Goodnight 🌙</h1>
                    <p>K-Sonic is sleeping.</p>
                </div>
            `;
            setTimeout(() => window.close(), 2000);
        }
    }, 200);
}

function setupShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (document.activeElement.tagName === 'INPUT') return;
        switch (e.code) {
            case 'Space': e.preventDefault(); togglePlay(); break;
            case 'ArrowRight': audioPlayer.currentTime += 5; break;
            case 'ArrowLeft': audioPlayer.currentTime -= 5; break;
            case 'KeyN': playNext(); break;
            case 'KeyP': playPrev(); break;
        }
    });
}

function showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fas fa-info-circle"></i> ${message}`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

async function fetchLyrics(track, artist, duration) { /* Stub */ }
function syncLyrics(currentTime) { /* Stub */ }

// Navigation Logic
function showSection(id) {
    const main = document.getElementById('mainContent');
    const title = document.getElementById('sectionTitle');
    const resultsArea = document.getElementById('resultsArea');

    // Update Active Pills
    document.querySelectorAll('.nav-pills .pill').forEach(p => p.classList.remove('active'));
    const activeBtn = document.querySelector(`.pill[onclick="showSection('${id}')"]`);
    if (activeBtn) activeBtn.classList.add('active');

    if (main) main.scrollTo({ top: 0, behavior: 'smooth' });

    if (id === 'home') {
        if (title) title.textContent = "Discover";
        renderHomePage();
    } else if (id === 'explore') {
        if (title) title.textContent = "Trending Charts";
        performSearch("Billboard Hot 100"); // No more aliens
    } else if (id === 'library') {
        if (title) title.textContent = "Your Favorites";
        // Library Logic? For now, show playlists?
        loadPlaylistsSidebar();
        resultsArea.innerHTML = '<p style="padding:20px; color:#777;">Open the sidebar to see your playlists.</p>';
    }
}

async function renderHomePage() {
    const resultsArea = document.getElementById('resultsArea');
    resultsArea.innerHTML = '';

    // 1. Hero Banner
    const hero = document.createElement('div');
    hero.className = 'hero-banner';
    hero.innerHTML = `
        <div class="hero-content">
            <h1>Welcome to K-Sonic</h1>
            <p>Your ultimate music experience.</p>
            <button onclick="performSearch('Trending Music 2024')">Play Trending</button>
        </div>
    `;
    resultsArea.appendChild(hero);

    // 2. Sections Container
    const categories = [
        { title: "Global Charts", query: "Billboard Hot 100 This Week" },
        { title: "Vibes & Chill", query: "Chill Lofi Beats 2025" },
        { title: "Club Bangers", query: "Best Club Songs 2025" }
    ];

    for (const cat of categories) {
        const section = document.createElement('div');
        section.style.gridColumn = "1 / -1";
        section.innerHTML = `<h3 style="margin:20px 0 15px 0; font-size: 20px;">${cat.title}</h3>`;

        const scrollRow = document.createElement('div');
        scrollRow.className = 'horizontal-scroll';
        scrollRow.innerHTML = '<div class="skeleton" style="width:160px; height:200px;"></div><div class="skeleton" style="width:160px; height:200px;"></div>';

        section.appendChild(scrollRow);
        resultsArea.appendChild(section);

        fetch(`/api/search?q=${encodeURIComponent(cat.query)}`)
            .then(r => r.json())
            .then(data => {
                scrollRow.innerHTML = '';
                if (data.results && data.results.length > 0) {
                    data.results.slice(0, 10).forEach(song => {
                        const card = document.createElement('div');
                        card.className = 'song-card';
                        card.style.minWidth = '160px'; // Slightly wider
                        const songJson = JSON.stringify(song).replace(/"/g, '&quot;');

                        let thumb = song.thumbnail || 'static/default.jpg';

                        // Enhanced Card UI
                        card.innerHTML = `
                            <div class="img-box" onclick="playSong(${songJson})" style="position:relative; cursor:pointer;">
                                <img src="${thumb}" onerror="this.onerror=null;this.src='https://via.placeholder.com/160/222/FFF?text=Music'">
                                <div class="play-overlay"><i class="fas fa-play"></i></div>
                            </div>
                            <div class="card-content" style="padding-top:10px;">
                                <div class="card-title" style="font-size:14px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${song.title}</div>
                                <div class="card-artist" style="font-size:12px; color:#aaa; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${song.artist}</div>
                                <button onclick="openPlaylistModal(${songJson}, event)" class="icon-btn-small" title="Add to Playlist" style="margin-top:5px; background:transparent; border:1px solid #444; color:#fff; border-radius:50%; width:24px; height:24px; cursor:pointer;">
                                    <i class="fas fa-plus" style="font-size:10px;"></i>
                                </button>
                            </div>
                        `;
                        scrollRow.appendChild(card);
                    });
                } else {
                    scrollRow.innerHTML = '<div style="padding:10px; color:#555;">No tracks found.</div>';
                }
            })
            .catch(e => {
                console.error(e);
                scrollRow.innerHTML = '<div style="padding:10px; color:#555;">Offline?</div>';
            });
    }
}
