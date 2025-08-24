import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getAvatarUrl } from '@/lib/avatar';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';
import { navigationConfig } from '@/config/navigation';

interface MobileFooterProps {
  currentPath?: string;
}

export function MobileFooter({ currentPath }: MobileFooterProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    if (currentPath) {
      return currentPath.startsWith(path);
    }
    return location.pathname.startsWith(path);
  };

  const navigationItems = navigationConfig.mobileNav;

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t">
      <div className="flex items-center justify-around px-2 py-2">
        {navigationItems.map((item) => (
          <Button
            key={item.href}
            variant="ghost"
            size="sm"
            onClick={() => navigate(item.href)}
            className={`flex flex-col items-center gap-1 h-12 px-2 ${
              isActive(item.href) || (item.href === '/feed' && currentPath === '/')
                ? 'text-primary bg-primary/10' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <item.icon className="h-4 w-4" />
            <span className="text-xs font-medium">{item.label}</span>
          </Button>
        ))}
        
        {/* Profile Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/profile')}
          className={`flex flex-col items-center gap-1 h-12 px-2 ${
            isActive('/profile') 
              ? 'text-primary bg-primary/10' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Avatar className="h-4 w-4">
            <AvatarImage src={getAvatarUrl(user?.username || user?.email || '')} alt={user?.displayName || 'Guest User'} />
            <AvatarFallback className="text-xs">
              {user?.displayName?.substring(0, 2).toUpperCase() || 'GU'}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs font-medium">Profile</span>
        </Button>
      </div>
    </div>
  );
}
