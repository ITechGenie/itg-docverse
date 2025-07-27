import axios from 'axios';
import type { AxiosInstance } from 'axios';
import type { 
  User, 
  Post, 
  Comment, 
  Tag, 
  CreatePostData, 
  ApiResponse, 
  PaginationParams,
  FeedFilters,
  ReactionType 
} from '@/types';

// Import mock data for development/testing
import authMeData from '@/mocks/auth-me.json';
import tagsData from '@/mocks/tags.json';
import { postsApi } from '@/services/posts-api';

// Configuration flags
const USE_REAL_API = true;
const API_BASE_URL = '/apis';
const TOKEN_STORAGE_KEY = 'itg_docverse_token';

export class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: USE_REAL_API ? '/apis' : '/api',
      timeout: 10000,
    });

        // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem(TOKEN_STORAGE_KEY);
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
  }

  // Map frontend post types to backend post types
  private mapPostTypeToApi(type: string): string | null {
    const typeMap: Record<string, string> = {
      'long-form': 'posts',
      'short-form': 'llm-short',
      'thoughts': 'thoughts',
      'posts': 'posts',
      'llm-short': 'llm-short',
      'llm-long': 'llm-long',
      'block-diagram': 'block-diagram',
      'code-snippet': 'code-snippet',
      'discussion': 'discussion'
    };
    
    return typeMap[type] || null;
  }

  private async mockApiCall<T>(endpoint: string, method: string = 'GET', data?: any): Promise<ApiResponse<T>> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500));

    try {
      let mockData: any;

      // Route mock responses
      switch (true) {
        case endpoint === '/auth/me':
          mockData = authMeData;
          break;
        
        case endpoint === '/posts' || endpoint.startsWith('/posts?'):
          mockData = await postsApi.getPosts();
          break;
        
        case endpoint === '/tags':
          mockData = tagsData;
          break;
        
        case endpoint.match(/^\/posts\/[\w-]+$/) !== null:
          const postId = endpoint.split('/').pop();
          const post = await postsApi.getPost(postId!);
          mockData = post ? { success: true, data: post } : { success: false, error: 'Post not found' };
          break;
        
        case method === 'POST' && endpoint === '/posts':
          // Handle post creation
          const postType = data.type || 'long-form';
          let postTitle = data.title;
          
          // Generate title for thoughts if not provided
          if (postType === 'thoughts' && !postTitle) {
            const randomId = Math.floor(Math.random() * 9000000) + 1000000;
            postTitle = `#thoughts - ${randomId}`;
          }
          
          const newPost = {
            id: postType === 'thoughts' ? `thoughts-${Date.now()}` : `post-${Date.now()}`,
            type: postType,
            title: postTitle,
            content: data.content,
            feed_content: data.feed_content || (postType === 'long-form' ? data.excerpt : data.content),
            coverImage: data.coverImage,
            author: authMeData.data,
            tags: data.tags?.map((tagName: string) => 
              tagsData.data.find((tag: any) => tag.name === tagName)
            ).filter(Boolean) || [],
            createdAt: new Date().toISOString(),
            readTime: postType === 'long-form' ? Math.ceil((data.content || '').length / 1000) : undefined,
            reactions: [],
            comments: [],
            stats: {
              views: 0,
              totalReactions: 0,
              totalComments: 0,
            },
          };
          mockData = { success: true, data: newPost };
          break;
        
        default:
          mockData = { success: false, error: 'Endpoint not found' };
      }

      return mockData;
      
    } catch (error) {
      return { success: false, error: 'Mock server error' };
    }
  }

  // Generic API call method that can switch between real and mock APIs
  private async apiCall<T>(endpoint: string, method: string = 'GET', data?: any): Promise<ApiResponse<T>> {
    if (!USE_REAL_API) {
      return await this.mockApiCall<T>(endpoint, method, data);
    }

    try {
      // Ensure we have a valid token for real API calls
      if (USE_REAL_API) {
        const authResult = await this.ensureAuthenticated();
        if (!authResult.success) {
          return { success: false, error: authResult.error || 'Authentication failed' };
        }
      }

      const config: any = {
        method,
        url: endpoint,
      };

      if (data) {
        config.data = data;
      }

      const response = await this.client(config);
      
      // Handle different response formats from the real API
      if (response.data && typeof response.data === 'object') {
        return { success: true, data: response.data };
      }
      
      return { success: true, data: response.data };
    } catch (error: any) {
      console.error(`API call failed: ${method} ${endpoint}`, error);
      
      if (error.response?.status === 401) {
        // Handle unauthorized - maybe trigger logout
        return { success: false, error: 'Authentication required' };
      }
      
      const errorMessage = error.response?.data?.detail || error.message || 'API call failed';
      return { success: false, error: errorMessage };
    }
  }

  // Auth APIs
  async ensureAuthenticated(): Promise<ApiResponse<string>> {
    try {
      const token = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (token) {
        // Check if token is still valid by trying to parse it
        try {
          const tokenPayload = this.parseJwtPayload(token);
          const currentTime = Math.floor(Date.now() / 1000);
          
          // If token is not expired, return it
          if (tokenPayload.exp && tokenPayload.exp > currentTime) {
            return { success: true, data: token };
          }
        } catch (error) {
          // Token is invalid, remove it
          localStorage.removeItem(TOKEN_STORAGE_KEY);
        }
      }
      
      // No valid token, get a new one from the public auth endpoint
      const authResponse = await this.apiCall<{ access_token: string }>('/public/auth', 'POST');
      if (authResponse.success && authResponse.data?.access_token) {
        const newToken = authResponse.data.access_token;
        localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
        return { success: true, data: newToken };
      }
      
      return { success: false, error: 'Failed to authenticate' };
    } catch (error) {
      console.error('Authentication failed:', error);
      return { success: false, error: 'Authentication failed' };
    }
  }

  async getCurrentUser(): Promise<ApiResponse<User & { token?: string }>> {
    try {
      if (USE_REAL_API) {
        // Ensure we have a valid token
        const authResult = await this.ensureAuthenticated();
        if (!authResult.success) {
          return { success: false, error: authResult.error };
        }
        
        const token = authResult.data!;
        
        try {
          const tokenPayload = this.parseJwtPayload(token);
          const user: User & { token?: string } = {
            id: tokenPayload.user_id || tokenPayload.sub || 'user',
            username: tokenPayload.username || 'User',
            displayName: tokenPayload.display_name || tokenPayload.username || 'User',
            email: tokenPayload.email || 'user@docverse.local',
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${tokenPayload.username || 'user'}`,
            joinedDate: new Date().toISOString(),
            stats: {
              postsCount: 0,
              commentsCount: 0,
              tagsFollowed: 0,
            },
            token: token,
          };
          return { success: true, data: user };
        } catch (error) {
          return { success: false, error: 'Invalid token format' };
        }
      } else {
        const response = await this.mockApiCall<User & { token?: string }>('/auth/me');
        
        // Store token if provided
        if (response.success && response.data?.token) {
          localStorage.setItem(TOKEN_STORAGE_KEY, response.data.token);
        }
        
        return response;
      }
    } catch (error) {
      console.error('Get current user failed:', error);
      return { success: false, error: 'Failed to get user information' };
    }
  }

  // Posts APIs
  async getPosts(params: PaginationParams & FeedFilters = { page: 1, limit: 10 }): Promise<ApiResponse<Post[]>> {
    try {
      if (USE_REAL_API) {
        const searchParams = new URLSearchParams();
        
        // Map UI params to API params
        if (params.page && params.limit) {
          const skip = (params.page - 1) * params.limit;
          searchParams.append('skip', String(skip));
          searchParams.append('limit', String(params.limit));
        }
        
        if (params.type && params.type !== 'all') {
          const mappedType = this.mapPostTypeToApi(params.type);
          if (mappedType) {
            searchParams.append('post_type', mappedType);
          }
        }
        
        if (params.tag) {
          searchParams.append('tag', params.tag);
        }

        if (params.author) {
          searchParams.append('author_id', params.author);
        }

        const endpoint = `/posts/${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
        const response = await this.apiCall<any[]>(endpoint);
        
        if (response.success && response.data) {
          // Transform API response to match UI expectations
          const transformedPosts = response.data.map(apiPost => this.transformApiPostToUIPost(apiPost));
          return { success: true, data: transformedPosts };
        }
        
        return response;
      } else {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            searchParams.append(key, String(value));
          }
        });
        
        const endpoint = `/posts${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
        return await this.mockApiCall<Post[]>(endpoint);
      }
    } catch (error) {
      console.error('Get posts failed:', error);
      return { success: false, error: 'Failed to load posts' };
    }
  }

  // Transform API post format to UI post format
  private transformApiPostToUIPost(apiPost: any): Post {
    return {
      id: apiPost.id,
      type: this.mapApiPostTypeToUIType(apiPost.post_type),
      title: apiPost.title,
      content: apiPost.content,
      feed_content: apiPost.content, // API doesn't have separate feed content yet
      coverImage: apiPost.cover_image || undefined,
      author: {
        id: apiPost.author_id,
        username: 'ITG DocVerse User', // Default for now
        displayName: 'ITG DocVerse User',
        email: 'user@docverse.local',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${apiPost.author_id}`,
        joinedDate: new Date().toISOString(),
        stats: {
          postsCount: 0,
          commentsCount: 0,
          tagsFollowed: 0,
        }
      },
      tags: apiPost.tags || [],
      createdAt: apiPost.created_at,
      updatedAt: apiPost.updated_at,
      readTime: apiPost.post_type === 'posts' ? Math.ceil(apiPost.content.length / 1000) : undefined,
      reactions: [],
      comments: [],
      stats: {
        views: apiPost.view_count || 0,
        totalReactions: apiPost.like_count || 0,
        totalComments: apiPost.comment_count || 0,
      },
      status: (apiPost.status === 'published' ? 'published' : 'draft') as 'draft' | 'published',
      revision: 0, // Default revision for now
    };
  }

  // Map API post types to UI post types
  private mapApiPostTypeToUIType(apiType: string): 'long-form' | 'thoughts' | 'short-form' {
    const typeMap: { [key: string]: 'long-form' | 'thoughts' | 'short-form' } = {
      'posts': 'long-form',
      'thoughts': 'thoughts',
      'llm-short': 'short-form',
      'llm-long': 'long-form',
      'block-diagram': 'long-form',
      'code-snippet': 'short-form',
      'discussion': 'long-form'
    };
    return typeMap[apiType] || 'long-form';
  }

  // Map UI post types to API post types
  private mapUIPostTypeToApiType(uiType: string): string {
    const typeMap: { [key: string]: string } = {
      'long-form': 'posts',
      'thoughts': 'thoughts',
      'ai-summary': 'llm-short',
      'documentation': 'llm-long',
      'diagram': 'block-diagram',
      'code': 'code-snippet',
      'discussion': 'discussion'
    };
    return typeMap[uiType] || 'posts';
  }

  async getPost(id: string): Promise<ApiResponse<Post>> {
    try {
      if (USE_REAL_API) {
        const response = await this.apiCall<any>(`/posts/${id}`);
        if (response.success) {
          const transformedPost = this.transformApiPostToUIPost(response.data);
          return { success: true, data: transformedPost };
        }
        return response;
      } else {
        return await this.mockApiCall<Post>(`/posts/${id}`);
      }
    } catch (error) {
      console.error('Get post failed:', error);
      return { success: false, error: 'Failed to load post' };
    }
  }

  async getPostVersion(id: string, version: number): Promise<ApiResponse<Post>> {
    try {
      if (USE_REAL_API) {
        // API doesn't support versions yet, just return the current post
        return await this.getPost(id);
      } else {
        return await this.mockApiCall<Post>(`/posts/${id}/versions/${version}`);
      }
    } catch (error) {
      console.error('Get post version failed:', error);
      return { success: false, error: 'Failed to load post version' };
    }
  }

  async createPost(data: CreatePostData): Promise<ApiResponse<Post>> {
    try {
      if (USE_REAL_API) {
        // Transform UI data to API format
        const apiData = {
          title: data.title || undefined, // Don't send empty string, send undefined
          content: data.content || '', // Default to empty string if not provided
          post_type: this.mapUIPostTypeToApiType(data.type || 'long-form'),
          tags: data.tags || [],
          status: 'published', // Default status
        };

        const response = await this.apiCall<any>('/posts/', 'POST', apiData);
        if (response.success) {
          const transformedPost = this.transformApiPostToUIPost(response.data);
          return { success: true, data: transformedPost };
        }
        return response;
      } else {
        return await this.mockApiCall<Post>('/posts', 'POST', data);
      }
    } catch (error) {
      console.error('Create post failed:', error);
      return { success: false, error: 'Failed to create post' };
    }
  }

  async toggleReaction(postId: string, reactionType: ReactionType): Promise<ApiResponse<boolean>> {
    try {
      if (USE_REAL_API) {
        // First check if user already has this reaction
        const reactionsResponse = await this.apiCall<any[]>(`/reactions/post/${postId}`);
        
        if (reactionsResponse.success && reactionsResponse.data) {
          const currentUser = await this.getCurrentUser();
          if (!currentUser.success) {
            return { success: false, error: 'User not authenticated' };
          }
          
          const userReaction = reactionsResponse.data.find(
            r => r.user_id === currentUser.data!.id && r.reaction_type === reactionType
          );
          
          if (userReaction) {
            // Remove existing reaction
            const removeResponse = await this.apiCall(
              `/reactions/post/${postId}/remove`,
              'DELETE',
              { reaction_type: reactionType }
            );
            return { success: removeResponse.success, data: removeResponse.success };
          } else {
            // Add new reaction
            const addResponse = await this.apiCall(
              `/reactions/post/${postId}/add`,
              'POST',
              { reaction_type: reactionType }
            );
            return { success: addResponse.success, data: addResponse.success };
          }
        }
        
        return { success: false, error: 'Failed to check existing reactions' };
      } else {
        // Mock reaction toggle - just return success
        await new Promise(resolve => setTimeout(resolve, 200));
        return { success: true, data: true };
      }
    } catch (error) {
      console.error('Toggle reaction failed:', error);
      return { success: false, error: 'Failed to toggle reaction' };
    }
  }

  async getPostReactions(postId: string): Promise<ApiResponse<any[]>> {
    try {
      if (USE_REAL_API) {
        return await this.apiCall<any[]>(`/reactions/post/${postId}`);
      } else {
        // Mock reactions
        await new Promise(resolve => setTimeout(resolve, 200));
        return { success: true, data: [] };
      }
    } catch (error) {
      console.error('Get post reactions failed:', error);
      return { success: false, error: 'Failed to get post reactions' };
    }
  }

  async toggleFavorite(_postId: string): Promise<ApiResponse<boolean>> {
    try {
      if (USE_REAL_API) {
        // Real API doesn't support favorites yet, return mock success
        await new Promise(resolve => setTimeout(resolve, 200));
        return { success: true, data: true };
      } else {
        // Mock favorite toggle - just return success
        await new Promise(resolve => setTimeout(resolve, 200));
        return { success: true, data: true };
      }
    } catch (error) {
      console.error('Toggle favorite failed:', error);
      return { success: false, error: 'Failed to toggle favorite' };
    }
  }

  // Tags APIs
  async getTags(): Promise<ApiResponse<Tag[]>> {
    try {
      if (USE_REAL_API) {
        const response = await this.apiCall<any[]>('/tags/');
        if (response.success && response.data) {
          // Transform API tags to UI format (if needed)
          const transformedTags = response.data.map((apiTag: any) => ({
            id: apiTag.id || apiTag.name,
            name: apiTag.name,
            description: apiTag.description,
            color: apiTag.color || '#3b82f6',
            postsCount: apiTag.posts_count || 0,
          }));
          return { success: true, data: transformedTags };
        }
        return response;
      } else {
        return await this.mockApiCall<Tag[]>('/tags');
      }
    } catch (error) {
      console.error('Get tags failed:', error);
      return { success: false, error: 'Failed to load tags' };
    }
  }

  // Comments APIs
  async getComments(_postId: string): Promise<ApiResponse<Comment[]>> {
    try {
      if (USE_REAL_API) {
        // Real API doesn't support comments yet, return empty array
        return { success: true, data: [] };
      } else {
        // Mock empty comments for now
        return { success: true, data: [] };
      }
    } catch (error) {
      console.error('Get comments failed:', error);
      return { success: false, error: 'Failed to load comments' };
    }
  }

  async createComment(postId: string, content: string, parentId?: string): Promise<ApiResponse<Comment>> {
    try {
      if (USE_REAL_API) {
        // Real API doesn't support comments yet, return mock
        const newComment: Comment = {
          id: `comment-${Date.now()}`,
          content,
          author: {
            id: 'itg-docverse',
            username: 'ITG DocVerse User',
            displayName: 'ITG DocVerse User',
            email: 'user@docverse.local',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=itg-docverse',
            joinedDate: new Date().toISOString(),
            stats: { postsCount: 0, commentsCount: 0, tagsFollowed: 0 }
          },
          postId,
          parentId,
          createdAt: new Date().toISOString(),
          reactions: [],
          stats: {
            totalReactions: 0,
            totalReplies: 0,
          },
        };
        return { success: true, data: newComment };
      } else {
        const newComment: Comment = {
          id: `comment-${Date.now()}`,
          content,
          author: authMeData.data,
          postId,
          parentId,
          createdAt: new Date().toISOString(),
          reactions: [],
          stats: {
            totalReactions: 0,
            totalReplies: 0,
          },
        };
        return { success: true, data: newComment };
      }
    } catch (error) {
      console.error('Create comment failed:', error);
      return { success: false, error: 'Failed to create comment' };
    }
  }

  // Search APIs
  async searchPosts(query: string): Promise<ApiResponse<Post[]>> {
    try {
      if (USE_REAL_API) {
        const response = await this.apiCall<any[]>(`/posts/search/?q=${encodeURIComponent(query)}`);
        if (response.success && response.data) {
          const transformedPosts = response.data.map(apiPost => this.transformApiPostToUIPost(apiPost));
          return { success: true, data: transformedPosts };
        }
        return response;
      } else {
        // Mock search - filter existing posts
        const postsResponse = await this.getPosts();
        if (postsResponse.success && postsResponse.data) {
          const filteredPosts = postsResponse.data.filter(post => 
            post.title?.toLowerCase().includes(query.toLowerCase()) ||
            post.content?.toLowerCase().includes(query.toLowerCase())
          );
          return { success: true, data: filteredPosts };
        }
        return { success: false, error: 'Search failed' };
      }
    } catch (error) {
      console.error('Search posts failed:', error);
      return { success: false, error: 'Failed to search posts' };
    }
  }

  // Authentication APIs
  async login(username: string, password: string): Promise<ApiResponse<{ token: string; user: User }>> {
    try {
      if (USE_REAL_API) {
        const response = await axios.post(`${API_BASE_URL}/public/auth`, {
          username,
          password,
        });

        if (response.data && response.data.access_token) {
          // Decode JWT to get user info
          const tokenPayload = this.parseJwtPayload(response.data.access_token);
          const user: User = {
            id: tokenPayload.user_id || tokenPayload.sub || 'user',
            username: tokenPayload.username || username,
            displayName: tokenPayload.display_name || tokenPayload.username || username,
            email: tokenPayload.email || `${username}@docverse.local`,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
            joinedDate: new Date().toISOString(),
            stats: {
              postsCount: 0,
              commentsCount: 0,
              tagsFollowed: 0,
            },
          };

          return {
            success: true,
            data: {
              token: response.data.access_token,
              user,
            },
          };
        }
        return { success: false, error: 'Invalid response from server' };
      } else {
        // Mock login
        if (username === 'admin' && password === 'admin') {
          const token = 'mock-jwt-token';
          const user = authMeData.data;
          return { success: true, data: { token, user } };
        }
        return { success: false, error: 'Invalid credentials' };
      }
    } catch (error: any) {
      console.error('Login failed:', error);
      const errorMessage = error.response?.data?.detail || 'Login failed';
      return { success: false, error: errorMessage };
    }
  }

  private parseJwtPayload(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Failed to parse JWT:', error);
      return {};
    }
  }
}

// Create and export API client instance
export const api = new ApiClient();
