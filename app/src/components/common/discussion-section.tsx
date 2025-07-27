import { useState, useEffect } from 'react';
import { 
  Heart, 
  MessageCircle, 
  Eye,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { api } from '@/lib/api-client';
import type { Post, Comment } from '@/types';

interface DiscussionSectionProps {
  post: Post;
  showBottomBar?: boolean;
}

export const DiscussionSection = ({ post, showBottomBar = true }: DiscussionSectionProps) => {
  const [showReplyDialog, setShowReplyDialog] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [replyText, setReplyText] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentReactions, setCommentReactions] = useState<Record<string, any[]>>({});

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
              <AvatarImage src="https://www.gravatar.com/avatar/current-user?d=identicon" />
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
              .filter(comment => !comment.parentId) // Show only top-level comments first
              .map((comment) => (
                <div key={comment.id}>
                  {/* Top-level comment */}
                  <div className="flex items-start space-x-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={comment.author.avatar} />
                      <AvatarFallback>
                        {comment.author.displayName.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-semibold text-sm">{comment.author.displayName}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.createdAt).toLocaleDateString()}
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
                          onClick={() => handleReply(comment.id, comment.author.displayName)}
                        >
                          Reply
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Nested replies */}
                  {comments
                    .filter(reply => reply.parentId === comment.id)
                    .map((reply) => (
                      <div key={reply.id} className="ml-11 mt-4 relative">
                        <div className="absolute left-0 top-0 bottom-0 w-px bg-border"></div>
                        <div className="flex items-start space-x-3 pl-4">
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={reply.author.avatar} />
                            <AvatarFallback>
                              {reply.author.displayName.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="font-semibold text-xs">{reply.author.displayName}</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(reply.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-xs mb-2 leading-relaxed text-foreground">{reply.content}</p>
                            <div className="flex items-center space-x-4 text-xs">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 px-2 text-muted-foreground hover:text-foreground hover:text-green-600"
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
                                className="h-6 px-2 text-muted-foreground hover:text-foreground hover:text-red-600"
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
                    ))}
                </div>
              ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No comments yet. Be the first to comment!
          </div>
        )}

        {/* Mock Comment Thread Example */}
        <div className="space-y-8">
          {/* Top Level Comment */}
          <div className="relative">
            <div className="flex items-start space-x-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src="https://www.gravatar.com/avatar/mock1?d=identicon" />
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="font-semibold text-sm">John Doe</span>
                  <span className="text-xs text-muted-foreground">2 days ago</span>
                </div>
                <p className="text-sm mb-3 leading-relaxed text-foreground">Great article! This is exactly what I was looking for. The open source alternatives you mentioned are really helpful.</p>
                <div className="flex items-center space-x-4 text-xs">
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground hover:text-foreground">
                    <ThumbsUp className="w-3 h-3 mr-1" />
                    <span>6</span>
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground hover:text-foreground">
                    <ThumbsDown className="w-3 h-3 mr-1" />
                    <span>1</span>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 px-2 text-muted-foreground hover:text-foreground"
                    onClick={() => handleReply('comment-1', 'John Doe')}
                  >
                    Reply
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Nested Reply with Thread Line */}
            <div className="relative ml-6 mt-4">
              <div className="absolute left-5 top-0 bottom-0 w-px bg-border"></div>
              <div className="flex items-start space-x-3 pl-6">
                <Avatar className="w-6 h-6">
                  <AvatarImage src="https://www.gravatar.com/avatar/mock2?d=identicon" />
                  <AvatarFallback>JS</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="font-semibold text-xs">Jane Smith</span>
                    <span className="text-xs text-muted-foreground">1 day ago</span>
                  </div>
                  <p className="text-xs mb-2 leading-relaxed text-foreground">I agree! I've been using some of these tools and they're amazing. Thanks for sharing!</p>
                  <div className="flex items-center space-x-4 text-xs">
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-muted-foreground hover:text-foreground">
                      <ThumbsUp className="w-3 h-3 mr-1" />
                      <span>2</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-muted-foreground hover:text-foreground">
                      <ThumbsDown className="w-3 h-3 mr-1" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 px-2 text-muted-foreground hover:text-foreground"
                      onClick={() => handleReply('reply-1', 'Jane Smith')}
                    >
                      Reply
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Another Top Level Comment */}
          <div className="relative">
            <div className="flex items-start space-x-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src="https://www.gravatar.com/avatar/mock3?d=identicon" />
                <AvatarFallback>MB</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="font-semibold text-sm">Mike Brown</span>
                  <span className="text-xs text-muted-foreground">1 day ago</span>
                </div>
                <p className="text-sm mb-3 leading-relaxed text-foreground">VSCodium has been my go-to editor for the past year. Loving the privacy-focused approach!</p>
                <div className="flex items-center space-x-4 text-xs">
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground hover:text-foreground">
                    <ThumbsUp className="w-3 h-3 mr-1" />
                    <span>3</span>
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground hover:text-foreground">
                    <ThumbsDown className="w-3 h-3 mr-1" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 px-2 text-muted-foreground hover:text-foreground"
                    onClick={() => handleReply('comment-2', 'Mike Brown')}
                  >
                    Reply
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Example of deeper nesting */}
          <div className="relative">
            <div className="flex items-start space-x-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src="https://www.gravatar.com/avatar/mock4?d=identicon" />
                <AvatarFallback>AL</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="font-semibold text-sm">Alex Lee</span>
                  <span className="text-xs text-muted-foreground">12 hours ago</span>
                </div>
                <p className="text-sm mb-3 leading-relaxed text-foreground">This is really comprehensive! I've bookmarked it for future reference.</p>
                <div className="flex items-center space-x-4 text-xs">
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground hover:text-foreground">
                    <ThumbsUp className="w-3 h-3 mr-1" />
                    <span>8</span>
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground hover:text-foreground">
                    <ThumbsDown className="w-3 h-3 mr-1" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 px-2 text-muted-foreground hover:text-foreground"
                    onClick={() => handleReply('comment-3', 'Alex Lee')}
                  >
                    Reply
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Multiple nested replies */}
            <div className="relative ml-6 mt-4">
              <div className="absolute left-5 top-0 bottom-0 w-px bg-border"></div>
              <div className="space-y-4 pl-6">
                {/* First reply */}
                <div className="flex items-start space-x-3">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src="https://www.gravatar.com/avatar/mock5?d=identicon" />
                    <AvatarFallback>PR</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="font-semibold text-xs">Prakash M</span>
                      <span className="text-xs text-muted-foreground">8 hours ago</span>
                    </div>
                    <p className="text-xs mb-2 leading-relaxed text-foreground">Thanks! I'm glad you found it useful. Let me know if you need any specific tool recommendations.</p>
                    <div className="flex items-center space-x-4 text-xs">
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-muted-foreground hover:text-foreground">
                        <ThumbsUp className="w-3 h-3 mr-1" />
                        <span>4</span>
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-muted-foreground hover:text-foreground">
                        <ThumbsDown className="w-3 h-3 mr-1" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 px-2 text-muted-foreground hover:text-foreground"
                        onClick={() => handleReply('reply-2', 'Prakash M')}
                      >
                        Reply
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Second reply */}
                <div className="flex items-start space-x-3">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src="https://www.gravatar.com/avatar/mock6?d=identicon" />
                    <AvatarFallback>SW</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="font-semibold text-xs">Sarah Wilson</span>
                      <span className="text-xs text-muted-foreground">6 hours ago</span>
                    </div>
                    <p className="text-xs mb-2 leading-relaxed text-foreground">Could you do a follow-up post on deployment strategies for these tools?</p>
                    <div className="flex items-center space-x-4 text-xs">
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-muted-foreground hover:text-foreground">
                        <ThumbsUp className="w-3 h-3 mr-1" />
                        <span>1</span>
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-muted-foreground hover:text-foreground">
                        <ThumbsDown className="w-3 h-3 mr-1" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 px-2 text-muted-foreground hover:text-foreground"
                        onClick={() => handleReply('reply-3', 'Sarah Wilson')}
                      >
                        Reply
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
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
