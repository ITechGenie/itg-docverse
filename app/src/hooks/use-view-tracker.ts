import { useEffect, useRef } from 'react';
import { api } from '@/services/api-client';

interface ViewTrackerOptions {
  /** Delay before tracking the view (in milliseconds) */
  delay?: number;
  /** Whether to track multiple views from the same session */
  trackMultipleViews?: boolean;
  /** Additional metadata to include with the view event */
  metadata?: Record<string, any>;
}

/**
 * Custom hook to track post/thought view events
 * 
 * @param postId - The ID of the post/thought to track
 * @param options - Configuration options for view tracking
 */
export const useViewTracker = (
  postId: string | undefined,
  options: ViewTrackerOptions = {}
) => {
  const {
    delay = 2000, // Track after 2 seconds by default (indicates user is actually reading)
    trackMultipleViews = false,
    metadata = {}
  } = options;

  const hasTracked = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Don't track if no postId or already tracked (unless multiple views allowed)
    if (!postId || (hasTracked.current && !trackMultipleViews)) {
      return;
    }

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set up delayed tracking
    timeoutRef.current = setTimeout(async () => {
      try {
        const viewMetadata = {
          ...metadata,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          referrer: document.referrer || undefined,
          userAgent: navigator.userAgent,
          // Add viewport info
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight
          }
        };

        const response = await api.logViewEvent(postId, viewMetadata);
        
        if (response.success) {
          hasTracked.current = true;
          console.log(`✅ View tracked for post: ${postId}`);
        } else {
          console.warn(`❌ Failed to track view for post: ${postId}`, response.error);
        }
      } catch (error) {
        console.error('Error tracking view:', error);
      }
    }, delay);

    // Cleanup timeout on unmount or dependency change
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [postId, delay, trackMultipleViews, metadata]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    hasTracked: hasTracked.current
  };
};

/**
 * Hook to manually track view events
 * Useful for tracking views on user actions (like clicking, scrolling, etc.)
 */
export const useManualViewTracker = () => {
  const trackView = async (
    postId: string,
    metadata?: Record<string, any>
  ): Promise<boolean> => {
    try {
      const viewMetadata = {
        ...metadata,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        trigger: 'manual'
      };

      const response = await api.logViewEvent(postId, viewMetadata);
      
      if (response.success) {
        console.log(`✅ Manual view tracked for post: ${postId}`);
        return true;
      } else {
        console.warn(`❌ Failed to track manual view for post: ${postId}`, response.error);
        return false;
      }
    } catch (error) {
      console.error('Error tracking manual view:', error);
      return false;
    }
  };

  return { trackView };
};

/**
 * Hook to track general events (not just views)
 */
export const useEventTracker = () => {
  const trackEvent = async (
    eventTypeId: string,
    targetType?: string,
    targetId?: string,
    metadata?: Record<string, any>
  ): Promise<boolean> => {
    try {
      const eventMetadata = {
        ...metadata,
        timestamp: new Date().toISOString(),
        url: window.location.href
      };

      const response = await api.logEvent(eventTypeId, targetType, targetId, eventMetadata);
      
      if (response.success) {
        console.log(`✅ Event tracked: ${eventTypeId}`, { targetType, targetId });
        return true;
      } else {
        console.warn(`❌ Failed to track event: ${eventTypeId}`, response.error);
        return false;
      }
    } catch (error) {
      console.error('Error tracking event:', error);
      return false;
    }
  };

  return { trackEvent };
};
