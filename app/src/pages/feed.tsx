import { useState, useEffect, useCallback, useRef } from 'react';
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchParams] = useSearchParams();
  const { tagName, filter } = useParams<{ tagName?: string; filter?: string }>();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const filters: FeedFilters = {
    type: (searchParams.get('type') as FeedFilters['type']) || 'all',
    timeframe: (searchParams.get('timeframe') as FeedFilters['timeframe']) || 'all',
    favoritesPosts: filter === 'favorite-posts',
    favoriteTags: filter === 'favorite-tags',
  };

  const loadPosts = async (reset = false) => {
    if (reset) {
      setLoading(true);
      setCurrentPage(1);
    } else {
      setLoadingMore(true);
    }

    try {
      const page = reset ? 1 : currentPage;
      const response = await api.getPosts({ 
        page, 
        limit: 10, 
        ...filters 
      });
      
      if (response.success && response.data) {
        let filteredPosts = response.data;
        
        // Filter by tag if tagName is provided
        if (tagName) {
          filteredPosts = response.data.filter(post => 
            post.tags.some(tag => tag.name.toLowerCase() === tagName.toLowerCase())
          );
        }
        
        if (reset) {
          setPosts(filteredPosts);
        } else {
          // Only add posts that aren't already in the current posts array
          setPosts(prev => {
            const existingIds = new Set(prev.map(post => post.id));
            const newPosts = filteredPosts.filter(post => !existingIds.has(post.id));
            return [...prev, ...newPosts];
          });
        }

        // Check if there are more posts
        setHasMore(filteredPosts.length === 10);
        
        if (!reset) {
          setCurrentPage(prev => prev + 1);
        }
      }
    } catch (error) {
      console.error('Failed to load posts:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMorePosts = useCallback(() => {
    if (!loadingMore && hasMore) {
      loadPosts(false);
    }
  }, [loadingMore, hasMore, currentPage]);

  // Intersection Observer for auto-loading on scroll
  useEffect(() => {
    if (loadingMore || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMorePosts();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [loadingMore, hasMore, loadMorePosts]);

  useEffect(() => {
    // Reset pagination state when filters change
    setCurrentPage(1);
    setHasMore(true);
    loadPosts(true);
  }, [searchParams.toString(), tagName, filter]);

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight min-w-0 flex-1">
          {tagName ? (
            <div className="flex items-center gap-2 flex-wrap">
              <Hash className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 shrink-0" />
              <span className="text-base sm:text-lg lg:text-xl shrink-0">Posts tagged with</span>
              <Badge variant="secondary" className="text-sm sm:text-base lg:text-lg px-2 py-1 sm:px-3 shrink-0">
                #{tagName}
              </Badge>
            </div>
          ) : filter === 'trending' ? (
            'Trending'
          ) : filter === 'favorite-posts' ? (
            'Favorite Posts'
          ) : filter === 'favorite-tags' ? (
            'Tagged Favorites'
          ) : (
            'Community Feed'
          )}
        </h1>
        <div className="flex items-center space-x-2 shrink-0">
          <Link to="/create">
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Create Post</span>
              <span className="sm:hidden">Create</span>
            </Button>
          </Link>
        </div>
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
            <>
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
              
              {/* Load More Section */}
              {hasMore ? (
                <div ref={loadMoreRef} className="py-8 text-center">
                  {loadingMore ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin h-5 w-5 border-2 border-blue-500 rounded-full border-t-transparent" />
                      <span>Loading more posts...</span>
                    </div>
                  ) : (
                    <Button onClick={loadMorePosts} variant="outline" size="lg">
                      Load More Posts
                    </Button>
                  )}
                </div>
              ) : posts.length > 0 && (
               
                <div className="py-12 text-center space-y-3">
                   <hr /> <br />
                  <div className="text-6xl">🎉</div>
                  <h3 className="text-xl font-semibold text-gray-700">You've reached the end!</h3>
                  <p className="text-gray-500 max-w-md mx-auto">
                    Congratulations! You've officially read everything. Time to touch some grass... 
                    or create your own post!
                  </p>
                  <div className="pt-4">
                    <Link to="/create">
                      <Button className="gap-2">
                        <Plus className="w-4 h-4" />
                        Create New Post
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
