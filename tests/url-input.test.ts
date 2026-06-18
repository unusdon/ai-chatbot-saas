import { describe, expect, it } from 'vitest';
import { z } from 'zod';

// Mirrors the SSRF guard inside ingestUrlAction so we can test the rules
// without booting Next.
const HostGuard = z
  .string()
  .trim()
  .url('Enter a valid URL')
  .refine((u) => {
    try {
      const parsed = new URL(u);
      if (!['http:', 'https:'].includes(parsed.protocol)) return false;
      const host = parsed.hostname.toLowerCase();
      if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') return false;
      if (host.endsWith('.localhost') || host.endsWith('.local')) return false;
      if (host.startsWith('10.') || host.startsWith('192.168.')) return false;
      if (/^169\.254\./.test(host)) return false;
      if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return false;
      return true;
    } catch {
      return false;
    }
  });

describe('URL ingestion SSRF guard', () => {
  it.each([
    ['https://docs.example.com'],
    ['http://example.com/path'],
    ['https://blog.example.com:8443/post?id=1'],
  ])('accepts %s', (u) => {
    expect(HostGuard.safeParse(u).success).toBe(true);
  });

  it.each([
    ['localhost', 'http://localhost:3000'],
    ['loopback', 'http://127.0.0.1'],
    ['link-local', 'http://169.254.169.254/'],
    ['private 10/8', 'http://10.0.0.5/'],
    ['private 192.168', 'http://192.168.1.1/'],
    ['private 172.16', 'http://172.20.10.5/'],
    ['mDNS .local', 'http://printer.local/'],
    ['ftp scheme', 'ftp://example.com/file'],
    ['file scheme', 'file:///etc/passwd'],
    ['gopher scheme', 'gopher://example.com/'],
  ])('rejects %s', (_label, u) => {
    expect(HostGuard.safeParse(u).success).toBe(false);
  });
});
