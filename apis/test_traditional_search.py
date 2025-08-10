#!/usr/bin/env python3
"""
Test Traditional Search API
Simple test to verify traditional database search is working
"""

import requests
import json

# Configuration
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

def test_search_config(token):
    """Test search configuration endpoint"""
    print("\n🔧 Testing search configuration...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(f"{BASE_URL}/search/config", headers=headers)
        if response.status_code == 200:
            config = response.json()
            print("✅ Search configuration:")
            print(f"   AI Search Enabled: {config['ai_search_enabled']}")
            print(f"   Redis Available: {config['redis_available']}")
            print(f"   Ollama Available: {config['ollama_available']}")
            print(f"   Search Mode: {config['search_mode']}")
            print(f"   Fallback Enabled: {config['fallback_enabled']}")
            return config
        else:
            print(f"❌ Config check failed: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Config error: {str(e)}")
        return None

def test_traditional_search(token, query="FastAPI"):
    """Test the search endpoint in traditional mode"""
    print(f"\n🔍 Testing traditional search with query: '{query}'...")
    
    headers = {"Authorization": f"Bearer {token}"}
    params = {
        "q": query,
        "limit": 5
    }
    
    try:
        response = requests.get(f"{BASE_URL}/search/semantic", params=params, headers=headers)
        if response.status_code == 200:
            results = response.json()
            print(f"✅ Traditional search successful! Found {len(results)} results:")
            for i, result in enumerate(results, 1):
                similarity = result.get('similarity_score')
                similarity_text = f" (Score: {similarity:.2f})" if similarity else " (Traditional)"
                print(f"\n{i}. {result['title']}{similarity_text}")
                print(f"   Author: {result['author_name']} | Type: {result['post_type']}")
                print(f"   Snippet: {result['content_snippet'][:100]}...")
                if result.get('tags'):
                    print(f"   Tags: {', '.join(result['tags'])}")
            return results
        else:
            print(f"❌ Search failed: {response.text}")
            print(f"   Status code: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Search error: {str(e)}")
        return None

def main():
    print("🚀 Testing Traditional Search Mode...")
    
    # Step 1: Get authentication token
    print("\n1. Getting authentication token...")
    token = get_auth_token()
    if not token:
        print("❌ Cannot proceed without authentication")
        return
    print("✅ Authentication successful!")
    
    # Step 2: Check search configuration
    config = test_search_config(token)
    if not config:
        print("❌ Cannot proceed without config check")
        return
    
    # Step 3: Test various searches
    print("\n2. Testing traditional search queries...")
    
    test_queries = [
        "FastAPI",
        "DocVerse", 
        "architecture",
        "tutorial",
        "getting started"
    ]
    
    successful_searches = 0
    for query in test_queries:
        results = test_traditional_search(token, query)
        if results is not None:
            successful_searches += 1
    
    print(f"\n🎉 Test completed!")
    print(f"   Successful searches: {successful_searches}/{len(test_queries)}")
    
    if config['search_mode'] == 'Traditional':
        print("✅ Traditional search is working correctly!")
    else:
        print("⚠️  Expected traditional mode but got: " + config['search_mode'])

if __name__ == "__main__":
    main()
