import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { searchApi } from '@/lib/api';
import type { SearchResult, SearchFilters, SearchConfig } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search as SearchIcon, Settings } from 'lucide-react';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchConfig, setSearchConfig] = useState<SearchConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load search configuration on component mount
  useEffect(() => {
    loadSearchConfig();
  }, []);

  // Perform search when URL parameters change
  useEffect(() => {
    const query = searchParams.get('q');
    if (query) {
      setSearchQuery(query);
      performSearch(query);
    }
  }, [searchParams]);

  const loadSearchConfig = async () => {
    try {
      const response = await searchApi.getConfig();
      if (response.success && response.data) {
        setSearchConfig(response.data);
      } else {
        setError('Failed to load search configuration');
      }
    } catch (err) {
      setError('Failed to load search configuration');
    }
  };

  const performSearch = async (query: string) => {
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const filters: SearchFilters = {
        query: query.trim(),
        limit: 20,
        threshold: 0.3  // Lower threshold for better results
      };

      const response = await searchApi.search(filters);
      
      if (response.success && response.data) {
        setSearchResults(response.data);
      } else {
        setError(response.error || 'Search failed');
        setSearchResults([]);
      }
    } catch (err) {
      setError('Search request failed');
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Update URL with search query
    setSearchParams({ q: searchQuery.trim() });
  };

  const handlePostClick = (postId: string) => {
    // Navigate to the post detail page
    navigate(`/post/${postId}`);
  };

  const handleIndexing = async () => {
    try {
      setError(null);
      const response = await searchApi.triggerIndexing(false);
      
      if (response.success && response.data) {
        alert(`Indexing triggered successfully! ${response.data.message}`);
      } else {
        setError(response.error || 'Failed to trigger indexing');
      }
    } catch (err) {
      setError('Failed to trigger indexing');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="w-full space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight flex items-center gap-2">
            <SearchIcon className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 shrink-0" />
            Search
          </h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            Find posts and content across the community
          </p>
        </div>
      </div>

      {/* Search Configuration Status */}
      {searchConfig && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Search Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">Mode:</span>
                <Badge 
                  variant={searchConfig.ai_search_enabled ? "default" : "secondary"}
                  className="ml-2"
                >
                  {searchConfig.ai_search_enabled ? 'AI Search' : 'Traditional Search'}
                </Badge>
              </div>
              <div>
                <span className="font-medium">Ollama:</span>
                <Badge 
                  variant={searchConfig.components.ollama.available ? "default" : "destructive"}
                  className="ml-2"
                >
                  {searchConfig.components.ollama.available ? 'Available' : 'Unavailable'}
                </Badge>
              </div>
              <div>
                <span className="font-medium">Redis:</span>
                <Badge 
                  variant={searchConfig.components.redis.available ? "default" : "destructive"}
                  className="ml-2"
                >
                  {searchConfig.components.redis.available ? 'Available' : 'Unavailable'}
                </Badge>
              </div>
              <div>
                <span className="font-medium">Database:</span>
                <Badge 
                  variant={searchConfig.ai_search_available ? "default" : "destructive"}
                  className="ml-2"
                >
                  {searchConfig.ai_search_available ? 'Available' : 'Unavailable'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Quick Search</span>
            {searchConfig?.ai_search_enabled && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleIndexing}
                disabled={!searchConfig.components.ollama.available || !searchConfig.components.redis.available}
              >
                Trigger Indexing
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              type="text"
              placeholder="Search for posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Searching...
                </>
              ) : (
                <>
                  <SearchIcon className="h-4 w-4 mr-2" />
                  Search
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-900 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">
            Search Results ({searchResults.length} found)
          </h3>
          
          {searchResults.map((result) => (
            <Card 
              key={result.post_id} 
              className="hover:shadow-md hover:border-primary/50 transition-all cursor-pointer group"
              onClick={() => handlePostClick(result.post_id)}
            >
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {/* Post Title */}
                  <div className="flex items-start justify-between">
                    <h4 className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors">
                      {result.title}
                    </h4>
                    {result.similarity_score && (
                      <Badge variant="outline" className="ml-2 shrink-0">
                        {Math.round(result.similarity_score * 100)}% match
                      </Badge>
                    )}
                  </div>

                  {/* Content Snippet */}
                  <p className="text-muted-foreground text-sm line-clamp-3">
                    {result.content_snippet}
                  </p>

                  {/* Metadata */}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <span>By {result.author_name}</span>
                    <span>•</span>
                    <span>{formatDate(result.created_at)}</span>
                    <span>•</span>
                    <Badge variant="secondary" className="text-xs">
                      {result.post_type}
                    </Badge>
                  </div>

                  {/* Tags */}
                  {result.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {result.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* No Results */}
      {!isLoading && searchQuery && searchResults.length === 0 && !error && (
        <Card>
          <CardContent className="py-12 text-center">
            <SearchIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No results found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search terms or check the spelling.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Welcome Message */}
      {!searchQuery && (
        <Card>
          <CardContent className="py-12 text-center">
            <SearchIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Search Posts</h3>
            <p className="text-muted-foreground">
              Enter a search term above to find relevant posts using{' '}
              {searchConfig?.ai_search_enabled ? 'AI-powered semantic search' : 'traditional search'}.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
