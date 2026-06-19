/**
 * Tiny user-agent parser — just enough to label a device on the sessions
 * page. We don't pull in a heavy UA library because the strings are public
 * and the labels are descriptive, not security-critical.
 */
export type DeviceLabel = {
  browser: string;
  os: string;
  type: 'desktop' | 'mobile' | 'tablet' | 'bot' | 'unknown';
};

export function parseUserAgent(ua: string | null | undefined): DeviceLabel {
  if (!ua) return { browser: 'Unknown', os: 'Unknown', type: 'unknown' };
  const s = ua.toLowerCase();

  let type: DeviceLabel['type'] = 'desktop';
  if (/bot|crawl|spider|slurp/.test(s)) type = 'bot';
  else if (/ipad|tablet/.test(s)) type = 'tablet';
  else if (/mobile|android|iphone|ipod/.test(s)) type = 'mobile';

  let browser = 'Browser';
  if (/edg\//.test(s)) browser = 'Edge';
  else if (/firefox/.test(s)) browser = 'Firefox';
  else if (/opr\/|opera/.test(s)) browser = 'Opera';
  else if (/chrome|crios/.test(s)) browser = 'Chrome';
  else if (/safari/.test(s)) browser = 'Safari';

  let os = 'OS';
  if (/windows nt 10/.test(s)) os = 'Windows';
  else if (/windows/.test(s)) os = 'Windows';
  else if (/mac os x|macintosh/.test(s)) os = 'macOS';
  else if (/iphone os|ipad/.test(s)) os = 'iOS';
  else if (/android/.test(s)) os = 'Android';
  else if (/linux/.test(s)) os = 'Linux';

  return { browser, os, type };
}
