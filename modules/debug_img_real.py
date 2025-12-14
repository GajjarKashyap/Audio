import requests
from modules.jiosaavn import search_jiosaavn

print("Searching for Believer...")
results = search_jiosaavn("Believer")

if results:
    img = results[0]['thumbnail']
    print(f"Found Thumbnail: {img}")
    
    try:
        r = requests.head(img)
        print(f"Status: {r.status_code}")
    except Exception as e:
        print(f"Error checking url: {e}")
else:
    print("No results found.")
