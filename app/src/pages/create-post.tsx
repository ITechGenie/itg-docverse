import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import MDEditor, { commands } from '@uiw/react-md-editor';
import { Plus, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { TagInput } from '@/components/ui/tag-input';
import { createImageUploadCommand, ImageUploadDialog } from '@/components/ui/mdeditor-image-command-new';
import { useTheme } from '@/components/theme-provider';
import { api } from '@/services/api-client';
import type { CreatePostData, Post } from '@/types';
import { useUserMentions, extractMentionedUserIds } from '@/hooks/use-user-mentions';
import { UserMentionSuggestions } from '@/components/ui/user-mention-suggestions';

const createPostSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  tags: z.array(z.string()).max(5, 'Maximum 5 tags allowed'),
  coverImage: z.string().url().optional().or(z.literal('')),
});

type CreatePostForm = z.infer<typeof createPostSchema>;

export default function CreatePost() {
  const defaultPlaceholder = '## Enter your content in markdown format, Type @ to mention users...\n';
  const navigate = useNavigate();
  const location = useLocation();
  const { id, version } = useParams<{ id?: string; version?: string }>();
  const { theme } = useTheme();
  const mentions = useUserMentions();
  
  // Determine if we're in edit mode
  const isEditMode = !!id;
  
  // Determine post type from route
  const getPostTypeFromRoute = (): 'posts' | 'thoughts' => {
    const pathname = location.pathname;
    if (pathname.includes('/create/article')) return 'posts';
    if (pathname.includes('/create/thoughts')) return 'thoughts';
    if (pathname.includes('/edit')) return 'posts'; // Default for edit mode
    return 'posts'; // default
  };

  const [activeTab, setActiveTab] = useState<'posts' | 'thoughts'>(getPostTypeFromRoute());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [markdownContent, setMarkdownContent] = useState('');
  const [currentPost, setCurrentPost] = useState<Post | null>(null);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);

  const handleEditorChange = (value: string | undefined) => {
    const newValue = value || ''; // defaultPlaceholder;
    setMarkdownContent(newValue);
    setValue('content', newValue);
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    //console.log('Textarea keydown event:', e.key);
    // Only trigger mention detection on @ key
    //if (e.key === '@') {
      const textarea = e.currentTarget;
      const cursorPos = textarea.selectionStart;
      //console.debug('Cursor position for mention:', cursorPos);
      mentions.detectMention(markdownContent, cursorPos, textarea);
   // }
  };

  const handleUserSelect = (user: any) => {
    const { value: newValue, cursorPosition: newCursorPos } = mentions.insertMention(user, markdownContent);
    setMarkdownContent(newValue);
    setValue('content', newValue);
    mentions.setShowSuggestions(false);
    setCursorPosition(newCursorPos);
    
    // Set focus and cursor position after state updates
    setTimeout(() => {
      const textarea = document.querySelector('.w-md-editor-text-input') as HTMLTextAreaElement;
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  // Function to insert image into markdown content
  const handleImageInsert = (markdown: string) => {
    setMarkdownContent(prevContent => {
      const newContent = prevContent ? `${prevContent}\n\n${markdown}` : markdown;
      setValue('content', newContent);
      return newContent;
    });
  };

  // Set up global callback for MDEditor image insertion
  useEffect(() => {
    console.log('Setting up global callbacks...');
    window.insertMarkdownCallback = handleImageInsert;
    window.showImageUploadDialog = () => {
      console.log('showImageUploadDialog called!');
      setShowImageDialog(true);
    };
    
    return () => {
      delete window.insertMarkdownCallback;
      delete window.showImageUploadDialog;
    };
  }, []);

  //console.log('Mentions.showSuggestions:', mentions.showSuggestions);

  // Create custom commands for MDEditor
  const imageUploadCommand = createImageUploadCommand();
  //console.log('Image upload command created:', imageUploadCommand);

  const customCommands = [
    commands.bold,
    commands.italic,
    commands.strikethrough,
    commands.hr,
    commands.title,
    commands.divider,
    commands.link,
    commands.image, // Original image command for external URLs
    imageUploadCommand, // Our custom image upload command
    commands.code,
    commands.codeBlock,
    commands.comment,
    commands.divider,
    commands.unorderedListCommand,
    commands.orderedListCommand,
    commands.checkedListCommand,
    commands.divider,
    commands.codeEdit,
    commands.codeLive,
    commands.codePreview,
    commands.divider,
    commands.fullscreen,
  ];

  // Update tab when route changes
  useEffect(() => {
    setActiveTab(getPostTypeFromRoute());
  }, [location.pathname]);

  // Fetch existing post data if in edit mode
  useEffect(() => {
    if (isEditMode && id) {
      fetchPostForEdit();
    }
  }, [isEditMode, id, version]);

  const fetchPostForEdit = async () => {
    if (!id) return;
    
    try {
      setIsLoading(true);
      console.log(`Fetching post for edit: ${id}, version: ${version}`);
      
      // Fetch the post (with version if specified)
      const response = version 
        ? await api.getPostVersion(id, parseInt(version))
        : await api.getPost(id);
      
      if (response.success && response.data) {
        const post = response.data;
        setCurrentPost(post);
        
        // Set the post type tab based on the post - map backend types to UI types
        if (post.type === 'posts' || post.type === 'llm-long' || post.type === 'llm-short' || 
            post.type === 'block-diagram' || post.type === 'code-snippet' || post.type === 'discussion') {
          setActiveTab('posts');
        } else if (post.type === 'thoughts') {
          setActiveTab('thoughts');
        } else {
          setActiveTab('posts'); // default
        }
        
        // Pre-populate form fields
        setValue('title', post.title || '');
        setValue('content', post.content || '');
        setValue('coverImage', post.coverImage || '');
        setValue('tags', post.tags?.map(tag => tag.name) || []);
        
        // Set markdown content for the editor
        setMarkdownContent(post.content || '');
        
        console.log('Post loaded for editing:', post);
      } else {
        console.error('Failed to fetch post for editing:', response.error);
      }
    } catch (error) {
      console.error('Error fetching post for edit:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CreatePostForm>({
    resolver: zodResolver(createPostSchema),
    defaultValues: {
      content: '',
      tags: [],
    },
  });

  const contentValue = watch('content');

  const handleSavePost = async (data: CreatePostForm, status: 'draft' | 'published' | 'archived' | 'frozen') => {
    setIsSubmitting(true);
    try {
      if (isEditMode && id) {
        // Update existing post
        const content = activeTab === 'posts' ? markdownContent : (data.content || '');
        const mentionedUserIds = activeTab === 'posts' ? extractMentionedUserIds(markdownContent) : [];
        
        const updateData = {
          title: activeTab === 'posts' ? data.title : undefined,
          content,
          coverImage: data.coverImage || undefined,
          tags: data.tags || [],
          status: status,
          mentionedUserIds,
        };

        console.log('Updating post:', id, updateData);
        const response = await api.updatePost(id, updateData);
        if (response.success && response.data) {
          navigate(`/post/${id}`);
        } else {
          console.error('Failed to update post:', response.error);
        }
      } else {
        // Create new post
        const content = activeTab === 'posts' ? markdownContent : (data.content || '');
        const mentionedUserIds = activeTab === 'posts' ? extractMentionedUserIds(markdownContent) : [];
        
        const postData: CreatePostData = {
          type: activeTab,
          title: activeTab === 'posts' ? data.title : undefined,
          content,
          coverImage: data.coverImage || undefined,
          tags: data.tags || [],
          status: status,
          mentionedUserIds,
        };

        console.log('Creating post with status:', status, postData);
        const response = await api.createPost(postData);
        if (response.success && response.data) {
          navigate(`/post/${response.data.id}`);
        }
      }
    } catch (error) {
      console.error('Failed to save post:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmit = async (data: CreatePostForm) => {
    // Default to published status (this is for the main Publish button)
    await handleSavePost(data, 'published');
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight flex items-center gap-2">
          {isEditMode ? (
            <>
              <Edit className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 shrink-0" />
              Edit Content
            </>
          ) : (
            <>
              <Plus className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 shrink-0" />
              Create New Content
            </>
          )}
          {isEditMode && currentPost && (
            <span className="text-base sm:text-lg lg:text-xl font-normal text-muted-foreground ml-2">
              - {currentPost.title || `${currentPost.type} post`}
            </span>
          )}
        </h1>
        {isEditMode && currentPost && (
          <div className="text-sm text-muted-foreground">
            Post Type: <span className="font-medium capitalize">{currentPost.type.replace('-', ' ')}</span>
          </div>
        )}
      </div>

      {/* Show loading state when fetching post for edit */}
      {isEditMode && isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="text-muted-foreground">Loading post...</div>
        </div>
      )}

      {/* Don't show form until post is loaded in edit mode */}
      {(!isEditMode || !isLoading) && (
        <>
          {/* Tab Navigation - only show in create mode */}
          {!isEditMode && (
            <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
              <button
                onClick={() => {
                  setActiveTab('posts');
                  navigate('/create/article');
                }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'posts'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Post (Markdown)
              </button>
              <button
                onClick={() => {
                  setActiveTab('thoughts');
                  navigate('/create/thoughts');
                }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'thoughts'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Quick Thoughts
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {activeTab === 'posts' && (
          <div className="space-y-4">
            <div>
              <Input
                placeholder="Enter post title..."
                {...register('title')}
                className="text-lg"
              />
              {errors.title && (
                <p className="text-sm text-destructive mt-1">{errors.title.message}</p>
              )}
            </div>

            {/*<div>
              <Input
                placeholder="Cover image URL (optional)"
                {...register('coverImage')}
              />
              {errors.coverImage && (
                <p className="text-sm text-destructive mt-1">{errors.coverImage.message}</p>
              )}
            </div>*/}
          </div>
        )}

        <div>
          {activeTab === 'posts' ? (
            <div data-color-mode={theme === 'dark' ? 'dark' : 'light'}>
              <div className="flex mt-1 text text-xs text-muted-foreground">
                <span className='ml-auto text-right p-1'>
                  Use the mode buttons below to switch between Edit, Live Preview, and Split View.<br />
                </span>
              </div>
              <MDEditor
                value={markdownContent}
                onChange={handleEditorChange}
                textareaProps={{
                  onKeyUp: handleTextareaKeyDown,
                  placeholder: defaultPlaceholder,
                }}
                data-color-mode={theme === 'dark' ? 'dark' : 'light'}
                preview="live"
                height={400}
                commands={customCommands}
              />

              {/* Mention Suggestions */}
              {mentions.showSuggestions && (
                <UserMentionSuggestions
                  searchTerm={mentions.mentionSearch}
                  position={mentions.mentionPosition}
                  onSelect={handleUserSelect}
                  onClose={() => mentions.setShowSuggestions(false)}
                />
              )}

            </div>
          ) : (
            <div>
              <textarea
                {...register('content')}
                placeholder="Share your thoughts..."
                className="w-full h-32 p-3 border border-border rounded-md bg-background text-foreground resize-none"
                maxLength={280}
              />
              <div className="flex justify-between items-center mt-2">
                <p className="text-sm text-muted-foreground">
                  {contentValue?.length || 0}/280 characters
                </p>
              </div>
            </div>
          )}
          {errors.content && (
            <p className="text-sm text-destructive mt-1">{errors.content.message}</p>
          )}
        </div>

        <div>
          <TagInput
            value={watch('tags') || []}
            onChange={(tags) => setValue('tags', tags)}
            placeholder="Add or search tags..."
            maxTags={5}
            disabled={isSubmitting}
          />
          {errors.tags && (
            <p className="text-sm text-destructive mt-1">{errors.tags.message}</p>
          )}
        </div>

        <Separator />

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:items-center gap-2 sm:gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(isEditMode ? `/post/${id}` : '/feed')}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            disabled={isSubmitting}
            onClick={handleSubmit((data) => handleSavePost(data, 'archived'))}
            className="w-full sm:w-auto"
          >
            {isSubmitting 
              ?  'Archiving...'
              : 'Archive'
            }
          </Button>
          {/*<Button 
            type="button" 
            variant="outline" 
            disabled={isSubmitting}
            onClick={handleSubmit((data) => handleSavePost(data, 'frozen'))}
          >
            {isSubmitting 
              ? (isEditMode ? 'Saving...' : 'Saving...') 
              : 'Freeze'
            }
          </Button> */}
          <Button 
            type="button" 
            variant="outline" 
            disabled={isSubmitting}
            onClick={handleSubmit((data) => handleSavePost(data, 'draft'))}
            className="w-full sm:w-auto"
          >
            {isSubmitting 
              ? (isEditMode ? 'Saving...' : 'Saving...') 
              : 'Save Draft'
            }
          </Button>
          <Button 
            type="button" 
            disabled={isSubmitting}
            onClick={handleSubmit((data) => handleSavePost(data, 'published'))}
            className="w-full sm:w-auto"
          >
            {isSubmitting 
              ? (isEditMode ? 'Publishing...' : 'Publishing...') 
              : 'Publish Content'
            }
          </Button>
        </div>
      </form>
        </>
      )}

      {/* Image Upload Dialog */}
      <ImageUploadDialog 
        open={showImageDialog} 
        onOpenChange={setShowImageDialog}
        onImageInsert={handleImageInsert}
      />
      <br /><br />
    </div>
  );
}
