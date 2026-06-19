import type { MetadataRoute } from 'next';

import { SITE } from '@/lib/seo/site';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.name,
    short_name: SITE.shortName,
    description: SITE.description,
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: SITE.themeColor.light,
    theme_color: SITE.themeColor.light,
    orientation: 'portrait',
    categories: ['business', 'productivity', 'developer'],
    icons: [
      { src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon', sizes: '180x180', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
