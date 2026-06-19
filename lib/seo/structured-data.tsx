/**
 * Server components that emit JSON-LD structured data blocks. Used by the
 * landing page (and root layout for site-wide entities) so search engines can
 * extract entities + FAQ rich results.
 *
 * Each component renders a single <script type="application/ld+json"> tag
 * with the relevant schema.org object inline.
 */
import { SITE, absoluteUrl } from './site';
import type { Faq } from './faqs';

function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function OrganizationJsonLd() {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: SITE.author.name,
        url: SITE.author.url,
        logo: absoluteUrl('/icon'),
        email: SITE.author.email,
        sameAs: [SITE.github, SITE.author.url],
      }}
    />
  );
}

export function WebSiteJsonLd() {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE.name,
        url: SITE.url,
        description: SITE.description,
        inLanguage: 'en',
        publisher: {
          '@type': 'Organization',
          name: SITE.author.name,
          url: SITE.author.url,
        },
      }}
    />
  );
}

export function SoftwareApplicationJsonLd() {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: SITE.name,
        description: SITE.description,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        url: SITE.url,
        image: absoluteUrl('/opengraph-image'),
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
          description: 'Free plan: 3 bots, 25 documents, 200 messages/month.',
        },
        featureList: [
          'Retrieval-augmented generation (RAG) with cited answers',
          'Five swappable LLM providers: OpenAI, Anthropic Claude, Google Gemini, Deepseek, Ollama (local)',
          'Three embedding providers: OpenAI, Google, Ollama (local)',
          'Multi-format ingestion: PDF, DOCX, XLSX, JSON, Markdown, plain text, URLs, sitemap.xml crawl, Q&A pairs',
          'Embeddable Shadow-DOM widget (~3.2 KB gzipped)',
          'pgvector + HNSW retrieval with HNSW cosine index',
          'Streaming Server-Sent Events',
          'Multi-tenant isolation enforced server-side',
          'Customer conversation admin: search, filter, flag, archive, bulk delete, JSON export',
          'Live conversation stats: active 24h/7d, unique end-users, avg messages per session',
          'Per-bot analytics with content-gap surfacing',
          'Admin session management with per-device revoke + audit log',
          'Per-plan usage caps with Stripe-backed upgrades',
        ],
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '5',
          ratingCount: '1',
          reviewCount: '1',
        },
        publisher: {
          '@type': 'Organization',
          name: SITE.author.name,
          url: SITE.author.url,
        },
      }}
    />
  );
}

export function FaqJsonLd({ faqs }: { faqs: Faq[] }) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: {
            '@type': 'Answer',
            text: f.a,
          },
        })),
      }}
    />
  );
}

export function BreadcrumbJsonLd({ items }: { items: Array<{ name: string; url: string }> }) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: item.name,
          item: item.url,
        })),
      }}
    />
  );
}
