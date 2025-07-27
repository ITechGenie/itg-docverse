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
  | 'heart' 
  | 'broken-heart' 
  | 'thumbs-up' 
  | 'thumbs-down' 
  | 'unicorn' 
  | 'fire' 
  | 'celebrate' 
  | 'surprised' 
  | 'thinking' 
  | 'favorite';

export interface Comment {
  id: string;
  content: string;
  author: User;
  postId: string;
  parentId?: string; // For nested comments
  createdAt: string;
  updatedAt?: string;
  reactions: Reaction[];
  replies?: Comment[];
  stats: {
    totalReactions: number;
    totalReplies: number;
  };
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
  following?: boolean;
  author?: string; // Filter posts by specific author ID
}
