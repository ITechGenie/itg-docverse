import { useState, useEffect } from "react";
import { Settings2,   ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { navigationConfig } from "@/config/navigation";
import { Skeleton } from "@/components/ui/skeleton";

import { useAuth } from "@/contexts/auth-context";
import { Link } from "react-router-dom";

const LoaderSkeleton = () => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-start space-x-4">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-20 w-full" />
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function Settings() {
  const { user: currentUser } = useAuth();

  const isAdmin = currentUser?.roles?.includes("role_admin");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch comments:", err);
        setError("Failed to load discussions. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  return (
    <div className="w-full space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row    gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight flex items-center gap-3">
            <Settings2 className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 shrink-0 text-primary" />
            <span>{navigationConfig.siteTitle} Settings</span>
          </h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            Configure account and administrative settings for {navigationConfig.siteTitle}.
          </p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-900 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Main Settings Grid */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 1 }).map((_, index) => (
            <LoaderSkeleton key={index} />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Left: Admin Functions */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="flex  justify-between">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-muted-foreground" />
                  <CardTitle>Admin</CardTitle>
                </div>
                
              </CardHeader>
              <CardContent>
                {isAdmin ? (
                  <ul className="space-y-3">
                    <li className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">User Management</p>
                        <p className="text-sm text-muted-foreground">Create, edit or remove users</p>
                      </div>
                     {isAdmin && (
                      <Link to="/admin/users">
                        <Button variant="outline" size="sm">Manage Users</Button>
                      </Link>
                    )}
                    </li>

                    <li className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Roles & Permissions</p>
                        <p className="text-sm text-muted-foreground">Manage role assignments and permissions</p>
                      </div>
                      <Button size="sm" variant="outline">Open</Button>
                    </li>

                    <li className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Site Analytics</p>
                        <p className="text-sm text-muted-foreground">View usage and activity reports</p>
                      </div>
                      <Link to="/analytics">
                        <Button size="sm" variant="outline">View Analytics</Button>
                      </Link>
                    </li>
                  </ul>
                ) : (
                  <div>
                    <p className="font-medium mb-2">No admin privileges</p>
                    <p className="text-sm text-muted-foreground">You don't have access to admin functions. Contact an administrator if you need elevated access.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Personal Settings */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Settings2 className="w-5 h-5 text-muted-foreground" />
                  <CardTitle>Personal Settings</CardTitle>
                </div>
                <p className="text-sm text-muted-foreground mt-1">Manage your profile and preferences</p>
              </CardHeader>
              <CardContent>
                <form className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="displayName">Display name</Label>
                    <Input id="displayName" placeholder={currentUser?.displayName || "Your name"} />
                  </div>

                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" placeholder={currentUser?.email || "you@example.com"} disabled />
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Input id="bio" placeholder={currentUser?.bio || "Short bio"} />
                  </div>

                  <div className="flex items-center gap-3 md:col-span-2">
                    <Label className="mb-0">Receive emails</Label>
                    <Switch />
                    <p className="text-sm text-muted-foreground">Enable email notifications for important updates</p>
                  </div>
                </form>
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <Button variant="outline">Cancel</Button>
                <Button>Save Changes</Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
