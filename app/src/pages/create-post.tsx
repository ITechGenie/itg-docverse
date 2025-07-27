import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import MDEditor from '@uiw/react-md-editor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { api } from '@/lib/api-client';
import type { CreatePostData } from '@/types';

const createPostSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  tags: z.string().max(100, 'Tags too long'),
  coverImage: z.string().url().optional().or(z.literal('')),
});

type CreatePostForm = z.infer<typeof createPostSchema>;

export default function CreatePost() {
  const navigate = useNavigate();
  
  // Determine post type from route
  const getPostTypeFromRoute = (): 'long-form' | 'short-form' | 'thoughts' => {
    const path = window.location.hash;
    if (path.includes('/create/article')) return 'long-form';
    if (path.includes('/create/thoughts')) return 'thoughts';
    return 'long-form'; // default
  };

  const [activeTab, setActiveTab] = useState<'long-form' | 'short-form' | 'thoughts'>(getPostTypeFromRoute());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [markdownContent, setMarkdownContent] = useState('');

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
      tags: '',
    },
  });

  const contentValue = watch('content');

  const onSubmit = async (data: CreatePostForm) => {
    setIsSubmitting(true);
    try {
      const postData: CreatePostData = {
        type: activeTab,
        title: activeTab === 'long-form' ? data.title : undefined,
        content: activeTab === 'long-form' ? markdownContent : (data.content || ''),
        coverImage: data.coverImage || undefined,
        tags: data.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      };

      const response = await api.createPost(postData);
      if (response.success && response.data) {
        navigate(`/#/post/${response.data.id}`);
      }
    } catch (error) {
      console.error('Failed to create post:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Create New Post</h1>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('long-form')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'long-form'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Article (Markdown)
        </button>
        <button
          onClick={() => setActiveTab('thoughts')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'thoughts'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Quick Thoughts
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {activeTab === 'long-form' && (
          <div className="space-y-4">
            <div>
              <Input
                placeholder="Enter article title..."
                {...register('title')}
                className="text-lg"
              />
              {errors.title && (
                <p className="text-sm text-destructive mt-1">{errors.title.message}</p>
              )}
            </div>

            <div>
              <Input
                placeholder="Cover image URL (optional)"
                {...register('coverImage')}
              />
              {errors.coverImage && (
                <p className="text-sm text-destructive mt-1">{errors.coverImage.message}</p>
              )}
            </div>
          </div>
        )}

        <div>
          {activeTab === 'long-form' ? (
            <div data-color-mode="dark">
              <MDEditor
                value={markdownContent}
                onChange={(value) => {
                  setMarkdownContent(value || '');
                  setValue('content', value || '');
                }}
                preview="edit"
                height={400}
              />
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
          <Input
            placeholder="Add tags (comma separated, max 5)"
            {...register('tags')}
          />
          <p className="text-sm text-muted-foreground mt-1">
            e.g., javascript, react, typescript
          </p>
          {errors.tags && (
            <p className="text-sm text-destructive mt-1">{errors.tags.message}</p>
          )}
        </div>

        <Separator />

        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/#/feed')}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Publishing...' : 'Publish Post'}
          </Button>
        </div>
      </form>
    </div>
  );
}
