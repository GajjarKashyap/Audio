import yt_dlp

def search_youtube(query, max_results=5):
    """
    Searches YouTube for the given query and returns a list of dictionaries.
    Each dictionary contains: title, artist, duration, uploader, thumbnail, url, source.
    """
    ydl_opts = {
        'quiet': False,
        'extract_flat': True,
        'dump_single_json': True,
        'noplaylist': True,
    }

    results = []
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # Force search prefix and quotes to ensure it treats it as a search
            search_query = f"ytsearch{max_results}:{query}"
            print(f"DEBUG: Searching with query string: {search_query}")
            
            info = ydl.extract_info(search_query, download=False)
            
            # Search results are usually directly in entries
            if 'entries' in info:
                for entry in info['entries']:
                    results.append({
                        'title': entry.get('title'),
                        'artist': entry.get('channel', 'Unknown'), # YouTube often puts artist in channel
                        'duration': entry.get('duration'),
                        'id': entry.get('id'),
                        'url': entry.get('url') or f"https://www.youtube.com/watch?v={entry.get('id')}",
                        'thumbnail': entry.get('thumbnail'),
                        'source': 'youtube'
                    })
    except Exception as e:
        print(f"Error searching YouTube: {e}")
        return []

    return results

if __name__ == "__main__":
    # Test
    print(search_youtube("Linkin Park Numb"))
