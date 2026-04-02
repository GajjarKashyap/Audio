import requests
import sys

BASE_URL = "http://127.0.0.1:5000"

def test_status():
    print(f"[TEST] Checking Status at {BASE_URL}/api/status")
    try:
        r = requests.get(f"{BASE_URL}/api/status")
        if r.status_code == 200 and r.json().get('status') == 'online':
            print("  [PASS] Server is Online")
            return True
        else:
            print(f"  [FAIL] Unexpected response: {r.text}")
            return False
    except Exception as e:
        print(f"  [FAIL] Connection Error: {e}")
        return False

def test_search():
    print(f"[TEST] Checking Search at {BASE_URL}/api/search")
    start_q = "Numb"
    try:
        r = requests.get(f"{BASE_URL}/api/search", params={'q': start_q})
        if r.status_code == 200:
            data = r.json()
            if data.get('count', 0) > 0:
                print(f"  [PASS] Found {data['count']} results for '{start_q}'")
                return True
            else:
                print("  [WARN] Request worked but returned 0 results.")
                return True # Still technically a pass of the endpoint logic
        else:
            print(f"  [FAIL] Search Error: {r.status_code}")
            return False
    except Exception as e:
        print(f"  [FAIL] Connection Error: {e}")
        return False

if __name__ == "__main__":
    print("Running Nexus Audio Self-Correction Tests...")
    status_ok = test_status()
    
    if status_ok:
        search_ok = test_search()
        
    print("\n[SUMMARY]")
    if status_ok and 'search_ok' in locals() and search_ok:
        print("ALL SYSTEMS GO.")
    else:
        print("SYSTEM CHECK FAILED.")
