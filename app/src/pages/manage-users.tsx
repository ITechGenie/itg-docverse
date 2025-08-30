import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Edit, Eye, Shield, MoreHorizontal } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/services/api-client';
import type { User } from '@/types';

export default function ManageUsers() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const loadingRef = useRef(false);

  console.log('Current User Roles:', currentUser?.roles);
  
  // Check if current user is admin
  const isAdmin = currentUser?.roles?.includes('role_admin');
  
  useEffect(() => {
    if (!isAdmin) {
      navigate('/feed');
      return;
    }
    loadUsers();
  }, [isAdmin, navigate]);

  const loadUsers = async (reset = false) => {
    // Prevent concurrent loads (helps with StrictMode double-invoke and repeated calls)
    if (!reset && loadingRef.current) return;

    try {
      loadingRef.current = true;
      setLoading(true);
      setError(null);

      const currentPage = reset ? 0 : page;
      const response = await api.getUsers({
        skip: currentPage * 20,
        limit: 20
      });

      if (response.success && response.data) {
        const fetched = response.data ?? [];

        if (reset) {
          // replace the list and set next page to 1 (we have loaded page 0)
          setUsers(fetched);
          setPage(1);
          setHasMore(fetched.length === 20);
        } else {
          // append but avoid duplicates by id
          setUsers(prev => {
            const existingIds = new Set(prev.map(u => u.id));
            const newUsers = fetched.filter(u => !existingIds.has(u.id));
            return [...prev, ...newUsers];
          });
          setHasMore(fetched.length === 20);
          setPage(prev => prev + 1);
        }
      } else {
        setError(response.error || 'Failed to load users');
      }
    } catch (err) {
      setError('Failed to load users. Please try again later.');
      console.error('Failed to fetch users:', err);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  };

  const handleEditUser = (userId: string) => {
    navigate(`/profile/${userId}/edit`);
  };

  const handleViewProfile = (userId: string) => {
    navigate(`/profile/${userId}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getRoleColor = (roleId: string) => {
    switch (roleId) {
      case 'role_admin': return 'destructive';
      case 'role_moderator': return 'default';
      case 'role_contributor': return 'secondary';
      default: return 'outline';
    }
  };

  const getRoleLabel = (roleId: string) => {
    return roleId.replace('role_', '').charAt(0).toUpperCase() + roleId.replace('role_', '').slice(1);
  };

  if (!isAdmin) {
    return (
      <div className="w-full space-y-6">
        <div className="text-center py-12">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
          <p className="text-muted-foreground">
            You need administrator privileges to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 shrink-0" />
            Manage Users
          </h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            View and manage all users in the system
          </p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-900 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && users.length === 0 ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-4 w-[150px]" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Stats</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar} alt={user.username} />
                            <AvatarFallback>
                              {user.displayName?.charAt(0) || user.username.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {user.displayName || user.username}
                              {user.isVerified && (
                                <Badge variant="outline" className="text-xs">
                                  Verified
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              @{user.username}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm space-y-1">
                          <div>{user.stats.postsCount || 0} posts</div>
                          <div className="text-muted-foreground">
                            {user.stats.commentsCount || 0} comments
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.roles && user.roles.length > 0 ? (
                            user.roles.map((roleId: string) => (
                              <Badge 
                                key={roleId} 
                                variant={getRoleColor(roleId)}
                                className="text-xs"
                              >
                                {getRoleLabel(roleId)}
                              </Badge>
                            ))
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              User
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(user.joinedDate)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewProfile(user.username)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditUser(user.username)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Load More Button */}
          {hasMore && !loading && (
            <div className="mt-6 text-center">
              <Button
                variant="outline"
                onClick={() => loadUsers(false)}
                disabled={loading}
              >
                Load More Users
              </Button>
            </div>
          )}

          {/* No Users Message */}
          {!loading && users.length === 0 && !error && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Users Found</h3>
              <p className="text-muted-foreground">
                No users are currently registered in the system.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
