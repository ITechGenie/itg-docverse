import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import type { User as UserType } from '@/types';

interface EditProfileForm {
  displayName: string;
  bio: string;
  location: string;
  website: string;
}

export default function EditProfile() {
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

  // Pre-populate form with current user data
  useEffect(() => {
    if (currentUser) {
      setValue('displayName', currentUser.displayName);
      setValue('bio', currentUser.bio || '');
      setValue('location', currentUser.location || '');
      setValue('website', currentUser.website || '');
    }
  }, [currentUser, setValue]);

  const onSubmit = async (data: EditProfileForm) => {
    if (!currentUser) return;

    setIsLoading(true);
    setError('');

    try {
      // For now, we'll just update the local user data
      // In a real app, this would call an API endpoint to update the user profile
      const updatedUser: Partial<UserType> = {
        displayName: data.displayName,
        bio: data.bio,
        location: data.location,
        website: data.website,
      };

      // Call updateUser from auth context
      updateUser(updatedUser);

      // Navigate back to profile
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

  const avatarUrl = getAvatarUrl(currentUser.email || currentUser.username, 100);

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
