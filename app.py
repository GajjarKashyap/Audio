from flask import Flask, render_template, jsonify, request, Response
import requests
import concurrent.futures
import yt_dlp
import os
import socket
import database
from modules.youtube import search_youtube
from modules.soundcloud import search_soundcloud
from modules.jiosaavn import search_jiosaavn
from modules.lyrics import get_lyrics

app = Flask(__name__)
DOWNLOAD_FOLDER = "downloads"

# --- 🚀 PERFORMANCE LAYER ---
# 1. URL Cache: Remembers the direct audio link so we don't hack it twice.
# Format: { "youtube_id": "https://rr4---sn-....googlevideo.com/..." }
URL_CACHE = {} 

if not os.path.exists(DOWNLOAD_FOLDER):
    os.makedirs(DOWNLOAD_FOLDER)

@app.route('/')
def home():
    return render_template('index.html')

# --- API: SMART SEARCH ---
@app.route('/api/search')
def search_api():
    query = request.args.get('q')
    if not query: return jsonify({"error": "No query"}), 400

    print(f"Searching: {query}")
    results = []

    # Parallel Search for speed
    with concurrent.futures.ThreadPoolExecutor() as executor:
        f1 = executor.submit(search_youtube, query)
        f2 = executor.submit(search_jiosaavn, query)
        # f3 = executor.submit(search_soundcloud, query) # Optional: Disable SC for speed
        
        results.extend(f1.result())
        results.extend(f2.result())
        # results.extend(f3.result())

    return jsonify({"results": results})

# --- API: AI RECOMMENDATIONS ---
@app.route('/api/recommend')
def recommend_api():
    # "AI Logic": We search for a "Mix" based on the current song's artist/genre
    # This piggybacks on YouTube's recommendation algorithm.
    seed_artist = request.args.get('artist')
    seed_track = request.args.get('track')
    
    query = f"{seed_artist} {seed_track} Mix"
    print(f"Generating AI Recommendations for: {query}")
    
    # We only ask YouTube for this, as it has the best "Related" logic
    results = search_youtube(query, max_results=5)
    
    # Filter out the exact song we are currently playing
    filtered = [r for r in results if r['title'] != seed_track]
    
    return jsonify({"recommendations": filtered})

# --- API: INSTANT STREAMING ---
@app.route('/stream')
def stream_proxy():
    video_url = request.args.get('url')
    video_id = request.args.get('id') # Unique ID for caching
    
    if not video_url: return "No URL", 400

    real_audio_url = None

    # CHECK CACHE FIRST (The "Fast Load" Feature)
    if video_id and video_id in URL_CACHE:
        print(f"⚡ CACHE HIT: Playing {video_id} instantly.")
        real_audio_url = URL_CACHE[video_id]
    else:
        print(f"🐢 CACHE MISS: Resolving {video_id}...")
        try:
            ydl_opts = {'format': 'bestaudio/best', 'quiet': True, 'noplaylist': True}
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(video_url, download=False)
                real_audio_url = info.get('url')
                
                # Save to cache for next time
                if video_id:
                    URL_CACHE[video_id] = real_audio_url
        except Exception as e:
            return str(e), 500

    # Stream it
    try:
        headers = {"User-Agent": "Mozilla/5.0"}
        req = requests.get(real_audio_url, stream=True, headers=headers)
        return Response(req.iter_content(chunk_size=1024*32), content_type="audio/mpeg")
    except Exception as e:
        return str(e), 500

# --- STANDARD APIs ---
@app.route('/api/download')
def download_api():
    # Implement download if needed using yt-dlp to file
    return jsonify({"success": False, "error": "Not implemented in snippet"})

@app.route('/api/library', methods=['GET', 'POST', 'DELETE'])
def library_api():
    if request.method == 'GET': return jsonify({"library": database.get_library()})
    elif request.method == 'POST': return jsonify({"success": database.add_song(request.json)})
    elif request.method == 'DELETE': 
        database.remove_song(request.args.get('id'))
        return jsonify({"success": True})

@app.route('/api/lyrics')
def lyrics_api():
    return jsonify(get_lyrics(request.args.get('track'), request.args.get('artist')))

# --- 6. PLAYLIST API (NEW) ---
@app.route('/api/playlists', methods=['GET', 'POST'])
def playlists_api():
    if request.method == 'GET':
        return jsonify(database.get_playlists())
    elif request.method == 'POST':
        name = request.json.get('name')
        if not name: return jsonify({"success": False, "error": "Name required"})
        return jsonify(database.create_playlist(name))

@app.route('/api/playlists/<int:playlist_id>/add', methods=['POST'])
def add_playlist_song_api(playlist_id):
    song = request.json
    return jsonify(database.add_to_playlist(playlist_id, song))

@app.route('/api/playlists/<int:playlist_id>')
def get_playlist_songs_api(playlist_id):
    songs = database.get_playlist_songs(playlist_id)
    return jsonify({"songs": songs})

# --- 7. PARTY MODE API (NEW) ---
@app.route('/api/party_info')
def party_info():
    hostname = socket.gethostname()
    local_ip = socket.gethostbyname(hostname)
    return jsonify({
        "ip": local_ip,
        "port": 5000,
        "url": f"http://{local_ip}:5000"
    })
# --- 8. SYSTEM SHUTDOWN (NEW) ---
@app.route('/api/shutdown', methods=['POST'])
def shutdown_api():
    print("💤 Sleep Timer Triggered: Shutting Down Server...")
    # Schedule exit slightly in future to allow response to return
    def kill_me():
        os._exit(0)
    
    # Use timer to delay kill so response sends
    from threading import Timer
    Timer(1.0, kill_me).start()
    return jsonify({"success": True, "message": "Goodnight!"})

if __name__ == '__main__':
    app.run(debug=True, port=5000, threaded=True)
