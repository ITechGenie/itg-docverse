#!/usr/bin/env python3
"""
Test script for semantic search setup
Run this to verify Ollama and Redis connections work
"""

import asyncio
import sys
import os

# Add the src directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

async def test_setup():
    """Test the semantic search setup"""
    print("🧪 Testing Semantic Search Setup...")
    
    # Test 1: Ollama connection
    print("\n1. Testing Ollama connection...")
    try:
        import ollama
        
        # Test if nomic-embed-text model is available
        response = ollama.embeddings(
            model="nomic-embed-text",
            prompt="This is a test message"
        )
        
        if 'embedding' in response and len(response['embedding']) > 0:
            print(f"✅ Ollama working! Embedding dimension: {len(response['embedding'])}")
        else:
            print("❌ Ollama response invalid")
            return False
            
    except Exception as e:
        print(f"❌ Ollama test failed: {str(e)}")
        print("💡 Make sure Ollama is running: ollama serve")
        print("💡 Install the model: ollama pull nomic-embed-text")
        return False
    
    # Test 2: Redis connection
    print("\n2. Testing Redis connection...")
    try:
        import redis
        from src.config.settings import get_settings
        
        settings = get_settings()
        redis_client = redis.Redis(
            host=settings.redis_host,
            port=settings.redis_port,
            decode_responses=False
        )
        
        # Test Redis connection
        redis_client.ping()
        print("✅ Redis connection successful!")
        
        # Test vector storage
        import numpy as np
        test_vector = np.random.rand(768).astype(np.float32)
        vector_bytes = test_vector.tobytes()
        
        redis_client.hset("test:vector", "data", vector_bytes)
        retrieved = redis_client.hget("test:vector", "data")
        retrieved_vector = np.frombuffer(retrieved, dtype=np.float32)
        
        if np.array_equal(test_vector, retrieved_vector):
            print("✅ Vector storage/retrieval working!")
        else:
            print("❌ Vector storage test failed")
            return False
            
        # Clean up test data
        redis_client.delete("test:vector")
        
    except Exception as e:
        print(f"❌ Redis test failed: {str(e)}")
        print("💡 Make sure Redis is running: redis-server")
        return False
    
    # Test 3: Database connection
    print("\n3. Testing Database connection...")
    try:
        from src.services.database.factory import DatabaseServiceFactory
        
        db_service = DatabaseServiceFactory.create_service()
        
        # Test a simple query
        users = await db_service.get_users(skip=0, limit=1)
        print(f"✅ Database connection successful! Found {len(users)} users")
        
    except Exception as e:
        print(f"❌ Database test failed: {str(e)}")
        return False
    
    print("\n🎉 All tests passed! Semantic search is ready to go!")
    print("\n📋 Quick Start Guide:")
    print("1. Start the API server: uvicorn main:app --reload")
    print("2. Index posts: POST /apis/search/index")
    print("3. Search: GET /apis/search/semantic?q=your+query")
    
    return True

if __name__ == "__main__":
    result = asyncio.run(test_setup())
    sys.exit(0 if result else 1)
