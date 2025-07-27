import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Calendar, ExternalLink, Edit } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { getAvatarUrl } from '@/lib/avatar';
import { useAuth } from '@/hooks/use-auth';
import type { User } from '@/types';

export default function Profile() {
  const { username } = useParams<{ username?: string }>();
  const { user: currentUser } = useAuth();
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Mock user data - in real app, fetch from API
  const mockUser: User = {
    id: 'user-1',
    username: username || 'prakashm88',
    displayName: username === 'prakashm88' ? 'Prakash M' : 'Demo User',
    email: `${username || 'prakash'}@example.com`,
    bio: 'Full Stack Developer | Tech Enthusiast | Open Source Contributor | Building amazing web experiences with React, TypeScript, and Node.js',
    location: 'Bangalore, India',
    website: 'https://prakash.dev',
    joinedDate: '2024-01-15T00:00:00Z',
    stats: {
      postsCount: 42,
      commentsCount: 128,
      tagsFollowed: 15,
    },
    badges: [
      {
        id: 'badge-1',
        name: 'Early Adopter',
        description: 'One of the first users',
        icon: '🌟',
        color: 'gold'
      },
      {
        id: 'badge-2',
        name: 'Top Contributor',
        description: 'Consistently helpful community member',
        icon: '🏆',
        color: 'blue'
      }
    ]
  };

  useEffect(() => {
    loadProfile();
  }, [username]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      // In real app, fetch user profile from API
      // const response = await api.getUserProfile(username || currentUser?.username);
      setProfileUser(mockUser);
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
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

  const avatarUrl = getAvatarUrl(displayUser.email || displayUser.username, 96);
  const joinedDate = new Date(displayUser.joinedDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long'
  });

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Profile Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-6">
              <Avatar className="w-24 h-24">
                <AvatarImage src={avatarUrl} alt={displayUser.displayName} />
                <AvatarFallback className="text-2xl">
                  {displayUser.displayName.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 space-y-4">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">
                    {displayUser.displayName}
                  </h1>
                  <p className="text-lg text-muted-foreground">
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
              <Button variant="outline" className="flex items-center space-x-2">
                <Edit className="w-4 h-4" />
                <span>Edit Profile</span>
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold">{displayUser.stats.postsCount}</div>
            <div className="text-sm text-muted-foreground">Posts</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold">{displayUser.stats.commentsCount}</div>
            <div className="text-sm text-muted-foreground">Comments</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-bold">{displayUser.stats.tagsFollowed}</div>
            <div className="text-sm text-muted-foreground">Tags Followed</div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Posts Section */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Recent Posts</h2>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>No posts yet. {isOwnProfile ? 'Share your first post!' : `${displayUser.displayName} hasn't posted anything yet.`}</p>
            {isOwnProfile && (
              <Link to="/#/create">
                <Button className="mt-4">Create Your First Post</Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
