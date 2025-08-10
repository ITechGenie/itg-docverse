#!/usr/bin/env python3
"""
Debug Indexing Endpoint Issues
"""

import sys
import os
sys.path.append('/Users/prakash/MyDocs/Projects/itg-docverse/apis')

from src.config.settings import get_settings

def test_settings():
    """Test settings when AI search is disabled"""
    print("Testing settings access...")
    
    try:
        settings = get_settings()
        print(f"enable_ai_search: {settings.enable_ai_search}")
        print(f"ollama_host: {settings.ollama_host}")
        print(f"ollama_model: {settings.ollama_model}")
        print(f"search_similarity_threshold: {settings.search_similarity_threshold}")
        print("✅ Settings access successful")
    except Exception as e:
        print(f"❌ Settings error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_settings()
