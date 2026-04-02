import requests

def search_jiosaavn(query):
    # JioSaavn Hidden API
    url = "https://www.jiosaavn.com/api.php"
    params = {
        "__call": "search.getResults",
        "_format": "json",
        "_marker": "0",
        "api_version": "4",
        "p": "1",
        "n": "10",
        "q": query
    }
    
    results = []
    try:
        res = requests.get(url, params=params)
        data = res.json()
        
        if "results" in data:
            for song in data["results"]:
                more_info = song.get("more_info", {})
                
                # Get Title
                title = song.get("title")
                if not title: continue # Skip invalid results

                # Get Artist
                artist = "Unknown"
                if "artistMap" in more_info:
                    p_artists = more_info["artistMap"].get("primary_artists", [])
                    if p_artists:
                        artist = p_artists[0].get("name")
                
                # Fallback Artist
                if artist == "Unknown":
                    artist = song.get("subtitle", "Unknown")

                # Get Duration
                duration = 0
                try:
                    duration = int(more_info.get("duration", 0))
                except:
                    pass
                
                # High-res image fix
                img = song.get("image", "").replace("150x150", "500x500")
                
                results.append({
                    "title": title,
                    "artist": artist,
                    "duration": duration,
                    "id": song.get("id"),
                    "url": song.get("perma_url"), 
                    "thumbnail": img,
                    "source": "jiosaavn"
                })
    except Exception as e:
        print(f"JioSaavn Error: {e}")
        
    return results
