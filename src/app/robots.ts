import { MetadataRoute } from 'next'
 
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/predictions', '/leagues', '/admin'],
    },
    sitemap: 'https://www.elprodedebeno.com.ar/sitemap.xml',
  }
}
