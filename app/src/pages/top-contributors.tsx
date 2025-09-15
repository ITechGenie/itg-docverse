import React, { useState, useEffect } from 'react';
import { Grid3X3, Cloud, Trophy, Eye, Heart, TrendingUp, Search, Filter, Users2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AuthorCloud } from '@/components/ui/author-cloud';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/services/api-client';
import { navigateTo } from '@/lib/routing';

interface Author {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  bio?: string;
  postsCount: number;
  totalViews: number;
  totalLikes: number;
  firstPostDate?: string;
  lastPostDate?: string;
  color: string;
}

const TopContributors: React.FC = () => {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cloud' | 'grid'>('cloud');
  const [sortBy, setSortBy] = useState<'posts' | 'views' | 'likes'>('posts');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredAuthors, setFilteredAuthors] = useState<Author[]>([]);

  // Load authors data
  useEffect(() => {
    const loadAuthors = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await api.getTopAuthors(50, sortBy);
        if (response.success && response.data) {
          setAuthors(response.data);
        } else {
          setError(response.error || 'Failed to load contributors');
        }
      } catch (err) {
        console.error('Error loading contributors:', err);
        setError('Failed to load contributors');
      } finally {
        setLoading(false);
      }
    };

    loadAuthors();
  }, [sortBy]);

  // Filter authors based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredAuthors(authors);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = authors.filter(author =>
        author.name.toLowerCase().includes(query) ||
        author.email.toLowerCase().includes(query) ||
        (author.bio && author.bio.toLowerCase().includes(query))
      );
      setFilteredAuthors(filtered);
    }
  }, [authors, searchQuery]);

  const handleAuthorClick = (author: Author) => {
    console.log('Author clicked:', author);
    navigateTo(`/profile/${author.id}`);
  };

  const getSortLabel = () => {
    switch (sortBy) {
      case 'views':
        return 'Total Views';
      case 'likes':
        return 'Total Likes';
      default:
        return 'Posts Count';
    }
  };

  const getSortIcon = () => {
    switch (sortBy) {
      case 'views':
        return <Eye className="w-4 h-4" />;
      case 'likes':
        return <Heart className="w-4 h-4" />;
      default:
        return <Trophy className="w-4 h-4" />;
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading top contributors...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Users2Icon className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium mb-2">Error Loading Contributors</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg  ">
              <Users2Icon className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Top Contributors</h1>
            
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-3 flex-wrap">
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
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search contributors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Sort Controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="w-4 h-4" />
              Sort by:
            </div>
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    {getSortIcon()}
                    {getSortLabel()}
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="posts">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4" />
                    Posts Count
                  </div>
                </SelectItem>
                <SelectItem value="views">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Total Views
                  </div>
                </SelectItem>
                <SelectItem value="likes">
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4" />
                    Total Reactions
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            <span>{filteredAuthors.length} contributors</span>
          </div>
          {searchQuery && (
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              <span>Filtered by "{searchQuery}"</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {filteredAuthors.length === 0 ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Users2Icon className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-30" />
            <h3 className="text-lg font-medium mb-2">
              {searchQuery ? 'No contributors found' : 'No contributors yet'}
            </h3>
            <p className="text-muted-foreground">
              {searchQuery 
                ? `No contributors match "${searchQuery}"`
                : 'Contributors will appear here as they create content'
              }
            </p>
            {searchQuery && (
              <Button
                variant="outline"
                onClick={() => setSearchQuery('')}
                className="mt-4"
              >
                Clear Search
              </Button>
            )}
          </div>
        </div>
      ) : viewMode === 'cloud' ? (
        <AuthorCloud
          authors={filteredAuthors}
          onAuthorClick={handleAuthorClick}
          sortBy={sortBy}
          className="bg-gradient-to-br from-background to-muted/20 rounded-xl border"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAuthors.map((author, index) => (
            <Card
              key={author.id}
              className="group hover:shadow-lg transition-all duration-300 cursor-pointer border hover:border-primary/20"
              onClick={() => handleAuthorClick(author)}
              style={{
                animationDelay: `${index * 50}ms`,
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="w-12 h-12 ring-2 ring-offset-2 ring-primary/20">
                    <AvatarImage src={author.avatarUrl} alt={author.name} />
                    <AvatarFallback 
                      className="font-semibold text-sm"
                      style={{ 
                        backgroundColor: `${author.color}20`,
                        color: author.color 
                      }}
                    >
                      {author.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                      {author.name}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate">
                      {author.email}
                    </p>

                    {author.bio && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {author.bio}
                      </p>
                    )}

                    <div className="flex items-center gap-3 mt-3">
                      <Badge variant="secondary" className="text-xs">
                        <Trophy className="w-3 h-3 mr-1" />
                        {author.postsCount}
                      </Badge>
                      {sortBy === 'views' && (
                        <Badge variant="outline" className="text-xs">
                          <Eye className="w-3 h-3 mr-1" />
                          {formatNumber(author.totalViews)}
                        </Badge>
                      )}
                      {sortBy === 'likes' && (
                        <Badge variant="outline" className="text-xs">
                          <Heart className="w-3 h-3 mr-1" />
                          {formatNumber(author.totalLikes)}
                        </Badge>
                      )}
                    </div>

                    {author.lastPostDate && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Last post: {formatDate(author.lastPostDate)}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TopContributors;
