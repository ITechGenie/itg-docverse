import { AroundTheWorldFeed } from "@/components/common/around-the-world-feed"
import { PinnedContent } from "@/components/common/pinned-content"
import PostCard from "@/components/post-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  SidebarInset,
  SidebarProvider
} from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/services/api-client"
import type { Post, Tag } from "@/types"
import { ArrowRight, Flame, Hash, Home, Plus, Pin, Users } from "lucide-react"
import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"

interface TopAuthor {
  id: string
  name: string
  email: string
  avatarUrl: string
  bio: string
  postsCount: number
  firstPostDate: string
  lastPostDate: string
  totalViews: number
  totalLikes: number
  color: string
}

interface DashboardData {
  trendingPosts: Post[]
  topContributors: TopAuthor[]
  popularTags: Tag[]
}

interface LoadingState {
  trendingPosts: boolean
  topContributors: boolean
  popularTags: boolean
}

// Loading Skeleton Components
const PostSkeleton = () => (
  <div className="space-y-4 p-6 border border-border rounded-lg">
    <div className="flex items-center space-x-4">
      <Skeleton className="w-10 h-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
    <Skeleton className="h-6 w-3/4" />
    <Skeleton className="h-16 w-full" />
    <div className="flex space-x-2">
      <Skeleton className="h-6 w-16" />
      <Skeleton className="h-6 w-16" />
      <Skeleton className="h-6 w-16" />
    </div>
  </div>
)

const TagSkeleton = () => (
  <div className="flex items-center gap-3">
    <Skeleton className="w-6 h-6 rounded-full" />
    <div className="flex-1">
      <Skeleton className="h-4 w-20 mb-1" />
      <Skeleton className="h-3 w-12" />
    </div>
  </div>
)

const ContributorSkeleton = () => (
  <div className="flex items-center gap-3">
    <Skeleton className="w-8 h-8 rounded-full" />
    <div className="flex-1">
      <Skeleton className="h-4 w-24 mb-1" />
      <Skeleton className="h-3 w-16" />
    </div>
  </div>
)

// Header Component
const DashboardHeader = () => (
  <header className="flex h-16 shrink-0 items-center gap-2 justify-between px-4">
    <div className="flex items-center gap-2">
      <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
        <div className="flex items-center gap-2">
          <Home className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8" />
          Dashboard
        </div>
      </h1>
    </div>
    <div className="flex items-center space-x-2 font-small text-sm text-muted-foreground">
      <Link to="/create">
        <Button className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Create Content</span>
          <span className="sm:hidden">Create Content</span>
        </Button>
      </Link>
    </div>
  </header>
)

// Pinned Content Card Component
const PinnedContentCard = () => (
  <Card className="col-span-1 md:col-span-2 lg:col-span-1">
    <CardHeader className="flex flex-row items-center justify-between">
      <CardTitle className="flex items-center gap-2">
        <Pin className="h-5 w-5 text-orange-500" />
        Pinned Content
      </CardTitle>
      <Link to="/tags/pinned" className="flex items-center gap-2 text-sm font-medium text-primary hover:underline">
        View All
        <ArrowRight className="w-4 h-4 inline" />
      </Link>
    </CardHeader>
    <CardContent>
      <PinnedContent limit={10} initialCount={4} />
    </CardContent>
  </Card>
);

// Trending Posts Card Component
const TrendingPostsCard = ({ posts, loading }: { posts: Post[], loading: boolean }) => (
  <Card className="col-span-1 md:col-span-2 lg:col-span-1">
    <CardHeader className="flex flex-row items-center justify-between">
      <CardTitle className="flex items-center gap-2">
        <Flame className="h-5 w-5 text-red-500" />
        Trending Content
      </CardTitle>
      <Link to="/feed">
        <span className="hidden sm:inline">
          <Button variant="ghost" size="sm" className="flex items-center gap-2">
            View Content Feed
            <ArrowRight className="w-4 h-4" />
          </Button>
        </span>
        <span className="sm:hidden">
          <Button variant="ghost" size="sm" className="flex items-center gap-2">
            <ArrowRight className="w-4 h-4" />
          </Button>
        </span>
      </Link>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <PostSkeleton key={i} />)
        ) : posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No trending posts found.</p>
          </div>
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </CardContent>
  </Card>
)

// Popular Tags Card Component
const PopularTagsCard = ({ tags, loading }: { tags: Tag[], loading: boolean }) => {
  const navigate = useNavigate()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hash className="w-4 h-4" />
          Popular Tags
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <TagSkeleton key={i} />)
          ) : tags.length === 0 ? (
            <p className="text-sm text-muted-foreground">No popular tags found.</p>
          ) : (
            tags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 rounded-md transition-colors"
                onClick={() => navigate(`/tags/${tag.name}`)}
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
                  style={{ backgroundColor: tag.color || '#3b82f6' }}
                >
                  #
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{tag.name}</p>
                  <p className="text-xs text-muted-foreground">{tag.postsCount} posts</p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Top Contributors Card Component
const TopContributorsCard = ({ contributors, loading }: { contributors: TopAuthor[], loading: boolean }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Users className="w-4 h-4" />
        Top Contributors
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <ContributorSkeleton key={i} />)
        ) : contributors.length === 0 ? (
          <p className="text-sm text-muted-foreground">No contributors found.</p>
        ) : (
          contributors.map((contributor) => (
            <div key={contributor.id} className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                style={{ backgroundColor: contributor.color }}
              >
                {contributor.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{contributor.name}</p>
                <p className="text-xs text-muted-foreground">{contributor.postsCount} posts</p>
              </div>
            </div>
          ))
        )}
      </div>
    </CardContent>
  </Card>
)

// Main Dashboard Component
export default function Dashboard() {
  const [data, setData] = useState<DashboardData>({
    trendingPosts: [],
    topContributors: [],
    popularTags: []
  })
  const [loading, setLoading] = useState<LoadingState>({
    trendingPosts: true,
    topContributors: true,
    popularTags: true
  })

  // Data loading functions
  const loadTrendingPosts = async () => {
    try {
      setLoading(prev => ({ ...prev, trendingPosts: true }))
      const response = await api.getPosts({
        page: 1,
        limit: 3,
        type: 'all'
      })

      if (response.success && response.data) {
        setData(prev => ({ ...prev, trendingPosts: response.data || [] }))
      }
    } catch (error) {
      console.error('Failed to load trending posts:', error)
    } finally {
      setLoading(prev => ({ ...prev, trendingPosts: false }))
    }
  }

  const loadTopContributors = async () => {
    try {
      setLoading(prev => ({ ...prev, topContributors: true }))
      const response = await api.getTopAuthors(3, 'posts')

      if (response.success && response.data) {
        setData(prev => ({ ...prev, topContributors: response.data || [] }))
      }
    } catch (error) {
      console.error('Failed to load top contributors:', error)
    } finally {
      setLoading(prev => ({ ...prev, topContributors: false }))
    }
  }

  const loadPopularTags = async () => {
    try {
      setLoading(prev => ({ ...prev, popularTags: true }))
      const response = await api.getPopularTags(3)

      if (response.success && response.data) {
        setData(prev => ({ ...prev, popularTags: response.data || [] }))
      }
    } catch (error) {
      console.error('Failed to load popular tags:', error)
    } finally {
      setLoading(prev => ({ ...prev, popularTags: false }))
    }
  }

  // Load all data on component mount
  useEffect(() => {
    const loadAllData = async () => {
      await Promise.all([
        loadTrendingPosts(),
        loadTopContributors(),
        loadPopularTags()
      ])
    }

    loadAllData()
  }, [])

  return (
    <SidebarProvider>
      <SidebarInset>
        <DashboardHeader />

        <div className="flex flex-1 gap-4 p-4">
          {/* Main Content Area */}
          <div className="flex-1 space-y-4 gap-4">
            <div className="grid gap-4 grid-cols-1 md:grid-cols-1 lg:grid-cols-1">
              <PinnedContentCard />
            </div>

            <div className="grid gap-4 grid-cols-1 md:grid-cols-1 lg:grid-cols-1">
              <TrendingPostsCard
                posts={data.trendingPosts}
                loading={loading.trendingPosts}
              />
            </div>

            {/* Around the World Feed - Mobile View */}
            <div className="lg:hidden">
              <AroundTheWorldFeed />
            </div>
          </div>

          {/* Sidebar */}
          <div className="hidden lg:flex lg:flex-col w-[400px] space-y-4">
            <AroundTheWorldFeed />
            <PopularTagsCard
              tags={data.popularTags}
              loading={loading.popularTags}
            />
            <TopContributorsCard
              contributors={data.topContributors}
              loading={loading.topContributors}
            />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
