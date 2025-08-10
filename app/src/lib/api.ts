import type { 
  User, 
  Post, 
  Tag, 
  CreatePostData, 
  ApiResponse, 
  PaginationParams,
  FeedFilters,
  Reaction,
  ReactionType,
  SearchResult,
  SearchFilters,
  SearchConfig
} from '@/types';
import { api as apiClient } from '@/lib/api-client';

// Mock data
const mockUser: User = {
  id: 'user-1',
  username: 'prakashm88',
  displayName: 'Prakash M',
  email: 'prakash@example.com',
  avatar: 'https://github.com/prakashm88.png',
  bio: 'Full Stack Developer | Tech Enthusiast | Open Source Contributor',
  location: 'Bangalore, India',
  website: 'https://prakash.dev',
  joinedDate: '2024-01-15',
  stats: {
    postsCount: 42,
    commentsCount: 128,
    tagsFollowed: 15,
  },
  badges: [
    {
      id: 'badge-1',
      name: 'Early Adopter',
      description: 'One of the first users',
      icon: '🌟',
      color: 'gold'
    }
  ]
};

const mockTags: Tag[] = [
  { id: 'tag-1', name: 'javascript', description: 'JavaScript programming language', color: '#f7df1e', postsCount: 1234 },
  { id: 'tag-2', name: 'react', description: 'React library for building UIs', color: '#61dafb', postsCount: 987 },
  { id: 'tag-3', name: 'typescript', description: 'TypeScript superset of JavaScript', color: '#3178c6', postsCount: 756 },
  { id: 'tag-4', name: 'webdev', description: 'Web Development', color: '#ff6b6b', postsCount: 2345 },
  { id: 'tag-5', name: 'opensource', description: 'Open Source Software', color: '#4ecdc4', postsCount: 654 },
];

const mockPosts: Post[] = [
  {
    id: 'post-1',
    type: 'long-form',
    title: '12 Open Source Alternatives to Popular Software (For Developers)',
    content: `# 12 Open Source Alternatives to Popular Software

As developers, we often rely on various tools and software to enhance our productivity and streamline our workflows. While many popular commercial solutions exist, there's a thriving ecosystem of open-source alternatives that can be just as powerful, if not more so.

## 1. Visual Studio Code vs VSCodium
VSCodium is a community-driven, freely-licensed binary distribution of Microsoft's editor VS Code.

## 2. Slack vs Mattermost
Mattermost is an open-source messaging platform that enables secure team collaboration.

*[Content continues...]*`,
    feed_content: 'Discover powerful open-source alternatives to popular development tools that can enhance your productivity while keeping costs down.',
    coverImage: 'https://picsum.photos/800/400?random=1',
    author: mockUser,
    tags: [mockTags[4], mockTags[3], mockTags[0]],
    createdAt: '2025-07-22T10:30:00Z',
    readTime: 6,
    status: 'published',
    revision: 1,
    reactions: [
      { id: 'r1', type: 'event-heart', userId: 'user-2', user: mockUser, createdAt: '2025-07-22T11:00:00Z' },
      { id: 'r2', type: 'event-unicorn', userId: 'user-3', user: mockUser, createdAt: '2025-07-22T11:30:00Z' },
    ],
    comments: [],
    stats: {
      views: 1234,
      totalReactions: 169,
      totalComments: 35,
    },
  },
  {
    id: 'post-2',
    type: 'short-form',
    status: 'published',
    revision: 1,
    content: 'Just discovered an amazing TypeScript feature that I never knew existed! The `satisfies` operator is a game-changer for type checking without widening types. 🤯',
    author: mockUser,
    tags: [mockTags[2], mockTags[3]],
    createdAt: '2025-07-23T14:20:00Z',
    reactions: [
      { id: 'r3', type: 'event-thinking', userId: 'user-4', user: mockUser, createdAt: '2025-07-23T14:30:00Z' },
    ],
    comments: [],
    stats: {
      views: 456,
      totalReactions: 23,
      totalComments: 8,
    },
  },
];

// API helper function
async function apiCall<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = localStorage.getItem('auth-token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'x-auth-user': token }),
    ...options.headers,
  };

  try {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 700));

    // Mock API responses based on endpoint
    const response = await mockApiResponse<T>(endpoint, { ...options, headers });
    return response;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

// Mock API response handler
async function mockApiResponse<T>(
  endpoint: string, 
  options: RequestInit
): Promise<ApiResponse<T>> {
  const method = options.method || 'GET';
  const url = new URL(`http://localhost:3000${endpoint}`);
  
  switch (endpoint) {
    case '/api/auth/me':
      return { success: true, data: mockUser as T };
    
    case '/api/posts':
      const filters = Object.fromEntries(url.searchParams.entries()) as FeedFilters;
      let filteredPosts = [...mockPosts];
      
      if (filters.type && filters.type !== 'all') {
        filteredPosts = filteredPosts.filter(post => post.type === filters.type);
      }
      
      return { success: true, data: filteredPosts as T };
    
    case '/api/tags':
      return { success: true, data: mockTags as T };
    
    default:
      if (endpoint.startsWith('/api/posts/') && method === 'GET') {
        const postId = endpoint.split('/')[3];
        const post = mockPosts.find(p => p.id === postId);
        if (post) {
          return { success: true, data: post as T };
        }
      }
      
      return { success: false, error: 'Endpoint not found' };
  }
}

// API functions
export const api = {
  // Auth
  async getCurrentUser(): Promise<ApiResponse<User>> {
    return apiCall<User>('/api/auth/me');
  },

  // Posts
  async getPosts(params: PaginationParams & FeedFilters = { page: 1, limit: 10 }): Promise<ApiResponse<Post[]>> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    return apiCall<Post[]>(`/api/posts?${searchParams.toString()}`);
  },

  async getPost(id: string): Promise<ApiResponse<Post>> {
    return apiCall<Post>(`/api/posts/${id}`);
  },

  async createPost(data: CreatePostData): Promise<ApiResponse<Post>> {
    const newPost: Post = {
      id: `post-${Date.now()}`,
      type: data.type,
      title: data.title,
      content: data.content,
      coverImage: data.coverImage,
      author: mockUser,
      tags: mockTags.filter(tag => data.tags.includes(tag.name)),
      createdAt: new Date().toISOString(),
      readTime: data.type === 'long-form' ? Math.ceil((data.content ?? '').length / 1000) : undefined,
      reactions: [],
      comments: [],
      status: 'published',
      revision: 1,
      stats: {
        views: 0,
        totalReactions: 0,
        totalComments: 0,
      },
    };
    
    mockPosts.unshift(newPost);
    return { success: true, data: newPost };
  },

  async toggleReaction(postId: string, reactionType: ReactionType): Promise<ApiResponse<boolean>> {
    const post = mockPosts.find(p => p.id === postId);
    if (!post) {
      return { success: false, error: 'Post not found' };
    }

    const existingReaction = post.reactions.find(r => r.userId === mockUser.id && r.type === reactionType);
    
    if (existingReaction) {
      // Remove reaction
      post.reactions = post.reactions.filter(r => r.id !== existingReaction.id);
      post.stats.totalReactions = Math.max(0, post.stats.totalReactions - 1);
    } else {
      // Add reaction
      const newReaction: Reaction = {
        id: `reaction-${Date.now()}`,
        type: reactionType,
        userId: mockUser.id,
        user: mockUser,
        createdAt: new Date().toISOString(),
      };
      post.reactions.push(newReaction);
      post.stats.totalReactions += 1;
    }

    return { success: true, data: !existingReaction };
  },

  async toggleFavorite(postId: string): Promise<ApiResponse<boolean>> {
    const post = mockPosts.find(p => p.id === postId);
    if (!post) {
      return { success: false, error: 'Post not found' };
    }

    post.isFavorited = !post.isFavorited;
    return { success: true, data: post.isFavorited };
  },

  // Tags
  async getTags(): Promise<ApiResponse<Tag[]>> {
    return apiCall<Tag[]>('/api/tags');
  },
};

// Search API
export const searchApi = {
  // Get search configuration
  async getConfig(): Promise<ApiResponse<SearchConfig>> {
    try {
      const response = await apiClient.getSearchConfig();
      return response;
    } catch (error) {
      console.error('Failed to get search config:', error);
      return { success: false, error: 'Failed to get search configuration' };
    }
  },

  // Perform search
  async search(filters: SearchFilters): Promise<ApiResponse<SearchResult[]>> {
    try {
      const response = await apiClient.search(filters);
      return response;
    } catch (error) {
      console.error('Search failed:', error);
      return { success: false, error: 'Search failed' };
    }
  },

  // Trigger indexing (only available when AI search is enabled)
  async triggerIndexing(forceReindex = false, postTypes?: string[]): Promise<ApiResponse<{
    message: string;
    posts_count: number;
    trigger_id: string | null;
    status: string;
  }>> {
    try {
      const response = await apiClient.triggerIndexing(forceReindex, postTypes);
      return response;
    } catch (error) {
      console.error('Indexing failed:', error);
      return { success: false, error: 'Failed to trigger indexing' };
    }
  },
};
