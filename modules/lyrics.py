import requests

def get_lyrics(track_name, artist_name, duration=None):
    """
    Fetches lyrics from LRCLIB.net.
    Returns a dictionary with 'plain' and 'synced' lyrics.
    """
    base_url = "https://lrclib.net/api/get"
    params = {
        'track_name': track_name,
        'artist_name': artist_name,
        'duration': duration
    }
    
    try:
        response = requests.get(base_url, params=params, timeout=5)
        if response.status_code == 200:
            data = response.json()
            return {
                "plain": data.get("plainLyrics"),
                "synced": data.get("syncedLyrics"), # This is the LRC format string
                "found": True
            }
        else:
            return {"found": False, "error": "Lyrics not found"}
            
    except Exception as e:
        print(f"Lyrics Error: {e}")
        return {"found": False, "error": str(e)}

if __name__ == "__main__":
    print(get_lyrics("Numb", "Linkin Park", 187))
