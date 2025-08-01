import * as React from "react"
import {
  BookOpen,
  Hash,
  Home,
  PenTool,
  User,
  Users,
  Star,
  BarChart3,
  Zap,
  FileText,
} from "lucide-react"

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
    teams: [
      {
        name: "ITG Docverse",
        logo: BookOpen,
        plan: "Community",
      },
    ],
    navMain: [
      {
        title: "Feed",
        url: "#/feed",
        icon: Home,
        isActive: true,
        items: [
          {
            title: "Latest Posts",
            url: "#/feed",
          },
          {
            title: "Following",
            url: "#/feed/following",
          },
          {
            title: "Favorite Posts",
            url: "#/feed/favorite-posts",
          },
          {
            title: "Favorite Tags",
            url: "#/feed/favorite-tags",
          },
          {
            title: "Trending",
            url: "#/feed/trending",
          },
        ],
      },
      {
        title: "Create",
        url: "#/create",
        icon: PenTool,
        items: [
          {
            title: "Write Article",
            url: "#/create/article",
            icon: PenTool,
          },
          {
            title: "Quick Thoughts",
            url: "#/create/thoughts",
            icon: Zap,
          },
        ],
      },
      {
        title: "Community",
        url: "#/",
        icon: Users,
        items: [
          {
            title: "Discussions",
            url: "#/discussions",
          },
          {
            title: "Popular Tags",
            url: "#/tags/popular",
          },
          {
            title: "Top Contributors",
            url: "#/contributors",
          },
        ],
      },
      {
        title: "Code Summaries",
        url: "#/code-summaries",
        icon: FileText,
        items: [
          {
            title: "Git Repos",
            url: "#/code-summaries/git-repos",
          },
          {
            title: "Documents",
            url: "#/code-summaries/documents",
          },
        ],
      },
      {
        title: "Analytics",
        url: "#/dashboard",
        icon: BarChart3,
        items: [
          {
            title: "Overview",
            url: "#/dashboard",
          },
          {
            title: "My Posts",
            url: "#/profile/posts",
          },
          {
            title: "Engagement",
            url: "#/analytics/engagement",
          },
        ],
      },
    ],
    projects: [
      {
        name: "My Profile",
        url: "#/profile",
        icon: User,
      },
      {
        name: "Favorites",
        url: "#/favorites",
        icon: Star,
      },
      {
        name: "Tags",
        url: "#/tags",
        icon: Hash,
      },
    ],
  };
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
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
