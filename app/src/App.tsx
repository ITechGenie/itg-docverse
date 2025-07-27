import { HashRouter } from "react-router-dom"
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

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <AuthProvider>
          <HashRouter>
            <Suspense fallback={<AppLoadingFallback />}>
              <AppRouter />
            </Suspense>
          </HashRouter>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
