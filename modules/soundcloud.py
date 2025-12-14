import yt_dlp

def search_soundcloud(query, max_results=5):
    """
    Searches SoundCloud for the given query using yt-dlp's scsearch.
    """
    ydl_opts = {
        'quiet': True,
        'extract_flat': True,
        'dump_single_json': True,
        'noplaylist': True,
    }

    results = []
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            search_query = f"scsearch{max_results}:{query}"
            info = ydl.extract_info(search_query, download=False)
            
            if 'entries' in info:
                for entry in info['entries']:
                    results.append({
                        'title': entry.get('title'),
                        'artist': entry.get('uploader', 'Unknown'), # SoundCloud uploader is usually the artist
                        'duration': entry.get('duration'),
                        'id': entry.get('id'),
                        'url': entry.get('url'),
                        'thumbnail': entry.get('thumbnail'), # yt-dlp might not get SC thumbnails in flat mode, but let's try
                        'source': 'soundcloud'
                    })
    except Exception as e:
        print(f"Error searching SoundCloud: {e}")
        return []

    return results

if __name__ == "__main__":
    # Test
    print(search_soundcloud("Skrillex Bangarang"))
