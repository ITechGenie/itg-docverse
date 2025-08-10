#!/usr/bin/env python3
"""
ITG DocVerse Bootstrap Data
Single source of truth for all bootstrap data across all database backends
"""

from datetime import datetime, timezone
from typing import List, Dict, Any
from src.models.post import PostType, PostStatus
from src.models.user import User
from src.models.tag import Tag
from src.models.comment import Comment
from src.models.post import Post

class BootstrapData:
    """Centralized bootstrap data for all database backends"""
    
    @staticmethod
    def get_users() -> List[User]:
        """Get sample users - same data as bootstrap.sql"""
        return [
            User(
                id="61aa7084-a14f-48ee-ac75-6645e2ad9ec4",
                username="admin",
                display_name="System Administrator",
                email="admin@itgdocverse.com",
                password_hash="$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewFI47Q/8X2.ov8u",  # 'admin'
                bio="System administrator with full access to all features",
                location="ITG Office",
                website="",
                avatar_url="",
                post_count=0,
                comment_count=0,
                created_at=datetime(2024, 1, 1, tzinfo=timezone.utc),
                updated_at=datetime(2024, 1, 1, tzinfo=timezone.utc)
            ),
            User(
                id="ac2402cf-9a84-46a5-8484-d32400e7a18d",
                username="prakashm88",
                display_name="Prakash M",
                email="prakash@example.com",
                password_hash="$2b$12$hashed_password_here",
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
                id="75765941-6b90-4acf-8b4d-6937329d9c08",
                username="sarah_dev",
                display_name="Sarah Johnson",
                email="sarah@example.com",
                password_hash="$2b$12$hashed_password_here",
                bio="Frontend Developer | React Specialist | UI/UX Enthusiast",
                location="San Francisco, USA",
                website="https://sarahdev.com",
                avatar_url="",
                post_count=15,
                comment_count=89,
                created_at=datetime(2024, 2, 1, tzinfo=timezone.utc),
                updated_at=datetime(2024, 2, 1, tzinfo=timezone.utc)
            ),
            User(
                id="0492735d-ac0d-4e41-808a-199e19c0f3ac",
                username="mike_backend",
                display_name="Mike Chen",
                email="mike@example.com",
                password_hash="$2b$12$hashed_password_here",
                bio="Backend Engineer | Python & Go | Distributed Systems",
                location="Toronto, Canada",
                website="",
                avatar_url="",
                post_count=8,
                comment_count=45,
                created_at=datetime(2024, 2, 15, tzinfo=timezone.utc),
                updated_at=datetime(2024, 2, 15, tzinfo=timezone.utc)
            )
        ]
    
    @staticmethod
    def get_tags() -> List[Tag]:
        """Get sample tags - same data as bootstrap.sql"""
        return [
            Tag(id="tag-react", name="react", display_name="React", color="#61dafb", description="React library for building UIs"),
            Tag(id="tag-webdev", name="webdev", display_name="Web Development", color="#ff6b6b", description="Web Development"),
            Tag(id="tag-opensource", name="opensource", display_name="Open Source", color="#4ecdc4", description="Open Source Software"),
            Tag(id="tag-typescript", name="typescript", display_name="TypeScript", color="#3178c6", description="TypeScript superset of JavaScript"),
            Tag(id="tag-css", name="css", display_name="CSS", color="#1572B6", description="Cascading Style Sheets"),
            Tag(id="tag-documentation", name="documentation", display_name="Documentation", color="#3B82F6", description="Technical documentation"),
            Tag(id="tag-api", name="api", display_name="API", color="#10B981", description="Application Programming Interface"),
            Tag(id="tag-javascript", name="javascript", display_name="Javascript", color="#f7df1e", description="JavaScript programming language")
        ]
    
    @staticmethod
    def get_posts(users: List[User], tags: List[Tag]) -> List[Post]:
        """Get sample posts - same data as bootstrap.sql"""
        # Create tag lookup
        tag_lookup = {tag.name: tag.id for tag in tags}
        
        return [
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
                author_id="ac2402cf-9a84-46a5-8484-d32400e7a18d",  # prakashm88
                post_type=PostType.POSTS,
                status=PostStatus.PUBLISHED,
                tags=[tag_lookup["opensource"], tag_lookup["webdev"]],
                view_count=245,
                like_count=18,
                comment_count=7,
                created_at=datetime(2025, 1, 26, 10, 0, tzinfo=timezone.utc),
                updated_at=datetime(2025, 1, 26, 10, 0, tzinfo=timezone.utc)
            ),
            Post(
                id="thoughts-react-best-practices",
                title="React Best Practices for 2025",
                content="Just discovered some amazing React patterns that are game-changers for performance! useCallback and useMemo are powerful but can hurt performance if overused. The key is understanding when NOT to use them. #react #webdev",
                author_id="75765941-6b90-4acf-8b4d-6937329d9c08",
                post_type=PostType.THOUGHTS,
                status=PostStatus.PUBLISHED,
                tags=[tag_lookup["react"], tag_lookup["webdev"]],
                view_count=89,
                like_count=12,
                comment_count=3,
                created_at=datetime(2025, 1, 31, 15, 45, tzinfo=timezone.utc),
                updated_at=datetime(2025, 1, 31, 15, 45, tzinfo=timezone.utc)
            ),
            Post(
                id="thoughts-css-layouts",
                title="CSS Grid vs Flexbox",
                content="Quick reminder: CSS Grid is for 2D layouts (rows AND columns), Flexbox is for 1D layouts (either row OR column). Stop trying to force Flexbox into Grid's job! #css #webdev",
                author_id="75765941-6b90-4acf-8b4d-6937329d9c08",
                post_type=PostType.THOUGHTS,
                status=PostStatus.PUBLISHED,
                tags=[tag_lookup["css"], tag_lookup["webdev"]],
                view_count=156,
                like_count=21,
                comment_count=5,
                created_at=datetime(2025, 1, 29, 16, 30, tzinfo=timezone.utc),
                updated_at=datetime(2025, 1, 29, 16, 30, tzinfo=timezone.utc)
            ),
            Post(
                id="thoughts-typescript-tips",
                title="TypeScript Satisfies Operator",
                content="TypeScript tip: Use the `satisfies` operator instead of type assertions when you want to ensure an object conforms to a type while preserving its literal types. It's a game changer! #typescript #webdev",
                author_id="ac2402cf-9a84-46a5-8484-d32400e7a18d",
                post_type=PostType.THOUGHTS,
                status=PostStatus.PUBLISHED,
                tags=[tag_lookup["typescript"], tag_lookup["webdev"]],
                view_count=134,
                like_count=19,
                comment_count=2,
                created_at=datetime(2025, 1, 30, 11, 20, tzinfo=timezone.utc),
                updated_at=datetime(2025, 1, 30, 11, 20, tzinfo=timezone.utc)
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
                post_type=PostType.POSTS,
                status=PostStatus.PUBLISHED,
                tags=[tag_lookup["react"], tag_lookup["webdev"], tag_lookup["javascript"]],
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
                post_type=PostType.LLM_SHORT,
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
    
    @staticmethod
    def get_comments(posts: List[Post], users: List[User]) -> List[Comment]:
        """Get sample comments - same data as bootstrap.sql"""
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
        
        return comments
