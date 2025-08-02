import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

// Custom hook for lazy loading components with error handling
export function useLazyComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
): LazyExoticComponent<T> {
  return lazy(importFunc);
}

// Preload function for critical routes
export function preloadRoute(routeImport: () => Promise<any>) {
  // Preload during idle time
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => {
      routeImport().catch(console.error);
    });
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(() => {
      routeImport().catch(console.error);
    }, 100);
  }
}

// Preload critical routes on app initialization
export function preloadCriticalRoutes() {
  // Preload the most commonly accessed pages
  preloadRoute(() => import('@/pages/feed'));
  preloadRoute(() => import('@/pages/post-detail'));
  preloadRoute(() => import('@/pages/create-post'));
}
