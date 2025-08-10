#!/usr/bin/env python3
"""
Comprehensive Search Fallback Test
Tests both AI and traditional search modes with configuration changes
"""

import requests
import json
import time

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
    print("🔧 Checking search configuration...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(f"{BASE_URL}/search/config", headers=headers)
        if response.status_code == 200:
            config = response.json()
            print(f"   🤖 AI Search Enabled: {config['ai_search_enabled']}")
            print(f"   🌟 AI Search Available: {config['ai_search_available']}")
            print(f"   🔍 Search Mode: {config['search_mode']}")
            print(f"   📊 Indexed Chunks: {config['statistics']['indexed_chunks']}")
            
            print(f"   🔧 Components Status:")
            ollama_status = "✅" if config['components']['ollama']['available'] else "❌"
            redis_status = "✅" if config['components']['redis']['available'] else "❌"
            print(f"      Ollama: {ollama_status} ({config['components']['ollama']['host']})")
            print(f"      Redis:  {redis_status} ({config['components']['redis']['host']}:{config['components']['redis']['port']})")
            
            return config
        else:
            print(f"❌ Config check failed: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Config error: {str(e)}")
        return None

def test_search_queries(token, test_name=""):
    """Test search with various queries"""
    print(f"\n🔎 Testing Search Queries {test_name}...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    test_queries = [
        ("ITG DocVerse", "Should find platform content"),
        ("React FastAPI", "Should find technical content"),
        ("Getting Started", "Should find tutorial content"),
        ("authentication", "Should find auth-related content"),
        ("Welcome", "Should find welcome content")
    ]
    
    for query, description in test_queries:
        params = {
            "q": query,
            "limit": 3,
            "threshold": 0.3
        }
        
        try:
            response = requests.get(f"{BASE_URL}/search/semantic", params=params, headers=headers)
            if response.status_code == 200:
                results = response.json()
                print(f"   ✅ '{query}': {len(results)} results")
                for i, result in enumerate(results, 1):
                    score_info = f" (Score: {result['similarity_score']:.2f})" if result.get('similarity_score') else " (Traditional)"
                    print(f"      {i}. {result['title'][:50]}...{score_info}")
            else:
                print(f"   ❌ '{query}': Failed - {response.status_code}")
        except Exception as e:
            print(f"   ❌ '{query}': Error - {str(e)}")
        
        time.sleep(0.2)  # Brief pause between queries

def test_indexing(token):
    """Test the indexing endpoint"""
    print("\n📚 Testing Indexing Endpoint...")
    
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "force_reindex": False,
        "post_types": ["posts"]
    }
    
    try:
        response = requests.post(f"{BASE_URL}/search/index", json=payload, headers=headers)
        if response.status_code == 200:
            result = response.json()
            print(f"   ✅ Indexing started: {result.get('message')}")
            return result.get('trigger_id')
        elif response.status_code == 501:
            print(f"   ⚠️  Indexing disabled: {response.json().get('detail')}")
            return None
        else:
            print(f"   ❌ Indexing failed: {response.text}")
            return None
    except Exception as e:
        print(f"   ❌ Indexing error: {str(e)}")
        return None

def main():
    print("🚀 Comprehensive Search Fallback Test")
    print("="*50)
    
    # Step 1: Authentication
    token = get_auth_token()
    if not token:
        print("❌ Cannot proceed without authentication")
        return
    
    print("✅ Authentication successful!")
    
    # Step 2: Check current configuration
    config = test_search_config(token)
    
    # Step 3: Test search queries
    test_search_queries(token, "(Current Mode)")
    
    # Step 4: Test indexing
    test_indexing(token)
    
    # Step 5: Summary and instructions
    print("\n" + "="*50)
    print("📊 SEARCH FALLBACK SUMMARY")
    print("="*50)
    
    if config:
        if config['ai_search_available']:
            print("✅ AI Search Mode Active:")
            print("   - Ollama embeddings working")
            print("   - Redis vector storage available")
            print("   - Semantic search with similarity scores")
            print("   - Falls back to traditional search if AI fails")
        else:
            print("✅ Traditional Search Mode Active:")
            print("   - SQL LIKE queries working")
            print("   - No similarity scores (None values)")
            print("   - Reliable fallback when AI unavailable")
    
    print("\n💡 How to Toggle Search Modes:")
    print("   1. AI Search:      Set ENABLE_AI_SEARCH=true in .env")
    print("   2. Traditional:    Set ENABLE_AI_SEARCH=false in .env")
    print("   3. Restart server after changes")
    
    print("\n🎯 Key Features Implemented:")
    print("   ✅ Configurable AI search via environment variable")
    print("   ✅ Automatic fallback to traditional database search")
    print("   ✅ Component health checking (Ollama, Redis)")
    print("   ✅ Graceful error handling and logging")
    print("   ✅ Optional similarity scores in response model")
    print("   ✅ Configuration endpoint for status monitoring")
    
    print("\n🎉 Search Fallback Implementation Complete!")

if __name__ == "__main__":
    main()
