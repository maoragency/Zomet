import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'
import { splitVendorChunkPlugin } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Enable React Fast Refresh
      fastRefresh: true
    }),
    // Split vendor chunks automatically
    splitVendorChunkPlugin(),
    // Bundle analyzer (only in build mode)
    process.env.ANALYZE && visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true
    })
  ],
  server: {
    port: 8080,
    allowedHosts: true,
    // Enable HTTP/2 for better performance
    https: false,
    // Optimize dev server
    hmr: {
      overlay: false
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx', '.json']
  },
  optimizeDeps: {
    // Pre-bundle dependencies for faster dev server startup
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      'lucide-react',
      'date-fns',
      'clsx'
    ],
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
      // Optimize for modern browsers
      target: 'es2020'
    },
  },
  build: {
    // Optimize build output
    target: 'es2020',
    minify: 'terser',
    sourcemap: false,
    // Reduce CSS code splitting threshold
    cssCodeSplit: true,
    // Optimize asset handling
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        // Enhanced manual chunking strategy
        manualChunks: (id) => {
          // Vendor chunks
          if (id.includes('node_modules')) {
            // React ecosystem
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor'
            }
            
            // Radix UI components
            if (id.includes('@radix-ui')) {
              return 'radix-ui'
            }
            
            // Supabase
            if (id.includes('@supabase')) {
              return 'supabase'
            }
            
            // Form libraries
            if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('zod')) {
              return 'forms'
            }
            
            // Utility libraries
            if (id.includes('date-fns') || id.includes('clsx') || id.includes('class-variance-authority') || id.includes('tailwind-merge')) {
              return 'utils'
            }
            
            // Icons
            if (id.includes('lucide-react')) {
              return 'icons'
            }
            
            // Charts and visualization
            if (id.includes('recharts') || id.includes('chart') || id.includes('d3')) {
              return 'charts'
            }
            
            // Other vendor libraries
            return 'vendor'
          }
          
          // Application chunks
          if (id.includes('/pages/dashboard/admin/')) {
            return 'admin-dashboard'
          }
          
          if (id.includes('/pages/dashboard/user/')) {
            return 'user-dashboard'
          }
          
          if (id.includes('/pages/auth/')) {
            return 'auth'
          }
          
          if (id.includes('/services/')) {
            return 'services'
          }
          
          if (id.includes('/components/optimized/')) {
            return 'optimized-components'
          }
        },
        
        // Optimize chunk file names
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
          if (facadeModuleId) {
            if (facadeModuleId.includes('pages/dashboard/admin')) {
              return 'chunks/admin-[name]-[hash].js'
            }
            if (facadeModuleId.includes('pages/dashboard/user')) {
              return 'chunks/user-[name]-[hash].js'
            }
            if (facadeModuleId.includes('pages/auth')) {
              return 'chunks/auth-[name]-[hash].js'
            }
          }
          return 'chunks/[name]-[hash].js'
        },
        
        // Optimize asset file names
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.')
          const ext = info[info.length - 1]
          
          if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name)) {
            return `assets/images/[name]-[hash].${ext}`
          }
          
          if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name)) {
            return `assets/fonts/[name]-[hash].${ext}`
          }
          
          if (/\.(css)$/i.test(assetInfo.name)) {
            return `assets/css/[name]-[hash].${ext}`
          }
          
          return `assets/[name]-[hash].${ext}`
        }
      },
      
      // Optimize external dependencies
      external: (id) => {
        // Don't bundle these in production (if using CDN)
        return false
      }
    },
    
    // Terser options for better minification
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn']
      },
      mangle: {
        safari10: true
      },
      format: {
        comments: false
      }
    },
    
    // Increase chunk size warning limit to 1MB
    chunkSizeWarningLimit: 1000,
    
    // Disable compressed size reporting for faster builds
    reportCompressedSize: false
  },
  
  // CSS optimization
  css: {
    devSourcemap: true,
    preprocessorOptions: {
      // Add any CSS preprocessor options here
    }
  },
  
  // Performance optimizations
  esbuild: {
    // Remove console logs in production
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
    // Optimize for modern browsers
    target: 'es2020'
  },
  
  // Preview server configuration
  preview: {
    port: 8080,
    strictPort: true
  }
}) 