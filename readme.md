---
title: ITG DocVerse - A Developer Knowledge Platform with AI-Powered Search
published: false
tags: devplatform, ai, search, collaboration
---

## What I Built

Meet **ITG DocVerse** - an internal knowledge-sharing platform for organizations, inspired by the excellent community-driven approach of DEV.to. This platform allows teams to document projects, share insights, and collaborate effectively with AI-powered semantic search capabilities.

The platform enables team members to:
- 📝 Create and share posts, thoughts, and technical documentation
- 🔍 Search content using AI-powered semantic search (Redis-powered)
- 💬 Engage through comments and discussions  
- 🏷️ Organize content with tags and categories
- � Upload and manage images with markdown integration
- 👤 Build comprehensive user profiles
- 📊 Track engagement and analytics

## Demo

🚀 **Live Demo**: [http://localhost:5173](http://localhost:5173)  
📚 **API Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)

## System Architecture

### Technology Stack

- **Backend**: FastAPI (Python) with PostgreSQL/SQLite database
- **Frontend**: React + TypeScript with Vite
- **UI Framework**: Tailwind CSS + shadcn/ui components
- **Search Engine**: Redis with vector embeddings
- **AI**: Ollama for local embeddings (nomic-embed-text model)
- **Authentication**: JWT-based authentication
- **File Storage**: Database BLOB storage with file caching
- **Deployment**: Docker-compose for easy setup

### Architecture Diagram

```mermaid
graph TB
    subgraph "Frontend Layer"
        A[React + TypeScript<br/>Vite + Tailwind]
        A1[shadcn/ui Components]
        A2[MDEditor for Content]
        A3[Image Upload Dialog]
    end
    
    subgraph "API Layer"
        B[FastAPI Backend]
        B1[Authentication Router]
        B2[Posts Router]
        B3[Users Router]
        B4[Files Router]
        B5[Search Router]
        B6[Comments Router]
    end
    
    subgraph "Data Layer"
        C[(PostgreSQL/SQLite<br/>Primary Database)]
        D[(Redis<br/>Search Engine)]
        E[File Cache<br/>/tmp/docverse_files]
    end
    
    subgraph "AI Layer"
        F[Ollama<br/>Embedding Service]
        F1[nomic-embed-text<br/>768-dim vectors]
    end
    
    A --> B
    B --> C
    B5 --> D
    B5 --> F
    B4 --> E
    F --> D
```

## Database Schema

### Entity Relationship Diagram

```mermaid
erDiagram
    users {
        uuid id PK
        varchar username UK
        varchar display_name
        varchar email
        text bio
        varchar location
        varchar website
        varchar avatar_url
        jsonb roles
        boolean is_verified
        timestamp created_at
        timestamp updated_at
    }
    
    posts {
        uuid id PK
        varchar title
        text content
        varchar post_type
        varchar status
        varchar cover_image_url
        uuid author_id FK
        integer view_count
        integer like_count
        integer comment_count
        timestamp created_at
        timestamp updated_at
    }
    
    comments {
        uuid id PK
        text content
        uuid post_id FK
        uuid author_id FK
        uuid parent_id FK
        integer like_count
        boolean is_edited
        timestamp created_at
        timestamp updated_at
    }
    
    tags {
        varchar id PK
        varchar name UK
        text description
        varchar color
        varchar category
        boolean is_active
        integer posts_count
        timestamp created_at
        timestamp updated_at
    }
    
    post_tags {
        uuid post_id FK
        varchar tag_id FK
        timestamp created_at
    }
    
    content_uploads {
        uuid id PK
        varchar filename
        varchar original_filename
        varchar content_type
        integer file_size
        bytea file_data
        varchar visibility
        varchar title
        text description
        uuid uploaded_by FK
        uuid updated_by FK
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }
    
    upload_tags {
        uuid upload_id FK
        varchar tag_name FK
        uuid created_by FK
        timestamp created_at
    }
    
    reactions {
        uuid id PK
        uuid user_id FK
        varchar target_type
        uuid target_id
        varchar reaction_type
        timestamp created_at
    }
    
    events {
        uuid id PK
        uuid user_id FK
        varchar event_type_id
        varchar target_type
        uuid target_id
        jsonb metadata
        timestamp created_at
    }
    
    users ||--o{ posts : "authors"
    users ||--o{ comments : "authors"
    users ||--o{ content_uploads : "uploads"
    users ||--o{ reactions : "reacts"
    users ||--o{ events : "performs"
    
    posts ||--o{ comments : "has"
    posts ||--o{ post_tags : "tagged_with"
    posts ||--o{ reactions : "receives"
    posts ||--o{ events : "target_of"
    
    tags ||--o{ post_tags : "applied_to"
    tags ||--o{ upload_tags : "applied_to"
    
    content_uploads ||--o{ upload_tags : "tagged_with"
    content_uploads ||--o{ reactions : "receives"
    
    comments ||--o{ comments : "replies_to"
    comments ||--o{ reactions : "receives"
```

## Core Application Flows

### 1. User Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant Database
    
    User->>Frontend: Access Application
    Frontend->>API: Check Token Validity
    
    alt Token Valid
        API-->>Frontend: User Data
        Frontend-->>User: Show Dashboard
    else Token Invalid/Missing
        API->>API: Generate Guest Token
        API-->>Frontend: Guest Token
        Frontend-->>User: Show Public Content
    end
```

### 2. Content Creation Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant Database
    participant SearchEngine
    
    User->>Frontend: Create Post
    Frontend->>Frontend: MDEditor Interface
    User->>Frontend: Add Images/Content
    
    Frontend->>API: Upload Images
    API->>Database: Store File Data
    API-->>Frontend: File URLs
    
    User->>Frontend: Submit Post
    Frontend->>API: POST /posts/
    API->>Database: Save Post
    
    API->>SearchEngine: Index for Search
    SearchEngine->>SearchEngine: Generate Embeddings
    SearchEngine->>SearchEngine: Store Vectors
    
    API-->>Frontend: Post Created
    Frontend-->>User: Success & Redirect
```

### 3. Content Discovery Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant Database
    participant Redis
    
    User->>Frontend: Browse/Search Content
    
    alt Browse Feed
        Frontend->>API: GET /posts/
        API->>Database: Query Posts
        Database-->>API: Post List
        API-->>Frontend: Formatted Posts
    else Search Content
        Frontend->>API: GET /search/semantic?q=query
        API->>Redis: Vector Search
        Redis-->>API: Relevant Chunks
        API->>Database: Fetch Full Posts
        Database-->>API: Complete Post Data
        API-->>Frontend: Search Results
    end
    
    Frontend-->>User: Display Content
```

### 4. Image Upload & Management Flow

```mermaid
sequenceDiagram
    participant User
    participant MDEditor
    participant ImageDialog
    participant API
    participant Database
    participant FileCache
    
    User->>MDEditor: Click Image Button
    MDEditor->>ImageDialog: Open Dialog
    
    alt Upload New Image
        User->>ImageDialog: Select File
        ImageDialog->>API: POST /files/upload
        API->>Database: Store File BLOB
        API-->>ImageDialog: File URL with filename
        ImageDialog->>MDEditor: Insert Markdown
    else Select from Gallery
        ImageDialog->>API: GET /files/my-images
        API->>Database: Query User Files
        Database-->>API: File List with URLs
        API-->>ImageDialog: Gallery Data
        User->>ImageDialog: Select Image
        ImageDialog->>MDEditor: Insert Markdown
    end
    
    MDEditor-->>User: Image in Editor
```

## AI-Powered Search with Redis

While the main application uses PostgreSQL/SQLite for structured data, Redis powers our semantic search capabilities:

### Search Architecture

```mermaid
graph TB
    subgraph "Content Processing"
        A[New Post Created] --> B[Text Chunking<br/>~500 words each]
        B --> C[Ollama API<br/>nomic-embed-text]
        C --> D[768-dim Vector<br/>Embeddings]
    end
    
    subgraph "Redis Search Engine"
        D --> E[Redis Hash Storage<br/>search:vector:chunk-id]
        E --> F[Vector Index<br/>search:chunks]
        G[Search Query] --> H[Query Embedding]
        H --> I[Cosine Similarity<br/>vs All Vectors]
        I --> J[Top K Results]
    end
    
    subgraph "Result Enhancement"
        J --> K[Fetch Metadata]
        K --> L[PostgreSQL Query<br/>Full Post Data]
        L --> M[Ranked Results]
    end
```

### Redis Data Structure for Search

```redis
# Store all searchable chunk IDs
SADD search:chunks "post-123-chunk-0" "post-123-chunk-1" "post-456-chunk-0"

# Store vector embeddings with metadata
HSET search:vector:post-123-chunk-0
  vector "\x3e\x9a\x12\x40..."  # 768 float32 values as binary
  metadata '{"post_id": "123", "title": "Architecture Guide", "content": "..."}'

# Track indexed posts
SADD search:indexed_posts "post-123" "post-456"
```

### Search Performance

- **Vector Storage**: Binary encoded float32 arrays for memory efficiency
- **Chunking Strategy**: 500-word chunks for semantic coherence
- **Similarity Algorithm**: Cosine similarity for relevance scoring
- **Response Time**: < 100ms for queries across 1000+ documents
- **Memory Usage**: ~3KB per 500-word chunk (768 × 4 bytes + metadata)

## Key Features

### 1. Rich Content Editor
- **Markdown Support**: Full markdown editing with live preview
- **Image Integration**: Drag-drop upload with gallery selection
- **Code Highlighting**: Syntax highlighting for technical content
- **Auto-save**: Prevents content loss during editing

### 2. Advanced Search
- **Semantic Search**: Find content by meaning, not just keywords
- **Hybrid Results**: Combines exact matches with semantic similarity
- **Content Types**: Search across posts, comments, and documentation
- **Real-time Indexing**: New content immediately searchable

### 3. Collaboration Features
- **Threaded Comments**: Nested discussion threads
- **Reactions System**: Like, favorite, and custom reactions
- **User Profiles**: Comprehensive user activity and statistics
- **Tag Organization**: Hierarchical content categorization

### 4. File Management
- **Image Upload**: Direct integration with markdown editor
- **File Gallery**: Personal file management interface
- **Access Control**: Public/private file visibility
- **Caching Layer**: Optimized file serving with disk cache

## Getting Started

### Prerequisites
- Docker & Docker Compose (recommended)
- Python 3.12+ (for local development)
- Node.js 18+ (for frontend development)
- Ollama (for AI embeddings)

### Quick Start with Docker

```bash
# Clone the repository
git clone https://github.com/ITechGenie/itg-docverse
cd itg-docverse

# Start all services
docker-compose up -d

# Access the application
open http://localhost:5173
```

### Local Development Setup

```bash
# Backend setup
cd apis
pip install -r requirements.txt
python main.py

# Frontend setup  
cd app
npm install
npm run dev

# Start Ollama for search
ollama serve
ollama pull nomic-embed-text
```

### Configuration

The application supports both PostgreSQL and SQLite:

```python
# Environment variables
DATABASE_TYPE=postgresql  # or sqlite
DATABASE_URL=postgresql://user:pass@localhost/dbname
REDIS_URL=redis://localhost:6379
OLLAMA_BASE_URL=http://localhost:11434
```

## Future Roadmap

- **Git Repository Integration**: Auto-generate documentation from code repositories
- **Real-time Collaboration**: Live editing and commenting
- **Advanced Analytics**: Content performance and user engagement metrics
- **Mobile Application**: React Native mobile client
- **Enterprise Features**: SSO integration, advanced permissions, audit logs

## Contributing

We welcome contributions! Please see our contributing guidelines for details on:
- Code style and standards
- Database migration procedures  
- API development patterns
- Frontend component guidelines

## License

This project is licensed under the MIT License - see the LICENSE file for details.

### Screenshots

#### Main Dashboard & Content Feed
![Dashboard Screenshot](screenshots/dashboard.png)
*The main feed showing posts with real-time interactions and engagement*

![Individual Post View](screenshots/post.png)
*Detailed post view with markdown rendering and discussion section*

#### Content Creation & Management
![Create Post](screenshots/create-post.png)
*Rich markdown editor for creating technical documentation*

![Create Thought](screenshots/create-thought.png)
*Quick thought sharing interface for team communication*

#### AI-Powered Search & Discovery
![Search Results](screenshots/search-result.png)
*Semantic search finding relevant content even without exact keyword matches*

![Code Documentation](screenshots/code-docs.png)
*AI-generated code summaries and documentation from repositories*

![Code Summaries](screenshots/code-summaries.png)
*Automated code analysis and summary generation*

#### Tag-Based Organization
![Tag Cloud](screenshots/tag-cloud.png)
*Visual tag cloud for content discovery and organization*

![Tag Grid View](screenshots/tag-cloud-grid.png)
*Grid-based tag organization for better navigation*

#### User Engagement & Analytics
![User Reactions](screenshots/reactions.png)
*Real-time reactions and engagement tracking*

![Top Contributors](screenshots/top-contributors.png)
*Community leaderboard and contributor recognition*

![User Profile](screenshots/my-profile.png)
*Comprehensive user profiles with activity tracking*

#### Redis Data Architecture in Action
![Redis Keys Overview](screenshots/redis-keys.png)
*Redis Insight showing our multi-model data structure*

![User Data in Redis](screenshots/users-in-redis.png)
*User profiles stored as Redis Hash sets*

![Posts in Redis](screenshots/posts-in-redis.png)
*Post content stored as Redis JSON documents*

![Tags in Redis](screenshots/tags-in-redis.png)
*Tag organization using Redis sorted sets*

![Search Vectors](screenshots/search-vectors.png)
*Vector embeddings stored for semantic search*

![Vector Chunks](screenshots/chunks-for-larger-posts.png)
*Content chunking strategy for large documents*