#!/usr/bin/env python3
"""
Test script to debug PostgreSQL SQL conversion
"""

import re

def convert_sqlite_to_postgres(sql_content: str) -> str:
    """Convert SQLite-specific syntax to PostgreSQL"""
    print("🔍 Starting SQLite to PostgreSQL conversion...")
    
    original_pragmas = len(re.findall(r'PRAGMA\s+[^;]*;', sql_content, flags=re.IGNORECASE))
    original_inserts = len(re.findall(r'INSERT\s+OR\s+IGNORE', sql_content, flags=re.IGNORECASE))
    
    print(f"📊 Found {original_pragmas} PRAGMA statements to remove")
    print(f"📊 Found {original_inserts} INSERT OR IGNORE statements to convert")
    
    # Remove SQLite PRAGMA statements
    sql_content = re.sub(r'PRAGMA\s+[^;]*;', '', sql_content, flags=re.IGNORECASE)
    print("✅ Removed PRAGMA statements")
    
    # Convert INSERT OR IGNORE to INSERT ... ON CONFLICT DO NOTHING
    sql_content = re.sub(
        r'INSERT\s+OR\s+IGNORE\s+INTO\s+(\w+)\s*\(',
        r'INSERT INTO \1 (',
        sql_content,
        flags=re.IGNORECASE
    )
    print("✅ Converted INSERT OR IGNORE to INSERT")
    
    # Add ON CONFLICT DO NOTHING before VALUES clause with table-specific conflict resolution
    def add_conflict_resolution(match):
        table_name = match.group(1)
        columns = match.group(2)
        print(f"🔧 Adding conflict resolution for table: {table_name}")
        
        # Define specific conflict resolution for tables with known primary keys
        conflict_clause_map = {
            'users': 'ON CONFLICT (id) DO NOTHING',
            'posts': 'ON CONFLICT (id) DO NOTHING',
            'posts_content': 'ON CONFLICT (id) DO NOTHING',
            'post_types': 'ON CONFLICT (id) DO NOTHING',
            'tag_types': 'ON CONFLICT (id) DO NOTHING',
            'event_types': 'ON CONFLICT (id) DO NOTHING',
            'reactions': 'ON CONFLICT (event_type_id, user_id, target_type, target_id) DO NOTHING',
            'post_tags': 'ON CONFLICT (post_id, tag_id) DO NOTHING',
            'post_discussions': 'ON CONFLICT (id) DO NOTHING',
            'user_events': 'ON CONFLICT (id) DO NOTHING',
            'user_stats': 'ON CONFLICT (user_id) DO NOTHING',
            'tag_stats': 'ON CONFLICT (tag_id) DO NOTHING',
            'kb_types': 'ON CONFLICT (id) DO NOTHING',
            'knowledge_base': 'ON CONFLICT (id) DO NOTHING',
            'kb_index_triggers': 'ON CONFLICT (id) DO NOTHING',
            'kb_indexes': 'ON CONFLICT (id) DO NOTHING',
            'kb_metadata': 'ON CONFLICT (id) DO NOTHING'
        }
        
        conflict_clause = conflict_clause_map.get(table_name.lower(), 'ON CONFLICT DO NOTHING')
        print(f"📋 Using conflict clause for {table_name}: {conflict_clause}")
        
        return f'INSERT INTO {table_name} {columns} {conflict_clause}'
    
    # Replace INSERT INTO table_name (columns) VALUES with conflict handling
    sql_content = re.sub(
        r'INSERT INTO (\w+)\s*(\([^)]+\))\s*VALUES',
        add_conflict_resolution,
        sql_content,
        flags=re.IGNORECASE
    )
    
    converted_conflicts = len(re.findall(r'ON CONFLICT', sql_content, flags=re.IGNORECASE))
    print(f"✅ Added {converted_conflicts} ON CONFLICT clauses")
    
    print("🎯 SQLite to PostgreSQL conversion completed")
    return sql_content

if __name__ == "__main__":
    # Read bootstrap.sql
    with open('bootstrap.sql', 'r') as f:
        sql_content = f.read()
    
    # Convert SQL
    converted = convert_sqlite_to_postgres(sql_content)
    
    # Find posts INSERT in converted SQL
    posts_pattern = r'INSERT INTO posts.*?VALUES.*?(?=INSERT\s+INTO|CREATE|$)'
    posts_match = re.search(posts_pattern, converted, flags=re.IGNORECASE | re.DOTALL)
    
    if posts_match:
        print("\n" + "="*60)
        print("CONVERTED POSTS INSERT STATEMENT:")
        print("="*60)
        posts_sql = posts_match.group(0)
        print(posts_sql[:1000] + "..." if len(posts_sql) > 1000 else posts_sql)
    else:
        print("\n❌ No posts INSERT found in converted SQL!")
    
    # Check if there are any obvious SQL syntax issues
    statements = [stmt.strip() for stmt in converted.split(';') if stmt.strip()]
    print(f"\n📊 Total SQL statements after conversion: {len(statements)}")
    
    # Look for potential issues in first few statements
    print("\n🔍 First 5 statements:")
    for i, stmt in enumerate(statements[:5]):
        if stmt:
            print(f"{i+1}. {stmt[:100]}...")
