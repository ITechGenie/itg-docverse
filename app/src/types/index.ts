export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatar?: string;
  bio?: string;
  location?: string;
  website?: string;
  joinedDate: string;
  isFollowing?: boolean;
  stats: {
    postsCount: number;
    commentsCount: number;
    tagsFollowed: number;
  };
  badges?: Badge[];
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export interface Post {
  id: string;
  type: 'long-form' | 'short-form' | 'thoughts';
  title?: string; // Optional for short-form posts
  content?: string; // Full content - optional in feed views for long-form posts to save bandwidth
  feed_content?: string; // Preview content for feed - used for all post types
  coverImage?: string;
  author: User;
  tags: Tag[];
  createdAt: string;
  updatedAt?: string;
  readTime?: number; // in minutes, for long-form posts
  reactions: Reaction[];
  comments: Comment[];
  stats: {
    views: number;
    totalReactions: number;
    totalComments: number;
  };
  isFavorited?: boolean;
  // Versioning and status
  status: 'draft' | 'published';
  revision: number; // 0 for draft, increments on each publish
  isLatest?: boolean; // indicates if this is the latest version
  // Document metadata (for code summaries)
  documentMeta?: {
    isDocument: boolean;
    projectId?: string;
    branchName?: string;
    gitUrl?: string;
    indexedDate?: string;
    documentType?: 'llm-short' | 'llm-full' | 'system-diagram' | 'api-flow' | 'batch-jobs' | 'user-journeys';
  };
}

export interface Tag {
  id: string;
  name: string;
  description?: string;
  color?: string;
  postsCount: number;
  isFollowing?: boolean;
}

export interface Reaction {
  id: string;
  type: ReactionType;
  userId: string;
  user: User;
  createdAt: string;
}

export type ReactionType = 
  | 'event-heart' 
  | 'event-broken-heart' 
  | 'event-thumbs-up' 
  | 'event-thumbs-down' 
  | 'event-unicorn' 
  | 'event-fire' 
  | 'event-celebrate' 
  | 'event-surprised' 
  | 'event-thinking' 
  | 'event-favorite';

export interface Comment {
  id: string;
  content: string;
  post_id: string;
  author_id: string;
  author_name?: string;
  author_username?: string;
  parent_id?: string; // For nested comments (renamed from parentId)
  like_count: number;
  is_edited?: boolean;
  created_at: string;
  updated_at?: string;
  post_title?: string; // For recent comments display
  replies?: Comment[];
}

// Search types
export interface SearchResult {
  post_id: string;
  title: string;
  content_snippet: string;
  author_name: string;
  post_type: string;
  tags: string[];
  created_at: string;
  similarity_score?: number; // Only present for AI search
}

export interface SearchFilters {
  query: string;
  limit?: number;
  threshold?: number;
  post_types?: string[];
}

export interface SearchConfig {
  ai_search_enabled: boolean;
  ai_search_available: boolean;
  search_mode: string;
  components: {
    ollama: {
      available: boolean;
      host: string;
      model: string;
    };
    redis: {
      available: boolean;
      host: string;
      port: number;
    };
  };
  settings: {
    similarity_threshold: number;
    chunk_size: number;
    chunk_overlap: number;
  };
  statistics: {
    indexed_chunks: number;
  };
  fallback_info: string;
}

export interface CreatePostData {
  type: 'long-form' | 'short-form' | 'thoughts';
  title?: string;
  content?: string;
  feed_content?: string; // Optional preview content for feed
  coverImage?: string;
  tags: string[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface AuthContext {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: 'latest' | 'popular' | 'trending';
  tag?: string;
}

export interface FeedFilters {
  type?: 'all' | 'long-form' | 'short-form' | 'thoughts';
  timeframe?: 'today' | 'week' | 'month' | 'year' | 'all';
  author?: string; // Filter posts by specific author ID
  favoritesPosts?: boolean; // Filter to show only favorite posts
  favoriteTags?: boolean; // Filter to show posts from favorite tags
}
