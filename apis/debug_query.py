#!/usr/bin/env python3
"""
Debug Database Query
Test the actual database query directly
"""

import asyncio
import sys
import os

# Add the parent directory to Python path
sys.path.append('/Users/prakash/MyDocs/Projects/itg-docverse/apis')

from src.services.database.factory import DatabaseServiceFactory

async def test_direct_query():
    db_service = DatabaseServiceFactory.create_service()
    
    # Test the exact query from the search function
    query = """
        SELECT DISTINCT
            p.id,
            p.title,
            COALESCE(pc.content, p.feed_content, '') as content,
            p.post_type_id,
            p.created_ts,
            p.updated_ts,
            u.display_name as author_name,
            u.username as author_username,
            GROUP_CONCAT(tt.name) as tags
        FROM posts p
        LEFT JOIN users u ON p.author_id = u.id
        LEFT JOIN posts_content pc ON p.id = pc.post_id AND pc.is_current = 1
        LEFT JOIN post_tags pt ON p.id = pt.post_id
        LEFT JOIN tag_types tt ON pt.tag_id = tt.id
        WHERE p.status = 'published' AND (
            p.title LIKE ? OR 
            COALESCE(pc.content, p.feed_content, '') LIKE ? OR
            tt.name LIKE ?
        )
        GROUP BY p.id, p.title, pc.content, p.feed_content, p.post_type_id, 
                 p.created_ts, p.updated_ts, u.display_name, u.username
        ORDER BY 
            CASE 
                WHEN p.title LIKE ? THEN 1
                WHEN COALESCE(pc.content, p.feed_content, '') LIKE ? THEN 2
                WHEN tt.name LIKE ? THEN 3
                ELSE 4
            END,
            p.created_ts DESC
        LIMIT ?
    """
    
    params = ('%Welcome%', '%Welcome%', '%Welcome%', '%Welcome%', '%Welcome%', '%Welcome%', 3)
    
    print("Testing database query directly...")
    print(f"Query: {query}")
    print(f"Params: {params}")
    
    try:
        results = await db_service.execute_query(query, params)
        print(f"\nResults count: {len(results) if results else 0}")
        
        if results:
            print(f"\nFirst result:")
            for i, row in enumerate(results):
                print(f"Row {i}: {row}")
                print(f"Row type: {type(row)}")
                print(f"Row length: {len(row)}")
                
                if hasattr(row, '_fields'):
                    print(f"Row fields: {row._fields}")
                
                for j, col in enumerate(row):
                    print(f"  Column {j}: '{col}' (type: {type(col)})")
                print()
                
                if i >= 1:  # Only show first 2 rows
                    break
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_direct_query())
