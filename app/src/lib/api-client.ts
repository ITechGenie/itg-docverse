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

// Import mock data for development
import authMeData from '@/mocks/auth-me.json';
import tagsData from '@/mocks/tags.json';
import { postsApi } from '@/services/posts-api';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: '/api',
      timeout: 10000,
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth-token');
        if (token) {
          config.headers['x-auth-user'] = token;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
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

  // Auth APIs
  async getCurrentUser(): Promise<ApiResponse<User & { token?: string }>> {
    try {
      const response = await this.mockApiCall<User & { token?: string }>('/auth/me');
      
      // Store token if provided
      if (response.success && response.data?.token) {
        localStorage.setItem('auth-token', response.data.token);
      }
      
      return response;
    } catch (error) {
      console.error('Get current user failed:', error);
      return { success: false, error: 'Failed to get user information' };
    }
  }

  // Posts APIs
  async getPosts(params: PaginationParams & FeedFilters = { page: 1, limit: 10 }): Promise<ApiResponse<Post[]>> {
    try {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
      
      const endpoint = `/posts${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
      return await this.mockApiCall<Post[]>(endpoint);
    } catch (error) {
      console.error('Get posts failed:', error);
      return { success: false, error: 'Failed to load posts' };
    }
  }

  async getPost(id: string): Promise<ApiResponse<Post>> {
    try {
      return await this.mockApiCall<Post>(`/posts/${id}`);
    } catch (error) {
      console.error('Get post failed:', error);
      return { success: false, error: 'Failed to load post' };
    }
  }

  async getPostVersion(id: string, version: number): Promise<ApiResponse<Post>> {
    try {
      return await this.mockApiCall<Post>(`/posts/${id}/versions/${version}`);
    } catch (error) {
      console.error('Get post version failed:', error);
      return { success: false, error: 'Failed to load post version' };
    }
  }

  async createPost(data: CreatePostData): Promise<ApiResponse<Post>> {
    try {
      return await this.mockApiCall<Post>('/posts', 'POST', data);
    } catch (error) {
      console.error('Create post failed:', error);
      return { success: false, error: 'Failed to create post' };
    }
  }

  async toggleReaction(_postId: string, _reactionType: ReactionType): Promise<ApiResponse<boolean>> {
    try {
      // Mock reaction toggle - just return success
      await new Promise(resolve => setTimeout(resolve, 200));
      return { success: true, data: true };
    } catch (error) {
      console.error('Toggle reaction failed:', error);
      return { success: false, error: 'Failed to toggle reaction' };
    }
  }

  async toggleFavorite(_postId: string): Promise<ApiResponse<boolean>> {
    try {
      // Mock favorite toggle - just return success
      await new Promise(resolve => setTimeout(resolve, 200));
      return { success: true, data: true };
    } catch (error) {
      console.error('Toggle favorite failed:', error);
      return { success: false, error: 'Failed to toggle favorite' };
    }
  }

  // Tags APIs
  async getTags(): Promise<ApiResponse<Tag[]>> {
    try {
      return await this.mockApiCall<Tag[]>('/tags');
    } catch (error) {
      console.error('Get tags failed:', error);
      return { success: false, error: 'Failed to load tags' };
    }
  }

  // Comments APIs
  async getComments(_postId: string): Promise<ApiResponse<Comment[]>> {
    try {
      // Mock empty comments for now
      return { success: true, data: [] };
    } catch (error) {
      console.error('Get comments failed:', error);
      return { success: false, error: 'Failed to load comments' };
    }
  }

  async createComment(postId: string, content: string, parentId?: string): Promise<ApiResponse<Comment>> {
    try {
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
    } catch (error) {
      console.error('Create comment failed:', error);
      return { success: false, error: 'Failed to create comment' };
    }
  }
}

// Create and export API client instance
export const api = new ApiClient();
