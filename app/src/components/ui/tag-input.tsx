import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api } from '@/services/api-client';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  disabled?: boolean;
  className?: string;
}

interface SuggestedTag {
  id: string;
  name: string;
  color: string;
  postsCount: number;
}

export const TagInput: React.FC<TagInputProps> = ({
  value,
  onChange,
  placeholder = "Add tags...",
  maxTags = 5,
  disabled = false,
  className = "",
}) => {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<SuggestedTag[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const { user: currentUser } = useAuth();

  console.log('Current User Roles:', currentUser?.roles);
  
  // Check if current user is admin
  const isAdmin = currentUser?.roles?.includes('role_admin');
  // Tags that only admins may add
  const RESTRICTED_TAGS = ['challenges', 'pinned'];

  // Debounce search
  useEffect(() => {
    if (inputValue.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await api.searchTags(inputValue.trim(), 10);
        if (response.success && response.data) {
          // Filter out already selected tags and transform to SuggestedTag format
          const filteredSuggestions: SuggestedTag[] = response.data
            .filter(tag => !value.includes(tag.name.toLowerCase()))
            // If the tag is restricted and user is not admin, don't show it in suggestions
            .filter(tag => isAdmin || !RESTRICTED_TAGS.includes(tag.name.toLowerCase()))
            .map(tag => ({
              id: tag.id,
              name: tag.name,
              color: tag.color || '#3b82f6',
              postsCount: tag.postsCount || 0
            }));
          setSuggestions(filteredSuggestions);
          setShowSuggestions(filteredSuggestions.length > 0);
          setSelectedIndex(-1);
        }
      } catch (error) {
        console.error('Failed to search tags:', error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue, value]);

  const addTag = (tagName: string) => {
    // Strip # symbol and normalize the tag name
    const normalizedTag = tagName.trim().replace(/^#+/, '').toLowerCase();
    // Prevent adding restricted tags for non-admin users
    if (RESTRICTED_TAGS.includes(normalizedTag) && !isAdmin) {
      toast.error(`The tag "${normalizedTag}" is restricted to administrators.`);
      // clear input and suggestions
      setInputValue('');
      setSuggestions([]);
      setShowSuggestions(false);
      setSelectedIndex(-1);
      return;
    }

    if (
      normalizedTag &&
      !value.includes(normalizedTag) &&
      value.length < maxTags
    ) {
      onChange([...value, normalizedTag]);
    }
    setInputValue('');
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter(tag => tag !== tagToRemove));
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        addTag(suggestions[selectedIndex].name);
      } else if (inputValue.trim()) {
        addTag(inputValue.trim());
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleSuggestionClick = (suggestion: SuggestedTag) => {
    addTag(suggestion.name);
  };

  const getTagColor = (tag: string): string => {
    // Find color from suggestions or use default
    const suggestion = suggestions.find(s => s.name.toLowerCase() === tag);
    return suggestion?.color || '#3b82f6';
  };

  return (
    <div className={`relative ${className}`}>
      <div className="flex flex-wrap items-center gap-2 p-3 border border-border rounded-md bg-background min-h-[42px] focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        {/* Selected Tags */}
        {value.map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className="flex items-center gap-1 px-2 py-1 text-xs"
            style={{ backgroundColor: `${getTagColor(tag)}20`, color: getTagColor(tag) }}
          >
            <Tag className="w-3 h-3" />
            {tag}
            {!disabled && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => removeTag(tag)}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </Badge>
        ))}

        {/* Input */}
        {!disabled && value.length < maxTags && (
          <Input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            placeholder={value.length === 0 ? placeholder : ""}
            className="flex-1 min-w-[120px] border-none bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            disabled={disabled}
          />
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-md max-h-48 overflow-y-auto"
        >
          {loading && (
            <div className="p-2 text-sm text-muted-foreground text-center">
              Searching...
            </div>
          )}
          
          {!loading && suggestions.map((suggestion, index) => (
            <div
              key={suggestion.id}
              className={`flex items-center justify-between p-2 text-sm cursor-pointer hover:bg-muted ${
                index === selectedIndex ? 'bg-muted' : ''
              }`}
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: suggestion.color }}
                />
                <span>{suggestion.name}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {suggestion.postsCount} posts
              </span>
            </div>
          ))}

          {/* Add new tag option */}
          {inputValue.trim() && !suggestions.some(s => s.name.toLowerCase() === inputValue.trim().replace(/^#+/, '').toLowerCase()) && (
            (() => {
              const cleaned = inputValue.trim().replace(/^#+/, '');
              const normalized = cleaned.toLowerCase();
              const isRestricted = RESTRICTED_TAGS.includes(normalized);
              return (
                <div
                  className={`flex items-center gap-2 p-2 text-sm border-t ${
                    selectedIndex === suggestions.length ? 'bg-muted' : ''
                  } ${isRestricted && !isAdmin ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:bg-muted'}`}
                  onClick={() => {
                    if (isRestricted && !isAdmin) {
                      toast.error(`The tag "${normalized}" is restricted to administrators.`);
                      // keep suggestions closed
                      setShowSuggestions(false);
                      setSelectedIndex(-1);
                      setInputValue('');
                      return;
                    }
                    addTag(cleaned);
                  }}
                >
                  <Plus className="w-3 h-3" />
                  <span>{isRestricted && !isAdmin ? `Create "${cleaned}" (admin only)` : `Create "${cleaned}"`}</span>
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* Helper Text */}
      <div className="flex justify-between items-center mt-1 text-xs text-muted-foreground">
        <span>
          {value.length > 0 && `${value.length}/${maxTags} tags`}
        </span>
        <span>
          Type 3 or more characters to search / Press Enter to add / Backspace to remove
        </span>
      </div>
    </div>
  );
};
