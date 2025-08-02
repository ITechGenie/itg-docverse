import type { Post } from '@/types';
import postsData from '@/mocks/posts.json';
import postDetailsData from '@/mocks/post-details.json';

export const postsApi = {
  // Get posts for feed (without full content for long-form posts)
  async getPosts(): Promise<{ success: boolean; data: Post[] }> {
    return postsData as { success: boolean; data: Post[] };
  },

  // Get single post with full content for detail view
  async getPost(id: string): Promise<Post | null> {
    const feedPost = postsData.data.find(post => post.id === id) as Post | undefined;
    if (!feedPost) return null;

    // For long-form posts, merge with full content from post-details
    if (feedPost.type === 'long-form' && postDetailsData[id as keyof typeof postDetailsData]) {
      return {
        ...feedPost,
        content: postDetailsData[id as keyof typeof postDetailsData].content
      } as Post;
    }

    // For thoughts and short-form, content is already in the feed data
    return feedPost;
  }
};
