import { Card, CardContent } from '@/components/ui/card';
import { PostHeader } from '@/components/common/post-header';
import { api } from '@/lib/api-client';
import type { Post, ReactionType } from '@/types';

interface PostCardProps {
  post: Post;
}

export default function PostCard({ post }: PostCardProps) {
  const handleReaction = async (type: ReactionType) => {
    try {
      console.log(`Toggling ${type} reaction for post ${post.id}`);
      const response = await api.toggleReaction(post.id, type);
      
      if (response.success) {
        console.log(`Successfully toggled ${type} reaction`);
        // PostHeader will handle its own reaction refetch
      } else {
        console.error('Failed to toggle reaction:', response.error);
      }
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: post.title || 'Check out this post!',
        url: `${window.location.origin}/post/${post.id}`,
      });
    } else {
      navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
    }
  };

  return (
    <Card className="w-full mb-6 hover:shadow-lg transition-shadow">
      <CardContent className="p-0">
        {/* PostHeader Component - Rows 1-6 (no image, no body) */}
        <PostHeader 
          post={post}
          showImage={false}
          isDetailView={false}
          onReaction={handleReaction}
          onShare={handleShare}
        />
        
        {/* Content Preview for Feed Cards */}
        {post.feed_content && (
          <div className="px-6 pb-6">
            <div className="text-sm text-muted-foreground line-clamp-3">
              {post.feed_content}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
