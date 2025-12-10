/** @type {import('next').NextConfig} */
const nextConfig = {
  // App Router is stable in Next.js 14+
  // No experimental flags needed
  
  // Production optimizations
  compress: true,
  poweredByHeader: false,
  
  // Optimize images
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'vercel.app' },
      { protocol: 'https', hostname: 'i.imgur.com' },
      { protocol: 'https', hostname: '**.amazonaws.com' },
      { protocol: 'https', hostname: '**.public.blob.vercel-storage.com' }
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
  
  // Optimize bundle size
  swcMinify: true,
  
  // Experimental features for performance
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-dropdown-menu'],
  },

  async redirects() {
    return [
      // TODO: Add meaningful redirects here if legacy URL shapes existed
      // Example: { source: '/content/:id', destination: '/content/:slug', permanent: true }
    ]
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), geolocation=(), microphone=()'
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self'",
              "connect-src 'self'",
              "media-src 'self' https://*.public.blob.vercel-storage.com",
              "frame-src https://js.stripe.com https://hooks.stripe.com https://www.tradingview.com",
              "frame-ancestors 'none'",
              "form-action 'self'"
            ].join('; ')
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig
