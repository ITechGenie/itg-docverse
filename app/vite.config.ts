import path from "path"
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      proxy: {
        '/files': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
        },        
        '/apis': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
        },
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
        }
      }
    },
    base: env.VITE_BASENAME || './', // Use environment variable or relative paths as fallback
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks for better caching
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['lucide-react', 'remark-gfm'],
          'vendor-utils': ['date-fns', 'class-variance-authority', 'clsx', 'tailwind-merge'],
          //editor chunks
           'ui-components': [
            '@radix-ui/react-avatar',
            '@radix-ui/react-collapsible',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-separator',
            '@radix-ui/react-slot',
            '@radix-ui/react-tooltip'
          ],
          'markdown': ['@uiw/react-md-editor', 'react-markdown'],
          // Feature-based chunks
          'pages-main': [
            './src/pages/dashboard.tsx',
            './src/pages/feed.tsx',
            './src/pages/profile.tsx'
          ],
          'pages-posts': [
            './src/pages/post-detail.tsx',
            './src/pages/create-post.tsx',
            './src/pages/post-versions.tsx'
          ],
          'pages-code-summaries': [
            './src/pages/git-repos.tsx',
            './src/pages/documents.tsx',
            './src/pages/document-detail.tsx'
          ],
          'components-common': [
            './src/components/common/post-header.tsx',
            './src/components/common/markdown-renderer.tsx',
            './src/components/common/error-boundary.tsx'
          ]
        }
      }
    },
    // Optimize chunk size warnings
    chunkSizeWarningLimit: 1000,
    // Enable source maps for better debugging
    sourcemap: true
  },
  // Enable dependency pre-bundling optimization
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'lucide-react',
      'date-fns',
      'clsx',
      'tailwind-merge'
    ]
  }
  }
})
