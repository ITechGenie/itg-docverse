import { AppSidebar } from "@/components/app-sidebar"
import { ModeToggle } from "@/components/mode-toggle"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { useEffect, useState } from "react"

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPath, setCurrentPath] = useState(window.location.hash.slice(1) || '/');

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    // TODO: Implement global search functionality
    // This could trigger a search across all posts in the application
    console.log('Searching for:', e.target.value);
  };

  useEffect(() => {
    const updatePath = () => {
      // Update state to force re-render when hash changes
      setCurrentPath(window.location.hash.slice(1) || '/');
    };
    
    window.addEventListener('hashchange', updatePath);
    
    return () => window.removeEventListener('hashchange', updatePath);
  }, []);
  
  const getBreadcrumbs = () => {
    // Use the current path state instead of reading from location directly
    const path = currentPath;
    
    switch (path) {
      case '/':
      case '/feed':
        return { section: 'Community', page: 'Feed' };
      case '/create':
        return { section: 'Content', page: 'Create Post' };
      case '/create/article':
        return { section: 'Content', page: 'Write Article' };
      case '/create/thoughts':
        return { section: 'Content', page: 'Quick Thoughts' };
      case '/dashboard':
        return { section: 'Overview', page: 'Dashboard' };
      case '/tags':
        return { section: 'Discovery', page: 'Tags' };
      case '/profile':
        return { section: 'Account', page: 'My Profile' };
      default:
        if (path.startsWith('/post/')) {
          return { section: 'Community', page: 'Post Detail' };
        }
        if (path.startsWith('/profile/')) {
          return { section: 'Community', page: 'User Profile' };
        }
        if (path.startsWith('/tags/')) {
          const tagName = path.split('/')[2];
          return { section: 'Discovery', page: `#${tagName}` };
        }
        return { section: 'ITG', page: 'Docverse' };
    }
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 justify-between transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/">
                    {breadcrumbs.section}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>{breadcrumbs.page}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="flex items-center gap-3 pr-4">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search posts..."
                className="pl-8 w-64"
                value={searchQuery}
                onChange={handleSearch}
              />
            </div>
            <ModeToggle />
          </div>
        </header>
        <hr />
        <main className="flex flex-1 flex-col gap-4 p-6 pt-4 max-w-none">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
