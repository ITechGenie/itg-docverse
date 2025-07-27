import { Routes, Route } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { useAuth } from '@/hooks/use-auth';
import Layout from '@/components/layout';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load components for code splitting
const Dashboard = lazy(() => import('@/pages/dashboard'));
const Feed = lazy(() => import('@/pages/feed'));
const CreatePost = lazy(() => import('@/pages/create-post'));
const PostDetail = lazy(() => import('@/pages/post-detail'));
const DocumentDetail = lazy(() => import('@/pages/document-detail'));
const Profile = lazy(() => import('@/pages/profile'));
const Tags = lazy(() => import('@/pages/tags'));
const NotFound = lazy(() => import('@/pages/not-found'));
const GitRepos = lazy(() => import('@/pages/git-repos'));
const Documents = lazy(() => import('@/pages/documents'));
const PostVersions = lazy(() => import('@/pages/post-versions'));

// Loading fallback components for different sections
const PageLoadingFallback = () => (
  <div className="space-y-6 p-6">
    <Skeleton className="h-8 w-64" />
    <div className="space-y-4">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  </div>
);

const PostLoadingFallback = () => (
  <div className="max-w-4xl mx-auto space-y-6 p-6">
    <Skeleton className="h-12 w-3/4" />
    <div className="flex items-center space-x-4">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
    <Skeleton className="h-64 w-full" />
  </div>
);

const FeedLoadingFallback = () => (
  <div className="space-y-6 p-6">
    {[1, 2, 3].map((i) => (
      <div key={i} className="border rounded-lg p-6 space-y-4">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-20 w-full" />
      </div>
    ))}
  </div>
);

export default function AppRouter() {
  const { initialize } = useAuth();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <Layout>
      <Routes>
        {/* Main Feed Routes */}
        <Route path="/" element={
          <Suspense fallback={<FeedLoadingFallback />}>
            <Feed />
          </Suspense>
        } />
        <Route path="/dashboard" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <Dashboard />
          </Suspense>
        } />
        <Route path="/feed" element={
          <Suspense fallback={<FeedLoadingFallback />}>
            <Feed />
          </Suspense>
        } />
        <Route path="/feed/:filter" element={
          <Suspense fallback={<FeedLoadingFallback />}>
            <Feed />
          </Suspense>
        } />
        
        {/* Post Creation Routes */}
        <Route path="/create" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <CreatePost />
          </Suspense>
        } />
        <Route path="/create/article" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <CreatePost />
          </Suspense>
        } />
        <Route path="/create/thoughts" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <CreatePost />
          </Suspense>
        } />
        
        {/* Post Detail Routes */}
        <Route path="/post/:id" element={
          <Suspense fallback={<PostLoadingFallback />}>
            <PostDetail />
          </Suspense>
        } />
        <Route path="/post/:id/:version" element={
          <Suspense fallback={<PostLoadingFallback />}>
            <PostDetail />
          </Suspense>
        } />
        <Route path="/post/:id/edit" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <CreatePost />
          </Suspense>
        } />
        <Route path="/post/:id/:version/edit" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <CreatePost />
          </Suspense>
        } />
        <Route path="/post/:id/versions" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <PostVersions />
          </Suspense>
        } />
        
        {/* User and Tags Routes */}
        <Route path="/profile/:username?" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <Profile />
          </Suspense>
        } />
        <Route path="/tags" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <Tags />
          </Suspense>
        } />
        <Route path="/tags/:tagName" element={
          <Suspense fallback={<FeedLoadingFallback />}>
            <Feed />
          </Suspense>
        } />
        
        {/* Code Summaries Routes */}
        <Route path="/code-summaries/git-repos" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <GitRepos />
          </Suspense>
        } />
        <Route path="/code-summaries/git-repos/:systemId" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <GitRepos />
          </Suspense>
        } />
        <Route path="/code-summaries/documents" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <Documents />
          </Suspense>
        } />
        <Route path="/code-summaries/documents/:docId" element={
          <Suspense fallback={<PostLoadingFallback />}>
            <DocumentDetail />
          </Suspense>
        } />
        <Route path="/code-summaries/documents/:docId/:docType" element={
          <Suspense fallback={<PostLoadingFallback />}>
            <DocumentDetail />
          </Suspense>
        } />
        <Route path="/code-summaries/documents/:docId/:version" element={
          <Suspense fallback={<PostLoadingFallback />}>
            <DocumentDetail />
          </Suspense>
        } />
        <Route path="/code-summaries/documents/:docId/:docType/:version" element={
          <Suspense fallback={<PostLoadingFallback />}>
            <DocumentDetail />
          </Suspense>
        } />
        <Route path="/code-summaries/documents/:docId/edit" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <CreatePost />
          </Suspense>
        } />
        <Route path="/code-summaries/documents/:docId/:version/edit" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <CreatePost />
          </Suspense>
        } />
        <Route path="/code-summaries/documents/:docId/versions" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <PostVersions />
          </Suspense>
        } />
        
        {/* 404 Route */}
        <Route path="*" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <NotFound />
          </Suspense>
        } />
      </Routes>
    </Layout>
  );
}
