#!/usr/bin/env python3
"""
Semantic Search API Test Script
Use this to test the search endpoints after starting the server
"""

import requests
import json
import time

# Configuration
BASE_URL = "http://localhost:8000/apis"
TEST_USER_CREDENTIALS = {
    "username": "admin",
    "password": "admin"  # Default password for admin user
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

def test_indexing(token):
    """Test the indexing endpoint"""
    print("\n🔍 Testing POST /search/index...")
    
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "force_reindex": False,
        "post_types": ["posts", "thoughts"]  # Optional filter
    }
    
    try:
        response = requests.post(f"{BASE_URL}/search/index", json=payload, headers=headers)
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Indexing started: {result}")
            return result.get("trigger_id")
        else:
            print(f"❌ Indexing failed: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Indexing error: {str(e)}")
        return None

def check_index_status(token, trigger_id):
    """Check indexing status"""
    if not trigger_id:
        return
        
    print(f"\n📊 Checking indexing status for {trigger_id}...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(f"{BASE_URL}/search/status/{trigger_id}", headers=headers)
        if response.status_code == 200:
            status = response.json()
            print(f"✅ Status: {json.dumps(status, indent=2)}")
            return status["status"]
        else:
            print(f"❌ Status check failed: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Status error: {str(e)}")
        return None

def test_search(token, query="FastAPI with React"):
    """Test the semantic search endpoint"""
    print(f"\n🔎 Testing semantic search with query: '{query}'...")
    
    headers = {"Authorization": f"Bearer {token}"}
    params = {
        "q": query,
        "limit": 5,
        "threshold": 0.3  # Lower threshold to find more results
    }
    
    try:
        response = requests.get(f"{BASE_URL}/search/semantic", params=params, headers=headers)
        if response.status_code == 200:
            results = response.json()
            print(f"✅ Search successful! Found {len(results)} results:")
            for i, result in enumerate(results, 1):
                print(f"\n{i}. {result['title']} (Score: {result['similarity_score']:.2f})")
                print(f"   Author: {result['author_name']} | Type: {result['post_type']}")
                print(f"   Snippet: {result['content_snippet'][:100]}...")
                print(f"   Tags: {', '.join(result['tags'])}")
        else:
            print(f"❌ Search failed: {response.text}")
    except Exception as e:
        print(f"❌ Search error: {str(e)}")

def debug_indexed_content(token):
    """Check what content is actually indexed"""
    print(f"\n🔍 Checking what content is indexed...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(f"{BASE_URL}/search/debug/chunks", headers=headers)
        if response.status_code == 200:
            debug_info = response.json()
            print(f"✅ Found {debug_info['total_chunks']} indexed chunks")
            print("\n📝 Sample content:")
            for chunk in debug_info['sample_chunks'][:3]:  # Show first 3
                print(f"  - {chunk['title']} ({chunk['post_type']})")
                print(f"    Content: {chunk['content_preview']}")
                print(f"    Tags: {chunk['tags']}")
                print()
        else:
            print(f"❌ Debug failed: {response.text}")
    except Exception as e:
        print(f"❌ Debug error: {str(e)}")

def test_search_with_thresholds(token, query="authentication"):
    """Test search with different similarity thresholds"""
    print(f"\n🎯 Testing '{query}' with different thresholds...")
    
    thresholds = [0.1, 0.3, 0.5, 0.7]
    headers = {"Authorization": f"Bearer {token}"}
    
    for threshold in thresholds:
        params = {
            "q": query,
            "limit": 3,
            "threshold": threshold
        }
        
        try:
            response = requests.get(f"{BASE_URL}/search/semantic", params=params, headers=headers)
            if response.status_code == 200:
                results = response.json()
                print(f"  Threshold {threshold}: Found {len(results)} results")
                if results:
                    best_score = max(result['similarity_score'] for result in results)
                    print(f"    Best match: {best_score:.3f}")
            else:
                print(f"  Threshold {threshold}: Error - {response.text}")
        except Exception as e:
            print(f"  Threshold {threshold}: Error - {str(e)}")

def main():
    print("🚀 Starting Semantic Search API Tests...")
    
    # Step 1: Get authentication token
    print("\n1. Getting authentication token...")
    token = get_auth_token()
    if not token:
        print("❌ Cannot proceed without authentication")
        return
    
    print("✅ Authentication successful!")
    
    # Step 2: Trigger indexing
    print("\n2. Triggering content indexing...")
    trigger_id = test_indexing(token)
    
    # Step 3: Wait and check status
    if trigger_id:
        print("\n3. Waiting for indexing to complete...")
        for attempt in range(10):  # Wait up to 30 seconds
            time.sleep(3)
            status = check_index_status(token, trigger_id)
            if status in ["completed", "partial_failure", "failed"]:
                break
            print(f"   Still processing... (attempt {attempt + 1}/10)")
    
    # Step 4: Test various searches
    print("\n4. Testing semantic search queries...")
    
    # First, debug what's indexed
    debug_indexed_content(token)
    
    # Test with different thresholds for problematic queries
    test_search_with_thresholds(token, "authentication and JWT tokens")
    test_search_with_thresholds(token, "Redis configuration")
    
    test_queries = [
        "How to use FastAPI with React?",
        "PostgreSQL database migration",
        "ITG DocVerse architecture",
        "authentication and JWT tokens",
        "Redis configuration setup"
    ]
    
    for query in test_queries:
        test_search(token, query)
        time.sleep(1)  # Brief pause between searches
    
    print("\n🎉 All tests completed!")
    print("\n💡 You can now:")
    print("   - Visit http://localhost:8000/docs to see the API documentation")
    print("   - Test more queries via the Swagger UI")
    print("   - Build a frontend search interface")

if __name__ == "__main__":
    main()
