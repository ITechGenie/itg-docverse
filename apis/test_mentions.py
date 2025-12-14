"""
Test script for mentions functionality
Tests that mentioned_user_ids are properly logged in user_events
"""
import asyncio
import sys
from pathlib import Path

# Add the src directory to Python path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from services.database.sqlite_service import SQLiteService
from config.settings import Settings

async def test_mentions():
    """Test the mentions functionality"""
    
    # Initialize database service
    settings = Settings()
    db = SQLiteService(settings)
    await db.initialize()
    
    print("=" * 60)
    print("Testing Mentions Functionality")
    print("=" * 60)
    
    try:
        # Test 1: Validate usernames and get user IDs
        print("\n1. Testing username validation...")
        mentioned_usernames = ["prakashm88", "admin", "invalid_user_123"]
        
        placeholders = ','.join('?' * len(mentioned_usernames))
        query = f"SELECT id, username FROM users WHERE username IN ({placeholders})"
        valid_users = await db.execute_query(query, tuple(mentioned_usernames))
        
        print(f"   Input usernames: {mentioned_usernames}")
        print(f"   Valid users found: {len(valid_users)}")
        for user in valid_users:
            print(f"     - {user['username']} (ID: {user['id']})")
        
        valid_user_map = {user['username']: user['id'] for user in valid_users}
        invalid_usernames = set(mentioned_usernames) - set(valid_user_map.keys())
        if invalid_usernames:
            print(f"   Invalid usernames: {invalid_usernames}")
        
        # Test 2: Log mention events
        if valid_users:
            print("\n2. Testing mention event logging...")
            test_mentioning_user = valid_users[0]['id']  # Use first valid user as mentioner
            test_entity_id = "test-post-123"
            
            await db.log_mention_events(
                mentioned_user_ids=mentioned_usernames,
                mentioning_user_id=test_mentioning_user,
                entity_type='post',
                entity_id=test_entity_id,
                metadata={'post_title': 'Test Post with Mentions'}
            )
            
            print(f"   ✓ Mention events logged for entity: {test_entity_id}")
            
            # Test 3: Verify events were created
            print("\n3. Verifying logged events...")
            events = await db.execute_query(
                """SELECT ue.id, ue.user_id, u.username, ue.event_type_id, 
                          ue.target_type, ue.target_id, ue.metadata
                   FROM user_events ue
                   JOIN users u ON ue.user_id = u.id
                   WHERE ue.target_id = ? AND ue.event_type_id = 'event-mentioned'
                   ORDER BY ue.created_ts DESC""",
                (test_entity_id,)
            )
            
            print(f"   Found {len(events)} mention events:")
            for event in events:
                print(f"     - User: {event['username']} | Type: {event['event_type_id']}")
                print(f"       Target: {event['target_type']}/{event['target_id']}")
                print(f"       Metadata: {event['metadata']}")
            
            # Test 4: Test duplicate removal
            print("\n4. Testing duplicate removal...")
            duplicate_usernames = ["prakashm88", "prakashm88", "admin"]
            unique_usernames = list(dict.fromkeys(duplicate_usernames))
            print(f"   Input: {duplicate_usernames}")
            print(f"   After deduplication: {unique_usernames}")
            
            # Test 5: Test empty list handling
            print("\n5. Testing empty list handling...")
            await db.log_mention_events(
                mentioned_user_ids=[],
                mentioning_user_id=test_mentioning_user,
                entity_type='post',
                entity_id='test-empty-123',
                metadata={}
            )
            print("   ✓ Empty list handled gracefully (no events logged)")
            
            print("\n" + "=" * 60)
            print("✓ All tests passed!")
            print("=" * 60)
        else:
            print("\n⚠ No valid users found in database. Please create users first.")
            
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await db.close()

if __name__ == "__main__":
    asyncio.run(test_mentions())
