#!/usr/bin/env python3
"""
Test script for semantic search indexing
This script directly calls the indexing functions without going through HTTP layer
"""

import asyncio
import sys
import os
sys.path.append('.')

from src.services.database.factory import DatabaseServiceFactory
from src.routers.search import get_posts_to_index, create_index_trigger, process_posts_for_indexing

async def test_indexing():
    """Test the search indexing process"""
    try:
        # Initialize database
        db_service = DatabaseServiceFactory.create_service()
        await db_service.initialize()
        
        print("🔍 Testing semantic search indexing process...")
        
        # Check if semantic-search-kb exists now
        semantic_kb = await db_service.execute_query(
            'SELECT id, title, kb_type_id FROM knowledge_base WHERE id = ?', 
            ('semantic-search-kb',)
        )
        print(f"✓ Semantic search KB: {semantic_kb}")
        
        # Get posts to index
        print("\n📋 Getting posts to index...")
        posts_to_index = await get_posts_to_index(force_reindex=False)
        print(f"Found {len(posts_to_index)} posts to index:")
        for i, post in enumerate(posts_to_index[:3]):  # Show first 3
            print(f"  {i+1}. {post['title'][:60]}...")
        
        if len(posts_to_index) == 0:
            print("❌ No posts found to index")
            return
            
        # Get a user ID for indexing
        users = await db_service.execute_query('SELECT id FROM users WHERE username = ?', ('prakashm88',))
        if not users:
            print("❌ No user found")
            return
            
        user_id = users[0]['id']
        print(f"✓ Using user ID: {user_id}")
        
        # Create index trigger
        print("\n🚀 Creating index trigger...")
        trigger_id = await create_index_trigger(user_id, len(posts_to_index))
        print(f"✓ Created trigger: {trigger_id}")
        
        # Process posts for indexing
        print("\n📝 Processing posts for indexing...")
        await process_posts_for_indexing(trigger_id, posts_to_index, user_id)
        
        print("\n✅ Indexing process completed!")
        
        # Check Redis for indexed data
        print("\n🔍 Checking Redis for indexed data...")
        import redis
        try:
            redis_client = redis.Redis(host='127.0.0.1', port=6379, decode_responses=True)
            keys = redis_client.keys("post_chunk:*")
            print(f"✓ Found {len(keys)} indexed chunks in Redis")
            if keys:
                # Show a sample chunk
                sample_key = keys[0]
                chunk_data = redis_client.hgetall(sample_key)
                print(f"Sample chunk: {sample_key}")
                print(f"  Content: {chunk_data.get('content', '')[:100]}...")
                print(f"  Post ID: {chunk_data.get('post_id', 'N/A')}")
        except Exception as redis_error:
            print(f"⚠️ Redis check failed: {redis_error}")
        
    except Exception as e:
        print(f"❌ Error during indexing: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_indexing())
