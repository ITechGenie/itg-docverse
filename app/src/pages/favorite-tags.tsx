import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Search, Grid3X3, Cloud, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TagCloud } from '@/components/ui/tag-cloud';
import { api } from '@/lib/api-client';
import type { Tag as TagType } from '@/types';

interface TagStats extends TagType {
  postsCount: number;
  isFavorited: boolean;
  color: string; // Make color required for TagStats
}

export default function FavoriteTags() {
  const navigate = useNavigate();
  const [favoriteTags, setFavoriteTags] = useState<TagStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'cloud' | 'grid'>('cloud');

  useEffect(() => {
    loadFavoriteTags();
  }, []);

  const loadFavoriteTags = async () => {
    setLoading(true);
    try {
      // Get user's favorite tag IDs
      const favoritesResponse = await api.getUserFavoriteTags();
      if (!favoritesResponse.success || !favoritesResponse.data?.length) {
        setFavoriteTags([]);
        setLoading(false);
        return;
      }

      // Get all popular tags to match with favorites
      const tagsResponse = await api.getPopularTags(100);
      if (tagsResponse.success && tagsResponse.data && favoritesResponse.data) {
        // Filter to only show favorite tags
        const favoriteTagsData = tagsResponse.data
          .filter(tag => favoritesResponse.data!.includes(tag.id))
          .map(tag => ({
            ...tag,
            isFavorited: true,
            color: tag.color || '#3b82f6' // Ensure color is always defined
          }));
        
        setFavoriteTags(favoriteTagsData);
      }
    } catch (error) {
      console.error('Failed to load favorite tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnfavoriteTag = async (tagId: string) => {
    try {
      const response = await api.toggleReaction(tagId, 'event-favorite', 'tag');
      if (response.success) {
        // Remove the tag from favorites list
        setFavoriteTags(prev => prev.filter(tag => tag.id !== tagId));
      }
    } catch (error) {
      console.error('Failed to unfavorite tag:', error);
    }
  };

  const filteredTags = favoriteTags.filter(tag =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tag.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Heart className="w-6 h-6 sm:w-8 sm:h-8 text-pink-600" />
            My Favorite Tags
          </h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            Manage your favorite tags and discover related content
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* View Toggle */}
          <div className="flex items-center border rounded-lg p-1">
            <Button
              variant={viewMode === 'cloud' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('cloud')}
              className="h-8 px-3"
            >
              <Cloud className="w-4 h-4 mr-1" />
              Cloud
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="h-8 px-3"
            >
              <Grid3X3 className="w-4 h-4 mr-1" />
              Grid
            </Button>
          </div>
          
          <Button variant="outline" onClick={() => navigate('/tags')}>
            Browse All Tags
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search favorite tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="secondary" className="text-sm">
          {filteredTags.length} favorite tags
        </Badge>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading favorite tags...</p>
          </div>
        </div>
      ) : favoriteTags.length === 0 ? (
        <div className="text-center py-12">
          <Heart className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-30" />
          <h3 className="text-lg font-medium mb-2">No favorite tags yet</h3>
          <p className="text-muted-foreground mb-4">
            Start favoriting tags to see them here and get personalized content recommendations.
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => navigate('/tags')}>
              Browse All Tags
            </Button>
            <Button variant="outline" onClick={() => navigate('/tags/popular')}>
              View Popular Tags
            </Button>
          </div>
        </div>
      ) : (
        <>
          {viewMode === 'cloud' ? (
            <Card className="min-h-[600px]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cloud className="w-5 h-5" />
                  Favorite Tags Cloud
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <TagCloud
                  tags={filteredTags}
                  onTagClick={(tag) => navigate(`/documents?tag=${tag.id}`)}
                  onTagFavorite={handleUnfavoriteTag}
                  showActions={true}
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredTags.map((tag) => (
                <Card key={tag.id} className="group hover:shadow-lg transition-all duration-200 cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div 
                        className="flex items-center gap-2 flex-1"
                        onClick={() => navigate(`/documents?tag=${tag.id}`)}
                      >
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: tag.color || '#3b82f6' }}
                        />
                        <h3 className="font-semibold truncate">{tag.name}</h3>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-pink-600 hover:text-pink-700"
                          onClick={() => handleUnfavoriteTag(tag.id)}
                          title="Remove from favorites"
                        >
                          <Heart className="w-4 h-4 fill-current" />
                        </Button>
                      </div>
                    </div>
                    
                    {tag.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {tag.description}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <Badge 
                        variant="secondary" 
                        className="text-xs"
                        style={{ 
                          backgroundColor: `${tag.color || '#3b82f6'}15`,
                          color: tag.color || '#3b82f6',
                          borderColor: `${tag.color || '#3b82f6'}30`
                        }}
                      >
                        {tag.postsCount} posts
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => navigate(`/feed/favorite-tags`)}
                        >
                          <Star className="w-3 h-3 mr-1" />
                          View Posts
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {filteredTags.length > 0 && (
        <div className="text-center pt-6">
          <p className="text-sm text-muted-foreground mb-4">
            Want to see posts from your favorite tags?
          </p>
          <Button onClick={() => navigate('/feed/favorite-tags')}>
            <Star className="w-4 h-4 mr-2" />
            View Tagged Favorites
          </Button>
        </div>
      )}
    </div>
  );
}
