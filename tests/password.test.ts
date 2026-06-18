import bcrypt from 'bcryptjs';
import { describe, expect, it } from 'vitest';

describe('password hashing (bcrypt)', () => {
  it('hashes and verifies a password round-trip', async () => {
    const hash = await bcrypt.hash('correct-horse-battery-staple', 4);
    expect(hash).not.toBe('correct-horse-battery-staple');
    await expect(bcrypt.compare('correct-horse-battery-staple', hash)).resolves.toBe(true);
    await expect(bcrypt.compare('wrong-password', hash)).resolves.toBe(false);
  });

  it('produces different hashes for the same password (salted)', async () => {
    const a = await bcrypt.hash('s4me-p4ssw0rd', 4);
    const b = await bcrypt.hash('s4me-p4ssw0rd', 4);
    expect(a).not.toBe(b);
  });
});
