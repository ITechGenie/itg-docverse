import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { PostHeader } from '@/components/common/post-header';
import { MarkdownRenderer } from '@/components/common/markdown-renderer';
import { DiscussionSection } from '@/components/common/discussion-section';
import { api } from '@/lib/api-client';
import type { Post, ReactionType } from '@/types';

interface PostDetailProps {
  post?: Post | null;
  loading?: boolean;
  isDocument?: boolean;
  documentType?: string;
  onEdit?: () => void;
  onViewVersions?: () => void;
}

export default function PostDetail(props: PostDetailProps) {
  // If props are provided, use them (wrapper component)
  // Otherwise, use internal state (standalone component)
  const { id, version, docType } = useParams<{ id: string; version?: string; docType?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [internalPost, setInternalPost] = useState<Post | null>(null);
  const [internalLoading, setInternalLoading] = useState(true);

  const post = props.post !== undefined ? props.post : internalPost;
  const loading = props.loading !== undefined ? props.loading : internalLoading;

  useEffect(() => {
    // Skip fetching if props are provided (wrapper component handles it)
    if (props.post !== undefined) return;
    
    const fetchPost = async () => {
      if (!id) return;
      
      try {
        setInternalLoading(true);
        
        console.log(`Fetching post with ID: ${id}`);
        console.log(`Current path: ${location.pathname}`);
        console.log(`Version: ${version}, DocType: ${docType}`);
        
        // For standalone usage, handle both posts and documents
        const isDocumentRoute = location.hash.includes('/code-summaries/documents/');
        const isDocumentType = docType && isNaN(parseInt(docType));
        const versionToFetch = version || (isDocumentType ? undefined : docType);
        
        console.log(`Fetching version: ${versionToFetch}`);
        
        const response = versionToFetch ? await api.getPostVersion(id, parseInt(versionToFetch)) : await api.getPost(id);
        
        console.log('API Response:', response);
        
        if (response.success && response.data) {
          setInternalPost(response.data);
          
          if (isDocumentRoute && isDocumentType) {
            console.log(`Viewing document ${id} with type: ${docType}`);
          }
        } else {
          console.error('No data in API response:', response);
        }
      } catch (error) {
        console.error('Failed to fetch post:', error);
      } finally {
        setInternalLoading(false);
      }
    };

    fetchPost();
  }, [id, version, docType, props.post]); // Remove location.pathname dependency

  const handleReaction = async (type: ReactionType) => {
    if (!post) return;
    try {
      // Simulate API call - in real app this would be implemented
      console.log(`Added ${type} reaction to post ${post.id}`);
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  };

  const handleFavorite = async () => {
    if (!post) return;
    try {
      // Simulate API call - in real app this would be implemented
      console.log(`Favorited post ${post.id}`);
    } catch (error) {
      console.error('Failed to favorite post:', error);
    }
  };

  const handleShare = async () => {
    if (!post) return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      console.log('Post URL copied to clipboard');
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  };

  const handleEdit = () => {
    if (!post) return;
    
    // Use provided handler if available (wrapper component)
    if (props.onEdit) {
      props.onEdit();
      return;
    }
    
    // Default handler for standalone usage
    const isDocumentRoute = location.hash.includes('/code-summaries/documents');
    const basePath = isDocumentRoute ? `/code-summaries/documents/${id}` : `/post/${id}`;
    
    if (version && version !== '0') {
      navigate(`${basePath}/${version}/edit`);
    } else {
      navigate(`${basePath}/edit`);
    }
  };

  const handleViewVersions = () => {
    if (!post) return;
    
    // Use provided handler if available (wrapper component)
    if (props.onViewVersions) {
      props.onViewVersions();
      return;
    }
    
    // Default handler for standalone usage
    const isDocumentRoute = location.hash.includes('/code-summaries/documents');
    const basePath = isDocumentRoute ? `/code-summaries/documents/${id}` : `/post/${id}`;
    navigate(`${basePath}/versions`);
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <div className="flex items-center space-x-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="w-full max-w-4xl mx-auto text-center py-12">
        <h1 className="text-2xl font-bold text-muted-foreground">Post not found</h1>
        <Link to="/feed" className="text-primary hover:underline mt-4 inline-block">
          Back to Feed
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* PostHeader Component - Rows 1-7 */}
      <PostHeader 
        post={post}
        showImage={true}
        isDetailView={true}
        onReaction={handleReaction}
        onFavorite={handleFavorite}
        onShare={handleShare}
        onEdit={handleEdit}
        onViewVersions={handleViewVersions}
      />

      {/* Row 8: Content */}
      <div className="w-full max-w-4xl mx-auto py-6">
        {post.content && post.content.trim() ? (
          post.type === 'long-form' ? (
            <MarkdownRenderer content={post.content} />
          ) : (
            <div className="prose prose-lg max-w-none dark:prose-invert">
              <div className="text-lg whitespace-pre-wrap">
                {post.content}
              </div>
            </div>
          )
        ) : post.type === 'thoughts' ? (
          <div className="text-center py-4">
            <p className="text-muted-foreground italic">Just a thought...</p>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading content...</p>
          </div>
        )}
      </div>

      {/* Row 9: Discussion Section */}
      <DiscussionSection post={post} showBottomBar={true} />
    </div>
  );
}
