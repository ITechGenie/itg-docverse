#!/usr/bin/env python3
"""
Test script for checking semantic search results
"""

import asyncio
import sys
import redis
import json
import ollama
sys.path.append('.')

from src.routers.search import search_vectors_in_redis
from src.services.database.factory import DatabaseServiceFactory

async def test_search():
    """Test the semantic search functionality"""
    try:
        print("🔍 Testing semantic search functionality...")
        
        # Check Redis directly
        print("\n📊 Checking Redis storage...")
        redis_client = redis.Redis(host='127.0.0.1', port=6379, decode_responses=True)
        
        # Check vector keys
        vector_keys = redis_client.keys("search:vector:*")
        print(f"Vector keys in Redis: {len(vector_keys)}")
        for key in vector_keys[:5]:  # Show first 5
            print(f"  {key}")
        
        if len(vector_keys) == 0:
            print("❌ No vectors found in Redis!")
            return
            
        # Test embedding generation
        print("\n🤖 Testing Ollama embedding...")
        try:
            query = "react"
            response = ollama.embeddings(model='nomic-embed-text', prompt=query)
            query_vector = response['embedding']
            print(f"✓ Generated embedding for '{query}' - {len(query_vector)} dimensions")
        except Exception as e:
            print(f"❌ Ollama embedding failed: {e}")
            return
            
        # Test vector search
        print(f"\n🔍 Searching for '{query}' in Redis vectors...")
        try:
            results = await search_vectors_in_redis(query_vector, limit=5, threshold=0.3)
            print(f"Vector search results: {len(results)} found")
            for i, result in enumerate(results):
                similarity = result.get('similarity', 0)
                metadata = result.get('metadata', {})
                content = metadata.get('content', 'No content')
                title = metadata.get('title', 'No title')
                post_id = metadata.get('post_id', 'No post ID')
                print(f"  {i+1}. Score: {similarity:.3f} | {title[:40]}... | {content[:60]}...")
        except Exception as search_error:
            print(f"❌ Vector search failed: {search_error}")
            import traceback
            traceback.print_exc()
            
        # Test with another query
        print(f"\n🔍 Searching for 'architecture' in Redis vectors...")
        try:
            response = ollama.embeddings(model='nomic-embed-text', prompt='architecture')
            query_vector = response['embedding']
            results = await search_vectors_in_redis(query_vector, limit=3, threshold=0.3)
            print(f"Vector search results: {len(results)} found")
            for i, result in enumerate(results):
                similarity = result.get('similarity', 0)
                metadata = result.get('metadata', {})
                content = metadata.get('content', 'No content')
                title = metadata.get('title', 'No title')
                print(f"  {i+1}. Score: {similarity:.3f} | {title[:40]}... | {content[:60]}...")
        except Exception as search_error:
            print(f"❌ Vector search failed: {search_error}")
        
    except Exception as e:
        print(f"❌ Error during search test: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_search())
