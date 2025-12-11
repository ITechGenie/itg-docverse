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

import {getAvatarUrl} from '@/lib/avatar';

// Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE || '/apis';
const TOKEN_STORAGE_KEY = 'itg_docverse_token';
const USER_STORAGE_KEY = 'itg_docverse_user';

export class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
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

  // Generic API call method
  private async apiCall<T>(endpoint: string, method: string = 'GET', data?: any): Promise<ApiResponse<T>> {
    try {
      console.debug(`API call: ${method} ${endpoint}`, data);
      // Ensure we have a valid token for API calls
      const authResult = await this.ensureAuthenticated();
      if (!authResult.success) {
        return { success: false, error: authResult.error || 'Authentication failed' };
      }

      const config: any = {
        method,
        url: endpoint,
      };

      if (data) {
        config.data = data;
      }

      const response = await this.client(config);
      
      // Handle different response formats from the API
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
      const token = localStorage.getItem(TOKEN_STORAGE_KEY);
      
      // First, check if we have cached user data in localStorage
      const cachedUserData = localStorage.getItem(USER_STORAGE_KEY);
      if (cachedUserData && token) {
        try {
          const user = JSON.parse(cachedUserData);
          return { success: true, data: { ...user, token } };
        } catch (error) {
          // Invalid cached data, remove it
          localStorage.removeItem(USER_STORAGE_KEY);
        }
      }

      // If no cached data, use token to call /users/me API
      if (token) {
        try {
          const response = await this.apiCall<any>(`/users/me`, 'GET');
          
          if (response.success && response.data) {
            const user: User = {
              id: response.data.id,
              username: response.data.username,
              displayName: response.data.display_name || response.data.username,
              email: response.data.email || `${response.data.username}@itgdocverse.com`,
              bio: response.data.bio || '',
              location: response.data.location || '',
              website: response.data.website || '',
              avatar: response.data.avatar_url || getAvatarUrl(response.data.username, 100),
              joinedDate: response.data.created_at || new Date().toISOString(),
              roles: response.data.roles || [],
              mentionsCount: response.data.mentions ?? 0,
              stats: {
                postsCount: response.data.post_count || 0,
                commentsCount: response.data.comment_count || 0,
                reactionsCount: response.data.reactions_count || 0,
                tagsFollowed: 0,
                mentions: response.data.mentions || 0,
              },
            };
            
            // Cache the user data in localStorage
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
            return { success: true, data: { ...user, token } };
          }
          
          return { success: false, error: 'Failed to get user data from API' };
        } catch (error: any) {
          // If API call fails, token might be invalid
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          localStorage.removeItem(USER_STORAGE_KEY);
          return { success: false, error: 'Authentication failed' };
        }
      }

      return { success: false, error: 'No authentication token found' };
    } catch (error) {
      console.error('Get current user failed:', error);
      return { success: false, error: 'Failed to get user information' };
    }
  }


  async getUsers(params: { skip?: number; limit?: number } = {}): Promise<ApiResponse<User[]>> {
    try {
      const searchParams = new URLSearchParams();
      if (params.skip !== undefined) {
        searchParams.append('skip', String(params.skip));
      }
      if (params.limit !== undefined) {
        searchParams.append('limit', String(params.limit));
      }
      
      const query = searchParams.toString();
      const endpoint = query ? `/users/?${query}` : '/users/';
      const response = await this.apiCall<any[]>(endpoint, 'GET');
      
      if (response.success && response.data) {
        // Transform backend user data to frontend User type
        const users: User[] = response.data.map((backendUser: any) => ({
          id: backendUser.id,
          username: backendUser.username,
          displayName: backendUser.display_name,
          email: `${backendUser.username}@itgdocverse.com`, // Email not exposed in public API
          bio: backendUser.bio || '',
          location: backendUser.location || '',
          website: backendUser.website || '',
          avatar: backendUser.avatar_url || getAvatarUrl(backendUser.username, 100),
          joinedDate: backendUser.created_at,
          roles: backendUser.roles || [],
          isVerified: backendUser.is_verified || false,
          stats: {
            postsCount: backendUser.post_count || 0,
            commentsCount: backendUser.comment_count || 0,
            reactionsCount: backendUser.reactions_count || 0,
            tagsFollowed: 0, // Not available in backend yet
          },
        }));
        return { success: true, data: users };
      }
      return response;
    } catch (error) {
      console.error('Get users failed:', error);
      return { success: false, error: 'Failed to get users' };
    }
  }

  async searchUsers(query: string): Promise<ApiResponse<User[]>> {
    try {
      const searchParams = new URLSearchParams();
      searchParams.append('query', query);
      searchParams.append('limit', '10'); // Limit search results
      
      const endpoint = `/users/search?${searchParams.toString()}`;
      const response = await this.apiCall<any[]>(endpoint, 'GET');
      
      if (response.success && response.data) {
        // Transform backend user data to frontend User type
        const users: User[] = response.data.map((backendUser: any) => ({
          id: backendUser.id,
          username: backendUser.username,
          displayName: backendUser.display_name,
          email: `${backendUser.username}@itgdocverse.com`,
          bio: backendUser.bio || '',
          location: backendUser.location || '',
          website: backendUser.website || '',
          avatar: backendUser.avatar_url || getAvatarUrl(backendUser.username, 100),
          joinedDate: backendUser.created_at,
          roles: backendUser.roles || [],
          isVerified: backendUser.is_verified || false,
          stats: {
            postsCount: backendUser.post_count || 0,
            commentsCount: backendUser.comment_count || 0,
            reactionsCount: backendUser.reactions_count || 0,
            tagsFollowed: 0,
          },
        }));
        return { success: true, data: users };
      }
      return response;
    } catch (error) {
      console.error('Search users failed:', error);
      return { success: false, error: 'Failed to search users' };
    }
  }

  async getUserByUsername(username: string): Promise<ApiResponse<User>> {
    try {
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
            reactionsCount: backendUser.reactions_count || 0,
            tagsFollowed: 0, // Not available in backend yet
          },
        };
        return { success: true, data: user };
      }
      return response;
    } catch (error) {
      console.error('Get user by username failed:', error);
      return { success: false, error: 'Failed to get user by username' };
    }
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<ApiResponse<User>> {
    try {
      const payload: any = {
        display_name: updates.displayName,
        bio: updates.bio,
        location: updates.location,
        website: updates.website,
      };

      const response = await this.apiCall<any>(`/users/${userId}`, 'POST', payload);
      if (response.success && response.data) {
        // Normalize to frontend User shape if possible
        const backendUser = response.data;
        const user: User = {
          id: backendUser.id,
          username: backendUser.username,
          displayName: backendUser.display_name || backendUser.username,
          email: backendUser.email || `${backendUser.username}@itgdocverse.com`,
          bio: backendUser.bio || '',
          location: backendUser.location || '',
          website: backendUser.website || '',
          avatar: backendUser.avatar_url || getAvatarUrl(backendUser.username, 100),
          joinedDate: backendUser.created_at || new Date().toISOString(),
          roles: backendUser.roles || [],
          stats: {
            postsCount: backendUser.post_count || 0,
            commentsCount: backendUser.comment_count || 0,
            reactionsCount: backendUser.reactions_count || 0,
            tagsFollowed: 0,
          },
        };
        return { success: true, data: user };
      }
      return response;
    } catch (error) {
      console.error('Update user failed:', error);
      return { success: false, error: 'Failed to update user' };
    }
  }

  async getRoleTypes(): Promise<ApiResponse<any[]>> {
    try {
      const response = await this.apiCall<any[]>('/users/roles', 'GET');
      if (response.success && response.data) {
        return { success: true, data: response.data };
      }
      return response;
    } catch (error) {
      console.error('Get role types failed:', error);
      return { success: false, error: 'Failed to get role types' };
    }
  }

  async updateUserRoles(userId: string, roles: string[]): Promise<ApiResponse<User>> {
    try {
      const response = await this.apiCall<any>(`/users/${userId}/roles`, 'POST', { roles });
      if (response.success && response.data) {
        // Normalize to User type minimally
        const backendUser = response.data;
        const user: User = {
          id: backendUser.id,
          username: backendUser.username,
          displayName: backendUser.display_name || backendUser.username,
          email: backendUser.email || `${backendUser.username}@itgdocverse.com`,
          bio: backendUser.bio || '',
          location: backendUser.location || '',
          website: backendUser.website || '',
          avatar: backendUser.avatar_url || getAvatarUrl(backendUser.username, 100),
          joinedDate: backendUser.created_at || new Date().toISOString(),
          roles: backendUser.roles || [],
          stats: {
            postsCount: backendUser.post_count || 0,
            commentsCount: backendUser.comment_count || 0,
            reactionsCount: backendUser.reactions_count || 0,
            tagsFollowed: 0,
          },
        };
        return { success: true, data: user };
      }
      return response;
    } catch (error) {
      console.error('Update user roles failed:', error);
      return { success: false, error: 'Failed to update user roles' };
    }
  }

  // Posts APIs
  async getPosts(params: PaginationParams & FeedFilters = { page: 1, limit: 10 }): Promise<ApiResponse<Post[]>> {
    try {
      const searchParams = new URLSearchParams();
      
      // Map UI params to API params
      if (params.page && params.limit) {
        const skip = (params.page - 1) * params.limit;
        searchParams.append('skip', String(skip));
        searchParams.append('limit', String(params.limit));
      }
      
      if (params.type && params.type !== 'all') {
        searchParams.append('post_type', params.type);
      }
      
      if (params.tag_id) {
        searchParams.append('tag_id', params.tag_id);
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

      if (params.trending) {
        searchParams.append('trending', 'true');
      }

      if (params.timeframe && params.timeframe !== 'all') {
        searchParams.append('timeframe', params.timeframe);
      }

      if (params.status) {
        searchParams.append('status', params.status);
      }

      const endpoint = `/posts/${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
      const response = await this.apiCall<any[]>(endpoint);
      
      if (response.success && response.data) {
        // Transform API response to match UI expectations
        const transformedPosts = response.data.map(apiPost => this.transformApiPostToUIPost(apiPost));
        return { success: true, data: transformedPosts };
      }
      
      return response;
    } catch (error) {
      console.error('Get posts failed:', error);
      return { success: false, error: 'Failed to load posts' };
    }
  }

  // Transform API post format to UI post format
  private transformApiPostToUIPost(apiPost: any): Post {
    return {
      id: apiPost.id,
      type: apiPost.post_type as 'block-diagram' | 'code-snippet' | 'discussion' | 'llm-long' | 'llm-short' | 'posts' | 'thoughts',
      title: apiPost.title,
      content: apiPost.content,
      feed_content: apiPost.content, // API doesn't have separate feed content yet
      coverImage: apiPost.cover_image || undefined,
      author: {
        id: apiPost.author_id,
        username: apiPost.author_username,
        displayName: apiPost.author_name,
        email: apiPost.author_email,
        avatar: getAvatarUrl(apiPost.author_username, 100),
        joinedDate: new Date().toISOString(),
        stats: {
          postsCount: 0,
          commentsCount: 0,
          reactionsCount: 0,
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
      revision: apiPost.revision, // Use actual revision from API
    };
  }

  async getPost(id: string): Promise<ApiResponse<Post>> {
    try {
      const response = await this.apiCall<any>(`/posts/${id}`);
      if (response.success) {
        const transformedPost = this.transformApiPostToUIPost(response.data);
        return { success: true, data: transformedPost };
      }
      return response;
    } catch (error) {
      console.error('Get post failed:', error);
      return { success: false, error: 'Failed to load post' };
    }
  }

  async getPostVersion(id: string, _version: number): Promise<ApiResponse<Post>> {
    try {
      // API doesn't support versions yet, just return the current post
      return await this.getPost(id);
    } catch (error) {
      console.error('Get post version failed:', error);
      return { success: false, error: 'Failed to load post version' };
    }
  }

  async createPost(data: CreatePostData): Promise<ApiResponse<Post>> {
    try {
      // Transform UI data to API format
      const apiData = {
        title: data.title || undefined,
        content: data.content || '',
        post_type: data.type || 'posts',
        tags: data.tags || [],
        status: data.status || 'draft',
        mentioned_user_ids: data.mentioned_user_ids || []
      };

      const response = await this.apiCall<any>('/posts/', 'POST', apiData);
      if (response.success) {
        const transformedPost = this.transformApiPostToUIPost(response.data);
        return { success: true, data: transformedPost };
      }
      return response;
    } catch (error) {
      console.error('Create post failed:', error);
      return { success: false, error: 'Failed to create post' };
    }
  }

  async updatePost(postId: string, data: Partial<CreatePostData>): Promise<ApiResponse<Post>> {
    try {
      // Transform UI data to API format
      const apiData: any = {};
      if (data.title !== undefined) apiData.title = data.title || undefined;
      if (data.content !== undefined) apiData.content = data.content || '';
      if (data.type !== undefined) apiData.post_type = data.type;
      if (data.tags !== undefined) apiData.tags = data.tags || [];
      if (data.coverImage !== undefined) apiData.cover_image_url = data.coverImage;
      if (data.status !== undefined) apiData.status = data.status; 
      if (data.mentioned_user_ids !== undefined) apiData.mentioned_user_ids = data.mentioned_user_ids;

      const response = await this.apiCall<any>(`/posts/${postId}`, 'POST', apiData);
      if (response.success) {
        const transformedPost = this.transformApiPostToUIPost(response.data);
        return { success: true, data: transformedPost };
      }
      return response;
    } catch (error) {
      console.error('Update post failed:', error);
      return { success: false, error: 'Failed to update post' };
    }
  }

  // Reaction APIs
  async toggleReaction(targetId: string, reactionType: ReactionType, targetType: string = 'post'): Promise<ApiResponse<boolean>> {
    console.log(`Toggling reaction: ${reactionType} on ${targetType} ${targetId}`);
    try {
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
            'POST',
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
    } catch (error) {
      console.error('Toggle reaction failed:', error);
      return { success: false, error: 'Failed to toggle reaction' };
    }
  }

  async getReactions(targetId: string, targetType: string = 'post'): Promise<ApiResponse<any[]>> {
    try {
      const endpoint = `/reactions/${targetType}/${targetId}`;
      return await this.apiCall<any[]>(endpoint);
    } catch (error) {
      console.error('Get reactions failed:', error);
      return { success: false, error: 'Failed to get reactions' };
    }
  }

  // Keep the old method for backward compatibility
  async getPostReactions(postId: string): Promise<ApiResponse<any[]>> {
    return this.getReactions(postId, 'post');
  }

  // Analytics APIs
  async getPostAnalytics(postId: string): Promise<ApiResponse<{
    user_analytics: Array<{
      user_id: string;
      user_name: string;
      display_name: string;
      views: number;
      reactions: number;
      comments: number;
    }>;
    total_views: number;
    total_reactions: number;
    total_comments: number;
  }>> {
    try {
      const endpoint = `/posts/${postId}/analytics`;
      return await this.apiCall(endpoint);
    } catch (error) {
      console.error('Get post analytics failed:', error);
      return { success: false, error: 'Failed to get post analytics' };
    }
  }

  async getUserAnalytics(userId: string): Promise<ApiResponse<{
    total_interactions: number;
    posts_interacted: Array<{
      post_id: string;
      post_title: string;
      views: number;
      reactions: number;
      comments: number;
      last_interaction: string;
    }>;
  }>> {
    try {
      const endpoint = `/users/${userId}/analytics`;
      return await this.apiCall(endpoint);
    } catch (error) {
      console.error('Get user analytics failed:', error);
      return { success: false, error: 'Failed to get user analytics' };
    }
  }

  async getPostSummary(postId: string): Promise<ApiResponse<{
    total_views: number;
    total_reactions: number;
    total_comments: number;
  }>> {
    try {
      const endpoint = `/posts/${postId}/summary`;
      return await this.apiCall(endpoint);
    } catch (error) {
      console.error('Get post summary failed:', error);
      return { success: false, error: 'Failed to get post summary' };
    }
  }

  async toggleFavorite(_postId: string): Promise<ApiResponse<boolean>> {
    try {
      // API doesn't support favorites yet, return mock success
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
    } catch (error) {
      console.error('Get tags failed:', error);
      return { success: false, error: 'Failed to load tags' };
    }
  }

  async searchTags(query: string, limit: number = 10): Promise<ApiResponse<Tag[]>> {
    try {
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
    } catch (error) {
      console.error('Search tags failed:', error);
      return { success: false, error: 'Failed to search tags' };
    }
  }

  async getPopularTags(limit: number = 20): Promise<ApiResponse<Tag[]>> {
    try {
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
    } catch (error) {
      console.error('Get popular tags failed:', error);
      return { success: false, error: 'Failed to load popular tags' };
    }
  }

  async createTag(tagData: { name: string; description?: string; color?: string; category?: string }): Promise<ApiResponse<Tag>> {
    try {
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
    } catch (error) {
      console.error('Create tag failed:', error);
      return { success: false, error: 'Failed to create tag' };
    }
  }

  async updateTag(tagId: string, tagData: { name?: string; description?: string; color?: string; category?: string }): Promise<ApiResponse<Tag>> {
    try {
      const response = await this.apiCall<any>(`/tags/${tagId}`, 'POST', tagData);
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
    } catch (error) {
      console.error('Update tag failed:', error);
      return { success: false, error: 'Failed to update tag' };
    }
  }

  async deleteTag(tagId: string): Promise<ApiResponse<{ message: string }>> {
    try {
      const response = await this.apiCall<{ message: string }>(`/tags/${tagId}`, 'POST');
      return response;
    } catch (error) {
      console.error('Delete tag failed:', error);
      return { success: false, error: 'Failed to delete tag' };
    }
  }

  async getUserFavoriteTags(): Promise<ApiResponse<string[]>> {
    try {
      const response = await this.apiCall<any>('/reactions/favorites/tags');
      if (response.success && response.data) {
        return { success: true, data: response.data.tag_ids || [] };
      }
      return response;
    } catch (error) {
      console.error('Get user favorite tags failed:', error);
      return { success: false, error: 'Failed to load favorite tags' };
    }
  }

  async getPostsByTag(tagId: string, page: number = 1, limit: number = 10): Promise<ApiResponse<{ posts: Post[]; pagination: any; tag: any }>> {
    try {
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
    } catch (error) {
      console.error('Get posts by tag failed:', error);
      return { success: false, error: 'Failed to load posts by tag' };
    }
  }

  // Comments APIs
  async getComments(postId: string): Promise<ApiResponse<Comment[]>> {
    try {
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
    } catch (error) {
      console.error('Get comments failed:', error);
      return { success: false, error: 'Failed to load comments' };
    }
  }

  async createComment(postId: string, content: string, parentId?: string, mentioned_user_ids?: string[]): Promise<ApiResponse<Comment>> {
    try {
      const response = await this.apiCall<any>(
        '/comments/',
        'POST',
        {
          post_id: postId,
          content,
          parent_id: parentId,
          mentioned_user_ids: mentioned_user_ids || []
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
    } catch (error) {
      console.error('Create comment failed:', error);
      return { success: false, error: 'Failed to create comment' };
    }
  }

  async getRecentComments(skip: number = 0, limit: number = 15): Promise<ApiResponse<Comment[]>> {
    try {
      const response = await this.apiCall<any[]>(`/comments/?skip=${skip}&limit=${limit}`);

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
        is_edited: apiComment.is_edited || false,
        created_at: apiComment.created_at,
        updated_at: apiComment.updated_at,
        post_title: apiComment.post_title
      }));

      return { success: true, data: comments };
    } catch (error) {
      console.error('Get recent comments failed:', error);
      return { success: false, error: 'Failed to load recent comments' };
    }
  }

  // Search APIs
  async searchPosts(query: string): Promise<ApiResponse<Post[]>> {
    try {
      const response = await this.apiCall<any[]>(`/posts/search/?q=${encodeURIComponent(query)}`);
      if (response.success && response.data) {
        const transformedPosts = response.data.map(apiPost => this.transformApiPostToUIPost(apiPost));
        return { success: true, data: transformedPosts };
      }
      return response;
    } catch (error) {
      console.error('Search posts failed:', error);
      return { success: false, error: 'Failed to search posts' };
    }
  }

  // Authentication APIs
  async login(username: string, password: string): Promise<ApiResponse<{ token: string; user: User }>> {
    try {
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
          // User data is already cached by getCurrentUser method
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
          avatar: getAvatarUrl(tokenPayload.username || username, 100),
          joinedDate: new Date().toISOString(),
          stats: {
            postsCount: 0,
            commentsCount: 0,
            reactionsCount: 0,
            tagsFollowed: 0,
          },
        };

        // Cache the fallback user data
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));

        return {
          success: true,
          data: {
            token,
            user,
          },
        };
      }
      return { success: false, error: 'Invalid response from server' };
    } catch (error: any) {
      console.error('Login failed:', error);
      const errorMessage = error.response?.data?.detail || 'Login failed';
      return { success: false, error: errorMessage };
    }
  }

  // Event tracking APIs
  async logViewEvent(postId: string, metadata?: Record<string, any>): Promise<ApiResponse<boolean>> {
    try {
      const response = await this.apiCall<any>('/events/view', 'POST', {
        post_id: postId,
        metadata
      });
      return { success: response.success, data: response.success };
    } catch (error) {
      console.error('Log view event failed:', error);
      return { success: false, error: 'Failed to log view event' };
    }
  }

  async logEvent(eventTypeId: string, targetType?: string, targetId?: string, metadata?: Record<string, any>): Promise<ApiResponse<boolean>> {
    try {
      const response = await this.apiCall<any>('/events/log', 'POST', {
        event_type_id: eventTypeId,
        target_type: targetType,
        target_id: targetId,
        metadata
      });
      return { success: response.success, data: response.success };
    } catch (error) {
      console.error('Log event failed:', error);
      return { success: false, error: 'Failed to log event' };
    }
  }

  async getEventTypes(category?: string): Promise<ApiResponse<any[]>> {
    try {
      const endpoint = category ? `/events/types?category=${encodeURIComponent(category)}` : '/events/types';
      return await this.apiCall<any[]>(endpoint);
    } catch (error) {
      console.error('Get event types failed:', error);
      return { success: false, error: 'Failed to get event types' };
    }
  }

  async getNotifications(params?: { days?: number; limit?: number }): Promise<ApiResponse<any[]>> {
    try {
      const searchParams = new URLSearchParams();
      if (params?.days !== undefined) searchParams.append('days', String(params.days));
      if (params?.limit !== undefined) searchParams.append('limit', String(params.limit));
      const query = searchParams.toString();
      const endpoint = query ? `/events/notifications?${query}` : '/events/notifications';
      return await this.apiCall<any[]>(endpoint, 'GET');
    } catch (error) {
      console.error('Get notifications failed:', error);
      return { success: false, error: 'Failed to get notifications' };
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

  // Clear cached user data (useful for logout)
  clearUserCache(): void {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  }

  // Force refresh user data from API (clears cache first)
  async refreshUserData(): Promise<ApiResponse<User & { token?: string }>> {
    // Clear cached user data first
    localStorage.removeItem(USER_STORAGE_KEY);
    // Then call getCurrentUser which will fetch fresh data
    return this.getCurrentUser();
  }

  async getTopAuthors(limit: number = 20, sortBy: 'posts' | 'views' | 'likes' = 'posts'): Promise<ApiResponse<any[]>> {
    try {
        const response = await this.apiCall<any[]>(`/authors/top?limit=${limit}&sort_by=${sortBy}`);
        if (response.success && response.data) {
          const transformedAuthors = response.data.map((apiAuthor: any) => ({
            id: apiAuthor.id,
            name: apiAuthor.name,
            username: apiAuthor.username,
            email: apiAuthor.email,
            avatarUrl: apiAuthor.avatar_url || getAvatarUrl(apiAuthor.username || apiAuthor.email),
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
       
    } catch (error) {
      console.error('Get top authors failed:', error);
      return { success: false, error: 'Failed to load top authors' };
    }
  }

  // ============================================
  // FILE UPLOAD OPERATIONS
  // ============================================

  async uploadImage(formData: FormData): Promise<ApiResponse<{
    id: string;
    filename: string;
    title: string;
    url: string;
    content_type: string;
    file_size: number;
    visibility: string;
    tags: string[];
  }>> {
    try {
      // Use direct axios call for file upload to handle FormData properly
      const token = localStorage.getItem(TOKEN_STORAGE_KEY);
      const response = await this.client.post('/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });
      
      return { success: true, data: response.data };
    } catch (error: any) {
      console.error('Image upload failed:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Upload failed';
      return { success: false, error: errorMessage };
    }
  }

  async getMyImages(params?: {
    visibility?: string;
    tags?: string;
    search?: string;
    sort_by?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<{
    files: Array<{
      id: string;
      filename: string;
      title: string;
      url: string;
      content_type: string;
      file_size: number;
      visibility: string;
      tags: string[];
      created_at: string;
      updated_at: string;
    }>;
    total: number;
    page: number;
    limit: number;
  }>> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.visibility) queryParams.append('visibility', params.visibility);
      if (params?.tags) queryParams.append('tags', params.tags);
      if (params?.search) queryParams.append('search', params.search);
      if (params?.sort_by) queryParams.append('sort_by', params.sort_by);
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.offset) queryParams.append('offset', params.offset.toString());

      const url = `/files/my-images${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      return this.apiCall(url);
    } catch (error) {
      console.error('Get my images failed:', error);
      return { success: false, error: 'Failed to load images' };
    }
  }

  async updateImageMetadata(fileId: string, formData: FormData): Promise<ApiResponse<{ message: string }>> {
    try {
      const token = localStorage.getItem(TOKEN_STORAGE_KEY);
      const response = await this.client.post(`/files/${fileId}/update`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });
      
      return { success: true, data: response.data };
    } catch (error: any) {
      console.error('Update image metadata failed:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Update failed';
      return { success: false, error: errorMessage };
    }
  }

  async deleteImage(fileId: string): Promise<ApiResponse<{ message: string }>> {
    try {
      return this.apiCall(`/files/${fileId}/delete`, 'POST');
    } catch (error) {
      console.error('Delete image failed:', error);
      return { success: false, error: 'Failed to delete image' };
    }
  }

}


// Create and export API client instance
export const api = new ApiClient();
