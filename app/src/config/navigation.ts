import {
	BookOpen,
	Hash,
	Home,
	PenTool,
	User,
	Users,
	Star,
	//  BarChart3,
	Zap,
	//  FileText,
	Search,
	RssIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavigationItem {
	title: string;
	url: string;
	icon?: LucideIcon;
	isActive?: boolean;
	items?: NavigationItem[];
	section?: string; // For breadcrumb grouping
}

export interface NavigationProject {
	name: string;
	url: string;
	icon: LucideIcon;
	section?: string;
}

export interface MobileNavItem {
	icon: LucideIcon;
	label: string;
	href: string;
}

export interface NavigationConfig {
	siteTitle: string;
	siteSubtitle?: string;
	teams: Array<{
		name: string;
		logo: LucideIcon;
		plan: string;
	}>;
	navMain: NavigationItem[];
	projects: NavigationProject[];
	mobileNav: MobileNavItem[];
}

export const navigationConfig: NavigationConfig = {
	siteTitle: 'ITG Docverse',
	siteSubtitle: 'Community',
	teams: [
		{
			name: 'ITG Docverse',
			logo: BookOpen,
			plan: 'Community',
		},
	],
	navMain: [
		{
			title: 'Dashboard',
			url: '/dashboard',
			icon: Home,
			isActive: true,
		},
		{
			title: 'Content Feed',
			url: '/feed',
			icon: RssIcon,

			section: 'Community',
			items: [
				{
					title: 'Latest Content',
					url: '/feed',
					section: 'Community',
				},
				/*        {
				title: "Favorite Content",
				url: "/feed/favorite-posts",
				section: "Community",
				}, 
				{
				title: "Tagged Favorites",
				url: "/feed/favorite-tags",
				section: "Community",
				}, */
				{
					title: 'Trending',
					url: '/feed/trending',
					section: 'Community',
				},
				{
					title: 'Discussions',
					url: '/discussions',
					section: 'Community',
				},
			],
		},
		{
			title: 'Create',
			url: '/create',
			icon: PenTool,
			section: 'Content',
			items: [
				{
					title: 'Write Article',
					url: '/create/article',
					icon: PenTool,
					section: 'Content',
				},
				{
					title: 'Quick Thoughts',
					url: '/create/thoughts',
					icon: Zap,
					section: 'Content',
				},
			],
		},

		{
			title: 'Community',
			url: '/',
			icon: Users,
			section: 'Community',
			items: [
				{
					title: 'All Tags',
					url: '/tags',
					section: 'Discovery',
				},

				{
					title: 'Popular Tags',
					url: '/tags/popular',
					section: 'Discovery',
				},
				{
					title: 'Top Contributors',
					url: '/contributors',
					section: 'Community',
				},
			],
		},
		/*    {
	  title: "Code Summaries",
	  url: "/code-summaries",
	  icon: FileText,
	  section: "Content",
	  items: [
		{
		  title: "Git Repos",
		  url: "/code-summaries/git-repos",
		  section: "Content",
		},
		{
		  title: "Documents",
		  url: "/code-summaries/documents",
		  section: "Content",
		},
	  ],
	},
   {
	  title: "Analytics",
	  url: "/dashboard",
	  icon: BarChart3,
	  section: "Overview",
	  items: [
		{
		  title: "Overview",
		  url: "/dashboard",
		  section: "Overview",
		},
		{
		  title: "My Posts",
		  url: "/profile/posts",
		  section: "Account",
		},
		{
		  title: "Engagement",
		  url: "/analytics/engagement",
		  section: "Overview",
		},
	  ],
	}, */
	],
	projects: [
		{
			name: 'My Profile',
			url: '/profile',
			icon: User,
			section: 'Account',
		},
		{
			name: 'Tagged Content',
			url: '/feed/favorite-tags',
			icon: Star,
			section: 'Discovery',
		},
		{
			name: 'Favorite Content',
			url: '/feed/favorite-posts',
			icon: RssIcon,
			section: 'Account',
		},
		{
			name: 'Favorite Tags',
			url: '/tags/favorites',
			icon: Hash,
			section: 'Discovery',
		},
		{
			name: 'Search',
			url: '/search',
			icon: Search,
			section: 'Discovery',
		},
	],
	mobileNav: [
		{
			icon: Home,
			label: 'Home',
			href: '/dashboard', // Changed from '/feed' to '/dashboard'
		},
		{
			icon: RssIcon,
			label: 'Feed',
			href: '/feed',
		},
		{
			icon: PenTool,
			label: 'Create',
			href: '/create',
		},
		{
			icon: Hash,
			label: 'Tags',
			href: '/tags',
		},
		{
			icon: Users,
			label: 'Community',
			href: '/contributors',
		},
	],
};

// Helper function to find navigation item by path
export function findNavigationItem(path: string): { section: string; page: string } | null {
	// Remove hash, basename, and trailing slash
	const basename = import.meta.env.VITE_BASENAME || '';
	let cleanPath = path.replace(/^#/, '');

	// Remove basename if present
	if (basename && cleanPath.startsWith(basename)) {
		cleanPath = cleanPath.slice(basename.length);
	}

	cleanPath = cleanPath.replace(/\/$/, '') || '/';

	// Check main navigation items and their children
	for (const navItem of navigationConfig.navMain) {
		const navUrl = navItem.url.replace(/\/$/, '') || '/';

		if (navUrl === cleanPath) {
			return {
				section: navItem.section || 'ITG',
				page: navItem.title,
			};
		}

		// Check sub-items
		if (navItem.items) {
			for (const subItem of navItem.items) {
				const subUrl = subItem.url.replace(/\/$/, '') || '/';
				if (subUrl === cleanPath) {
					return {
						section: subItem.section || navItem.section || 'ITG',
						page: subItem.title,
					};
				}
			}
		}
	}

	// Check project items
	for (const project of navigationConfig.projects) {
		const projectUrl = project.url.replace(/\/$/, '') || '/';
		if (projectUrl === cleanPath) {
			return {
				section: project.section || 'ITG',
				page: project.name,
			};
		}
	}

	// Handle dynamic routes
	if (cleanPath.startsWith('/post/')) {
		return { section: 'Community', page: 'Post Detail' };
	}

	if (cleanPath.startsWith('/profile/')) {
		return { section: 'Community', page: 'User Profile' };
	}

	if (cleanPath.startsWith('/tags/')) {
		const tagName = cleanPath.split('/')[2];
		return { section: 'Discovery', page: `#${tagName}` };
	}

	// Default fallback
	return { section: 'ITG', page: 'Docverse' };
}
