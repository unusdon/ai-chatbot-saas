import { ImageResponse } from 'next/og';

import { SITE } from '@/lib/seo/site';

export const runtime = 'edge';
export const alt = `${SITE.name} — ${SITE.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
          padding: '72px 80px',
          position: 'relative',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Subtle grid background */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage:
              'radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)',
            opacity: 0.5,
          }}
        />

        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: '#0f172a',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            ✦
          </div>
          <div style={{ display: 'flex', fontSize: 24, fontWeight: 600, color: '#0f172a', letterSpacing: -0.5 }}>
            {SITE.name}
          </div>
        </div>

        {/* Headline */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            marginTop: 80,
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: 88,
              lineHeight: 1.05,
              fontWeight: 800,
              color: '#0f172a',
              letterSpacing: -2,
              maxWidth: 1000,
            }}
          >
            Train an AI on your content.
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 88,
              lineHeight: 1.05,
              fontWeight: 800,
              letterSpacing: -2,
              background: 'linear-gradient(135deg, #0f172a 0%, #64748b 100%)',
              backgroundClip: 'text',
              color: 'transparent',
              maxWidth: 1000,
            }}
          >
            Embed anywhere.
          </div>
        </div>

        {/* Footer chips */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            marginTop: 'auto',
            flexWrap: 'wrap',
          }}
        >
          {['RAG', 'pgvector', 'Streaming citations', 'Shadow-DOM widget', 'MIT'].map((tag) => (
            <div
              key={tag}
              style={{
                display: 'flex',
                padding: '8px 16px',
                borderRadius: 9999,
                border: '1px solid #cbd5e1',
                background: 'rgba(255,255,255,0.7)',
                color: '#475569',
                fontSize: 22,
                fontWeight: 500,
              }}
            >
              {tag}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
