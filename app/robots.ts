import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://crypto-portal.com'
  
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/me/',
          '/account/',
          '/dashboard/',
          '/notifications/',
          '/_next/',
          '/login',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
