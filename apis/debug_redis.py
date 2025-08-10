#!/usr/bin/env python3
"""
Debug script to check Redis data structure
"""

import redis
import json

def debug_redis():
    """Debug the Redis data structure"""
    try:
        print("🔍 Debugging Redis data structure...")
        
        redis_client = redis.Redis(host='127.0.0.1', port=6379, decode_responses=False)  # Don't decode binary data
        
        # Get vector keys
        vector_keys = [key.decode('utf-8') for key in redis_client.keys(b"search:vector:*")]
        print(f"Vector keys found: {len(vector_keys)}")
        
        if vector_keys:
            # Check the first vector key
            sample_key = vector_keys[0]
            print(f"\nSample key: {sample_key}")
            
            # Check what type of data it is
            key_type = redis_client.type(sample_key).decode('utf-8')
            print(f"Key type: {key_type}")
            
            if key_type == 'hash':
                # Get hash fields
                hash_data = redis_client.hgetall(sample_key)
                print(f"Hash fields: {[k.decode('utf-8') for k in hash_data.keys()]}")
                for field, value in hash_data.items():
                    field_str = field.decode('utf-8')
                    if field_str == 'vector':
                        print(f"  {field_str}: [vector data {len(value)} bytes]")
                    else:
                        try:
                            value_str = value.decode('utf-8')
                            print(f"  {field_str}: {value_str[:100]}...")
                        except:
                            print(f"  {field_str}: [binary data {len(value)} bytes]")
                        
            elif key_type == 'string':
                value = redis_client.get(sample_key)
                print(f"String value length: {len(value)}")
                try:
                    value_str = value.decode('utf-8')
                    parsed = json.loads(value_str)
                    print(f"JSON keys: {list(parsed.keys()) if isinstance(parsed, dict) else 'Not a dict'}")
                except:
                    print("Not valid JSON or UTF-8")
        
        # Check if there are metadata keys
        metadata_keys = [key.decode('utf-8') for key in redis_client.keys(b"search:metadata:*")]
        print(f"\nMetadata keys found: {len(metadata_keys)}")
        
        if metadata_keys:
            sample_meta = metadata_keys[0]
            print(f"Sample metadata key: {sample_meta}")
            meta_data = redis_client.hgetall(sample_meta)
            print(f"Metadata: {meta_data}")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_redis()
