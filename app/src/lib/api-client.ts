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
import {getAvatarUrl} from '@/lib/avatar';

// Configuration flags
const USE_REAL_API = true;
const API_BASE_URL = '/apis';
const TOKEN_STORAGE_KEY = 'itg_docuverse_token';

export class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: USE_REAL_API ? '/apis' : '/api',
      timeout: 30000, // 30 seconds timeout for API calls
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
        // Get token from storage
        const token = localStorage.getItem(TOKEN_STORAGE_KEY);
        if (!token) {
          return { success: false, error: 'No authentication token found' };
        }
        
        try {
          // Call the /me endpoint to get full user data
          const response = await axios.get(`${API_BASE_URL}/public/me?token=${token}`);
          
          if (response.data && response.data.success) {
            return { success: true, data: response.data.data };
          }
          
          return { success: false, error: 'Failed to get user data' };
        } catch (error: any) {
          // If token is invalid, remove it
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          return { success: false, error: 'Authentication failed' };
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

  async getUserByUsername(username: string): Promise<ApiResponse<User>> {
    try {
      if (USE_REAL_API) {
        const response = await this.apiCall<any>(`/users/username/${username}`, 'GET');
        if (response.success && response.data) {
          // Transform backend user data to frontend User type
          const backendUser = response.data;
          const user: User = {
            id: backendUser.id,
            username: backendUser.username,
            displayName: backendUser.display_name,
            email: `${backendUser.username}@itgdocverse.com`, // Email not exposed in public API
            bio: backendUser.bio || '',
            location: backendUser.location || '',
            website: backendUser.website || '',
            avatar: backendUser.avatar_url || getAvatarUrl(backendUser.username, 100),
            joinedDate: backendUser.created_at,
            stats: {
              postsCount: backendUser.post_count || 0,
              commentsCount: backendUser.comment_count || 0,
              tagsFollowed: 0, // Not available in backend yet
            },
          };
          return { success: true, data: user };
        }
        return response;
      } else {
        // Mock implementation
        const mockUser: User = {
          id: 'user-1',
          username: username,
          displayName: username.charAt(0).toUpperCase() + username.slice(1),
          email: `${username}@example.com`,
          bio: 'Mock user profile',
          location: 'Mock Location',
          joinedDate: '2024-01-15T00:00:00Z',
          stats: {
            postsCount: 0,
            commentsCount: 0,
            tagsFollowed: 0,
          },
        };
        return { success: true, data: mockUser };
      }
    } catch (error) {
      console.error('Get user by username failed:', error);
      return { success: false, error: 'Failed to get user by username' };
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

        if (params.favoritesPosts) {
          searchParams.append('favorites_posts', 'true');
        }

        if (params.favoriteTags) {
          searchParams.append('favorite_tags', 'true');
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
        //avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${apiPost.author_id}`,
        avatar: getAvatarUrl(apiPost.author_id, 100), // Use avatar utility function
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

  async updatePost(postId: string, data: Partial<CreatePostData>): Promise<ApiResponse<Post>> {
    try {
      if (USE_REAL_API) {
        // Transform UI data to API format
        const apiData: any = {};
        if (data.title !== undefined) apiData.title = data.title || undefined;
        if (data.content !== undefined) apiData.content = data.content || '';
        if (data.type !== undefined) apiData.post_type = this.mapUIPostTypeToApiType(data.type);
        if (data.tags !== undefined) apiData.tags = data.tags || [];
        if (data.coverImage !== undefined) apiData.cover_image_url = data.coverImage;

        const response = await this.apiCall<any>(`/posts/${postId}`, 'PUT', apiData);
        if (response.success) {
          const transformedPost = this.transformApiPostToUIPost(response.data);
          return { success: true, data: transformedPost };
        }
        return response;
      } else {
        // Mock update - just return a success response
        const existingPost = await this.getPost(postId);
        if (existingPost.success && existingPost.data) {
          const updatedPost = {
            ...existingPost.data,
            title: data.title !== undefined ? data.title : existingPost.data.title,
            content: data.content !== undefined ? data.content : existingPost.data.content,
            coverImage: data.coverImage !== undefined ? data.coverImage : existingPost.data.coverImage,
            tags: data.tags !== undefined ? 
              data.tags.map(tagName => ({ id: tagName, name: tagName, color: '#3b82f6', postsCount: 0 })) : 
              existingPost.data.tags,
            updatedAt: new Date().toISOString(),
          };
          return { success: true, data: updatedPost };
        }
        return { success: false, error: 'Post not found' };
      }
    } catch (error) {
      console.error('Update post failed:', error);
      return { success: false, error: 'Failed to update post' };
    }
  }

  async toggleReaction(targetId: string, reactionType: ReactionType, targetType: string = 'post'): Promise<ApiResponse<boolean>> {
    try {
      if (USE_REAL_API) {
        // Special case for tag favorites - use the dedicated endpoint
        if (targetType === 'tag' && reactionType === 'event-favorite') {
          const response = await this.apiCall<{success: boolean, is_favorited: boolean}>(
            `/reactions/tag/${targetId}/toggle-favorite`,
            'POST'
          );
          return { 
            success: response.success, 
            data: response.success ? response.data?.is_favorited : false 
          };
        }
        
        // First check if user already has this reaction
        const endpoint = `/reactions/${targetType}/${targetId}`;
        const reactionsResponse = await this.apiCall<any[]>(endpoint);
        
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
              `/reactions/${targetType}/${targetId}/remove`,
              'DELETE',
              { reaction_type: reactionType }
            );
            return { success: removeResponse.success, data: removeResponse.success };
          } else {
            // Add new reaction
            const addResponse = await this.apiCall(
              `/reactions/${targetType}/${targetId}/add`,
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

  async getReactions(targetId: string, targetType: string = 'post'): Promise<ApiResponse<any[]>> {
    try {
      if (USE_REAL_API) {
        const endpoint = `/reactions/${targetType}/${targetId}`;
        return await this.apiCall<any[]>(endpoint);
      } else {
        // Mock reactions
        await new Promise(resolve => setTimeout(resolve, 200));
        return { success: true, data: [] };
      }
    } catch (error) {
      console.error('Get reactions failed:', error);
      return { success: false, error: 'Failed to get reactions' };
    }
  }

  // Keep the old method for backward compatibility
  async getPostReactions(postId: string): Promise<ApiResponse<any[]>> {
    return this.getReactions(postId, 'post');
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

  async searchTags(query: string, limit: number = 10): Promise<ApiResponse<Tag[]>> {
    try {
      if (USE_REAL_API) {
        const response = await this.apiCall<any[]>(`/tags/search?q=${encodeURIComponent(query)}&limit=${limit}`);
        if (response.success && response.data) {
          const transformedTags = response.data.map((apiTag: any) => ({
            id: apiTag.id,
            name: apiTag.name,
            color: apiTag.color || '#3b82f6',
            postsCount: apiTag.posts_count || 0,
          }));
          return { success: true, data: transformedTags };
        }
        return response;
      } else {
        // Mock search functionality
        const allTags = tagsData.data;
        const filteredTags = allTags
          .filter((tag: any) => tag.name.toLowerCase().includes(query.toLowerCase()))
          .slice(0, limit);
        return { success: true, data: filteredTags };
      }
    } catch (error) {
      console.error('Search tags failed:', error);
      return { success: false, error: 'Failed to search tags' };
    }
  }

  async getPopularTags(limit: number = 20): Promise<ApiResponse<Tag[]>> {
    try {
      if (USE_REAL_API) {
        const response = await this.apiCall<any[]>(`/tags/popular?limit=${limit}`);
        if (response.success && response.data) {
          const transformedTags = response.data.map((apiTag: any) => ({
            id: apiTag.id,
            name: apiTag.name,
            description: apiTag.description,
            color: apiTag.color || '#3b82f6',
            postsCount: apiTag.posts_count || 0,
            category: apiTag.category,
            isActive: apiTag.is_active,
          }));
          return { success: true, data: transformedTags };
        }
        return response;
      } else {
        const sortedTags = [...tagsData.data].sort((a: any, b: any) => b.postsCount - a.postsCount).slice(0, limit);
        return { success: true, data: sortedTags };
      }
    } catch (error) {
      console.error('Get popular tags failed:', error);
      return { success: false, error: 'Failed to load popular tags' };
    }
  }

  async createTag(tagData: { name: string; description?: string; color?: string; category?: string }): Promise<ApiResponse<Tag>> {
    try {
      if (USE_REAL_API) {
        const response = await this.apiCall<any>('/tags/', 'POST', tagData);
        if (response.success && response.data) {
          const transformedTag = {
            id: response.data.id,
            name: response.data.name,
            description: response.data.description,
            color: response.data.color || '#3b82f6',
            postsCount: 0,
          };
          return { success: true, data: transformedTag };
        }
        return response;
      } else {
        // Mock creation
        const newTag = {
          id: `tag-${Date.now()}`,
          name: tagData.name,
          description: tagData.description || '',
          color: tagData.color || '#3b82f6',
          postsCount: 0,
        };
        return { success: true, data: newTag };
      }
    } catch (error) {
      console.error('Create tag failed:', error);
      return { success: false, error: 'Failed to create tag' };
    }
  }

  async updateTag(tagId: string, tagData: { name?: string; description?: string; color?: string; category?: string }): Promise<ApiResponse<Tag>> {
    try {
      if (USE_REAL_API) {
        const response = await this.apiCall<any>(`/tags/${tagId}`, 'PUT', tagData);
        if (response.success && response.data) {
          const transformedTag = {
            id: response.data.id,
            name: response.data.name,
            description: response.data.description,
            color: response.data.color || '#3b82f6',
            postsCount: response.data.posts_count || 0,
          };
          return { success: true, data: transformedTag };
        }
        return response;
      } else {
        // Mock update
        const updatedTag = {
          id: tagId,
          name: tagData.name || 'Updated Tag',
          description: tagData.description || '',
          color: tagData.color || '#3b82f6',
          postsCount: 0,
        };
        return { success: true, data: updatedTag };
      }
    } catch (error) {
      console.error('Update tag failed:', error);
      return { success: false, error: 'Failed to update tag' };
    }
  }

  async deleteTag(tagId: string): Promise<ApiResponse<{ message: string }>> {
    try {
      if (USE_REAL_API) {
        const response = await this.apiCall<{ message: string }>(`/tags/${tagId}`, 'DELETE');
        return response;
      } else {
        return { success: true, data: { message: 'Tag deleted successfully' } };
      }
    } catch (error) {
      console.error('Delete tag failed:', error);
      return { success: false, error: 'Failed to delete tag' };
    }
  }

  async getUserFavoriteTags(): Promise<ApiResponse<string[]>> {
    try {
      if (USE_REAL_API) {
        const response = await this.apiCall<any>('/reactions/favorites/tags');
        if (response.success && response.data) {
          return { success: true, data: response.data.tag_ids || [] };
        }
        return response;
      } else {
        // Mock favorite tags
        return { success: true, data: [] };
      }
    } catch (error) {
      console.error('Get user favorite tags failed:', error);
      return { success: false, error: 'Failed to load favorite tags' };
    }
  }

  async getPostsByTag(tagId: string, page: number = 1, limit: number = 10): Promise<ApiResponse<{ posts: Post[]; pagination: any; tag: any }>> {
    try {
      if (USE_REAL_API) {
        const response = await this.apiCall<any>(`/tags/${tagId}/posts?page=${page}&limit=${limit}`);
        if (response.success && response.data) {
          const transformedPosts = response.data.posts.map((apiPost: any) => this.transformApiPostToUIPost(apiPost));
          return { 
            success: true, 
            data: {
              posts: transformedPosts,
              pagination: response.data.pagination,
              tag: response.data.tag
            }
          };
        }
        return response;
      } else {
        // Mock implementation
        const mockPosts = await this.getPosts({ page, limit });
        return { 
          success: true, 
          data: {
            posts: Array.isArray(mockPosts.data) ? mockPosts.data : [],
            pagination: { page, limit, total: 0, pages: 0 },
            tag: { id: tagId, name: 'Mock Tag' }
          }
        };
      }
    } catch (error) {
      console.error('Get posts by tag failed:', error);
      return { success: false, error: 'Failed to load posts by tag' };
    }
  }

  // Authors API methods
  async searchAuthors(query: string, limit: number = 10, minPosts: number = 0): Promise<ApiResponse<any[]>> {
    try {
      if (USE_REAL_API) {
        const params = new URLSearchParams({
          limit: limit.toString(),
          offset: '0',
          min_posts: minPosts.toString(),
        });
        if (query) {
          params.append('q', query);
        }
        
        const response = await this.apiCall<any[]>(`/authors/search?${params}`);
        if (response.success && response.data) {
          const transformedAuthors = response.data.map((apiAuthor: any) => ({
            id: apiAuthor.id,
            name: apiAuthor.name,
            email: apiAuthor.email,
            avatarUrl: apiAuthor.avatar_url || getAvatarUrl(apiAuthor.name),
            bio: apiAuthor.bio,
            postsCount: apiAuthor.posts_count || 0,
            firstPostDate: apiAuthor.first_post_date,
            lastPostDate: apiAuthor.last_post_date,
            totalViews: apiAuthor.total_views || 0,
            totalLikes: apiAuthor.total_likes || 0,
            color: this.generateColorFromString(apiAuthor.name), // Generate a consistent color
          }));
          return { success: true, data: transformedAuthors };
        }
        return response;
      } else {
        // Mock authors data
        const mockAuthors = [
          {
            id: '1',
            name: 'John Doe',
            email: 'john@example.com',
            avatarUrl: getAvatarUrl('John Doe'),
            bio: 'Senior Developer',
            postsCount: 15,
            firstPostDate: '2024-01-01',
            lastPostDate: '2024-12-01',
            totalViews: 1500,
            totalLikes: 200,
            color: '#3b82f6',
          },
          {
            id: '2',
            name: 'Jane Smith',
            email: 'jane@example.com',
            avatarUrl: getAvatarUrl('Jane Smith'),
            bio: 'Tech Lead',
            postsCount: 23,
            firstPostDate: '2024-01-15',
            lastPostDate: '2024-12-05',
            totalViews: 2300,
            totalLikes: 350,
            color: '#10b981',
          }
        ].filter(author => 
          author.postsCount >= minPosts && 
          (!query || author.name.toLowerCase().includes(query.toLowerCase()))
        ).slice(0, limit);
        
        return { success: true, data: mockAuthors };
      }
    } catch (error) {
      console.error('Search authors failed:', error);
      return { success: false, error: 'Failed to search authors' };
    }
  }

  async getTopAuthors(limit: number = 20, sortBy: 'posts' | 'views' | 'likes' = 'posts'): Promise<ApiResponse<any[]>> {
    try {
      if (USE_REAL_API) {
        const response = await this.apiCall<any[]>(`/authors/top?limit=${limit}&sort_by=${sortBy}`);
        if (response.success && response.data) {
          const transformedAuthors = response.data.map((apiAuthor: any) => ({
            id: apiAuthor.id,
            name: apiAuthor.name,
            email: apiAuthor.email,
            avatarUrl: apiAuthor.avatar_url || getAvatarUrl(apiAuthor.name),
            bio: apiAuthor.bio,
            postsCount: apiAuthor.posts_count || 0,
            firstPostDate: apiAuthor.first_post_date,
            lastPostDate: apiAuthor.last_post_date,
            totalViews: apiAuthor.total_views || 0,
            totalLikes: apiAuthor.total_likes || 0,
            color: this.generateColorFromString(apiAuthor.name),
          }));
          return { success: true, data: transformedAuthors };
        }
        return response;
      } else {
        // Mock top authors
        const mockAuthors = [
          {
            id: '1',
            name: 'Alice Johnson',
            email: 'alice@example.com',
            avatarUrl: getAvatarUrl('Alice Johnson'),
            bio: 'DevOps Engineer with 8+ years experience',
            postsCount: 45,
            firstPostDate: '2023-01-01',
            lastPostDate: '2024-12-01',
            totalViews: 4500,
            totalLikes: 780,
            color: '#8b5cf6',
          },
          {
            id: '2',
            name: 'Bob Wilson',
            email: 'bob@example.com',
            avatarUrl: getAvatarUrl('Bob Wilson'),
            bio: 'Full Stack Developer',
            postsCount: 38,
            firstPostDate: '2023-03-15',
            lastPostDate: '2024-11-28',
            totalViews: 3800,
            totalLikes: 620,
            color: '#f59e0b',
          },
          {
            id: '3',
            name: 'Carol Davis',
            email: 'carol@example.com',
            avatarUrl: getAvatarUrl('Carol Davis'),
            bio: 'Data Scientist & ML Engineer',
            postsCount: 32,
            firstPostDate: '2023-05-10',
            lastPostDate: '2024-12-03',
            totalViews: 3200,
            totalLikes: 540,
            color: '#ef4444',
          },
          {
            id: '4',
            name: 'David Brown',
            email: 'david@example.com',
            avatarUrl: getAvatarUrl('David Brown'),
            bio: 'Frontend Architect',
            postsCount: 28,
            firstPostDate: '2023-02-20',
            lastPostDate: '2024-11-30',
            totalViews: 2800,
            totalLikes: 460,
            color: '#06b6d4',
          },
          {
            id: '5',
            name: 'Eva Martinez',
            email: 'eva@example.com',
            avatarUrl: getAvatarUrl('Eva Martinez'),
            bio: 'Backend Engineer & API Specialist',
            postsCount: 25,
            firstPostDate: '2023-04-05',
            lastPostDate: '2024-12-02',
            totalViews: 2500,
            totalLikes: 420,
            color: '#84cc16',
          }
        ];

        // Sort by the specified criteria
        mockAuthors.sort((a, b) => {
          switch (sortBy) {
            case 'views':
              return b.totalViews - a.totalViews;
            case 'likes':
              return b.totalLikes - a.totalLikes;
            default:
              return b.postsCount - a.postsCount;
          }
        });

        return { success: true, data: mockAuthors.slice(0, limit) };
      }
    } catch (error) {
      console.error('Get top authors failed:', error);
      return { success: false, error: 'Failed to load top authors' };
    }
  }

  async getAuthorDetails(authorId: string): Promise<ApiResponse<any>> {
    try {
      if (USE_REAL_API) {
        const response = await this.apiCall<any>(`/authors/${authorId}`);
        if (response.success && response.data) {
          const transformedAuthor = {
            id: response.data.id,
            name: response.data.name,
            email: response.data.email,
            avatarUrl: response.data.avatar_url || getAvatarUrl(response.data.name),
            bio: response.data.bio,
            postsCount: response.data.posts_count || 0,
            firstPostDate: response.data.first_post_date,
            lastPostDate: response.data.last_post_date,
            totalViews: response.data.total_views || 0,
            totalLikes: response.data.total_likes || 0,
            color: this.generateColorFromString(response.data.name),
          };
          return { success: true, data: transformedAuthor };
        }
        return response;
      } else {
        // Mock author detail
        const mockAuthor = {
          id: authorId,
          name: 'Mock Author',
          email: 'mock@example.com',
          avatarUrl: getAvatarUrl('Mock Author'),
          bio: 'Mock bio for testing',
          postsCount: 10,
          firstPostDate: '2024-01-01',
          lastPostDate: '2024-12-01',
          totalViews: 1000,
          totalLikes: 150,
          color: '#3b82f6',
        };
        return { success: true, data: mockAuthor };
      }
    } catch (error) {
      console.error('Get author details failed:', error);
      return { success: false, error: 'Failed to load author details' };
    }
  }

  async getAuthorPosts(authorId: string, page: number = 1, limit: number = 10): Promise<ApiResponse<{ posts: Post[]; total: number }>> {
    try {
      if (USE_REAL_API) {
        const offset = (page - 1) * limit;
        const response = await this.apiCall<any>(`/authors/${authorId}/posts?limit=${limit}&offset=${offset}`);
        if (response.success && response.data) {
          const transformedPosts = response.data.posts.map((apiPost: any) => this.transformApiPostToUIPost(apiPost));
          return { 
            success: true, 
            data: {
              posts: transformedPosts,
              total: response.data.total || transformedPosts.length
            }
          };
        }
        return response;
      } else {
        // Mock posts by author
        const mockPosts = await this.getPosts({ page, limit });
        return { 
          success: true, 
          data: {
            posts: Array.isArray(mockPosts.data) ? mockPosts.data.slice(0, 5) : [],
            total: 5
          }
        };
      }
    } catch (error) {
      console.error('Get author posts failed:', error);
      return { success: false, error: 'Failed to load author posts' };
    }
  }

  // Helper method to generate consistent colors from strings
  private generateColorFromString(str: string): string {
    const colors = [
      '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
      '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  // Comments APIs
  async getComments(postId: string): Promise<ApiResponse<Comment[]>> {
    try {
      if (USE_REAL_API) {
        const response = await this.apiCall<any[]>(`/comments/post/${postId}`);

        if (!response.success) {
          return { success: false, error: response.error };
        }

        // Transform API comments to frontend format
        const comments: Comment[] = response.data!.map((apiComment: any) => ({
          id: apiComment.id,
          content: apiComment.content,
          author_id: apiComment.author_id,
          author_name: apiComment.author_name,
          author_username: apiComment.author_username,
          post_id: apiComment.post_id,
          parent_id: apiComment.parent_id,
          like_count: apiComment.like_count || 0,
          created_at: apiComment.created_at
        }));

        return { success: true, data: comments };
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
        const response = await this.apiCall<any>(
          '/comments/',
          'POST',
          {
            post_id: postId,
            content,
            parent_id: parentId
          }
        );

        if (!response.success) {
          return { success: false, error: response.error };
        }

        const apiComment = response.data!;
        
        // Transform API comment to frontend format
        const newComment: Comment = {
          id: apiComment.id,
          content: apiComment.content,
          author_id: apiComment.author_id,
          author_name: apiComment.author_name,
          author_username: apiComment.author_username,
          post_id: apiComment.post_id,
          parent_id: apiComment.parent_id,
          like_count: apiComment.like_count || 0,
          created_at: apiComment.created_at
        };
        return { success: true, data: newComment };
      } else {
        const newComment: Comment = {
          id: `comment-${Date.now()}`,
          content,
          author_id: authMeData.data.id,
          author_name: authMeData.data.displayName,
          author_username: authMeData.data.username,
          post_id: postId,
          parent_id: parentId,
          like_count: 0,
          created_at: new Date().toISOString()
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
          // Store token
          const token = response.data.access_token;
          localStorage.setItem(TOKEN_STORAGE_KEY, token);
          
          // Get full user data using the new /me endpoint
          const userResponse = await this.getCurrentUser();
          if (userResponse.success && userResponse.data) {
            const { token: userToken, ...user } = userResponse.data;
            return {
              success: true,
              data: {
                token,
                user,
              },
            };
          }
          
          // Fallback - decode JWT to get basic user info
          const tokenPayload = this.parseJwtPayload(token);
          const user: User = {
            id: tokenPayload.user_id || 'user',
            username: tokenPayload.username || username,
            displayName: tokenPayload.display_name || tokenPayload.username || username,
            email: tokenPayload.email || `${username}@docverse.local`,
            avatar: getAvatarUrl(tokenPayload.email || username, 100),
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
              token,
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

  // Event tracking APIs
  async logViewEvent(postId: string, metadata?: Record<string, any>): Promise<ApiResponse<boolean>> {
    try {
      if (USE_REAL_API) {
        const response = await this.apiCall<any>('/events/view', 'POST', {
          post_id: postId,
          metadata
        });
        return { success: response.success, data: response.success };
      } else {
        // Mock implementation - just log to console in development
        console.log('Mock view event logged:', { postId, metadata });
        return { success: true, data: true };
      }
    } catch (error) {
      console.error('Log view event failed:', error);
      return { success: false, error: 'Failed to log view event' };
    }
  }

  async logEvent(eventTypeId: string, targetType?: string, targetId?: string, metadata?: Record<string, any>): Promise<ApiResponse<boolean>> {
    try {
      if (USE_REAL_API) {
        const response = await this.apiCall<any>('/events/log', 'POST', {
          event_type_id: eventTypeId,
          target_type: targetType,
          target_id: targetId,
          metadata
        });
        return { success: response.success, data: response.success };
      } else {
        // Mock implementation - just log to console in development
        console.log('Mock event logged:', { eventTypeId, targetType, targetId, metadata });
        return { success: true, data: true };
      }
    } catch (error) {
      console.error('Log event failed:', error);
      return { success: false, error: 'Failed to log event' };
    }
  }

  async getEventTypes(category?: string): Promise<ApiResponse<any[]>> {
    try {
      if (USE_REAL_API) {
        const endpoint = category ? `/events/types?category=${encodeURIComponent(category)}` : '/events/types';
        return await this.apiCall<any[]>(endpoint);
      } else {
        // Mock event types
        const mockEventTypes = [
          { id: 'event-view', name: 'view', description: 'Content view', category: 'engagement', icon: '👁️', color: '#95A5A6' },
          { id: 'event-share', name: 'share', description: 'Content share', category: 'engagement', icon: '📤', color: '#3498DB' },
          { id: 'event-heart', name: 'heart', description: 'Heart reaction', category: 'reaction', icon: '❤️', color: '#E74C3C' }
        ];
        const filtered = category ? mockEventTypes.filter(et => et.category === category) : mockEventTypes;
        return { success: true, data: filtered };
      }
    } catch (error) {
      console.error('Get event types failed:', error);
      return { success: false, error: 'Failed to get event types' };
    }
  }

  // Search API methods
  async getSearchConfig(): Promise<ApiResponse<any>> {
    try {
      return await this.apiCall<any>('/search/config');
    } catch (error) {
      console.error('Failed to get search config:', error);
      return { success: false, error: 'Failed to get search configuration' };
    }
  }

  async search(filters: {
    query: string;
    limit?: number;
    threshold?: number;
    post_types?: string[];
  }): Promise<ApiResponse<any[]>> {
    try {
      const params = new URLSearchParams();
      params.append('q', filters.query);
      
      if (filters.limit) {
        params.append('limit', filters.limit.toString());
      }
      
      if (filters.threshold) {
        params.append('threshold', filters.threshold.toString());
      }
      
      if (filters.post_types && filters.post_types.length > 0) {
        params.append('post_types', filters.post_types.join(','));
      }

      return await this.apiCall<any[]>(`/search/semantic?${params.toString()}`);
    } catch (error) {
      console.error('Search failed:', error);
      return { success: false, error: 'Search failed' };
    }
  }

  async triggerIndexing(forceReindex = false, postTypes?: string[]): Promise<ApiResponse<{
    message: string;
    posts_count: number;
    trigger_id: string | null;
    status: string;
  }>> {
    try {
      const payload = {
        force_reindex: forceReindex,
        post_types: postTypes
      };

      return await this.apiCall(`/search/index`, 'POST', payload);
    } catch (error) {
      console.error('Indexing failed:', error);
      return { success: false, error: 'Failed to trigger indexing' };
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
