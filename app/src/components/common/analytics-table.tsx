import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Eye, Heart, MessageCircle } from 'lucide-react';
import { api } from '@/services/api-client';

interface UserAnalytics {
  user_id: string;
  user_name: string;
  display_name: string;
  views: number;
  reactions: number;
  comments: number;
}

interface AnalyticsTableProps {
  postId: string;
  postTitle?: string;
  showPostTitle?: boolean;
  analyticsData?: {
    total_views: number;
    total_reactions: number;
    total_comments: number;
    user_analytics: UserAnalytics[];
  };
}

export function AnalyticsTable({ postId, postTitle, showPostTitle = false, analyticsData }: AnalyticsTableProps) {
  const [analytics, setAnalytics] = useState<UserAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalViews, setTotalViews] = useState(0);
  const [totalReactions, setTotalReactions] = useState(0);
  const [totalComments, setTotalComments] = useState(0);

  useEffect(() => {
    // If pre-fetched analytics data is provided, use it directly
    if (analyticsData) {
      setAnalytics(analyticsData.user_analytics || []);
      setTotalViews(analyticsData.total_views || 0);
      setTotalReactions(analyticsData.total_reactions || 0);
      setTotalComments(analyticsData.total_comments || 0);
      setLoading(false);
      return;
    }

    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('🔍 Fetching analytics for postId:', postId);
        const response = await api.getPostAnalytics(postId);
        
        console.log('📊 Analytics API response:', response);
        
        if (response.success && response.data) {
          console.log('✅ Analytics data received:', {
            userAnalytics: response.data.user_analytics,
            totalViews: response.data.total_views,
            totalReactions: response.data.total_reactions,
            totalComments: response.data.total_comments
          });
          
          setAnalytics(response.data.user_analytics || []);
          setTotalViews(response.data.total_views || 0);
          setTotalReactions(response.data.total_reactions || 0);
          setTotalComments(response.data.total_comments || 0);
        } else {
          console.log('❌ API response not successful:', response);
          setError('No analytics data available');
        }
      } catch (err) {
        console.error('💥 Failed to fetch analytics:', err);
        setError('Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [postId, analyticsData]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          {showPostTitle && postTitle && (
            <CardTitle className="text-xl font-bold">
              <Link 
                to={`/post/${postId}`}
                className="hover:text-primary transition-colors"
              >
                {postTitle}
              </Link>
            </CardTitle>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-4 mb-6">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          {showPostTitle && postTitle && (
            <CardTitle className="text-xl font-bold">
              <Link 
                to={`/post/${postId}`}
                className="hover:text-primary transition-colors"
              >
                {postTitle}
              </Link>
            </CardTitle>
          )}
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        {showPostTitle && postTitle && (
          <CardTitle className="text-xl font-bold">
            <Link 
              to={`/post/${postId}`}
              className="hover:text-primary transition-colors"
            >
              {postTitle}
            </Link>
          </CardTitle>
        )}
      </CardHeader>
      <CardContent>
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="flex items-center p-4">
              <Eye className="w-8 h-8 text-blue-500 mr-3" />
              <div>
                <p className="text-2xl font-bold">{totalViews}</p>
                <p className="text-xs text-muted-foreground">Total Views</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-4">
              <Heart className="w-8 h-8 text-red-500 mr-3" />
              <div>
                <p className="text-2xl font-bold">{totalReactions}</p>
                <p className="text-xs text-muted-foreground">Total Reactions</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-4">
              <MessageCircle className="w-8 h-8 text-green-500 mr-3" />
              <div>
                <p className="text-2xl font-bold">{totalComments}</p>
                <p className="text-xs text-muted-foreground">Total Comments</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User Analytics Table */}
        {analytics.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No analytics data available for this post.</p>
          </div>
        ) : (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead className="text-center">Views</TableHead>
                  <TableHead className="text-center">Reactions</TableHead>
                  <TableHead className="text-center">Comments</TableHead>
                  <TableHead className="text-center">Engagement</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.map((user) => {
                  const totalEngagement = user.views + user.reactions + user.comments;
                  return (
                    <TableRow key={user.user_id}>
                      <TableCell>
                        <div>
                          <Link 
                            to={`/profile/${user.user_name}`}
                            className="hover:text-primary transition-colors"
                          >
                            <p className="font-medium">{user.display_name}</p>
                            <p className="text-sm text-muted-foreground">@{user.user_name}</p>
                          </Link>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-bold">
                          {user.views}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-bold">
                          {user.reactions}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-bold">
                          {user.comments}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-bold">
                          {totalEngagement}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}