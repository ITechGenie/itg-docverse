import { BrowserRouter } from "react-router-dom"
import { Suspense, useEffect } from "react"
import { ThemeProvider } from "./components/theme-provider"
import { ErrorBoundary } from "./components/common/error-boundary"
import { AuthProvider } from "./contexts/auth-context"
import AppRouter from "./components/app-router"
import { Skeleton } from "./components/ui/skeleton"
import { preloadCriticalRoutes } from "./hooks/use-lazy-component"

// Loading fallback component
const AppLoadingFallback = () => (
  <div className="min-h-screen bg-background">
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    </div>
  </div>
)

export default function App() {
  // Preload critical routes on app initialization
  useEffect(() => {
    preloadCriticalRoutes();
  }, []);

  // Get the base path from environment variables
  const basename = import.meta.env.VITE_BASENAME || '';

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <AuthProvider>
          <BrowserRouter basename={basename}>
            <Suspense fallback={<AppLoadingFallback />}>
              <AppRouter />
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
