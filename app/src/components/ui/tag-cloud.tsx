import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Tag as TagIcon, Edit, Trash2, ExternalLink, Sparkles, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/services/api-client';

interface TagCloudItem {
  id: string;
  name: string;
  color: string;
  postsCount: number;
  description?: string;
  category?: string;
  isFavorited?: boolean;
}

interface TagCloudProps {
  tags: TagCloudItem[];
  onTagClick?: (tag: TagCloudItem) => void;
  onTagEdit?: (tag: TagCloudItem) => void;
  onTagDelete?: (tagId: string) => void;
  onTagFavorite?: (tagId: string, isFavorited: boolean) => void;
  className?: string;
  showActions?: boolean;
  minFontSize?: number;
  maxFontSize?: number;
  animate?: boolean;
  showSparkles?: boolean;
}

export const TagCloud: React.FC<TagCloudProps> = ({
  tags,
  onTagClick,
  onTagEdit,
  onTagDelete,
  onTagFavorite,
  className = '',
  showActions = true,
  minFontSize = 14,
  maxFontSize = 32,
  animate = true,
  showSparkles = true,
}) => {
  const [hoveredTag, setHoveredTag] = useState<string | null>(null);
  const [sparklePositions, setSparklePositions] = useState<Array<{x: number, y: number, delay: number}>>([]);
  const favoriteClickTimeoutRef = useRef<{ [key: string]: boolean }>({});

  // Generate random sparkle positions
  useEffect(() => {
    if (showSparkles) {
      const sparkles = Array.from({ length: 8 }, () => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 3000,
      }));
      setSparklePositions(sparkles);
    }
  }, [showSparkles]);

  const processedTags = useMemo(() => {
    if (!tags.length) return [];

    // Sort tags by post count for better cloud layout
    const sortedTags = [...tags].sort((a, b) => b.postsCount - a.postsCount);

    // Calculate font sizes and positions
    const maxCount = Math.max(...tags.map(tag => tag.postsCount));
    const minCount = Math.min(...tags.map(tag => tag.postsCount));
    const countRange = maxCount - minCount || 1;
    const fontRange = maxFontSize - minFontSize;

    const processedTags: any[] = [];
    const usedPositions: Array<{x: number, y: number, width: number, height: number}> = [];

    sortedTags.forEach((tag, index) => {
      // Calculate font size based on post count with exponential scaling
      const normalizedCount = (tag.postsCount - minCount) / countRange;
      const exponentialScale = Math.pow(normalizedCount, 0.6);
      const fontSize = minFontSize + (exponentialScale * fontRange);
      
      // Calculate opacity and scale
      const opacity = 0.7 + (normalizedCount * 0.3);
      const scale = 0.8 + (normalizedCount * 0.4);
      
      // Estimate tag dimensions for collision detection
      const estimatedWidth = tag.name.length * (fontSize * 0.6) + 80;
      const estimatedHeight = fontSize + 20;
      
      let position = { x: 0, y: 0 };
      let attempts = 0;
      let validPosition = false;
      
      // Try to find a non-overlapping position
      while (!validPosition && attempts < 100) {
        if (index === 0) {
          // First tag goes in center
          position = { x: 0, y: 0 };
          validPosition = true;
        } else {
          // Use improved spiral with better collision detection
          const spiralIndex = attempts + index * 3;
          const angle = spiralIndex * 0.8; // Tighter spiral
          const radius = Math.sqrt(spiralIndex + 1) * 45; // Increased spacing
          const spiralX = Math.cos(angle) * radius;
          const spiralY = Math.sin(angle) * radius * 0.7; // Slight vertical compression
          
          // Add some randomness for natural look
          position = {
            x: spiralX + (Math.random() - 0.5) * 30,
            y: spiralY + (Math.random() - 0.5) * 20,
          };
          
          // Enhanced collision detection with padding
          const padding = 25; // Minimum distance between tags
          const hasCollision = usedPositions.some(used => {
            const dx = Math.abs(position.x - used.x);
            const dy = Math.abs(position.y - used.y);
            const minDistanceX = (estimatedWidth + used.width) / 2 + padding;
            const minDistanceY = (estimatedHeight + used.height) / 2 + padding;
            return dx < minDistanceX && dy < minDistanceY;
          });
          
          if (!hasCollision) {
            validPosition = true;
          }
        }
        attempts++;
      }
      
      // Store position for collision detection
      usedPositions.push({
        x: position.x,
        y: position.y,
        width: estimatedWidth,
        height: estimatedHeight
      });

      processedTags.push({
        ...tag,
        fontSize,
        opacity,
        scale,
        randomOffset: position,
        weight: normalizedCount,
        index,
      });
    });

    return processedTags;
  }, [tags, minFontSize, maxFontSize]);

  const handleTagClick = (tag: TagCloudItem, event: React.MouseEvent) => {
    event.stopPropagation();
    onTagClick?.(tag);
  };

  const handleEditClick = (tag: TagCloudItem, event: React.MouseEvent) => {
    event.stopPropagation();
    onTagEdit?.(tag);
  };

  const handleDeleteClick = (tagId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    onTagDelete?.(tagId);
  };

  const handleFavoriteClick = async (tag: TagCloudItem, event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    
    // Debounce mechanism to prevent double clicks
    if (favoriteClickTimeoutRef.current[tag.id]) {
      console.log('Debounced duplicate click for tag:', tag.id);
      return;
    }
    
    favoriteClickTimeoutRef.current[tag.id] = true;
    
    // Clear the debounce flag after 1 second
    setTimeout(() => {
      favoriteClickTimeoutRef.current[tag.id] = false;
    }, 1000);
    
    console.log('handleFavoriteClick called for tag:', tag.id, 'current favorited:', tag.isFavorited);
    
    try {
      if (onTagFavorite) {
        // If parent provides onTagFavorite callback, let the parent handle the API call
        console.log('Delegating to parent onTagFavorite callback');
        onTagFavorite(tag.id, !tag.isFavorited);
      } else {
        // If no parent callback, handle the API call ourselves
        console.log('Handling API call in TagCloud component');
        const response = await api.toggleReaction(tag.id, 'event-favorite', 'tag');
        console.log('Toggle reaction response:', response);
      }
    } catch (error) {
      console.error('Failed to toggle tag favorite:', error);
    } finally {
      // Clear the debounce flag on completion (in case of quick error)
      setTimeout(() => {
        favoriteClickTimeoutRef.current[tag.id] = false;
      }, 100);
    }
  };

  if (tags.length === 0) {
    return (
      <div className={`flex items-center justify-center min-h-[300px] ${className}`}>
        <div className="text-center text-muted-foreground">
          <TagIcon className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <h3 className="text-lg font-medium mb-2">No tags found</h3>
          <p className="text-sm">Tags will appear here as they are created and used in posts.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full min-h-[400px] sm:min-h-[500px] lg:min-h-[600px] overflow-auto ${className}`}>
      {/* Background gradients */}
      <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05] pointer-events-none">
        <div className="absolute top-8 left-8 w-32 sm:w-48 lg:w-64 h-32 sm:h-48 lg:h-64 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 blur-3xl animate-pulse"></div>
        <div className="absolute bottom-12 right-12 w-24 sm:w-36 lg:w-48 h-24 sm:h-36 lg:h-48 rounded-full bg-gradient-to-br from-green-400 via-blue-500 to-purple-600 blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/3 w-28 sm:w-42 lg:w-56 h-28 sm:h-42 lg:h-56 rounded-full bg-gradient-to-br from-yellow-400 via-red-500 to-pink-500 blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Floating sparkles */}
      {showSparkles && sparklePositions.map((sparkle, index) => (
        <div
          key={index}
          className="absolute pointer-events-none hidden sm:block"
          style={{
            left: `${sparkle.x}%`,
            top: `${sparkle.y}%`,
            animationDelay: `${sparkle.delay}ms`,
          }}
        >
          <Sparkles 
            className="w-3 h-3 text-yellow-400 dark:text-yellow-300 opacity-30 dark:opacity-50 animate-pulse" 
            style={{ animationDuration: '2s' }}
          />
        </div>
      ))}

      {/* Mobile-first responsive container */}
      <div className="block sm:hidden p-4">
        {/* Mobile: Simple wrapped list */}
        <div className="flex flex-wrap gap-2 justify-center">
          {tags.slice(0, 20).map((tag) => (
            <button
              key={tag.id}
              className="inline-flex items-center gap-1 px-3 py-1 text-sm rounded-full
                       bg-white/80 dark:bg-gray-800/80 border border-gray-300/40 dark:border-gray-600/40
                       hover:shadow-md transition-all duration-200 backdrop-blur-sm"
              style={{ borderColor: tag.color + '40', color: tag.color }}
              onClick={(e) => handleTagClick(tag, e)}
            >
              <TagIcon className="w-3 h-3" />
              {tag.name}
              <Badge variant="secondary" className="ml-1 text-xs">
                {tag.postsCount}
              </Badge>
            </button>
          ))}
        </div>
        {tags.length > 20 && (
          <div className="text-center mt-4">
            <Button variant="outline" size="sm">
              View All {tags.length} Tags
            </Button>
          </div>
        )}
      </div>

      {/* Desktop: Tag cloud */}
      <div className="hidden sm:block absolute inset-0 flex items-center justify-center p-8 lg:p-16">
        <div className="relative w-full max-w-4xl lg:max-w-6xl h-full">
          {processedTags.map((tag) => (
            <div
              key={tag.id}
              className={`
                absolute cursor-pointer group transition-all duration-500 ease-out
                hover:z-20 hover:scale-110 hover:rotate-1
                ${animate ? 'animate-in fade-in slide-in-from-bottom-8' : ''}
                ${hoveredTag === tag.id ? 'z-10' : ''}
              `}
              style={{
                left: '50%',
                top: '50%',
                transform: `translate(calc(-50% + ${tag.randomOffset.x}px), calc(-50% + ${tag.randomOffset.y}px)) scale(${tag.scale})`,
                fontSize: `${tag.fontSize}px`,
                opacity: tag.opacity,
                animationDelay: `${tag.index * 100}ms`,
                animationDuration: '800ms',
              }}
              onClick={(e) => handleTagClick(tag, e)}
              onMouseEnter={() => setHoveredTag(tag.id)}
              onMouseLeave={() => setHoveredTag(null)}
            >
              <div
                className={`
                  relative inline-flex items-center gap-2 px-4 py-2 rounded-full
                  backdrop-blur-sm border transition-all duration-300
                  hover:shadow-xl hover:shadow-opacity-25
                  ${hoveredTag === tag.id ? 'shadow-lg ring-2 ring-opacity-50' : 'hover:shadow-md'}
                  dark:bg-gray-800/80 bg-white/80
                  dark:border-gray-600/40 border-gray-300/40
                `}
                style={{
                  backgroundColor: hoveredTag === tag.id 
                    ? `${tag.color}15` 
                    : 'var(--card)',
                  borderColor: `${tag.color}50`,
                  color: 'var(--foreground)',
                  boxShadow: hoveredTag === tag.id ? `0 8px 32px ${tag.color}20` : undefined,
                }}
              >
                {/* Tag Icon */}
                <TagIcon 
                  className="w-4 h-4 opacity-70" 
                  style={{ color: tag.color }}
                />
                
                {/* Tag Name */}
                <span className="font-semibold whitespace-nowrap select-none">
                  {tag.name}
                </span>
                
                {/* Post Count Badge */}
                <Badge 
                  variant="secondary" 
                  className="text-xs font-medium transition-all duration-300 group-hover:scale-105 dark:bg-gray-700/50 bg-gray-100/80"
                  style={{ 
                    backgroundColor: hoveredTag === tag.id ? `${tag.color}25` : undefined,
                    color: hoveredTag === tag.id ? tag.color : 'var(--muted-foreground)',
                    fontSize: `${Math.max(tag.fontSize * 0.5, 10)}px`,
                    border: `1px solid ${tag.color}40`,
                  }}
                >
                  {tag.postsCount}
                </Badge>

                {/* Glow effect on hover */}
                <div 
                  className={`
                    absolute inset-0 rounded-full opacity-0 group-hover:opacity-10 
                    transition-opacity duration-300 blur-sm
                    dark:group-hover:opacity-20
                  `}
                  style={{ backgroundColor: tag.color }}
                />
              </div>

              {/* Hover Actions */}
              {showActions && hoveredTag === tag.id && (
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 z-30">
                  {/* Invisible bridge to prevent menu from disappearing */}
                  <div className="absolute top-6 left-1/2 transform -translate-x-1/2 w-full h-4 bg-transparent"></div>
                  {/* Action menu */}
                  <div className="flex gap-1 bg-background/95 backdrop-blur-sm border rounded-lg shadow-xl p-1 animate-in fade-in slide-in-from-top-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 hover:bg-blue-100 hover:text-blue-600"
                      onClick={(e) => handleTagClick(tag, e)}
                      title="View posts"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-7 w-7 p-0 ${tag.isFavorited ? 'text-pink-600 hover:bg-pink-50' : 'hover:bg-pink-100 hover:text-pink-600'}`}
                      onClick={(e) => handleFavoriteClick(tag, e)}
                      title={tag.isFavorited ? "Remove from favorites" : "Add to favorites"}
                    >
                      <Bookmark className={`w-3 h-3 ${tag.isFavorited ? 'fill-current' : ''}`} />
                    </Button>
                    {onTagEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 hover:bg-green-100 hover:text-green-600"
                        onClick={(e) => handleEditClick(tag, e)}
                        title="Edit tag"
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                    )}
                    {onTagDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 hover:bg-red-100 hover:text-red-600"
                        onClick={(e) => handleDeleteClick(tag.id, e)}
                        title="Delete tag"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Description tooltip */}
              {hoveredTag === tag.id && tag.description && (
                <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-popover/95 backdrop-blur-sm text-popover-foreground text-sm rounded-lg px-3 py-2 shadow-lg border z-30 whitespace-nowrap max-w-xs animate-in fade-in slide-in-from-bottom-2">
                  <div className="text-center">
                    <p className="font-medium">{tag.description}</p>
                    {tag.category && (
                      <p className="text-xs opacity-70 mt-1">Category: {tag.category}</p>
                    )}
                  </div>
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-popover border-l border-t rotate-45"></div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Central focal point - desktop only */}
      <div className="hidden sm:block absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 opacity-20 animate-pulse pointer-events-none"></div>
    </div>
  );
};
