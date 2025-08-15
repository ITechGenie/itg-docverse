import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tag, Edit, Trash2, Plus, Search, TrendingUp, Grid3X3, Cloud, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TagCloud } from '@/components/ui/tag-cloud';
import { api } from '@/lib/api-client';
import type { Tag as TagType } from '@/types';

interface TagStats extends TagType {
  postsCount: number;
  isFavorited?: boolean;
}

interface TagFormData {
  name: string;
  description?: string;
  color: string;
}

export default function PopularTags() {
  const navigate = useNavigate();
  const [tags, setTags] = useState<TagStats[]>([]);
  const [favoriteTags, setFavoriteTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'cloud' | 'grid'>('cloud');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<TagStats | null>(null);
  const [formData, setFormData] = useState<TagFormData>({
    name: '',
    description: '',
    color: '#3b82f6'
  });

  useEffect(() => {
    loadTags();
    loadFavoriteTags();
  }, []);

  const loadTags = async () => {
    setLoading(true);
    try {
      const response = await api.getPopularTags(50);
      if (response.success && response.data) {
        setTags(response.data);
      }
    } catch (error) {
      console.error('Failed to load tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFavoriteTags = async () => {
    try {
      const response = await api.getUserFavoriteTags();
      if (response.success && response.data) {
        setFavoriteTags(response.data);
      }
    } catch (error) {
      console.error('Failed to load favorite tags:', error);
    }
  };

  const handleCreateTag = async () => {
    if (!formData.name.trim()) return;

    try {
      const response = await api.createTag({
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
        color: formData.color
      });

      if (response.success) {
        await loadTags();
        setIsCreateModalOpen(false);
        resetForm();
      }
    } catch (error) {
      console.error('Failed to create tag:', error);
    }
  };

  const handleUpdateTag = async () => {
    if (!editingTag || !formData.name.trim()) return;

    try {
      const response = await api.updateTag(editingTag.id, {
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
        color: formData.color
      });

      if (response.success) {
        await loadTags();
        setEditingTag(null);
        resetForm();
      }
    } catch (error) {
      console.error('Failed to update tag:', error);
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    if (!confirm('Are you sure you want to delete this tag? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await api.deleteTag(tagId);
      if (response.success) {
        await loadTags();
      }
    } catch (error) {
      console.error('Failed to delete tag:', error);
    }
  };

  const handleFavoriteTag = async (tagId: string, isFavorited: boolean) => {
    try {
      const response = await api.toggleReaction(tagId, 'event-favorite', 'tag');
      if (response.success) {
        // Update the local state to reflect the favorite status
        setTags(prevTags => 
          prevTags.map(tag => 
            tag.id === tagId 
              ? { ...tag, isFavorited: isFavorited }
              : tag
          )
        );
        
        // Update favorite tags list
        if (isFavorited) {
          setFavoriteTags(prev => [...prev, tagId]);
        } else {
          setFavoriteTags(prev => prev.filter(id => id !== tagId));
        }
      }
    } catch (error) {
      console.error('Failed to toggle tag favorite:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: '#3b82f6'
    });
  };

  const openEditModal = (tag: TagStats) => {
    setEditingTag(tag);
    setFormData({
      name: tag.name,
      description: tag.description || '',
      color: tag.color || '#3b82f6'
    });
  };

  const filteredTags = tags
    .map(tag => ({
      ...tag,
      isFavorited: favoriteTags.includes(tag.id)
    }))
    .filter(tag =>
      tag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tag.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const colorOptions = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
    '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
    '#f97316', '#6366f1', '#14b8a6', '#eab308'
  ];

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8" />
            Popular Tags
          </h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            Manage and explore the most popular tags in the community
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
          
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Tag
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Tag</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter tag name..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description (optional)</label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter tag description..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Color</label>
                  <div className="flex gap-2 mt-2">
                    {colorOptions.map(color => (
                      <button
                        key={color}
                        type="button"
                        className={`w-6 h-6 rounded-full border-2 ${
                          formData.color === color ? 'border-foreground' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setFormData({ ...formData, color })}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateTag}>
                    Create Tag
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Search tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tags Display */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="text-muted-foreground">Loading tags...</div>
        </div>
      ) : viewMode === 'cloud' ? (
        /* Tag Cloud View */
        <Card className="min-h-[400px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="w-5 h-5" />
              Tag Cloud
              <Badge variant="secondary" className="ml-2">
                {filteredTags.length} tags
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TagCloud
              tags={filteredTags.map(tag => ({
                id: tag.id,
                name: tag.name,
                color: tag.color || '#3b82f6',
                postsCount: tag.postsCount,
                isFavorited: tag.isFavorited || false
              }))}
              onTagClick={(tag) => navigate(`/#/posts?tag=${encodeURIComponent(tag.name)}`)}
              onTagEdit={openEditModal}
              onTagDelete={handleDeleteTag}
              onTagFavorite={handleFavoriteTag}
              className="min-h-[300px]"
            />
          </CardContent>
        </Card>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{filteredTags.map((tag) => (
            <Card key={tag.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: tag.color || '#3b82f6' }}
                    />
                    <CardTitle className="text-lg">{tag.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`${tag.isFavorited ? 'text-pink-600 hover:bg-pink-50' : 'hover:bg-pink-100 hover:text-pink-600'}`}
                      onClick={() => handleFavoriteTag(tag.id, !tag.isFavorited)}
                      title={tag.isFavorited ? "Remove from favorites" : "Add to favorites"}
                    >
                      <Bookmark className={`w-4 h-4 ${tag.isFavorited ? 'fill-current' : ''}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(tag)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTag(tag.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {tag.description && (
                  <p className="text-sm text-muted-foreground mb-3">
                    {tag.description}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs">
                    {tag.postsCount} posts
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/#/posts?tag=${encodeURIComponent(tag.name)}`)}
                  >
                    View Posts
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      <Dialog open={!!editingTag} onOpenChange={(open) => !open && setEditingTag(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Tag</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter tag name..."
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description (optional)</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter tag description..."
              />
            </div>
            <div>
              <label className="text-sm font-medium">Color</label>
              <div className="flex gap-2 mt-2">
                {colorOptions.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`w-6 h-6 rounded-full border-2 ${
                      formData.color === color ? 'border-foreground' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingTag(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateTag}>
                Update Tag
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {filteredTags.length === 0 && !loading && (
        <div className="text-center py-12">
          <Tag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No tags found</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery ? 'Try adjusting your search query.' : 'Create your first tag to get started.'}
          </p>
          {!searchQuery && (
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Tag
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
