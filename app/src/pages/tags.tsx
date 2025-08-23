import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tag, Edit, Trash2, Plus, Search, Grid3X3, Cloud, Bookmark } from 'lucide-react';
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

export default function Tags() {
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
      const response = await api.getPopularTags(100); // Load more tags for general tags page
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

  // Mark tags as favorited based on favoriteTags list and ensure proper types
  const tagsWithFavorites = tags.map(tag => ({
    ...tag,
    isFavorited: favoriteTags.includes(tag.id),
    color: tag.color || '#3b82f6' // Ensure color is always defined
  }));

  const filteredTags = tagsWithFavorites.filter(tag =>
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
            <Tag className="w-6 h-6 sm:w-8 sm:h-8" />
            All Tags
          </h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            Explore and manage all tags in the community
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
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Tag name"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description (Optional)</label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Color</label>
                  <div className="flex gap-2 mt-2">
                    {colorOptions.map(color => (
                      <button
                        key={color}
                        className={`w-8 h-8 rounded-full border-2 ${
                          formData.color === color ? 'border-foreground' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setFormData(prev => ({ ...prev, color }))}
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
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="secondary" className="text-sm">
          {filteredTags.length} tags
        </Badge>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading tags...</p>
          </div>
        </div>
      ) : (
        <>
          {viewMode === 'cloud' ? (
            <Card className="min-h-[600px]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cloud className="w-5 h-5" />
                  Tag Cloud
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <TagCloud
                  tags={filteredTags}
                  onTagClick={(tag) => navigate(`/tags/${tag.name}`)}
                  onTagEdit={openEditModal}
                  onTagDelete={handleDeleteTag}
                  onTagFavorite={handleFavoriteTag}
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
                        onClick={() => navigate(`/tags/${tag.name}`)}
                      >
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        <h3 className="font-semibold truncate">{tag.name}</h3>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-8 w-8 p-0 ${tag.isFavorited ? 'text-pink-600' : 'hover:text-pink-600'}`}
                          onClick={() => handleFavoriteTag(tag.id, !tag.isFavorited)}
                        >
                          <Bookmark className={`w-4 h-4 ${tag.isFavorited ? 'fill-current' : ''}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:text-blue-600"
                          onClick={() => openEditModal(tag)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:text-red-600"
                          onClick={() => handleDeleteTag(tag.id)}
                        >
                          <Trash2 className="w-4 h-4" />
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
                          backgroundColor: `${tag.color}15`,
                          color: tag.color,
                          borderColor: `${tag.color}30`
                        }}
                      >
                        {tag.postsCount} posts
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Edit Dialog */}
      {editingTag && (
        <Dialog open={!!editingTag} onOpenChange={() => setEditingTag(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Tag</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Tag name"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Color</label>
                <div className="flex gap-2 mt-2">
                  {colorOptions.map(color => (
                    <button
                      key={color}
                      className={`w-8 h-8 rounded-full border-2 ${
                        formData.color === color ? 'border-foreground' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData(prev => ({ ...prev, color }))}
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
      )}
    </div>
  );
}
