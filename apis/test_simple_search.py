#!/usr/bin/env python3
"""
Simple Traditional Search Test
"""

import requests
import json

BASE_URL = "http://localhost:8000/apis"
TEST_USER_CREDENTIALS = {
    "username": "admin",
    "password": "admin"
}

def get_auth_token():
    """Get authentication token"""
    try:
        response = requests.post(f"{BASE_URL}/public/auth", json=TEST_USER_CREDENTIALS)
        if response.status_code == 200:
            return response.json()["access_token"]
        else:
            print(f"❌ Authentication failed: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Auth error: {str(e)}")
        return None

def test_simple_searches():
    """Test simple searches that should definitely match"""
    token = get_auth_token()
    if not token:
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test simple queries that exist in titles
    test_queries = [
        "ITG DocVerse",
        "Technical Architecture", 
        "React",
        "Getting Started",
        "Welcome"
    ]
    
    for query in test_queries:
        print(f"\n🔎 Testing: '{query}'")
        params = {
            "q": query,
            "limit": 3,
            "threshold": 0.3
        }
        
        try:
            response = requests.get(f"{BASE_URL}/search/semantic", params=params, headers=headers)
            if response.status_code == 200:
                results = response.json()
                print(f"✅ Found {len(results)} results")
                for i, result in enumerate(results, 1):
                    print(f"   {i}. {result['title']}")
            else:
                print(f"❌ Failed: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    test_simple_searches()
