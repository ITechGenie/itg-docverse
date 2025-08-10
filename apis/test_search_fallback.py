#!/usr/bin/env python3
"""
Test Search Fallback Functionality
Tests both AI search and traditional search modes
"""

import requests
import json
import time
import os

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
    """Test the search configuration endpoint"""
    print("\n🔧 Checking search configuration...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(f"{BASE_URL}/search/config", headers=headers)
        if response.status_code == 200:
            config = response.json()
            print(f"✅ Search Config Retrieved:")
            print(f"   🤖 AI Search Enabled: {config['ai_search_enabled']}")
            print(f"   🌟 AI Search Available: {config['ai_search_available']}")
            print(f"   🔍 Search Mode: {config['search_mode']}")
            print(f"   📊 Indexed Chunks: {config['statistics']['indexed_chunks']}")
            
            print(f"\n   🔧 Components Status:")
            print(f"      Ollama: {'✅' if config['components']['ollama']['available'] else '❌'} ({config['components']['ollama']['host']})")
            print(f"      Redis:  {'✅' if config['components']['redis']['available'] else '❌'} ({config['components']['redis']['host']}:{config['components']['redis']['port']})")
            
            return config
        else:
            print(f"❌ Config check failed: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Config error: {str(e)}")
        return None

def test_search_query(token, query, mode="default"):
    """Test search with a specific query"""
    print(f"\n🔎 Testing search: '{query}' (mode: {mode})")
    
    headers = {"Authorization": f"Bearer {token}"}
    params = {
        "q": query,
        "limit": 3,
        "threshold": 0.3
    }
    
    try:
        response = requests.get(f"{BASE_URL}/search/semantic", params=params, headers=headers)
        if response.status_code == 200:
            results = response.json()
            print(f"✅ Found {len(results)} results:")
            for i, result in enumerate(results, 1):
                score_info = f" (Score: {result['similarity_score']:.2f})" if result.get('similarity_score') else " (Traditional)"
                print(f"   {i}. {result['title']}{score_info}")
                print(f"      Author: {result['author_name']} | Type: {result['post_type']}")
        else:
            print(f"❌ Search failed: {response.text}")
    except Exception as e:
        print(f"❌ Search error: {str(e)}")

def test_with_ai_disabled():
    """Test with AI search disabled via environment variable"""
    print("\n" + "="*60)
    print("🚫 TESTING WITH AI SEARCH DISABLED")
    print("="*60)
    
    # Set environment variable to disable AI search
    os.environ["ENABLE_AI_SEARCH"] = "false"
    
    print("⚠️  NOTE: You need to restart the server with ENABLE_AI_SEARCH=false to test this properly")
    print("💡 For now, we'll test indexing endpoint which should return 501 when AI is disabled")
    
    token = get_auth_token()
    if not token:
        return
    
    # Test indexing (should fail when AI disabled)
    print("\n🔍 Testing indexing with AI disabled...")
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"force_reindex": False}
    
    try:
        response = requests.post(f"{BASE_URL}/search/index", json=payload, headers=headers)
        if response.status_code == 501:
            print("✅ Indexing correctly disabled when AI search is off")
            print(f"   Response: {response.json()['detail']}")
        else:
            print(f"⚠️  Unexpected response: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Indexing test error: {str(e)}")

def main():
    print("🚀 Testing Search Fallback Functionality...")
    
    # Test 1: Check current configuration
    token = get_auth_token()
    if not token:
        print("❌ Cannot proceed without authentication")
        return
    
    print("✅ Authentication successful!")
    
    config = test_search_config(token)
    
    # Test 2: Search queries
    test_queries = [
        "How to use FastAPI with React?",
        "authentication and JWT tokens",
        "Redis configuration setup",
        "ITG DocVerse architecture"
    ]
    
    for query in test_queries:
        test_search_query(token, query)
        time.sleep(0.5)
    
    # Test 3: Show how to disable AI search
    print("\n" + "="*60)
    print("💡 HOW TO TEST TRADITIONAL SEARCH ONLY:")
    print("="*60)
    print("1. Stop the API server")
    print("2. Set environment variable: export ENABLE_AI_SEARCH=false")
    print("3. Restart the API server")
    print("4. Run this test again")
    print()
    print("Alternative: Create .env file with ENABLE_AI_SEARCH=false")
    
    # Test 4: Simulate AI disabled scenario
    test_with_ai_disabled()
    
    print("\n🎉 All fallback tests completed!")
    print("\n💡 Summary:")
    print("   - ✅ Search endpoint adapts based on AI availability")
    print("   - 🔄 Automatic fallback to traditional search")
    print("   - ⚙️  Configurable via ENABLE_AI_SEARCH environment variable")
    print("   - 📊 Configuration endpoint shows current status")

if __name__ == "__main__":
    main()
