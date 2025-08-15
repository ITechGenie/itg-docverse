import { Button } from '@/components/ui/button';
import { Home, PenTool, Hash, Users } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getAvatarUrl } from '@/lib/avatar';

interface MobileFooterProps {
  currentPath?: string;
}

export function MobileFooter({ currentPath }: MobileFooterProps) {
  const { user } = useAuth();

  const userData = user ? {
    name: user.displayName,
    email: user.email,
    avatar: getAvatarUrl(user.id || user.email, 32),
  } : {
    name: "Guest User",
    email: "guest@example.com",
    avatar: getAvatarUrl("guest@example.com", 32),
  };

  const isActive = (path: string) => {
    if (currentPath) {
      return currentPath.startsWith(path);
    }
    return window.location.hash.slice(1).startsWith(path);
  };

  const navigationItems = [
    {
      icon: Home,
      label: 'Home',
      href: '#/feed',
      isActive: isActive('/feed') || currentPath === '/',
    },
    {
      icon: PenTool,
      label: 'Create',
      href: '#/create',
      isActive: isActive('/create'),
    },
    {
      icon: Hash,
      label: 'Tags',
      href: '#/tags',
      isActive: isActive('/tags'),
    },
    {
      icon: Users,
      label: 'Community',
      href: '#/contributors',
      isActive: isActive('/contributors') || isActive('/discussions'),
    },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t">
      <div className="flex items-center justify-around px-2 py-2">
        {navigationItems.map((item) => (
          <Button
            key={item.href}
            variant="ghost"
            size="sm"
            onClick={() => window.location.hash = item.href}
            className={`flex flex-col items-center gap-1 h-12 px-2 ${
              item.isActive 
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
          onClick={() => window.location.hash = '#/profile'}
          className={`flex flex-col items-center gap-1 h-12 px-2 ${
            isActive('/profile') 
              ? 'text-primary bg-primary/10' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Avatar className="h-4 w-4">
            <AvatarImage src={userData.avatar} alt={userData.name} />
            <AvatarFallback className="text-xs">
              {userData.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs font-medium">Profile</span>
        </Button>
      </div>
    </div>
  );
}
