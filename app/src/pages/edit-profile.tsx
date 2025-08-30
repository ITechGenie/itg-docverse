import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, ArrowLeft, User, MapPin, Globe, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { getAvatarUrl } from '@/lib/avatar';
import { ApiClient } from '@/services/api-client';
import type { User as UserType } from '@/types';

interface EditProfileForm {
  displayName: string;
  bio: string;
  location: string;
  website: string;
}

export default function EditProfile() {

  const { username } = useParams<{ username?: string }>();

  const navigate = useNavigate();
  const { user: currentUser, updateUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isDirty }
  } = useForm<EditProfileForm>();

  const isAdmin = currentUser?.roles?.includes('role_admin');

  const apiClient = new ApiClient();
  const [targetUser, setTargetUser] = useState<UserType | null>(null);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const isEditingOther = Boolean(username && username !== currentUser?.username);

  console.log('Current User:', currentUser);
  console.log('Username from URL:', username);
  console.log('users role: ', currentUser?.roles)
  console.log('Is admin user? ' + isAdmin);

  // Pre-populate form with current user data
  useEffect(() => {
    const load = async () => {
      // If username param provided, try to fetch that user's profile
      if (username) {
        // If editing another user, ensure admin
        if (username !== currentUser?.username && !isAdmin) {
          setError('Not authorized to edit other users');
          return;
        }

        const resp = await apiClient.getUserByUsername(username);
        if (resp.success && resp.data) {
          setTargetUser(resp.data);
          setValue('displayName', resp.data.displayName);
          setValue('bio', resp.data.bio || '');
          setValue('location', resp.data.location || '');
          setValue('website', resp.data.website || '');
          // Pre-select roles when editing another user
          if (resp.data.roles && Array.isArray(resp.data.roles)) {
            setSelectedRoles(resp.data.roles as string[]);
          }

          // If current user is admin, load available role types for assignment
          if (isAdmin) {
            const rolesResp = await apiClient.getRoleTypes();
            if (rolesResp.success && Array.isArray(rolesResp.data)) {
              // rolesResp.data expected to be array of role objects or strings
              // normalize to array of role ids (strings)
              const roleIds = rolesResp.data.map((r: any) => (typeof r === 'string' ? r : r.role_id || r.id || r.roleId)).filter(Boolean);
              setAvailableRoles(roleIds as string[]);
            }
          }
          return;
        } else {
          setError(resp.error || 'Failed to load user');
          return;
        }
      }

      if (currentUser) {
        setValue('displayName', currentUser.displayName);
        setValue('bio', currentUser.bio || '');
        setValue('location', currentUser.location || '');
        setValue('website', currentUser.website || '');
      }
    };

    load();
  }, [currentUser, setValue]);

  const onSubmit = async (data: EditProfileForm) => {
    setIsLoading(true);
    setError('');

    try {
      const updatedUser: Partial<UserType> = {
        displayName: data.displayName,
        bio: data.bio,
        location: data.location,
        website: data.website,
      };

      // Editing another user -> call API (admin only)
      if (isEditingOther) {
        if (!isAdmin) {
          setError('Not authorized to edit other users');
          return;
        }

        // Update profile fields for the target user
        const resp = await apiClient.updateUser(targetUser?.id || '', updatedUser);
        if (!resp.success || !resp.data) {
          setError(resp.error || 'Failed to update user');
          return;
        }

        // If admin, also sync selected roles
        if (isAdmin) {
          try {
            const rolesResp = await apiClient.updateUserRoles(targetUser?.id || '', selectedRoles);
            if (!rolesResp.success) {
              // roles update failed; surface error but continue
              setError(rolesResp.error || 'Failed to update user roles');
              return;
            }
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update user roles');
            return;
          }
        }

        // Navigate to the updated user's profile
        navigate(`/profile/${resp.data.username || username}`);
        return;
      }

      // Updating self: update local auth state and persist
      updateUser(updatedUser);
      navigate('/profile');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="w-full max-w-2xl mx-auto py-12 text-center">
        <p className="text-muted-foreground">Please log in to edit your profile.</p>
        <Button 
          onClick={() => navigate('/login')}
          className="mt-4"
        >
          Go to Login
        </Button>
      </div>
    );
  }

  const avatarUrl = getAvatarUrl( currentUser.username || currentUser.email, 100);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/profile')}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Profile</span>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="w-5 h-5" />
            <span>Edit Profile</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Avatar Section */}
            <div className="flex items-center space-x-6">
              <Avatar className="w-20 h-20">
                <AvatarImage src={avatarUrl} alt={currentUser.displayName} />
                <AvatarFallback className="text-lg">
                  {currentUser.displayName.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-medium">Profile Picture</h3>
                <p className="text-sm text-muted-foreground">
                  Your avatar is automatically generated based on your username.
                </p>
              </div>
            </div>

            {/* Display Name */}
            <div className="space-y-2">
              <Label htmlFor="displayName" className="flex items-center space-x-2">
                <User className="w-4 h-4" />
                <span>Display Name</span>
              </Label>
              <Input
                id="displayName"
                {...register('displayName', {
                  required: 'Display name is required',
                  minLength: {
                    value: 1,
                    message: 'Display name must be at least 1 character'
                  },
                  maxLength: {
                    value: 100,
                    message: 'Display name must be less than 100 characters'
                  }
                })}
                placeholder="Your display name"
                disabled={isLoading}
              />
              {errors.displayName && (
                <p className="text-sm text-destructive">{errors.displayName.message}</p>
              )}
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio" className="flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <span>Bio</span>
              </Label>
              <Textarea
                id="bio"
                {...register('bio', {
                  maxLength: {
                    value: 500,
                    message: 'Bio must be less than 500 characters'
                  }
                })}
                placeholder="Tell us about yourself..."
                rows={4}
                disabled={isLoading}
              />
              {errors.bio && (
                <p className="text-sm text-destructive">{errors.bio.message}</p>
              )}
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center space-x-2">
                <MapPin className="w-4 h-4" />
                <span>Location</span>
              </Label>
              <Input
                id="location"
                {...register('location', {
                  maxLength: {
                    value: 100,
                    message: 'Location must be less than 100 characters'
                  }
                })}
                placeholder="Your location"
                disabled={isLoading}
              />
              {errors.location && (
                <p className="text-sm text-destructive">{errors.location.message}</p>
              )}
            </div>

            {/* Website */}
            <div className="space-y-2">
              <Label htmlFor="website" className="flex items-center space-x-2">
                <Globe className="w-4 h-4" />
                <span>Website</span>
              </Label>
              <Input
                id="website"
                type="url"
                {...register('website', {
                  pattern: {
                    value: /^https?:\/\/.+/,
                    message: 'Please enter a valid URL (starting with http:// or https://)'
                  },
                  maxLength: {
                    value: 200,
                    message: 'Website URL must be less than 200 characters'
                  }
                })}
                placeholder="https://yourwebsite.com"
                disabled={isLoading}
              />
              {errors.website && (
                <p className="text-sm text-destructive">{errors.website.message}</p>
              )}
            </div>

            {/* Error Message */}
            {/* Roles (admin editing another user) */}
            {isEditingOther && isAdmin && (
              <div className="space-y-2">
                <Label className="flex items-center space-x-2">
                  <User className="w-4 h-4" />
                  <span>Roles</span>
                </Label>
                <div className="flex flex-wrap gap-2">
                  {availableRoles.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No roles available</p>
                  ) : (
                    availableRoles.map((roleId) => {
                      const checked = selectedRoles.includes(roleId);
                      return (
                        <label key={roleId} className="inline-flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setSelectedRoles((prev) =>
                                prev.includes(roleId) ? prev.filter((r) => r !== roleId) : [...prev, roleId]
                              );
                            }}
                            className="form-checkbox"
                          />
                          <span className="text-sm">{roleId}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-lg bg-destructive/15 text-destructive text-sm">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/profile')}
                disabled={isLoading}
              >
                Cancel
              </Button>
              
              <Button
                type="submit"
                disabled={isLoading || !isDirty}
                className="flex items-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
