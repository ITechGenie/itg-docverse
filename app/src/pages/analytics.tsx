import { useState, useEffect, useRef } from 'react';
import { BarChart3, TrendingUp, ExternalLink, Search, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AnalyticsTable } from '@/components/common/analytics-table';
import { api } from '@/services/api-client';
import type { Post, User } from '@/types';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface UserAnalyticsData {
  userId: string;
  total_interactions: number;
  posts_interacted: Array<{
    post_id: string;
    post_title: string;
    views: number;
    reactions: number;
    comments: number;
    last_interaction: string;
  }>;
  loading?: boolean;
  error?: string;
}

interface PostAnalyticsData {
  postId: string;
  total_views: number;
  total_reactions: number;
  total_comments: number;
  user_analytics: Array<{
    user_id: string;
    user_name: string;
    display_name: string;
    views: number;
    reactions: number;
    comments: number;
  }>;
  loading: boolean;
  error?: string;
}

export default function Analytics() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [postAnalytics, setPostAnalytics] = useState<Map<string, PostAnalyticsData>>(new Map());
  const [userAnalytics, setUserAnalytics] = useState<Map<string, UserAnalyticsData>>(new Map());
  
  // User search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const searchUsers = async (query: string) => {
    if (query.length < 4) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    setSearchLoading(true);
    try {
      // TODO: Create searchUsers API endpoint
      const response = await api.searchUsers(query);
      if (response.success && response.data) {
        setSearchResults(response.data);
        setShowSearchDropdown(true);
      }
    } catch (error) {
      console.error('Failed to search users:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setSearchQuery(user.displayName);
    setShowSearchDropdown(false);
    setSearchResults([]);
  };

  const clearUserSelection = () => {
    setSelectedUser(null);
    setSearchQuery('');
    setShowSearchDropdown(false);
    setSearchResults([]);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchUserAnalytics = async (userId: string) => {
    // Set loading state
    setUserAnalytics(prev => new Map(prev.set(userId, {
      userId,
      total_interactions: 0,
      posts_interacted: [],
      loading: true
    })));

    try {
      // TODO: Create this API endpoint in the backend
      const response = await api.getUserAnalytics(userId);
      
      if (response.success && response.data) {
        setUserAnalytics(prev => new Map(prev.set(userId, {
          userId,
          total_interactions: response.data!.total_interactions,
          posts_interacted: response.data!.posts_interacted,
          loading: false
        })));
      } else {
        setUserAnalytics(prev => new Map(prev.set(userId, {
          userId,
          total_interactions: 0,
          posts_interacted: [],
          loading: false,
          error: 'Failed to load user analytics'
        })));
      }
    } catch (err) {
      console.error('Failed to fetch user analytics:', err);
      setUserAnalytics(prev => new Map(prev.set(userId, {
        userId,
        total_interactions: 0,
        posts_interacted: [],
        loading: false,
        error: 'Failed to load user analytics'
      })));
    }
  };

  const fetchPostAnalytics = async (postId: string) => {
    // Set loading state
    setPostAnalytics(prev => new Map(prev.set(postId, {
      postId,
      total_views: 0,
      total_reactions: 0,
      total_comments: 0,
      user_analytics: [],
      loading: true
    })));

    try {
      const response = await api.getPostAnalytics(postId);
      
      if (response.success && response.data) {
        setPostAnalytics(prev => new Map(prev.set(postId, {
          postId,
          total_views: response.data!.total_views,
          total_reactions: response.data!.total_reactions,
          total_comments: response.data!.total_comments,
          user_analytics: response.data!.user_analytics,
          loading: false
        })));
      } else {
        setPostAnalytics(prev => new Map(prev.set(postId, {
          postId,
          total_views: 0,
          total_reactions: 0,
          total_comments: 0,
          user_analytics: [],
          loading: false,
          error: 'Failed to load analytics'
        })));
      }
    } catch (err) {
      console.error('Failed to fetch post analytics:', err);
      setPostAnalytics(prev => new Map(prev.set(postId, {
        postId,
        total_views: 0,
        total_reactions: 0,
        total_comments: 0,
        user_analytics: [],
        loading: false,
        error: 'Failed to load analytics'
      })));
    }
  };

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch all posts for analytics
        const response = await api.getPosts({ 
          page: 1, 
          limit: 100, // Get more posts for analytics
          type: 'all' 
        });
        
        if (response.success && response.data) {
          setPosts(response.data);
        }
      } catch (err) {
        console.error('Failed to fetch posts:', err);
        setError('Failed to load posts for analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  const fetchUsers = async () => {
    if (users.length > 0) return; // Don't fetch if already loaded
    
    try {
      setUsersLoading(true);
      setUsersError(null);
      
      // Fetch all users for analytics
      const response = await api.getUsers({ 
        skip: 0, 
        limit: 100 // Get users for analytics
      });
      
      if (response.success && response.data) {
        setUsers(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setUsersError('Failed to load users for analytics');
    } finally {
      setUsersLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full space-y-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 shrink-0 text-primary" />
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
              Content Analytics
            </h1>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">
              Comprehensive engagement analytics for all posts
            </p>
          </div>
        </div>
        
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full space-y-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 shrink-0 text-primary" />
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
              Content Analytics
            </h1>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">
              Comprehensive engagement analytics for all posts
            </p>
          </div>
        </div>
        
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <p className="text-muted-foreground">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header Section */}
      <div className="flex items-center gap-3">
        <BarChart3 className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 shrink-0 text-primary" />
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
            Content Analytics
          </h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            Comprehensive engagement analytics for all posts
          </p>
        </div>
      </div>

      {/* Tabbed Analytics Interface */}
      <Tabs defaultValue="posts" onValueChange={(value) => {
        if (value === 'users') {
          fetchUsers();
        }
      }} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="posts">Post Analytics</TabsTrigger>
          <TabsTrigger value="users">User Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="posts" className="space-y-6">
          {/* Overview Stats */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                <CardTitle>Overview</CardTitle>
              </div>
              <CardDescription>
                Analytics overview for {posts.length} posts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold">{posts.length}</p>
                  <p className="text-xs text-muted-foreground">Total Posts</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    {posts.reduce((sum, post) => sum + (post.stats?.views || 0), 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Views</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    {posts.reduce((sum, post) => sum + (post.stats?.totalReactions || 0), 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Reactions</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    {posts.reduce((sum, post) => sum + (post.stats?.totalComments || 0), 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Comments</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Posts Analytics Accordion */}
          <Card>
            <CardHeader>
              <CardTitle>Post-by-Post Analytics</CardTitle>
              <CardDescription>
                Detailed engagement data for each post
              </CardDescription>
            </CardHeader>
            <CardContent>
              {posts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No posts available for analytics.</p>
                </div>
              ) : (
                <Accordion type="single" collapsible className="w-full">
                  {posts.map((post) => {
                    const analytics = postAnalytics.get(post.id);
                    
                    return (
                      <AccordionItem key={post.id} value={post.id}>
                        <AccordionTrigger 
                          className="text-left"
                          onClick={() => {
                            // Fetch full analytics when accordion is opened
                            if (!analytics) {
                              fetchPostAnalytics(post.id);
                            }
                          }}
                        >
                          <div className="flex items-center justify-between w-full pr-4">
                            <div className="flex-1">
                              <h3 className="font-medium text-left">{post.title}</h3>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                {analytics?.loading ? (
                                  <>
                                    <span className="flex items-center gap-1">
                                      <div className="w-3 h-3 bg-gray-300 rounded animate-pulse"></div>
                                      views
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <div className="w-3 h-3 bg-gray-300 rounded animate-pulse"></div>
                                      reactions
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <div className="w-3 h-3 bg-gray-300 rounded animate-pulse"></div>
                                      comments
                                    </span>
                                  </>
                                ) : analytics ? (
                                  <>
                                    <span>{analytics.total_views} views</span>
                                    <span>{analytics.total_reactions} reactions</span>
                                    <span>{analytics.total_comments} comments</span>
                                  </>
                                ) : (
                                  <>
                                    <span>{post.stats?.views || 0} views</span>
                                    <span>{post.stats?.totalReactions || 0} reactions</span>
                                    <span>{post.stats?.totalComments || 0} comments</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="sm" asChild>
                                <Link to={`/post/${post.id}/analytics`}>
                                  <ExternalLink className="w-4 h-4" />
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="pt-4">
                            {analytics && !analytics.loading && analytics.user_analytics.length > 0 ? (
                              <AnalyticsTable 
                                postId={post.id}
                                showPostTitle={false}
                                analyticsData={analytics}
                              />
                            ) : analytics?.loading ? (
                              <div className="space-y-4">
                                <div className="grid grid-cols-3 gap-4">
                                  {[1, 2, 3].map((i) => (
                                    <Card key={i}>
                                      <CardContent className="flex items-center p-4">
                                        <Skeleton className="w-8 h-8 rounded mr-3" />
                                        <div>
                                          <Skeleton className="h-6 w-16 mb-1" />
                                          <Skeleton className="h-3 w-20" />
                                        </div>
                                      </CardContent>
                                    </Card>
                                  ))}
                                </div>
                                <div className="space-y-2">
                                  {Array.from({ length: 3 }).map((_, i) => (
                                    <Skeleton key={i} className="h-12 w-full" />
                                  ))}
                                </div>
                              </div>
                            ) : analytics?.error ? (
                              <div className="text-center py-8">
                                <p className="text-muted-foreground">{analytics.error}</p>
                              </div>
                            ) : analytics && analytics.user_analytics.length === 0 ? (
                              <div className="text-center py-8">
                                <p className="text-muted-foreground">No analytics data available for this post.</p>
                              </div>
                            ) : null}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          {/* User Search Filter */}
          <Card>
            <CardHeader>
              <CardTitle>User Filter</CardTitle>
              <CardDescription>
                Search and select a user to view their engagement analytics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative" ref={searchRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Type 4+ characters to search users..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      searchUsers(e.target.value);
                    }}
                    className="w-full pl-10 pr-10 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  {selectedUser && (
                    <button
                      onClick={clearUserSelection}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                {/* Search Results Dropdown */}
                {showSearchDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                    {searchLoading ? (
                      <div className="p-3 text-center text-muted-foreground">
                        <div className="inline-block w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin mr-2"></div>
                        Searching...
                      </div>
                    ) : searchResults.length > 0 ? (
                      searchResults.map((user) => (
                        <div
                          key={user.id}
                          onClick={() => handleUserSelect(user)}
                          className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={user.avatar}
                              alt={user.displayName}
                              className="w-8 h-8 rounded-full"
                            />
                            <div>
                              <div className="font-medium">{user.displayName}</div>
                              <div className="text-sm text-muted-foreground">@{user.username}</div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : searchQuery.length >= 4 ? (
                      <div className="p-3 text-center text-muted-foreground">
                        No users found matching "{searchQuery}"
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
              
              {/* Selected User Display */}
              {selectedUser && (
                <div className="mt-4 p-3 bg-muted rounded-md">
                  <div className="flex items-center gap-3">
                    <img
                      src={selectedUser.avatar}
                      alt={selectedUser.displayName}
                      className="w-10 h-10 rounded-full"
                    />
                    <div>
                      <div className="font-medium">Viewing analytics for: {selectedUser.displayName}</div>
                      <div className="text-sm text-muted-foreground">@{selectedUser.username}</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* User Analytics */}
          <Card>
            <CardHeader>
              <CardTitle>User Engagement Analytics</CardTitle>
              <CardDescription>
                {selectedUser 
                  ? `Detailed engagement data for ${selectedUser.displayName}`
                  : "View detailed engagement data for each user"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!users.length && !usersLoading && !usersError ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Click to load users for analytics...</p>
                </div>
              ) : usersLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Skeleton className="w-8 h-8 rounded-full" />
                            <div>
                              <Skeleton className="h-5 w-32 mb-2" />
                              <Skeleton className="h-4 w-20" />
                            </div>
                          </div>
                          <Skeleton className="h-4 w-24" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : usersError ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">{usersError}</p>
                </div>
              ) : (selectedUser ? [selectedUser] : users).length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No users available for analytics.</p>
                </div>
              ) : (
                <Accordion type="single" collapsible className="w-full">
                  {(selectedUser ? [selectedUser] : users).map((user) => {
                    const analytics = userAnalytics.get(user.id);
                    
                    return (
                      <AccordionItem key={user.id} value={user.id}>
                        <AccordionTrigger 
                          className="text-left"
                          onClick={() => {
                            // Fetch user analytics when accordion is opened
                            if (!analytics) {
                              fetchUserAnalytics(user.id);
                            }
                          }}
                        >
                          <div className="flex items-center justify-between w-full pr-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <img
                                  src={user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user.displayName}`}
                                  alt={user.displayName}
                                  className="w-8 h-8 rounded-full"
                                />
                                <div>
                                  <h3 className="font-medium text-left">{user.displayName}</h3>
                                  <p className="text-sm text-muted-foreground">@{user.username}</p>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              {analytics?.loading ? (
                                <div className="w-6 h-6 bg-gray-300 rounded animate-pulse"></div>
                              ) : analytics ? (
                                <div className="text-sm text-muted-foreground">
                                  {analytics.total_interactions} interactions
                                </div>
                              ) : (
                                <div className="text-sm text-muted-foreground">
                                  Click to load
                                </div>
                              )}
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="pt-4">
                            {analytics && !analytics.loading && analytics.posts_interacted.length > 0 ? (
                              <div className="space-y-4">
                                <div className="text-sm text-muted-foreground mb-3">
                                  Posts this user has interacted with ({analytics.posts_interacted.length} posts):
                                </div>
                                <div className="border rounded-lg overflow-hidden">
                                  <table className="w-full">
                                    <thead className="bg-muted/50">
                                      <tr className="border-b">
                                        <th className="text-left p-3 font-medium">Post Title</th>
                                        <th className="text-center p-3 font-medium w-20">Views</th>
                                        <th className="text-center p-3 font-medium w-24">Reactions</th>
                                        <th className="text-center p-3 font-medium w-24">Comments</th>
                                        <th className="text-center p-3 font-medium w-32">Last Interaction</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {analytics.posts_interacted.map((post) => (
                                        <tr key={post.post_id} className="border-b hover:bg-muted/30">
                                          <td className="p-3">
                                            <Link 
                                              to={`/post/${post.post_id}`}
                                              className="font-medium hover:text-primary hover:underline"
                                            >
                                              {post.post_title}
                                            </Link>
                                          </td>
                                          <td className="p-3 text-center text-sm text-muted-foreground">
                                            {post.views}
                                          </td>
                                          <td className="p-3 text-center text-sm text-muted-foreground">
                                            {post.reactions}
                                          </td>
                                          <td className="p-3 text-center text-sm text-muted-foreground">
                                            {post.comments}
                                          </td>
                                          <td className="p-3 text-center text-xs text-muted-foreground">
                                            {new Date(post.last_interaction).toLocaleDateString()}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            ) : analytics?.loading ? (
                              <div className="space-y-3">
                                <div className="text-sm text-muted-foreground mb-3">
                                  Loading user interactions...
                                </div>
                                <div className="border rounded-lg overflow-hidden">
                                  <table className="w-full">
                                    <thead className="bg-muted/50">
                                      <tr className="border-b">
                                        <th className="text-left p-3 font-medium">Post Title</th>
                                        <th className="text-center p-3 font-medium w-20">Views</th>
                                        <th className="text-center p-3 font-medium w-24">Reactions</th>
                                        <th className="text-center p-3 font-medium w-24">Comments</th>
                                        <th className="text-center p-3 font-medium w-32">Last Interaction</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {Array.from({ length: 3 }).map((_, i) => (
                                        <tr key={i} className="border-b">
                                          <td className="p-3">
                                            <Skeleton className="h-4 w-3/4" />
                                          </td>
                                          <td className="p-3 text-center">
                                            <Skeleton className="h-4 w-8 mx-auto" />
                                          </td>
                                          <td className="p-3 text-center">
                                            <Skeleton className="h-4 w-8 mx-auto" />
                                          </td>
                                          <td className="p-3 text-center">
                                            <Skeleton className="h-4 w-8 mx-auto" />
                                          </td>
                                          <td className="p-3 text-center">
                                            <Skeleton className="h-4 w-16 mx-auto" />
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            ) : analytics?.error ? (
                              <div className="text-center py-8">
                                <p className="text-muted-foreground">{analytics.error}</p>
                              </div>
                            ) : analytics && analytics.posts_interacted.length === 0 ? (
                              <div className="text-center py-8">
                                <p className="text-muted-foreground">This user hasn't interacted with any posts yet.</p>
                              </div>
                            ) : null}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}