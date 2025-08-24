import { useState, useEffect } from 'react';
import { MessageCircle, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { commentsApi } from '@/lib/api';
import type { Comment } from '@/types';

const CommentCard = ({ comment }: { comment: Comment }) => {
  const navigate = useNavigate();

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleGoToPost = () => {
    navigate(`/post/${comment.post_id}`);
  };

  return (
    <Card 
      className="hover:shadow-md hover:border-primary/50 transition-all cursor-pointer group"
      onClick={handleGoToPost}
    >
      <CardContent className="pt-6">
        <div className="space-y-3">
          {/* Author Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div>
                <span className="font-medium">
                  {comment.author_name || comment.author_username}
                </span>
                <span className="text-muted-foreground text-sm ml-2">
                  @{comment.author_username}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {comment.is_edited && (
                <Badge variant="outline" className="text-xs">
                  edited
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {formatTimeAgo(comment.created_at)}
              </span>
            </div>
          </div>

          {/* Post Title - More Prominent Display */}
          {comment.post_title && (
            <div className="mb-2">
              <span className="text-xs text-muted-foreground">Commented on:</span>
              <h4 className="font-medium text-sm group-hover:text-primary transition-colors line-clamp-1">
                {comment.post_title}
              </h4>
            </div>
          )}

          {/* Comment Content */}
          <p className="text-muted-foreground text-sm line-clamp-3">
            {comment.content}
          </p>

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span>{formatDate(comment.created_at)}</span>
            {comment.like_count > 0 && (
              <>
                <span>•</span>
                <span>❤️ {comment.like_count}</span>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const CommentSkeleton = () => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-start space-x-4">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-20 w-full" />
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function DiscussionsPage() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchComments = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await commentsApi.getRecent(0, 15);
        
        if (response.success && response.data) {
          setComments(response.data);
        } else {
          setError(response.error || 'Failed to load discussions');
        }
      } catch (err) {
        console.error('Failed to fetch comments:', err);
        setError('Failed to load discussions. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchComments();
  }, []);

  return (
    <div className="w-full space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight flex items-center gap-2">
            <MessageCircle className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 shrink-0" />
            Recent Discussions
          </h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            Latest comments and discussions from the community
          </p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-900 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Comments List */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <CommentSkeleton key={index} />
          ))}
        </div>
      ) : comments.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">
            Recent Discussions ({comments.length} found)
          </h3>
          
          {comments.map((comment) => (
            <CommentCard key={comment.id} comment={comment} />
          ))}
        </div>
      ) : !error && (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Discussions Yet</h3>
            <p className="text-muted-foreground">
              Be the first to start a conversation! Comment on a post to get the discussion going.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
