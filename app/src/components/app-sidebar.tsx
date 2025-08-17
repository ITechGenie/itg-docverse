import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useAuth } from "@/contexts/auth-context"
import { getAvatarUrl } from "@/lib/avatar"
import { navigationConfig } from "@/config/navigation"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
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

  const data = {
    user: userData,
    teams: navigationConfig.teams,
    navMain: navigationConfig.navMain,
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
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
