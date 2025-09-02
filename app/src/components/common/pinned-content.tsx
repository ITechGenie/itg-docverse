import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pin, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '@/services/api-client';
import type { Post } from '@/types';
import { Link, useNavigate } from 'react-router-dom';

// Constants - same styling as challenges for consistency
const PINNED_CARD_STYLES = {
  card: "light-mode-gradient dark:sunset-glow-gradient text-white border-0 hover:shadow-lg transition-shadow cursor-pointer",
  header: "flex flex-row items-center gap-2 space-y-0 pb-2",
  title: "text-2xl font-bold",
  content: "space-y-2",
  description: "text-xs opacity-90",
  badgesContainer: "flex items-center gap-2 flex-wrap",
  tagBadge: "hover:bg-primary hover:text-primary-foreground transition-colors text-sm px-3 py-1",
  authorInfo: "text-xs opacity-75"
} as const;

const GRID_STYLES = {
  container: "grid grid-cols-1 md:grid-cols-2 gap-4"
} as const;

const BUTTON_STYLES = {
  viewAll: "mt-6 w-full flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-colors"
} as const;

interface PinnedContentProps {
  limit?: number;
  showViewAll?: boolean;
  initialCount?: number;
}

export const PinnedContent: React.FC<PinnedContentProps> = ({
  limit = 10, // Fetch top 10
  showViewAll = false,
  initialCount = 4, // Show 4 initially
}) => {
  const [pinnedPosts, setPinnedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();

  const displayedPosts = expanded ? pinnedPosts : pinnedPosts.slice(0, initialCount);
  const hasMore = pinnedPosts.length > initialCount;

  useEffect(() => {
    const fetchPinnedPosts = async () => {
      try {
        setLoading(true);
        const response = await api.getPosts({ page: 1, tag_id: 'pinned', limit });
        if (response.success && response.data) {
          setPinnedPosts(response.data);
        } else {
          setPinnedPosts([]);
        }
      } catch (err) {
        console.error('Failed to fetch pinned posts:', err);
        setError('Failed to load pinned content');
        setPinnedPosts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPinnedPosts();
  }, [limit]);

  if (loading) {
    return (
      <div className={GRID_STYLES.container}>
        {Array.from({ length: initialCount }).map((_, i) => (
          <Card key={i} className="animate-pulse light-mode-gradient dark:sunset-glow-gradient border-0">
            <CardContent className="p-4">
              <div className="h-6 bg-white/20 rounded w-3/4 mb-3"></div>
              <div className="h-4 bg-white/20 rounded w-full mb-2"></div>
              <div className="h-4 bg-white/20 rounded w-2/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <Pin className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (pinnedPosts.length === 0) {
    return (
      <div className="text-center py-8">
        <Pin className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
        <p className="text-sm text-muted-foreground">No pinned content yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Create posts with the "pinned" tag to see them here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className={GRID_STYLES.container}>
        {displayedPosts.map((post) => (
          <Card key={post.id} className={PINNED_CARD_STYLES.card}>
            <CardHeader className={PINNED_CARD_STYLES.header}>
              <Link to={`/posts/${post.id}`} className="block">
                <div className={PINNED_CARD_STYLES.title}>
                  {post.title}
                </div>
              </Link>
            </CardHeader>
            <CardContent className={PINNED_CARD_STYLES.content}>
              {post.feed_content && (
                <p className={PINNED_CARD_STYLES.description}>
                  {post.feed_content}
                </p>
              )}
              
              <div className={PINNED_CARD_STYLES.badgesContainer}>
                {post.tags
                  ?.filter((tag) => tag.name.toLowerCase() !== "pinned")
                  .map((tag) => (
                    <Badge
                      key={tag.name}
                      variant="secondary"
                      className={`${PINNED_CARD_STYLES.tagBadge} cursor-pointer`}
                      onClick={() => navigate(`/tags/${encodeURIComponent(tag.name)}`)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          navigate(`/tags/${encodeURIComponent(tag.name)}`);
                        }
                      }}
                    >
                      {tag.name}
                    </Badge>
                  ))}
              </div>
              
              <p className={PINNED_CARD_STYLES.authorInfo}>
                <Users className="inline h-3 w-3 mr-1" />
                {post.author.displayName} • {new Date(post.createdAt).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {hasMore && (
        <Button
          variant="outline"
          onClick={() => setExpanded(!expanded)}
          className={BUTTON_STYLES.viewAll}
        >
          {expanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              View All ({pinnedPosts.length} pinned)
            </>
          )}
        </Button>
      )}
      
      {showViewAll && (
        <div className="text-center mt-4">
          <Button variant="outline" size="sm" asChild>
            <Link to="/tags/pinned">View All Pinned Content</Link>
          </Button>
        </div>
      )}
    </div>
  );
};
