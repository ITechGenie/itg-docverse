import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp } from 'lucide-react';
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
import type { Post } from '@/types';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [postAnalytics, setPostAnalytics] = useState<Map<string, PostAnalyticsData>>(new Map());

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
    </div>
  );
}