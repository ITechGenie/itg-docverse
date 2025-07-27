import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
  MessageCircle, 
  Bookmark, 
  Eye,
  Share2,
  MoreHorizontal,
  Copy,
  Edit3,
  GitBranch,
  Clock,
  ExternalLink,
  Lock,
  History
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { getAvatarUrl } from '@/lib/avatar';
import { api } from '@/lib/api-client';
import type { Post, ReactionType } from '@/types';

const HeartPlusIcon = ({ className }: { className?: string }) => (
    <svg   
    className={className} 
    width="24" height="24" 
    viewBox="0 0 24 24" 
     fill="none" 
    role="img" 
    aria-hidden="true"
>
    <g clipPath="url(#clip0_988_3276)">
        <path d="M19 14V17H22V19H18.999L19 22H17L16.999 19H14V17H17V14H19ZM20.243 4.75698C22.505 7.02498 22.583 10.637 20.479 12.992L19.059 11.574C20.39 10.05 20.32 7.65998 18.827 6.16998C17.324 4.67098 14.907 4.60698 13.337 6.01698L12.002 7.21498L10.666 6.01798C9.09103 4.60598 6.67503 4.66798 5.17203 6.17198C3.68203 7.66198 3.60703 10.047 4.98003 11.623L13.412 20.069L12 21.485L3.52003 12.993C1.41603 10.637 1.49503 7.01898 3.75603 4.75698C6.02103 2.49298 9.64403 2.41698 12 4.52898C14.349 2.41998 17.979 2.48998 20.242 4.75698H20.243Z" fill="#828282ff"></path>
    </g>
    <defs>
        <clipPath id="clip0_988_3276">
        <rect width="24" height="24" fill="white"></rect>
        </clipPath>
    </defs>
</svg>
); 

const reactionEmojis: Record<ReactionType, React.ReactNode> = {
  'event-heart': <span className="text-xl">❤️</span>,
  'event-broken-heart': <span className="text-xl">💔</span>,
  'event-thumbs-up': <span className="text-xl">👍</span>,
  'event-thumbs-down': <span className="text-xl">👎</span>,
  'event-unicorn': <span className="text-xl">🦄</span>,
  'event-fire': <span className="text-xl">🔥</span>,
  'event-celebrate': <span className="text-xl">🎉</span>,
  'event-surprised': <span className="text-xl">😮</span>,
  'event-thinking': <span className="text-xl">🤔</span>,
  'event-favorite': <span className="text-xl">⭐</span>,
};

interface PostHeaderProps {
  post: Post;
  showImage?: boolean;
  isDetailView?: boolean;
  onReaction?: (type: ReactionType) => void;
  onShare?: () => void;
  onEdit?: () => void;
  onViewVersions?: () => void;
}

export const PostHeader = ({ 
  post, 
  showImage = true, 
  isDetailView = false,
  onReaction,
  onShare,
  onEdit,
  onViewVersions
}: PostHeaderProps) => {
  const [reactions, setReactions] = useState<any[]>([]);
  const [loadingReactions, setLoadingReactions] = useState(true);
  const [totalReactions, setTotalReactions] = useState(0);
  
  const avatarUrl = getAvatarUrl(post.author.email || post.author.username, 48);
  const formattedDate = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });

  // Fetch reactions independently
  useEffect(() => {
    fetchReactions();
  }, [post.id]);

  const fetchReactions = async () => {
    try {
      setLoadingReactions(true);
      const response = await api.getPostReactions(post.id);
      if (response.success && response.data) {
        console.log('Fetched reactions:', response.data);
        setReactions(response.data);
        setTotalReactions(response.data.length);
      }
    } catch (error) {
      console.error('Failed to fetch reactions:', error);
    } finally {
      setLoadingReactions(false);
    }
  };

  const handleReactionClick = async (type: ReactionType) => {
    if (onReaction) {
      await onReaction(type);
      // Refetch reactions after the action
      await fetchReactions();
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
  };

  return (
    <div className={isDetailView ? "w-full max-w-4xl mx-auto mb-4" : "p-4"}>
      {/* Row 1: Title */}
      {post.title && (
        <div className="mb-4">
          {isDetailView ? (
            <h1 className="text-3xl font-bold tracking-tight">{post.title}</h1>
          ) : (
            <Link to={`/post/${post.id}`} className="block">
              <h3 className="text-xl font-bold text-foreground hover:underline line-clamp-2">
                {post.title}
              </h3>
            </Link>
          )}
        </div>
      )}

      {/* Row 2: Author Left, Reaction Actions Right */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <Link to={`/profile/${post.author.username}`}>
            <Avatar className="w-10 h-10 hover:ring-2 hover:ring-primary transition-all">
              <AvatarImage src={avatarUrl} alt={post.author.displayName} />
              <AvatarFallback>
                {post.author.displayName.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div>
            <Link 
              to={`/profile/${post.author.username}`}
              className="font-semibold text-foreground hover:underline"
            >
              {post.author.displayName}
            </Link>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <time>{formattedDate}</time>
              {post.readTime && (
                <>
                  <span>•</span>
                  <span>{post.readTime} min read</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Reaction Actions */}
        <div className="flex items-center space-x-2">
          {/* Reaction Dropdown with Heart+ */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center space-x-2 text-muted-foreground hover:text-foreground"
                title="Add reaction"
              >
                <HeartPlusIcon className="w-4 h-4" />
                <span className="text-sm">{loadingReactions ? '...' : totalReactions}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="grid grid-cols-5 gap-1 p-2">
                {(Object.keys(reactionEmojis) as ReactionType[]).map((reactionType) => (
                  <DropdownMenuItem
                    key={reactionType}
                    className="flex items-center justify-center p-2 cursor-pointer hover:bg-accent"
                    onClick={() => handleReactionClick(reactionType)}
                  >
                    {reactionEmojis[reactionType]}
                  </DropdownMenuItem>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="sm"
            className="flex items-center space-x-2 text-muted-foreground hover:text-foreground"
            onClick={() => document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth' })}
            title="Jump to comments"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="text-sm">{post.stats.totalComments}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleReactionClick('event-favorite')}
            className="flex items-center space-x-2 text-muted-foreground hover:text-foreground"
            title="Save"
          >
            <Bookmark className={`w-4 h-4 ${(() => {
              // Check if current user has favorited this post
              // TODO: Get current user ID from context/auth
              const currentUserId = 'itg-docverse'; // Mock current user
              const userHasFavorited = reactions.some(r => 
                r.reaction_type === 'event-favorite' && r.user_id === currentUserId
              );
              return userHasFavorited ? 'fill-current text-yellow-500' : '';
            })()} `} />
            <span className="text-sm">{(() => {
              // Count favorite reactions for this post
              const favoriteCount = reactions.filter(r => r.reaction_type === 'event-favorite').length;
              return favoriteCount;
            })()}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="flex items-center space-x-2 text-muted-foreground hover:text-foreground"
            onClick={() => {/* TODO: Navigate to Analytics/Engagement page */}}
            title="View engagement analytics"
          >
            <Eye className="w-4 h-4" />
            <span className="text-sm">{post.stats.views}</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
                title="More options"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={onShare}
                className="cursor-pointer"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleCopyLink}
                className="cursor-pointer"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy link
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Row 3: Tags Left, Version Management Right */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <Link key={tag.id} to={`/tags/${tag.name}`}>
              <Badge 
                variant="secondary" 
                className="hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer text-sm px-3 py-1"
                style={{ backgroundColor: `${tag.color}20`, color: tag.color, borderColor: `${tag.color}40` }}
              >
                #{tag.name}
              </Badge>
            </Link>
          ))}
        </div>
        
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          {/* Show version info and management */}
          {post.revision !== undefined && (
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-xs">
                v{post.revision} {post.isLatest && '(Latest)'}
              </Badge>
              {post.status && (
                <Badge 
                  variant={post.status === 'published' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {post.status}
                </Badge>
              )}
            </div>
          )}
          {/* Show edit and version buttons if current user is the author */}
          {post.author.id === 'user-1' && ( // Mock current user ID
            <div className="flex items-center space-x-2">
                {onViewVersions && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs flex items-center space-x-1"
                  onClick={onViewVersions}
                  title="View all versions"
                >
                  <History className="w-3 h-3" />
                  <span>Versions</span>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="text-xs flex items-center space-x-1"
                onClick={onEdit}
              >
                <Edit3 className="w-3 h-3" />
                <span>Edit</span>
              </Button>
              
            </div>
          )}
        </div>
      </div>

      {/* Row 4: Document Metadata (only show for documents) */}
      {post.documentMeta?.isDocument && (
        <div className="flex items-center justify-between mb-4 p-3 bg-muted/20 rounded-lg border">
          <div className="flex items-center space-x-6">
            {/* Document Type Indicator */}
            <div className="flex items-center space-x-2">
              <Lock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {post.status === 'published' ? 'Published Document' : 'Private Document'}
              </span>
            </div>
            
            {/* Project Info */}
            {post.documentMeta.projectId && (
              <div className="flex items-center space-x-2">
                <GitBranch className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {post.documentMeta.projectId}
                  {post.documentMeta.branchName && (
                    <span className="ml-1">({post.documentMeta.branchName})</span>
                  )}
                </span>
              </div>
            )}
            
            {/* Indexed Date */}
            {post.documentMeta.indexedDate && (
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Indexed {formatDistanceToNow(new Date(post.documentMeta.indexedDate), { addSuffix: true })}
                </span>
              </div>
            )}
          </div>
          
          {/* Git URL */}
          {post.documentMeta.gitUrl && (
            <div className="flex items-center">
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs"
                onClick={() => window.open(post.documentMeta!.gitUrl, '_blank')}
              >
                <span className="truncate max-w-[200px]">View Repository</span>
                <ExternalLink className="ml-1 h-3 w-3 flex-shrink-0" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Row 5: Reaction Emojis with Counts (only show if reactions exist and post is published) */}
      {!loadingReactions && reactions.length > 0 && post.status === 'published' && (
        <div className="flex items-center space-x-6 mb-4 p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center space-x-4">
            {(() => {
              // Group reactions by type and count them
              const reactionCounts = reactions.reduce((acc, reaction) => {
                const reactionType = reaction.reaction_type;
                acc[reactionType] = (acc[reactionType] || 0) + 1;
                return acc;
              }, {} as Record<ReactionType, number>);

              console.log('Reaction counts:', reactionCounts);
              console.log('Available emojis:', Object.keys(reactionEmojis));

              return Object.entries(reactionCounts).map(([type, count]) => (
                <div key={type} className="flex items-center space-x-2">
                  {reactionEmojis[type as ReactionType]}
                  <span className="text-muted-foreground font-medium">{count as number}</span>
                </div>
              ));
            })()}
          </div>
          <div className="text-sm text-muted-foreground">
            ({totalReactions} Reactions)
          </div>
        </div>
      )}

      {/* Row 6: Cover Image */}
      {showImage && post.coverImage && (
        <div className="rounded-lg overflow-hidden mb-4">
          <img 
            src={post.coverImage} 
            alt={post.title || 'Post cover'} 
            className="w-full h-64 object-cover"
          />
        </div>
      )}

      {/* Row 7: Separator (only in detail view) */}
      {isDetailView && <hr className="border-y border-border mb-4" />}
    </div>
  );
};
