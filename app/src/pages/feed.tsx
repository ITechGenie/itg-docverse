import { useState, useEffect } from 'react';
import { useSearchParams, Link, useParams } from 'react-router-dom';
import { Plus, Hash } from 'lucide-react';
import { api } from '@/lib/api-client';
import type { Post, FeedFilters } from '@/types';
import PostCard from '@/components/post-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function Feed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const { tagName, filter } = useParams<{ tagName?: string; filter?: string }>();

  const filters: FeedFilters = {
    type: (searchParams.get('type') as FeedFilters['type']) || 'all',
    timeframe: (searchParams.get('timeframe') as FeedFilters['timeframe']) || 'all',
    following: filter === 'following',
    favoritesPosts: filter === 'favorite-posts',
    favoriteTags: filter === 'favorite-tags',
  };

  useEffect(() => {
    loadPosts();
  }, [searchParams.toString(), tagName, filter]); // Use searchParams.toString() to avoid object reference issues

  const loadPosts = async () => {
    setLoading(true);
    try {
      const response = await api.getPosts({ page: 1, limit: 10, ...filters });
      if (response.success && response.data) {
        let filteredPosts = response.data;
        
        // Filter by tag if tagName is provided
        if (tagName) {
          filteredPosts = response.data.filter(post => 
            post.tags.some(tag => tag.name.toLowerCase() === tagName.toLowerCase())
          );
        }
        
        setPosts(filteredPosts);
      }
    } catch (error) {
      console.error('Failed to load posts:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">
          {tagName ? (
            <div className="flex items-center space-x-2">
              <Hash className="w-8 h-8" />
              <span>Posts tagged with</span>
              <Badge variant="secondary" className="text-lg px-3 py-1">
                #{tagName}
              </Badge>
            </div>
          ) : filter === 'following' ? (
            'Following'
          ) : filter === 'trending' ? (
            'Trending'
          ) : filter === 'favorite-posts' ? (
            'Favorite Posts'
          ) : filter === 'favorite-tags' ? (
            'Favorite Tags'
          ) : (
            'Community Feed'
          )}
        </h1>
        {!tagName && (
          <Link to="/create">
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Post
            </Button>
          </Link>
        )}
        {tagName && (
          <div className="flex items-center space-x-2">
            <Link to="/feed">
              <Button variant="outline">
                Back to Feed
              </Button>
            </Link>
            <Link to="/create">
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Create Post
              </Button>
            </Link>
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-4 p-6 border border-border rounded-lg">
              <div className="flex items-center space-x-4">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-16 w-full" />
              <div className="flex space-x-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No posts found. Be the first to share something!</p>
            </div>
          ) : (
            posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
