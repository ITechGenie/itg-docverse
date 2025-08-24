import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MapPin, Calendar, ExternalLink, Edit, FileText, Archive, Eye } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { getAvatarUrl } from '@/lib/avatar';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/services/api-client';
import PostCard from '@/components/post-card';
import type { User, Post } from '@/types';

export default function Profile() {
  const { username } = useParams<{ username?: string }>();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'published' | 'draft' | 'archived'>('published');

  useEffect(() => {
    loadProfile();
  }, [username]);

  useEffect(() => {
    // Load posts after profile is loaded or if we have current user
    if (profileUser || currentUser) {
      loadUserPosts();
    }
  }, [profileUser, currentUser, statusFilter]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      if (!username) {
        // Show current user's profile
        setProfileUser(currentUser);
      } else {
        // Try to load another user's profile by username
        try {
          const response = await api.getUserByUsername(username);
          if (response.success && response.data) {
            setProfileUser(response.data);
          } else {
            // Fallback to mock user if not found
            const mockUser: User = {
              id: 'user-unknown',
              username: username,
              displayName: username.charAt(0).toUpperCase() + username.slice(1),
              email: `${username}@example.com`,
              bio: 'User profile not found in database',
              location: 'Unknown',
              joinedDate: '2024-01-15T00:00:00Z',
              stats: {
                postsCount: 0,
                commentsCount: 0,
                tagsFollowed: 0,
              },
            };
            setProfileUser(mockUser);
          }
        } catch (error) {
          console.error('Failed to load user profile:', error);
          // Use current user as fallback
          setProfileUser(currentUser);
        }
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserPosts = async () => {
    setPostsLoading(true);
    try {
      const targetUserId = profileUser?.id || currentUser?.id;
      if (targetUserId) {
        const response = await api.getPosts({ 
          page: 1, 
          limit: 10,
          author: targetUserId,
          status: statusFilter
        });
        
        if (response.success && response.data) {
          setUserPosts(response.data);
        }
      }
    } catch (error) {
      console.error('Failed to load user posts:', error);
    } finally {
      setPostsLoading(false);
    }
  };

  const isOwnProfile = !username || username === currentUser?.username;
  const displayUser = profileUser || currentUser;

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-start space-x-6">
              <Skeleton className="w-24 h-24 rounded-full" />
              <div className="flex-1 space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-20 w-full" />
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!displayUser) {
    return (
      <div className="w-full max-w-4xl mx-auto text-center py-12">
        <h1 className="text-2xl font-bold text-muted-foreground">User not found</h1>
        <Link to="/#/feed" className="text-primary hover:underline mt-4 inline-block">
          Back to Feed
        </Link>
      </div>
    );
  }

  const avatarUrl = getAvatarUrl(displayUser.username || displayUser.email, 96);
  const joinedDate = new Date(displayUser.joinedDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long'
  });

  return (
    <div className="w-full mx-auto space-y-6 px-4">
      {/* Profile Header */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6 text-center sm:text-left">
              <Avatar className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24">
                <AvatarImage src={avatarUrl} alt={displayUser.displayName} />
                <AvatarFallback className="text-lg sm:text-xl lg:text-2xl">
                  {displayUser.displayName}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 space-y-3 sm:space-y-4">
                <div>
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
                    {displayUser.displayName}
                  </h1>
                  <p className="text-base sm:text-lg text-muted-foreground">
                    @{displayUser.username}
                  </p>
                </div>

                {displayUser.bio && (
                  <p className="text-muted-foreground max-w-2xl">
                    {displayUser.bio}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  {displayUser.location && (
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-4 h-4" />
                      <span>{displayUser.location}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>Joined {joinedDate}</span>
                  </div>

                  {displayUser.website && (
                    <a 
                      href={displayUser.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-1 text-primary hover:underline"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Website</span>
                    </a>
                  )}
                </div>

                {/* Badges */}
                {displayUser.badges && displayUser.badges.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {displayUser.badges.map((badge) => (
                      <Badge 
                        key={badge.id}
                        variant="secondary"
                        className="flex items-center space-x-1"
                        title={badge.description}
                      >
                        <span>{badge.icon}</span>
                        <span>{badge.name}</span>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {isOwnProfile && (
              <Button 
                variant="outline" 
                size="sm"
                className="flex items-center space-x-2 w-full sm:w-auto self-center sm:self-start"
                onClick={() => navigate('/profile/edit')}
              >
                <Edit className="w-4 h-4" />
                <span>Edit Profile</span>
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-6 text-center">
            <div className="text-lg sm:text-2xl font-bold">{userPosts.length}</div>
            <div className="text-xs sm:text-sm text-muted-foreground">Posts</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-6 text-center">
            <div className="text-lg sm:text-2xl font-bold">{displayUser.stats.commentsCount}</div>
            <div className="text-xs sm:text-sm text-muted-foreground">Comments</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-6 text-center">
            <div className="text-lg sm:text-2xl font-bold">{displayUser.stats.tagsFollowed}</div>
            <div className="text-xs sm:text-sm text-muted-foreground">Tags Followed</div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Posts Section */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-3xl font-bold tracking-tight">Recent Posts</h2>
          
          {/* Status Filter - only show if viewing own profile */}
          {profileUser?.id === currentUser?.id && (
            <div className="flex items-center border rounded-lg p-1">   
              <Button
                variant={statusFilter === 'archived' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setStatusFilter('archived')}
                className="h-8 px-2 sm:px-3"
              >
                <Archive className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">Archived</span>
              </Button>
               <Button
                variant={statusFilter === 'draft' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setStatusFilter('draft')}
                className="h-8 px-2 sm:px-3"
              >
                <FileText className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">Draft</span>
              </Button>
              <Button
                variant={statusFilter === 'published' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setStatusFilter('published')}
                className="h-8 px-2 sm:px-3"
              >
                <Eye className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">Published</span>
              </Button>
            </div>
          )}
        </div>
        
        {postsLoading ? (
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-4 p-6 border border-border rounded-lg">
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
            ))}
          </div>
        ) : userPosts.length > 0 ? (
          <div className="space-y-6">
            {userPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No posts yet. {isOwnProfile ? 'Share your first post!' : `${displayUser.displayName} hasn't posted anything yet.`}</p>
            {isOwnProfile && (
              <Link to="/#/create">
                <Button className="mt-4">Create Your First Post</Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
