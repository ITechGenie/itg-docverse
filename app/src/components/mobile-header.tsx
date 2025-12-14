import React from 'react';
import { Button } from '@/components/ui/button';
import { Menu, Home, Search, Plus } from 'lucide-react';
import { ModeToggle } from '@/components/mode-toggle';
import { Input } from '@/components/ui/input';
import { useSidebar } from '@/components/ui/sidebar';
import { Link, useNavigate } from 'react-router-dom';
import { findNavigationItem, navigationConfig } from '@/config/navigation';
import NotifyBell from './ui/notify-icon';

interface MobileHeaderProps {
  currentPath?: string;
  onSearch?: (query: string) => void;
  showSearch?: boolean;
}

export function MobileHeader({ 
  currentPath, 
  onSearch,
  showSearch = false 
}: MobileHeaderProps) {
  const { toggleSidebar } = useSidebar();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = React.useState('');

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    onSearch?.(e.target.value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const breadcrumbs = currentPath ? findNavigationItem(currentPath) : null;
  const pageTitle = breadcrumbs?.page || navigationConfig.siteTitle;

  return (
    <div className="lg:hidden fixed top-0 left-0 right-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-4">
        {/* Left side - Menu and Home */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-8 w-8"
          >
            <Menu className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/feed')}
            className="h-8 w-8"
          >
            <Home className="h-4 w-4" />
          </Button>
        </div>

        {/* Center - Page Title */}
        <div className="flex-1 px-2 min-w-0">
          <h1 className="text-sm font-semibold truncate">{pageTitle}</h1>
        </div>

        {/* Right side - Search and Mode Toggle */}
        <div className="flex items-center gap-2">
          <Link to="/create">
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Create Content</span>
              <span className="sm:hidden">Create</span>
            </Button>
          </Link>
          {showSearch && (
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search..."
                className="pl-7 h-8 w-32 sm:w-40 text-xs"
                value={searchQuery}
                onChange={handleSearch}
              />
            </form>
          )}
          <ModeToggle /> 
          <NotifyBell />
        </div>
      </div>
    </div>
  );
}
