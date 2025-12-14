import { useEffect, useMemo, useState } from "react";
import { Bell, MessageCircle, FileText, Clock3 } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "@/services/api-client";
import type { Notification } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Timeframe = "all" | "today" | "week" | "month";

const timeframeToDays: Record<Timeframe, number | undefined> = {
  all: undefined,
  today: 1,
  week: 7,
  month: 30,
};

function NotificationSkeleton() {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-12" />
        </div>
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </CardContent>
    </Card>
  );
}

function NotificationItem({ notification }: { notification: Notification }) {
  const metadata = notification.metadata || {};
  const postId = notification.post_id;
  const postTitle = notification.post_title;
  const mentionedByUsername = notification.mentioned_by_username;
  const mentionedByDisplayName = notification.mentioned_by_display_name;
  const commentId = notification.target_type === 'comment' ? notification.target_id : undefined;

  const link = commentId
    ? `/post/${postId}#comment-${commentId}`
    : postId
    ? `/post/${postId}`
    : undefined;

  const profileLink = mentionedByUsername ? `/content/profile/${mentionedByUsername}` : undefined;

  return (
    <Card className="hover:shadow-md transition-all">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-pink-600" />
            <span className="text-sm font-semibold">Mentioned you</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock3 className="w-3 h-3" />
            <span>{new Date(notification.created_at).toLocaleString()}</span>
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          {profileLink ? (
            <Link to={profileLink} className="font-medium text-foreground hover:underline">
              {mentionedByDisplayName || `@${mentionedByUsername}`}
            </Link>
          ) : (
            <span>Someone</span>
          )}
          {" "}
          mentioned you in a {notification.target_type || "post"}.
        </div>

        {postTitle && (
          <div className="flex items-center gap-2 text-sm text-foreground">
            <FileText className="w-4 h-4 text-primary" />
            <span className="line-clamp-1">{postTitle}</span>
          </div>
        )}

        {metadata.preview && (
          <p className="text-sm text-muted-foreground line-clamp-2">{metadata.preview}</p>
        )}

        {link && (
          <div className="pt-1">
            <Link to={link} className="text-sm text-primary hover:underline flex items-center gap-1">
              <MessageCircle className="w-4 h-4" />
              View conversation
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function NotificationsPage() {
  const [timeframe, setTimeframe] = useState<Timeframe>("month");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const days = useMemo(() => timeframeToDays[timeframe], [timeframe]);

  useEffect(() => {
    const fetchNotifications = async () => {
      setLoading(true);
      setError(null);
      const response = await api.getNotifications({ days, limit: 50 });
      if (response.success && response.data) {
        const payload = response.data as any;
        const list = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
        setNotifications(list as Notification[]);
      } else {
        setError(response.error || "Failed to load notifications");
      }
      setLoading(false);
    };

    fetchNotifications();
  }, [days]);

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Bell className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 shrink-0 text-pink-600" />
            Notifications
          </div>
        </h1>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center border rounded-lg p-1 overflow-x-auto">
            <Button
              variant={timeframe === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTimeframe('all')}
              className="h-8 px-2 md:px-3 whitespace-nowrap text-xs md:text-sm"
            >
              <span className="hidden md:inline">All Time</span>
              <span className="md:hidden">All</span>
            </Button>
            <Button
              variant={timeframe === 'today' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTimeframe('today')}
              className="h-8 px-2 md:px-3 whitespace-nowrap text-xs md:text-sm"
            >
              <span className="hidden md:inline">Today</span>
              <span className="md:hidden">1d</span>
            </Button>
            <Button
              variant={timeframe === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTimeframe('week')}
              className="h-8 px-2 md:px-3 whitespace-nowrap text-xs md:text-sm"
            >
              <span className="hidden md:inline">This Week</span>
              <span className="md:hidden">1w</span>
            </Button>
            <Button
              variant={timeframe === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTimeframe('month')}
              className="h-8 px-2 md:px-3 whitespace-nowrap text-xs md:text-sm"
            >
              <span className="hidden md:inline">This Month</span>
              <span className="md:hidden">1m</span>
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <NotificationSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <div className="text-red-600 bg-red-50 border border-red-100 p-4 rounded-lg text-sm">
          {error}
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center text-muted-foreground border border-dashed rounded-lg p-6">
          <p>No new notifications.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <NotificationItem key={n.id} notification={n} />
          ))}
        </div>
      )}
    </div>
  );
}
