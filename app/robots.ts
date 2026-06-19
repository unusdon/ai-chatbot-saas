import type { MetadataRoute } from 'next';

import { SITE } from '@/lib/seo/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/login', '/signup'],
        // Crawlers should never index private user areas or API endpoints.
        disallow: [
          '/dashboard',
          '/bots',
          '/account',
          '/forgot-password',
          '/api/',
          '/_next/',
        ],
      },
      {
        // Be polite to LLM crawlers — let them have the marketing surface but
        // not the API or user data.
        userAgent: ['GPTBot', 'Google-Extended', 'ClaudeBot', 'PerplexityBot', 'CCBot'],
        allow: ['/'],
        disallow: ['/api/', '/dashboard', '/bots', '/account'],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
