import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { useAuth } from "@/contexts/auth-context"
import { getAvatarUrl } from "@/lib/avatar"
import { navigationConfig } from "@/config/navigation" 


export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth();
  const { state } = useSidebar();

  const userData = user ? {
    name: user.displayName,
    email: user.email,
    avatar: getAvatarUrl(user.username || user.email, 32),
  } : {
    name: "Guest User",
    email: "guest@example.com",
    avatar: getAvatarUrl("guest@example.com", 32),
  };

  const data = {
    user: userData,
    teams: navigationConfig.teams,
    navMain: navigationConfig.navMain,
    navSecondary: navigationConfig.navSecondary,
    projects: navigationConfig.projects,
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher 
          siteTitle={navigationConfig.siteTitle}
          siteSubtitle={navigationConfig.siteSubtitle}
          teams={data.teams} 
        />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        {state === 'collapsed' ? (
          <div className="flex items-center justify-center w-full">
            <a href="/" aria-label="Made with love" className="text-muted-foreground/60 hover:text-accent">
              ❤️
            </a>
          </div>
        ) : (
          <NavUser user={data.user} />
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
