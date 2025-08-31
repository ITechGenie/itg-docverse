import { AppSidebar } from "@/components/app-sidebar"
import { MobileHeader } from "@/components/mobile-header"
import { MobileFooter } from "@/components/mobile-footer"
import { ModeToggle } from "@/components/mode-toggle"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Home } from "lucide-react"
import { Toaster } from "@/components/ui/sonner"
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
import { useNavigate, useLocation } from "react-router-dom"
import { findNavigationItem, navigationConfig } from "@/config/navigation"
import { createUrl } from "@/lib/routing"

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const [currentPath, setCurrentPath] = useState(location.pathname);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Navigate to search page with query parameter
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      // Navigate to search page with query parameter
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  useEffect(() => {
    // Update current path when location changes
    setCurrentPath(location.pathname);
  }, [location.pathname]);
  
  const getBreadcrumbs = () => {
    // Use the current path state instead of reading from location directly
    const path = currentPath;
    
    // Use the centralized navigation helper which already returns { section, page }
    return findNavigationItem(path);
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="relative min-h-screen">
      <Toaster position="top-right" richColors />
      <SidebarProvider>
        <AppSidebar />
        
        {/* Mobile Header */}
        <MobileHeader 
          currentPath={currentPath}
          onSearch={(query) => setSearchQuery(query)}
        />
        
        <SidebarInset>
          <header className="hidden lg:flex h-16 shrink-0 items-center gap-2 justify-between transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(createUrl('/feed'))}
                className="h-7 w-7"
                title="Go to Home"
              >
                <Home className="h-4 w-4" />
              </Button>
              <Separator
                orientation="vertical"
                className="mr-2 data-[orientation=vertical]:h-4"
              />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/">
                      {breadcrumbs?.section || navigationConfig.siteTitle}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="max-w-[120px] sm:max-w-none truncate">
                      {breadcrumbs?.page || navigationConfig.siteTitle}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 pr-2 sm:pr-4">
              <form onSubmit={handleSearchSubmit} className="relative">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search..."
                  className="pl-8 w-32 sm:w-48 md:w-64 text-sm"
                  value={searchQuery}
                  onChange={handleSearch}
                  onKeyPress={handleSearchKeyPress}
                />
              </form>
              <ModeToggle />
            </div>
          </header>
          <hr className="hidden lg:block" />
          <main className="flex flex-1 flex-col gap-4 p-3 sm:p-6 pt-[72px] md:pt-20 lg:pt-4 pb-20 lg:pb-4 max-w-none">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
      
      {/* Mobile Footer */}
      <MobileFooter currentPath={currentPath} />
    </div>
  );
}
