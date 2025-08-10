import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Heart, 
  MessageCircle, 
  Eye,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getAvatarUrl } from '@/lib/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { api } from '@/lib/api-client';
import type { Post, Comment } from '@/types';
import { useAuth } from '@/hooks/use-auth';

interface DiscussionSectionProps {
  post: Post;
  showBottomBar?: boolean;
}

export const DiscussionSection = ({ post, showBottomBar = true }: DiscussionSectionProps) => {
  const navigate = useNavigate();
  const [showReplyDialog, setShowReplyDialog] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [replyText, setReplyText] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentReactions, setCommentReactions] = useState<Record<string, any[]>>({});
  const { user: currentUser } = useAuth();

  // Handle navigation to user profile
  const handleUserClick = (userId: string) => {
    navigate(`/profile/${userId}`);
  };

  // Fetch comments on component mount
  useEffect(() => {
    fetchComments();
  }, [post.id]);

  const fetchComments = async () => {
    try {
      setLoadingComments(true);
      const response = await api.getComments(post.id);
      if (response.success && response.data) {
        setComments(response.data);
        // Fetch reactions for each comment
        await fetchCommentReactions(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || submittingComment) return;
    
    try {
      setSubmittingComment(true);
      const response = await api.createComment(post.id, newComment.trim());
      
      if (response.success && response.data) {
        // Add new comment to the list
        setComments([response.data, ...comments]);
        setNewComment('');
        console.log('Comment posted successfully!');
      } else {
        console.error('Failed to post comment:', response.error);
      }
    } catch (error) {
      console.error('Error posting comment:', error);
    } finally {
      setSubmittingComment(false);
    }
  };

  const fetchCommentReactions = async (comments: Comment[]) => {
    try {
      const reactions: Record<string, any[]> = {};
      
      // For now, fetch reactions for each comment individually
      // TODO: Optimize with bulk query
      for (const comment of comments) {
        const response = await api.getReactions(comment.id, 'discussion');
        if (response.success && response.data) {
          reactions[comment.id] = response.data;
        }
      }
      
      setCommentReactions(reactions);
    } catch (error) {
      console.error('Failed to fetch comment reactions:', error);
    }
  };

  const handleCommentReaction = async (commentId: string, reactionType: string) => {
    try {
      const response = await api.toggleReaction(commentId, reactionType as any, 'discussion');
      if (response.success) {
        // Refresh reactions for this comment
        const reactionsResponse = await api.getReactions(commentId, 'discussion');
        if (reactionsResponse.success && reactionsResponse.data) {
          setCommentReactions(prev => ({
            ...prev,
            [commentId]: reactionsResponse.data || []
          }));
        }
      }
    } catch (error) {
      console.error('Failed to toggle comment reaction:', error);
    }
  };

  const handleReply = (commentId: string, authorName: string) => {
    setReplyTo({ id: commentId, name: authorName });
    setShowReplyDialog(true);
  };

  const handleSubmitReply = async () => {
    if (!replyText.trim() || !replyTo) return;
    
    try {
      const response = await api.createComment(post.id, replyText.trim(), replyTo.id);
      
      if (response.success && response.data) {
        // Add new reply to the comments list
        setComments([response.data, ...comments]);
        console.log(`Reply posted to ${replyTo.name}`);
      } else {
        console.error('Failed to post reply:', response.error);
      }
    } catch (error) {
      console.error('Error posting reply:', error);
    }
    
    // Reset form
    setReplyText('');
    setReplyTo(null);
    setShowReplyDialog(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Bottom Reactions Bar */}
      {showBottomBar && (
        <>
          <hr className="border-border" />
          <div className="flex items-center justify-between py-4" id="reactions-section">
            <div className="flex items-center space-x-6 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <Heart className="w-4 h-4" />
                <span>{post.stats.totalReactions} reactions</span>
              </div>
              <div className="flex items-center space-x-2">
                <MessageCircle className="w-4 h-4" />
                <span>{post.stats.totalComments} comments</span>
              </div>
              <div className="flex items-center space-x-2">
                <Eye className="w-4 h-4" />
                <span>{post.stats.views} views</span>
              </div>
            </div>
            <Button variant="outline" size="sm">
              <MessageCircle className="w-4 h-4 mr-2" />
              Add Comment
            </Button>
          </div>
        </>
      )}

      {/* Comments Section */}
      <div id="comments-section" className="py-6">
        <h3 className="text-xl font-semibold mb-6">Discussion ({post.stats.totalComments})</h3>
        
        {/* Add Comment Form */}
        <div className="pb-6 mb-6 border-b border-border">
          <div className="flex items-start space-x-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src={getAvatarUrl(post.author.id, 100)} />
              <AvatarFallback>ME</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <textarea
                className="w-full p-3 border border-border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                rows={3}
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                disabled={submittingComment}
              />
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-muted-foreground">
                  Be kind and respectful to get the best response.
                </span>
                <Button 
                  size="sm" 
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || submittingComment}
                >
                  {submittingComment ? 'Posting...' : 'Post Comment'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Real Comments List */}
        {loadingComments ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading comments...
          </div>
        ) : comments.length > 0 ? (
          <div className="space-y-6">
            {comments
              .filter(comment => !comment.parent_id) // Show only top-level comments first
              .map((comment) => {
                const authorName = comment.author_name || comment.author_username || 'Unknown User';
                const authorAvatar = getAvatarUrl(comment.author_id || 'default', 32);
                
                return (
                <div key={comment.id}>
                  {/* Top-level comment */}
                  <div className="flex items-start space-x-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={authorAvatar} />
                      <AvatarFallback>
                        {authorName.split(' ').map((n: string) => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <button 
                          onClick={() => handleUserClick(comment.author_username || comment.author_id || '')}
                          className="font-semibold text-sm text-primary hover:text-primary/80 transition-colors cursor-pointer"
                        >
                          {authorName}
                        </button>
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.created_at || '').toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm mb-3 leading-relaxed text-foreground">{comment.content}</p>
                      <div className="flex items-center space-x-4 text-xs">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 px-2 text-muted-foreground hover:text-foreground hover:text-green-600"
                          title="Like this comment"
                          onClick={() => handleCommentReaction(comment.id, 'event-thumbs-up')}
                        >
                          <ThumbsUp className="w-3 h-3 mr-1" />
                          <span>
                            {commentReactions[comment.id]?.filter(r => r.reaction_type === 'event-thumbs-up').length || 0}
                          </span>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 px-2 text-muted-foreground hover:text-foreground hover:text-red-600"
                          title="Dislike this comment"
                          onClick={() => handleCommentReaction(comment.id, 'event-thumbs-down')}
                        >
                          <ThumbsDown className="w-3 h-3 mr-1" />
                          <span>
                            {commentReactions[comment.id]?.filter(r => r.reaction_type === 'event-thumbs-down').length || 0}
                          </span>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 px-2 text-muted-foreground hover:text-foreground"
                          onClick={() => handleReply(comment.id, authorName)}
                        >
                          Reply
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Nested replies */}
                  {comments
                    .filter(reply => reply.parent_id === comment.id)
                    .map((reply) => {
                      const replyAuthorName = reply.author_name || reply.author_username || 'Unknown User';
                      const replyAuthorAvatar = getAvatarUrl(reply.author_id || 'default', 32);
                      
                      return (
                      <div key={reply.id} className="ml-11 mt-4 relative">
                        <div className="absolute left-0 top-0 bottom-0 w-px bg-border"></div>
                        <div className="flex items-start space-x-3 pl-4">
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={replyAuthorAvatar} />
                            <AvatarFallback>
                              {replyAuthorName.split(' ').map((n: string) => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <button 
                                onClick={() => handleUserClick(reply.author_username || reply.author_id || '')}
                                className="font-semibold text-xs text-primary hover:text-primary/80 transition-colors cursor-pointer"
                              >
                                {replyAuthorName}
                              </button>
                              <span className="text-xs text-muted-foreground">
                                {new Date(reply.created_at || '').toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-xs mb-2 leading-relaxed text-foreground">{reply.content}</p>
                            <div className="flex items-center space-x-4 text-xs">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className={`h-6 px-2 text-muted-foreground hover:text-foreground hover:text-green-600 ${
                                  commentReactions[reply.id]?.some(r => r.reaction_type === 'event-thumbs-up' && r.user_id ===   currentUser?.id) 
                                    ? 'text-green-600 bg-green-50' 
                                    : ''
                                }`}
                                title="Like this reply"
                                onClick={() => handleCommentReaction(reply.id, 'event-thumbs-up')}
                              >
                                <ThumbsUp className="w-3 h-3 mr-1" />
                                <span>
                                  {commentReactions[reply.id]?.filter(r => r.reaction_type === 'event-thumbs-up').length || 0}
                                </span>
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className={`h-6 px-2 text-muted-foreground hover:text-foreground hover:text-red-600 ${
                                  commentReactions[reply.id]?.some(r => r.reaction_type === 'event-thumbs-down' && r.user_id ===  currentUser?.id) 
                                    ? 'text-red-600 bg-red-50' 
                                    : ''
                                }`}
                                title="Dislike this reply"
                                onClick={() => handleCommentReaction(reply.id, 'event-thumbs-down')}
                              >
                                <ThumbsDown className="w-3 h-3 mr-1" />
                                <span>
                                  {commentReactions[reply.id]?.filter(r => r.reaction_type === 'event-thumbs-down').length || 0}
                                </span>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                      );
                    })}
                </div>
                );
              })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No comments yet. Be the first to comment!
          </div>
        )}
 
      </div>

      {/* Reply Dialog */}
      <Dialog open={showReplyDialog} onOpenChange={setShowReplyDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              Reply to {replyTo?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <textarea
              className="w-full p-3 border border-border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
              rows={4}
              placeholder={`Reply to ${replyTo?.name}...`}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowReplyDialog(false);
                setReplyText('');
                setReplyTo(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitReply}
              disabled={!replyText.trim()}
            >
              Post Reply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
