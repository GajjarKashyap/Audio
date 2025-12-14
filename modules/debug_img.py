import requests

def check_image_url(url):
    print(f"Checking: {url}")
    try:
        r = requests.head(url)
        print(f"Status: {r.status_code}")
    except Exception as e:
        print(f"Error: {e}")

# Example from potential JioSaavn result
# Checking both original and 500x500
base = "https://c.saavncdn.com/134/Evolve-English-2017-150x150.jpg" # Example Believer album art
check_image_url(base)
check_image_url(base.replace("150x150", "500x500"))
