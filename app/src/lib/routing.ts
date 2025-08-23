/**
 * Utility functions for handling routing URLs in both hash and path-based routing modes
 */

/**
 * Generates a URL that works with both HashRouter and BrowserRouter
 * In development: returns path-based URLs
 * In production with basename: returns path-based URLs with basename prefix
 */
export function createUrl(path: string): string {
  // Remove any existing hash prefix from path
  const cleanPath = path.replace(/^#?/, '');
  
  // Get the basename from environment variables
  const basename = import.meta.env.VITE_BASENAME || '';
  
  // In development or when no basename is set, return the clean path
  if (!basename) {
    return cleanPath;
  }
  
  // In production with basename, prefix the path
  return `${basename}${cleanPath}`;
}

/**
 * Navigate to a URL using the appropriate method for the current routing mode
 */
export function navigateTo(path: string): void {
  const url = createUrl(path);
  window.location.href = url;
}

/**
 * Check if a path is currently active
 */
export function isPathActive(path: string, currentPath?: string): boolean {
  const cleanPath = path.replace(/^#?/, '');
  
  if (currentPath) {
    return currentPath.startsWith(cleanPath);
  }
  
  // Fallback to checking current location
  const currentLocation = window.location.pathname + window.location.hash.replace('#', '');
  return currentLocation.startsWith(cleanPath);
}

/**
 * Get current path without hash or basename
 */
export function getCurrentPath(): string {
  const basename = import.meta.env.VITE_BASENAME || '';
  let path = window.location.pathname;
  
  // Remove basename if present
  if (basename && path.startsWith(basename)) {
    path = path.slice(basename.length);
  }
  
  // Also check hash for backward compatibility
  if (!path || path === '/') {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      path = hash;
    }
  }
  
  return path || '/';
}
