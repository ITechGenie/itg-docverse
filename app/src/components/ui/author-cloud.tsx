import React, { useMemo, useState, useEffect } from 'react';
import { User, Edit, Trash2, ExternalLink, Sparkles, Trophy, Eye, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface AuthorCloudItem {
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

interface AuthorCloudProps {
  authors: AuthorCloudItem[];
  onAuthorClick?: (author: AuthorCloudItem) => void;
  onAuthorEdit?: (author: AuthorCloudItem) => void;
  onAuthorDelete?: (authorId: string) => void;
  className?: string;
  showActions?: boolean;
  minFontSize?: number;
  maxFontSize?: number;
  animate?: boolean;
  showSparkles?: boolean;
  sortBy?: 'posts' | 'views' | 'likes';
}

export const AuthorCloud: React.FC<AuthorCloudProps> = ({
  authors,
  onAuthorClick,
  onAuthorEdit,
  onAuthorDelete,
  className = '',
  showActions = true,
  minFontSize = 14,
  maxFontSize = 28,
  animate = true,
  showSparkles = true,
  sortBy = 'posts',
}) => {
  const [hoveredAuthor, setHoveredAuthor] = useState<string | null>(null);
  const [sparklePositions, setSparklePositions] = useState<Array<{x: number, y: number, delay: number}>>([]);

  // Generate random sparkle positions
  useEffect(() => {
    if (showSparkles) {
      const sparkles = Array.from({ length: 6 }, () => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 3000,
      }));
      setSparklePositions(sparkles);
    }
  }, [showSparkles]);

  const processedAuthors = useMemo(() => {
    if (!authors.length) return [];

    // Sort authors by the specified criteria
    const sortedAuthors = [...authors].sort((a, b) => {
      switch (sortBy) {
        case 'views':
          return b.totalViews - a.totalViews;
        case 'likes':
          return b.totalLikes - a.totalLikes;
        default:
          return b.postsCount - a.postsCount;
      }
    });

    // Calculate font sizes and positions based on the sort criteria
    const values = sortedAuthors.map(author => {
      switch (sortBy) {
        case 'views':
          return author.totalViews;
        case 'likes':
          return author.totalLikes;
        default:
          return author.postsCount;
      }
    });

    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const valueRange = maxValue - minValue || 1;
    const fontRange = maxFontSize - minFontSize;

    const processedAuthors: any[] = [];
    const usedPositions: Array<{x: number, y: number, width: number, height: number}> = [];

    sortedAuthors.forEach((author, index) => {
      const currentValue = values[index];
      
      // Calculate font size based on value with exponential scaling
      const normalizedValue = (currentValue - minValue) / valueRange;
      const exponentialScale = Math.pow(normalizedValue, 0.6);
      const fontSize = minFontSize + (exponentialScale * fontRange);
      
      // Calculate opacity and scale
      const opacity = 0.8 + (normalizedValue * 0.2);
      const scale = 0.85 + (normalizedValue * 0.3);
      
      // Estimate author card dimensions for collision detection
      const estimatedWidth = Math.max(author.name.length * (fontSize * 0.5), 160) + 100;
      const estimatedHeight = fontSize + 60; // Account for avatar and badges
      
      let position = { x: 0, y: 0 };
      let attempts = 0;
      let validPosition = false;
      
      // Try to find a non-overlapping position
      while (!validPosition && attempts < 120) {
        if (index === 0) {
          // First author goes in center
          position = { x: 0, y: 0 };
          validPosition = true;
        } else {
          // Use improved spiral with better collision detection
          const spiralIndex = attempts + index * 3;
          const angle = spiralIndex * 0.7; // Tighter spiral
          const radius = Math.sqrt(spiralIndex + 1) * 50; // Increased spacing for larger cards
          const spiralX = Math.cos(angle) * radius;
          const spiralY = Math.sin(angle) * radius * 0.8; // Slight vertical compression
          
          // Add some randomness for natural look
          position = {
            x: spiralX + (Math.random() - 0.5) * 35,
            y: spiralY + (Math.random() - 0.5) * 25,
          };
          
          // Enhanced collision detection with padding
          const padding = 30; // Minimum distance between author cards
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

      processedAuthors.push({
        ...author,
        fontSize,
        opacity,
        scale,
        randomOffset: position,
        weight: normalizedValue,
        index,
        currentValue,
      });
    });

    return processedAuthors;
  }, [authors, minFontSize, maxFontSize, sortBy]);

  const handleAuthorClick = (author: AuthorCloudItem, event: React.MouseEvent) => {
    event.stopPropagation();
    onAuthorClick?.(author);
  };

  const handleEditClick = (author: AuthorCloudItem, event: React.MouseEvent) => {
    event.stopPropagation();
    onAuthorEdit?.(author);
  };

  const handleDeleteClick = (authorId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    onAuthorDelete?.(authorId);
  };

  const getMetricIcon = () => {
    switch (sortBy) {
      case 'views':
        return <Eye className="w-3 h-3" />;
      case 'likes':
        return <Heart className="w-3 h-3" />;
      default:
        return <Trophy className="w-3 h-3" />;
    }
  };

  const getMetricValue = (author: any) => {
    switch (sortBy) {
      case 'views':
        return author.totalViews;
      case 'likes':
        return author.totalLikes;
      default:
        return author.postsCount;
    }
  };

  if (authors.length === 0) {
    return (
      <div className={`flex items-center justify-center min-h-[300px] ${className}`}>
        <div className="text-center text-muted-foreground">
          <User className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <h3 className="text-lg font-medium mb-2">No contributors found</h3>
          <p className="text-sm">Top contributors will appear here as they create and publish content.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full min-h-[650px] overflow-hidden ${className}`}>
      {/* Background gradients */}
      <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.04] pointer-events-none">
        <div className="absolute top-12 left-12 w-72 h-72 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 blur-3xl animate-pulse"></div>
        <div className="absolute bottom-16 right-16 w-56 h-56 rounded-full bg-gradient-to-br from-emerald-400 via-blue-500 to-purple-600 blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }}></div>
        <div className="absolute top-1/3 left-1/4 w-64 h-64 rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 blur-3xl animate-pulse" style={{ animationDelay: '3s' }}></div>
      </div>

      {/* Floating sparkles */}
      {showSparkles && sparklePositions.map((sparkle, index) => (
        <div
          key={index}
          className="absolute pointer-events-none"
          style={{
            left: `${sparkle.x}%`,
            top: `${sparkle.y}%`,
            animationDelay: `${sparkle.delay}ms`,
          }}
        >
          <Sparkles 
            className="w-4 h-4 text-amber-400 dark:text-amber-300 opacity-25 dark:opacity-45 animate-pulse" 
            style={{ animationDuration: '3s' }}
          />
        </div>
      ))}

      {/* Author cloud container */}
      <div className="absolute inset-0 flex items-center justify-center p-20">
        <div className="relative w-full max-w-7xl h-full">
          {processedAuthors.map((author) => (
            <div
              key={author.id}
              className={`
                absolute cursor-pointer group transition-all duration-500 ease-out
                hover:z-20 hover:scale-105 hover:rotate-1
                ${animate ? 'animate-in fade-in slide-in-from-bottom-8' : ''}
                ${hoveredAuthor === author.id ? 'z-10' : ''}
              `}
              style={{
                left: '50%',
                top: '50%',
                transform: `translate(calc(-50% + ${author.randomOffset.x}px), calc(-50% + ${author.randomOffset.y}px)) scale(${author.scale})`,
                fontSize: `${author.fontSize}px`,
                opacity: author.opacity,
                animationDelay: `${author.index * 120}ms`,
                animationDuration: '900ms',
              }}
              onClick={(e) => handleAuthorClick(author, e)}
              onMouseEnter={() => setHoveredAuthor(author.id)}
              onMouseLeave={() => setHoveredAuthor(null)}
            >
              <div
                className={`
                  relative inline-flex items-center gap-3 px-4 py-3 rounded-2xl
                  backdrop-blur-sm border transition-all duration-300
                  hover:shadow-xl hover:shadow-opacity-25
                  ${hoveredAuthor === author.id ? 'shadow-lg ring-2 ring-opacity-50' : 'hover:shadow-md'}
                  dark:bg-gray-800/85 bg-white/85
                  dark:border-gray-600/50 border-gray-300/50
                `}
                style={{
                  backgroundColor: hoveredAuthor === author.id 
                    ? `${author.color}12` 
                    : 'var(--card)',
                  borderColor: `${author.color}60`,
                  color: 'var(--foreground)',
                  boxShadow: hoveredAuthor === author.id ? `0 12px 40px ${author.color}15` : undefined,
                }}
              >
                {/* Author Avatar */}
                <Avatar 
                  className="w-8 h-8 ring-2 ring-offset-1 transition-all duration-300 group-hover:scale-110"
                  style={{ 
                    ['--ring-color' as any]: `${author.color}40`,
                    ['--ring-offset-color' as any]: 'var(--background)'
                  }}
                >
                  <AvatarImage src={author.avatarUrl} alt={author.name} />
                  <AvatarFallback 
                    className="text-xs font-semibold"
                    style={{ 
                      backgroundColor: `${author.color}20`,
                      color: author.color 
                    }}
                  >
                    {author.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                {/* Author Name */}
                <span className="font-semibold whitespace-nowrap select-none">
                  {author.name}
                </span>
                
                {/* Metric Badge */}
                <Badge 
                  variant="secondary" 
                  className="text-xs font-medium transition-all duration-300 group-hover:scale-105 dark:bg-gray-700/60 bg-gray-100/90 flex items-center gap-1"
                  style={{ 
                    backgroundColor: hoveredAuthor === author.id ? `${author.color}25` : undefined,
                    color: hoveredAuthor === author.id ? author.color : 'var(--muted-foreground)',
                    fontSize: `${Math.max(author.fontSize * 0.45, 9)}px`,
                    border: `1px solid ${author.color}40`,
                  }}
                >
                  {getMetricIcon()}
                  {getMetricValue(author)}
                </Badge>

                {/* Glow effect on hover */}
                <div 
                  className={`
                    absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-8 
                    transition-opacity duration-300 blur-sm
                    dark:group-hover:opacity-15
                  `}
                  style={{ backgroundColor: author.color }}
                />
              </div>

              {/* Hover Actions */}
              {showActions && hoveredAuthor === author.id && (
                <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 flex gap-1 bg-background/95 backdrop-blur-sm border rounded-lg shadow-xl p-1 z-30 animate-in fade-in slide-in-from-top-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900/50"
                    onClick={(e) => handleAuthorClick(author, e)}
                    title="View profile"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                  {onAuthorEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-green-100 hover:text-green-600 dark:hover:bg-green-900/50"
                      onClick={(e) => handleEditClick(author, e)}
                      title="Edit author"
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                  )}
                  {onAuthorDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/50"
                      onClick={(e) => handleDeleteClick(author.id, e)}
                      title="Remove author"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              )}

              {/* Bio tooltip */}
              {hoveredAuthor === author.id && author.bio && (
                <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 bg-popover/95 backdrop-blur-sm text-popover-foreground text-sm rounded-lg px-4 py-3 shadow-lg border z-30 whitespace-nowrap max-w-sm animate-in fade-in slide-in-from-bottom-2">
                  <div className="text-center">
                    <p className="font-medium mb-1">{author.bio}</p>
                    <div className="flex items-center justify-center gap-4 text-xs opacity-70">
                      <span className="flex items-center gap-1">
                        <Trophy className="w-3 h-3" />
                        {author.postsCount} posts
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {author.totalViews}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        {author.totalLikes}
                      </span>
                    </div>
                  </div>
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-popover border-l border-t rotate-45"></div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Central focal point */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gradient-to-r from-indigo-400 to-purple-500 opacity-15 animate-pulse pointer-events-none"></div>
    </div>
  );
};
