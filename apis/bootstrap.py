#!/usr/bin/env python3
"""
ITG DocVerse Database Bootstrap Script
Creates initial sample data for the application
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any

from src.services.database.factory import DatabaseServiceFactory
from src.models.post import Post, PostType, PostStatus
from src.models.user import User
from src.models.tag import Tag
from src.models.comment import Comment
from src.config.settings import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DatabaseBootstrap:
    """Bootstrap the database with initial sample data"""
    
    def __init__(self):
        self.db_service = DatabaseServiceFactory.create_service()
    
    async def initialize(self):
        """Initialize the database connection"""
        await self.db_service.initialize()
        logger.info("Database service initialized")
    
    async def create_sample_users(self) -> List[User]:
        """Create sample users"""
        logger.info("Creating sample users...")
        
        users = [
            User(
                id="user-1",
                username="prakashm88",
                display_name="Prakash M",
                email="prakash@example.com",
                password_hash="$2b$12$hashed_password_here",  # In real app, hash the password
                bio="Full Stack Developer | Tech Enthusiast | Open Source Contributor",
                location="Bangalore, India",
                website="https://prakash.dev",
                avatar_url="",
                post_count=25,
                comment_count=120,
                created_at=datetime(2024, 1, 15, tzinfo=timezone.utc),
                updated_at=datetime(2024, 1, 15, tzinfo=timezone.utc)
            ),
            User(
                id="user-2",
                username="sarah_dev",
                display_name="Sarah Johnson",
                email="sarah@example.com",
                password_hash="$2b$12$hashed_password_here",
                bio="Frontend Developer | React Enthusiast | UI/UX Designer",
                location="San Francisco, USA",
                website="",
                avatar_url="",
                post_count=15,
                comment_count=89,
                created_at=datetime(2024, 2, 1, tzinfo=timezone.utc),
                updated_at=datetime(2024, 2, 1, tzinfo=timezone.utc)
            ),
            User(
                id="user-3",
                username="mike_ts",
                display_name="Mike TS",
                email="mike@example.com",
                password_hash="$2b$12$hashed_password_here",
                bio="Backend Developer | TypeScript Expert | Node.js Specialist",
                location="London, UK",
                website="",
                avatar_url="",
                post_count=8,
                comment_count=45,
                created_at=datetime(2024, 2, 15, tzinfo=timezone.utc),
                updated_at=datetime(2024, 2, 15, tzinfo=timezone.utc)
            )
        ]
        
        created_users = []
        for user in users:
            created_user = await self.db_service.create_user(user)
            created_users.append(created_user)
            logger.info(f"Created user: {user.username}")
        
        return created_users
    
    async def create_sample_tags(self) -> List[Tag]:
        """Create sample tags"""
        logger.info("Creating sample tags...")
        
        tags = [
            Tag(id="tag-1", name="opensource", color="#4ecdc4", description="Open source projects and contributions"),
            Tag(id="tag-2", name="webdev", color="#ff6b6b", description="Web development topics"),
            Tag(id="tag-3", name="developer", color="#45b7d1", description="Developer tools and practices"),
            Tag(id="tag-4", name="typescript", color="#3178C6", description="TypeScript programming language"),
            Tag(id="tag-5", name="react", color="#61DAFB", description="React framework and ecosystem"),
            Tag(id="tag-6", name="css", color="#1572B6", description="CSS styling and layouts"),
            Tag(id="tag-7", name="documentation", color="#3B82F6", description="Documentation and technical writing"),
            Tag(id="tag-8", name="api", color="#10B981", description="API design and development")
        ]
        
        created_tags = []
        for tag in tags:
            created_tag = await self.db_service.create_tag(tag)
            created_tags.append(created_tag)
            logger.info(f"Created tag: {tag.name}")
        
        return created_tags
    
    async def create_sample_posts(self, users: List[User], tags: List[Tag]) -> List[Post]:
        """Create sample posts"""
        logger.info("Creating sample posts...")
        
        # Create tag lookup
        tag_lookup = {tag.name: tag.id for tag in tags}
        
        posts = [
            Post(
                id="post-1",
                title="12 Open Source Alternatives to Popular Software (For Developers)",
                content="""# 12 Open Source Alternatives to Popular Software (For Developers)

As developers, we often rely on various tools and software to get our work done. While many commercial options are excellent, open source alternatives can provide similar functionality while offering benefits like transparency, customizability, and cost-effectiveness.

## Development Tools

### 1. VS Code Alternative: **Neovim**
A highly extensible text editor that's completely free and open source.
- **Website**: https://neovim.io/
- **License**: Apache 2.0
- **Why it's great**: Lightweight, highly customizable, excellent plugin ecosystem

### 2. Postman Alternative: **Insomnia**
A powerful REST client for testing APIs.
- **Website**: https://insomnia.rest/
- **License**: Apache 2.0
- **Why it's great**: Clean interface, supports GraphQL, completely free

## Design Tools

### 3. Figma Alternative: **Penpot**
Open source design and prototyping platform.
- **Website**: https://penpot.app/
- **License**: MPL 2.0
- **Why it's great**: Web-based, collaborative, no vendor lock-in

## Database Tools

### 4. TablePlus Alternative: **DBeaver**
Universal database tool for developers and database administrators.
- **Website**: https://dbeaver.io/
- **License**: Apache 2.0
- **Why it's great**: Supports virtually any database, rich feature set

## Conclusion

These open source alternatives not only save money but also give you more control over your development environment. Many of them have thriving communities and are actively maintained.

What are your favorite open source developer tools? Let me know in the comments!""",
                author_id="user-1",
                post_type=PostType.LONG_FORM,
                status=PostStatus.PUBLISHED,
                tags=[tag_lookup["opensource"], tag_lookup["webdev"], tag_lookup["developer"]],
                view_count=245,
                like_count=18,
                comment_count=7,
                created_at=datetime(2025, 1, 26, 10, 0, tzinfo=timezone.utc),
                updated_at=datetime(2025, 1, 26, 10, 0, tzinfo=timezone.utc)
            ),
            Post(
                id="thoughts-3282347",
                title="#thoughts - 3282347",
                content="Just discovered that React's useCallback and useMemo hooks can actually hurt performance if overused. The memoization overhead can be more expensive than just recreating the function/value, especially for simple computations. Profile first, optimize second! 🚀",
                author_id="user-1",
                post_type=PostType.THOUGHTS,
                status=PostStatus.PUBLISHED,
                tags=[tag_lookup["react"], tag_lookup["webdev"]],
                view_count=89,
                like_count=12,
                comment_count=3,
                created_at=datetime(2025, 1, 25, 10, 30, tzinfo=timezone.utc),
                updated_at=datetime(2025, 1, 25, 10, 30, tzinfo=timezone.utc)
            ),
            Post(
                id="thoughts-5471829",
                title="#thoughts - 5471829",
                content="CSS Grid is for 2D layouts (rows AND columns), Flexbox is for 1D layouts (either row OR column). Stop trying to force Flexbox to do Grid's job! 😅 Each tool has its purpose and excels in different scenarios.",
                author_id="user-1",
                post_type=PostType.THOUGHTS,
                status=PostStatus.PUBLISHED,
                tags=[tag_lookup["css"], tag_lookup["webdev"]],
                view_count=156,
                like_count=21,
                comment_count=5,
                created_at=datetime(2025, 1, 24, 15, 45, tzinfo=timezone.utc),
                updated_at=datetime(2025, 1, 24, 15, 45, tzinfo=timezone.utc)
            ),
            Post(
                id="thoughts-8392647",
                title="#thoughts - 8392647",
                content="TypeScript tip: Use `satisfies` operator instead of type assertion when you want to ensure a value matches a type but still preserve its literal type. Game changer for configuration objects! 💡",
                author_id="user-1",
                post_type=PostType.THOUGHTS,
                status=PostStatus.PUBLISHED,
                tags=[tag_lookup["typescript"], tag_lookup["webdev"]],
                view_count=134,
                like_count=19,
                comment_count=2,
                created_at=datetime(2025, 1, 23, 9, 15, tzinfo=timezone.utc),
                updated_at=datetime(2025, 1, 23, 9, 15, tzinfo=timezone.utc)
            ),
            Post(
                id="post-3",
                title="Building Scalable React Applications with Clean Architecture",
                content="""# Building Scalable React Applications with Clean Architecture

As React applications grow in complexity, maintaining clean and scalable code becomes increasingly challenging. In this post, we'll explore how to apply clean architecture principles to React applications.

## What is Clean Architecture?

Clean Architecture, coined by Robert C. Martin (Uncle Bob), is a software design philosophy that emphasizes:
- **Independence**: Business rules don't depend on external frameworks
- **Testability**: Business rules can be tested without UI, database, or web server
- **UI Independence**: The UI can change without changing business rules
- **Framework Independence**: Not bound to any particular framework

## Applying Clean Architecture to React

### Layer Structure

```
src/
├── components/          # Presentation Layer
├── hooks/              # Presentation Layer
├── services/           # Interface Adapters
├── domain/             # Business Logic
├── infrastructure/     # External Interfaces
└── shared/             # Shared utilities
```

### 1. Domain Layer (Business Logic)

This is the core of your application. It contains:
- **Entities**: Core business objects
- **Use Cases**: Application-specific business rules
- **Repository Interfaces**: Contracts for data access

```typescript
// domain/entities/User.ts
export interface User {
  id: string;
  name: string;
  email: string;
}

// domain/usecases/GetUserUseCase.ts
export class GetUserUseCase {
  constructor(private userRepository: UserRepository) {}
  
  async execute(id: string): Promise<User> {
    return await this.userRepository.findById(id);
  }
}
```

### 2. Infrastructure Layer

Implements the interfaces defined in the domain layer:

```typescript
// infrastructure/repositories/ApiUserRepository.ts
export class ApiUserRepository implements UserRepository {
  async findById(id: string): Promise<User> {
    const response = await fetch(`/api/users/${id}`);
    return response.json();
  }
}
```

### 3. Presentation Layer

React components that depend on use cases:

```typescript
// components/UserProfile.tsx
export const UserProfile: React.FC<{ userId: string }> = ({ userId }) => {
  const [user, setUser] = useState<User | null>(null);
  
  useEffect(() => {
    const getUserUseCase = new GetUserUseCase(new ApiUserRepository());
    getUserUseCase.execute(userId).then(setUser);
  }, [userId]);
  
  return user ? <div>{user.name}</div> : <div>Loading...</div>;
};
```

## Benefits

1. **Testability**: Each layer can be tested independently
2. **Maintainability**: Clear separation of concerns
3. **Flexibility**: Easy to swap implementations
4. **Scalability**: Structure grows naturally with complexity

## Conclusion

Clean Architecture provides a solid foundation for building scalable React applications. While it might seem over-engineered for small projects, the benefits become apparent as your application grows.

What architectural patterns do you use in your React projects?""",
                author_id="user-2",
                post_type=PostType.LONG_FORM,
                status=PostStatus.PUBLISHED,
                tags=[tag_lookup["react"], tag_lookup["webdev"], tag_lookup["developer"]],
                view_count=312,
                like_count=28,
                comment_count=12,
                created_at=datetime(2025, 1, 22, 14, 20, tzinfo=timezone.utc),
                updated_at=datetime(2025, 1, 22, 14, 20, tzinfo=timezone.utc)
            ),
            Post(
                id="doc-1",
                title="Short Summary - Project payment-gateway-api",
                content="""# Payment Gateway API - Project Summary

## Overview
A robust RESTful API service for handling payment transactions across multiple payment providers including Stripe, PayPal, and Razorpay.

## Key Features
- **Multi-provider support**: Easily switch between payment providers
- **Webhook handling**: Secure webhook processing for payment events
- **Transaction logging**: Comprehensive audit trail for all transactions  
- **Retry mechanisms**: Automatic retry for failed transactions
- **Rate limiting**: Protection against abuse and API overuse

## Technology Stack
- **Framework**: Node.js with Express.js
- **Database**: PostgreSQL with Redis for caching
- **Authentication**: JWT with refresh token support
- **Documentation**: OpenAPI 3.0 (Swagger)
- **Testing**: Jest with 90%+ coverage

## API Endpoints
- `POST /v1/payments` - Create payment
- `GET /v1/payments/{id}` - Get payment details
- `POST /v1/webhooks/{provider}` - Handle provider webhooks
- `GET /v1/transactions` - List transactions with filtering

## Setup & Deployment
```bash
npm install
cp .env.example .env
npm run migrate
npm start
```

## Security Features
- Input validation and sanitization
- SQL injection protection
- Rate limiting per IP/user
- Encrypted sensitive data storage
- PCI DSS compliance considerations

## Performance
- Response time: <200ms (95th percentile)
- Throughput: 1000+ requests/second
- Uptime: 99.9% SLA

Repository: https://gitlab.com/company/payment-gateway-api.git""",
                author_id="user-1",
                post_type=PostType.LONG_FORM,
                status=PostStatus.DRAFT,
                tags=[tag_lookup["documentation"], tag_lookup["api"]],
                is_document=True,
                project_id="payment-gateway-api",
                git_url="https://gitlab.com/company/payment-gateway-api.git",
                view_count=0,
                like_count=0,
                comment_count=0,
                created_at=datetime(2025, 1, 27, 14, 30, tzinfo=timezone.utc),
                updated_at=datetime(2025, 1, 27, 14, 30, tzinfo=timezone.utc)
            )
        ]
        
        created_posts = []
        for post in posts:
            created_post = await self.db_service.create_post(post)
            created_posts.append(created_post)
            logger.info(f"Created post: {post.title[:50]}...")
        
        return created_posts
    
    async def create_sample_comments(self, posts: List[Post], users: List[User]) -> List[Comment]:
        """Create sample comments"""
        logger.info("Creating sample comments...")
        
        # Find specific posts for comments
        thoughts_post = next((p for p in posts if p.id == "thoughts-3282347"), None)
        ts_thoughts_post = next((p for p in posts if p.id == "thoughts-8392647"), None)
        
        comments = []
        
        if thoughts_post:
            comment1 = Comment(
                id="comment-1",
                post_id=thoughts_post.id,
                author_id="user-2",
                content="This is so true! I spent hours optimizing with useMemo only to find it made things slower. The React DevTools Profiler is a lifesaver for this.",
                created_at=datetime(2025, 1, 25, 11, 15, tzinfo=timezone.utc),
                updated_at=datetime(2025, 1, 25, 11, 15, tzinfo=timezone.utc)
            )
            comments.append(comment1)
        
        if ts_thoughts_post:
            comment2 = Comment(
                id="comment-2",
                post_id=ts_thoughts_post.id,
                author_id="user-3",
                content="Mind blown! I've been using `as` everywhere. Thanks for this tip, will definitely try satisfies in my next project!",
                created_at=datetime(2025, 1, 23, 10, 30, tzinfo=timezone.utc),
                updated_at=datetime(2025, 1, 23, 10, 30, tzinfo=timezone.utc)
            )
            comments.append(comment2)
        
        created_comments = []
        for comment in comments:
            created_comment = await self.db_service.create_comment(comment)
            created_comments.append(created_comment)
            logger.info(f"Created comment on post: {comment.post_id}")
        
        return created_comments
    
    async def run_bootstrap(self):
        """Run the complete bootstrap process"""
        logger.info("🚀 Starting ITG DocVerse database bootstrap...")
        
        try:
            # Initialize database connection
            await self.initialize()
            
            # Create sample data
            users = await self.create_sample_users()
            tags = await self.create_sample_tags()
            posts = await self.create_sample_posts(users, tags)
            comments = await self.create_sample_comments(posts, users)
            
            logger.info("✅ Bootstrap completed successfully!")
            logger.info(f"   Created {len(users)} users")
            logger.info(f"   Created {len(tags)} tags") 
            logger.info(f"   Created {len(posts)} posts")
            logger.info(f"   Created {len(comments)} comments")
            
        except Exception as e:
            logger.error(f"❌ Bootstrap failed: {e}")
            raise
        finally:
            # Close database connection
            await self.db_service.close()
            logger.info("Database connection closed")

async def main():
    """Main bootstrap function"""
    bootstrap = DatabaseBootstrap()
    await bootstrap.run_bootstrap()

if __name__ == "__main__":
    asyncio.run(main())
