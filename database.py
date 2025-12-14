
import sqlite3
import json

DB_NAME = "nexus.db"

def init_db():
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    
    # 1. Existing Library Table
    c.execute('''
        CREATE TABLE IF NOT EXISTS library (
            id TEXT PRIMARY KEY,
            title TEXT,
            artist TEXT,
            url TEXT,
            thumbnail TEXT,
            source TEXT,
            duration INTEGER,
            added_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # 2. History Table (Useful for "Jump Back In") - Added for completeness
    c.execute('''
        CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            song_id TEXT,
            song_json TEXT,
            played_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 3. NEW: Playlists Table
    c.execute('''
        CREATE TABLE IF NOT EXISTS playlists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 4. NEW: Playlist Songs Table
    c.execute('''
        CREATE TABLE IF NOT EXISTS playlist_songs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            playlist_id INTEGER,
            song_id TEXT,
            song_json TEXT, -- We store the full song data for faster loading
            added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(playlist_id) REFERENCES playlists(id)
        )
    ''')
    conn.commit()
    conn.close()

# --- LIBRARY FUNCTIONS ---

def add_song(song_data):
    # Ensure ID exists
    if 'id' not in song_data: return False
    
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    try:
        c.execute('''
            INSERT OR IGNORE INTO library (id, title, artist, url, thumbnail, source, duration)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            song_data.get('id'),
            song_data.get('title'),
            song_data.get('artist'),
            song_data.get('url'),
            song_data.get('thumbnail'),
            song_data.get('source'),
            song_data.get('duration')
        ))
        conn.commit()
        return True
    except Exception as e:
        print(f"DB Error: {e}")
        return False
    finally:
        conn.close()

def get_library():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute('SELECT * FROM library ORDER BY added_at DESC')
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def remove_song(song_id):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute('DELETE FROM library WHERE id = ?', (song_id,))
    conn.commit()
    conn.close()

# --- NEW PLAYLIST FUNCTIONS ---

def create_playlist(name):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    try:
        c.execute('INSERT INTO playlists (name) VALUES (?)', (name,))
        conn.commit()
        pid = c.lastrowid
        return {"success": True, "id": pid, "name": name}
    except sqlite3.IntegrityError:
        return {"success": False, "error": "Playlist already exists"}
    except Exception as e:
        return {"success": False, "error": str(e)}
    finally:
        conn.close()

def get_playlists():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute('SELECT * FROM playlists ORDER BY created_at DESC')
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def add_to_playlist(playlist_id, song):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    try:
        # Check if song already in playlist
        c.execute('SELECT id FROM playlist_songs WHERE playlist_id = ? AND song_id = ?', (playlist_id, song['id']))
        if c.fetchone():
            return {"success": False, "error": "Song already in playlist"}
        
        c.execute('INSERT INTO playlist_songs (playlist_id, song_id, song_json) VALUES (?, ?, ?)', 
                  (playlist_id, song['id'], json.dumps(song)))
        conn.commit()
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}
    finally:
        conn.close()

def get_playlist_songs(playlist_id):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute('SELECT song_json FROM playlist_songs WHERE playlist_id = ? ORDER BY added_at DESC', (playlist_id,))
    rows = c.fetchall()
    conn.close()
    # Decode JSON back to dict
    return [json.loads(row[0]) for row in rows]

# Initialize
init_db()

