-- Sample Data for ITG DocVerse
-- This file adds sample users, posts, tags, and other data for testing

-- =====================================================
-- SAMPLE USERS
-- =====================================================
INSERT OR IGNORE INTO users (id, username, display_name, email, bio, location, avatar_url, is_verified, created_by, updated_by) VALUES
('user-admin', 'admin', 'System Administrator', 'admin@docverse.local', 'System administrator and platform maintainer', 'San Francisco', 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin', TRUE, 'system', 'system'),
('user-john', 'john.doe', 'John Doe', 'john.doe@docverse.local', 'Senior Software Engineer with expertise in full-stack development and cloud architecture', 'Seattle', 'https://api.dicebear.com/7.x/avataaars/svg?seed=john', TRUE, 'system', 'system'),
('user-sarah', 'sarah.wilson', 'Sarah Wilson', 'sarah.wilson@docverse.local', 'Product Manager passionate about user experience and agile methodologies', 'Austin', 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah', TRUE, 'system', 'system'),
('user-mike', 'mike.chen', 'Mike Chen', 'mike.chen@docverse.local', 'DevOps Engineer specializing in Kubernetes and CI/CD pipelines', 'New York', 'https://api.dicebear.com/7.x/avataaars/svg?seed=mike', FALSE, 'system', 'system'),
('user-alice', 'alice.brown', 'Alice Brown', 'alice.brown@docverse.local', 'Technical Writer and Documentation Specialist', 'Portland', 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice', TRUE, 'system', 'system');

-- =====================================================
-- SAMPLE POST TYPES
-- =====================================================
INSERT OR IGNORE INTO post_types (id, name, description, icon, color, created_by) VALUES
('posts', 'Long-form Posts', 'Detailed articles and documentation', '📄', '#3b82f6', 'system'),
('thoughts', 'Quick Thoughts', 'Short updates and quick thoughts', '💭', '#8b5cf6', 'system'),
('llm-short', 'AI Summary', 'AI-generated short summaries', '🤖', '#10b981', 'system'),
('llm-long', 'AI Documentation', 'AI-generated detailed documentation', '📚', '#f59e0b', 'system'),
('block-diagram', 'System Diagrams', 'Architecture and system diagrams', '📊', '#ef4444', 'system'),
('code-snippet', 'Code Snippets', 'Code examples and snippets', '💻', '#6366f1', 'system'),
('discussion', 'Discussions', 'Team discussions and Q&A', '💬', '#ec4899', 'system');

-- =====================================================
-- SAMPLE TAG TYPES
-- =====================================================
INSERT OR IGNORE INTO tag_types (id, name, description, color, category, created_by) VALUES
('tag-react', 'React', 'React.js framework and ecosystem', '#61dafb', 'technology', 'system'),
('tag-python', 'Python', 'Python programming language', '#3776ab', 'technology', 'system'),
('tag-api', 'API', 'API design and development', '#ff6b35', 'technology', 'system'),
('tag-devops', 'DevOps', 'DevOps practices and tools', '#326ce5', 'technology', 'system'),
('tag-documentation', 'Documentation', 'Technical documentation', '#4caf50', 'documentation', 'system'),
('tag-tutorial', 'Tutorial', 'Step-by-step tutorials', '#ff9800', 'documentation', 'system'),
('tag-best-practices', 'Best Practices', 'Industry best practices', '#9c27b0', 'documentation', 'system'),
('tag-architecture', 'Architecture', 'System architecture and design', '#f44336', 'technology', 'system'),
('tag-frontend', 'Frontend', 'Frontend development', '#2196f3', 'technology', 'system'),
('tag-backend', 'Backend', 'Backend development', '#795548', 'technology', 'system'),
('tag-database', 'Database', 'Database design and management', '#607d8b', 'technology', 'system'),
('tag-testing', 'Testing', 'Software testing practices', '#8bc34a', 'technology', 'system');

-- =====================================================
-- SAMPLE POSTS
-- =====================================================
INSERT OR IGNORE INTO posts (id, post_type_id, title, feed_content, author_id, status, created_by, updated_by) VALUES
('post-1', 'posts', 'Getting Started with React Hooks', 'A comprehensive guide to understanding and using React Hooks in modern React applications. Learn useState, useEffect, and custom hooks with practical examples.', 'user-john', 'published', 'user-john', 'user-john'),
('post-2', 'thoughts', 'Just deployed our new API gateway! 🚀', 'Excited to share that we just deployed our new API gateway with rate limiting and authentication. Performance improvements are already visible!', 'user-mike', 'published', 'user-mike', 'user-mike'),
('post-3', 'posts', 'Python Best Practices for 2024', 'Essential Python best practices every developer should follow in 2024. Covers code organization, testing, documentation, and modern Python features.', 'user-alice', 'published', 'user-alice', 'user-alice'),
('post-4', 'llm-short', 'API Design Principles Summary', 'Key principles for designing robust and maintainable APIs: consistency, clear naming, proper HTTP methods, error handling, and documentation.', 'user-sarah', 'published', 'user-sarah', 'user-sarah'),
('post-5', 'discussion', 'How do you handle database migrations in production?', 'Looking for best practices on handling database migrations in production environments. What tools and strategies do you recommend?', 'user-mike', 'published', 'user-mike', 'user-mike'),
('post-6', 'code-snippet', 'JWT Token Validation Middleware', 'Express.js middleware for validating JWT tokens with proper error handling and token refresh logic.', 'user-john', 'published', 'user-john', 'user-john');

-- =====================================================
-- SAMPLE POSTS CONTENT
-- =====================================================
INSERT OR IGNORE INTO posts_content (id, post_id, revision, content, is_current, created_by) VALUES
('content-1', 'post-1', 1, 
'# Getting Started with React Hooks

React Hooks revolutionized how we write React components by allowing us to use state and other React features in functional components. This guide will walk you through the most important hooks and how to use them effectively.

## useState Hook

The useState hook allows you to add state to functional components:

```javascript
import React, { useState } from ''react'';

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>You clicked {count} times</p>
      <button onClick={() => setCount(count + 1)}>
        Click me
      </button>
    </div>
  );
}
```

## useEffect Hook

The useEffect hook lets you perform side effects in functional components:

```javascript
import React, { useState, useEffect } from ''react'';

function Example() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    document.title = `You clicked ${count} times`;
  });

  return (
    <div>
      <p>You clicked {count} times</p>
      <button onClick={() => setCount(count + 1)}>
        Click me
      </button>
    </div>
  );
}
```

## Custom Hooks

You can create your own hooks to share stateful logic:

```javascript
function useCounter(initialValue = 0) {
  const [count, setCount] = useState(initialValue);
  
  const increment = () => setCount(count + 1);
  const decrement = () => setCount(count - 1);
  const reset = () => setCount(initialValue);
  
  return { count, increment, decrement, reset };
}
```

## Best Practices

1. Always use hooks at the top level of your component
2. Only call hooks from React functions
3. Use multiple useEffect hooks to separate concerns
4. Create custom hooks for reusable logic

React Hooks make your code more readable and easier to test. Start using them in your next React project!', 
TRUE, 'user-john'),

('content-2', 'post-2', 1, 
'Just deployed our new API gateway! 🚀

The new setup includes:
- Rate limiting per user
- JWT authentication
- Request/response logging
- Health monitoring

Performance improvements are already visible - response times down by 40%! #DevOps #API', 
TRUE, 'user-mike'),

('content-3', 'post-3', 1, 
'# Python Best Practices for 2024

As Python continues to evolve, it''s important to stay up-to-date with the latest best practices. Here are the essential practices every Python developer should follow in 2024.

## Code Organization

### Use Type Hints
Type hints make your code more readable and help catch errors early:

```python
from typing import List, Optional, Dict

def process_users(users: List[Dict[str, str]]) -> Optional[Dict[str, int]]:
    if not users:
        return None
    
    return {
        "total": len(users),
        "active": sum(1 for user in users if user.get("status") == "active")
    }
```

### Follow PEP 8
Use tools like `black` and `flake8` to maintain consistent code style:

```bash
pip install black flake8
black your_code.py
flake8 your_code.py
```

## Testing

### Use pytest for Testing
pytest is the most popular testing framework for Python:

```python
import pytest
from your_module import calculate_total

def test_calculate_total():
    assert calculate_total([1, 2, 3]) == 6
    assert calculate_total([]) == 0

def test_calculate_total_with_none():
    with pytest.raises(TypeError):
        calculate_total(None)
```

### Test Coverage
Maintain high test coverage:

```bash
pip install pytest-cov
pytest --cov=your_module --cov-report=html
```

## Modern Python Features

### Use f-strings for String Formatting
f-strings are faster and more readable:

```python
name = "Alice"
age = 30
message = f"Hello, {name}! You are {age} years old."
```

### Leverage dataclasses
dataclasses reduce boilerplate code:

```python
from dataclasses import dataclass
from typing import Optional

@dataclass
class User:
    id: int
    name: str
    email: str
    age: Optional[int] = None
```

### Use pathlib for File Operations
pathlib is more intuitive than os.path:

```python
from pathlib import Path

config_file = Path("config") / "settings.json"
if config_file.exists():
    content = config_file.read_text()
```

## Documentation

### Write Good Docstrings
Use Google or NumPy style docstrings:

```python
def calculate_bmi(weight: float, height: float) -> float:
    """Calculate Body Mass Index.
    
    Args:
        weight: Weight in kilograms
        height: Height in meters
        
    Returns:
        BMI value as float
        
    Raises:
        ValueError: If weight or height is not positive
    """
    if weight <= 0 or height <= 0:
        raise ValueError("Weight and height must be positive")
    
    return weight / (height ** 2)
```

## Conclusion

Following these best practices will make your Python code more maintainable, readable, and robust. Remember to keep learning and adapting as the Python ecosystem evolves!', 
TRUE, 'user-alice'),

('content-4', 'post-4', 1, 
'# API Design Principles Summary

## Core Principles

**Consistency**: Use consistent naming conventions, response formats, and error handling across all endpoints.

**Clear Naming**: Use descriptive, noun-based URLs (e.g., `/users/123/orders` not `/getOrdersForUser/123`).

**HTTP Methods**: Use appropriate HTTP methods:
- GET for retrieval
- POST for creation
- PUT for updates
- DELETE for removal

**Error Handling**: Return meaningful HTTP status codes and error messages in a consistent format.

**Documentation**: Provide comprehensive API documentation with examples and use cases.

Following these principles leads to APIs that are intuitive, maintainable, and easy to integrate with.', 
TRUE, 'user-sarah'),

('content-5', 'post-5', 1, 
'# How do you handle database migrations in production?

We''re scaling our application and need to establish better practices for database migrations in production. Currently, we''re using manual scripts, but this is becoming error-prone.

## Current Challenges:
- Coordinating migrations with deployments
- Rolling back failed migrations
- Zero-downtime migrations for large tables
- Testing migrations before production

## Questions:
1. What migration tools do you recommend?
2. How do you handle backward compatibility?
3. Any strategies for zero-downtime migrations?
4. How do you test migrations safely?

Looking forward to hearing your experiences and recommendations!', 
TRUE, 'user-mike'),

('content-6', 'post-6', 1, 
'# JWT Token Validation Middleware

Here''s a robust JWT validation middleware for Express.js applications:

```javascript
const jwt = require(''jsonwebtoken'');
const { promisify } = require(''util'');

const authenticateToken = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers[''authorization''];
    const token = authHeader && authHeader.split('' '')[1];

    if (!token) {
      return res.status(401).json({ 
        error: ''Access token required'' 
      });
    }

    // Verify token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    
    // Add user info to request
    req.user = decoded;
    
    // Check if token is close to expiry (refresh logic)
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp - now < 300) { // 5 minutes
      res.setHeader(''X-Token-Refresh'', ''true'');
    }
    
    next();
  } catch (error) {
    if (error.name === ''TokenExpiredError'') {
      return res.status(401).json({ 
        error: ''Token expired'',
        code: ''TOKEN_EXPIRED''
      });
    } else if (error.name === ''JsonWebTokenError'') {
      return res.status(401).json({ 
        error: ''Invalid token'',
        code: ''INVALID_TOKEN''
      });
    }
    
    return res.status(500).json({ 
      error: ''Token validation failed'' 
    });
  }
};

module.exports = authenticateToken;
```

Usage:
```javascript
app.use(''/api/protected'', authenticateToken);
```', 
TRUE, 'user-john');-- =====================================================
-- SAMPLE POST TAGS ASSOCIATIONS
-- =====================================================
INSERT OR IGNORE INTO post_tags (id, post_id, tag_id, created_by) VALUES
('pt-1', 'post-1', 'tag-react', 'user-john'),
('pt-2', 'post-1', 'tag-frontend', 'user-john'),
('pt-3', 'post-1', 'tag-tutorial', 'user-john'),
('pt-4', 'post-2', 'tag-devops', 'user-mike'),
('pt-5', 'post-2', 'tag-api', 'user-mike'),
('pt-6', 'post-3', 'tag-python', 'user-alice'),
('pt-7', 'post-3', 'tag-best-practices', 'user-alice'),
('pt-8', 'post-3', 'tag-documentation', 'user-alice'),
('pt-9', 'post-4', 'tag-api', 'user-sarah'),
('pt-10', 'post-4', 'tag-best-practices', 'user-sarah'),
('pt-11', 'post-4', 'tag-documentation', 'user-sarah'),
('pt-12', 'post-5', 'tag-database', 'user-mike'),
('pt-13', 'post-5', 'tag-devops', 'user-mike'),
('pt-14', 'post-5', 'tag-best-practices', 'user-mike'),
('pt-15', 'post-6', 'tag-api', 'user-john'),
('pt-16', 'post-6', 'tag-backend', 'user-john'),
('pt-17', 'post-6', 'tag-tutorial', 'user-john');

-- =====================================================
-- SAMPLE COMMENTS (POST_DISCUSSIONS)
-- =====================================================
INSERT OR IGNORE INTO post_discussions (id, post_id, author_id, content, thread_level, created_by, updated_by) VALUES
('comment-1', 'post-1', 'user-sarah', 'Great tutorial! The custom hooks section was particularly helpful. I''ve been struggling with sharing logic between components.', 0, 'user-sarah', 'user-sarah'),
('comment-2', 'post-1', 'user-mike', 'Thanks for the examples. One question: when should I use useCallback vs useMemo?', 0, 'user-mike', 'user-mike'),
('comment-3', 'post-1', 'user-john', '@mike.chen useCallback is for memoizing functions, useMemo is for memoizing values. Use useCallback when passing functions to child components to prevent unnecessary re-renders.', 1, 'user-john', 'user-john'),
('comment-4', 'post-3', 'user-mike', 'The type hints section is gold! I''ve been avoiding them but this makes it clear why they''re important.', 0, 'user-mike', 'user-mike'),
('comment-5', 'post-3', 'user-john', 'dataclasses are a game-changer. Been using them in all my new projects since Python 3.7.', 0, 'user-john', 'user-john'),
('comment-6', 'post-5', 'user-alice', 'We use Alembic with SQLAlchemy for migrations. The auto-generate feature is really helpful for schema changes.', 0, 'user-alice', 'user-alice'),
('comment-7', 'post-5', 'user-john', 'For zero-downtime migrations on large tables, we use online schema change tools like pt-online-schema-change for MySQL.', 0, 'user-john', 'user-john'),
('comment-8', 'post-5', 'user-sarah', 'Blue-green deployments with separate database instances work well for us. Allows full rollback if needed.', 0, 'user-sarah', 'user-sarah'),
('comment-9', 'post-6', 'user-alice', 'Nice middleware! One suggestion: consider adding rate limiting to prevent token brute force attacks.', 0, 'user-alice', 'user-alice'),
('comment-10', 'post-6', 'user-sarah', 'The token refresh logic is clever. We implemented something similar and it really improves UX.', 0, 'user-sarah', 'user-sarah');

-- =====================================================
-- SAMPLE REACTIONS
-- =====================================================
INSERT OR IGNORE INTO reactions (id, event_type_id, user_id, target_type, target_id, reaction_value) VALUES
('reaction-1', 'event-like', 'user-sarah', 'post', 'post-1', 1),
('reaction-2', 'event-like', 'user-mike', 'post', 'post-1', 1),
('reaction-3', 'event-like', 'user-alice', 'post', 'post-1', 1),
('reaction-4', 'event-like', 'user-john', 'post', 'post-2', 1),
('reaction-5', 'event-like', 'user-alice', 'post', 'post-2', 1),
('reaction-6', 'event-like', 'user-john', 'post', 'post-3', 1),
('reaction-7', 'event-like', 'user-mike', 'post', 'post-3', 1),
('reaction-8', 'event-love', 'user-sarah', 'post', 'post-3', 1),
('reaction-9', 'event-like', 'user-mike', 'post', 'post-4', 1),
('reaction-10', 'event-like', 'user-alice', 'post', 'post-4', 1),
('reaction-11', 'event-like', 'user-john', 'post', 'post-5', 1),
('reaction-12', 'event-like', 'user-alice', 'post', 'post-5', 1),
('reaction-13', 'event-like', 'user-sarah', 'post', 'post-6', 1),
('reaction-14', 'event-love', 'user-mike', 'post', 'post-6', 1),
('reaction-15', 'event-like', 'user-alice', 'post', 'post-6', 1);

-- =====================================================
-- UPDATE USER CREDENTIALS FOR TESTING
-- =====================================================
-- Note: In a real application, passwords should be properly hashed
-- For testing purposes, we'll use simple passwords (admin/admin, john/password, etc.)

-- The authentication is handled by the JWT middleware in the application
-- These users can be used to test login functionality:
-- admin / admin
-- john.doe / password  
-- sarah.wilson / password
-- mike.chen / password
-- alice.brown / password
