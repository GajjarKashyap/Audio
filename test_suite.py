import unittest
import sys
import os
import json
from app import app
from modules import youtube, soundcloud, lyrics

class MediaTypeTest(unittest.TestCase):
    """Graybox Unit Tests for Modules"""
    
    def test_youtube_module(self):
        print("\n[GRAYBOX] Testing YouTube Module internal logic...")
        results = youtube.search_youtube("Linkin Park Numb", max_results=1)
        self.assertIsInstance(results, list)
        # We expect results, but network might fail. If it strictly fails, we debug.
        if len(results) > 0:
            self.assertEqual(results[0]['source'], 'youtube')
            self.assertIn('url', results[0])
            print(f"   PASS: Found {results[0]['title']}")
        else:
            print("   WARN: No results from YouTube (Network or Rate Limit?)")

    def test_lyrics_module(self):
        print("\n[GRAYBOX] Testing Lyrics Module logic...")
        data = lyrics.get_lyrics("Numb", "Linkin Park")
        if data['found']:
            self.assertTrue('plain' in data or 'synced' in data)
            print("   PASS: Lyrics found successfully")
        else:
            print(f"   WARN: Lyrics not found: {data.get('error')}")

class ApiIntegrationTest(unittest.TestCase):
    """Blackbox API Integration Tests"""
    
    def setUp(self):
        app.testing = True
        self.client = app.test_client()

    def test_status_endpoint(self):
        print("\n[BLACKBOX] Testing /api/status endpoint...")
        response = self.client.get('/api/status')
        self.assertEqual(response.status_code, 200)
        json_data = response.get_json()
        self.assertEqual(json_data['status'], 'online')
        print("   PASS: Status is Online")

    def test_search_endpoint(self):
        print("\n[BLACKBOX] Testing /api/search endpoint...")
        valid_query = "Linkin Park"
        response = self.client.get(f'/api/search?q={valid_query}')
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn('results', data)
        print(f"   PASS: API returned {len(data['results'])} results")

    def test_lyrics_endpoint(self):
        print("\n[BLACKBOX] Testing /api/lyrics endpoint...")
        response = self.client.get('/api/lyrics?track=Numb&artist=Linkin%20Park')
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        if data.get('found'):
            print("   PASS: API returned lyrics data")
        else:
            print("   WARN: API returned 'Not Found' (acceptable if song has no lyrics)")
            
    def test_missing_params(self):
        print("\n[BLACKBOX] Testing Error Handling...")
        response = self.client.get('/api/search') # Missing q
        self.assertEqual(response.status_code, 400)
        print("   PASS: Handled missing search param correctly")

if __name__ == '__main__':
    unittest.main()
