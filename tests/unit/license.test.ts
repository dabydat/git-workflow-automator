import { describe, it, expect } from 'vitest';
import { sign } from 'node:crypto';
import { validateLicense, ProRequiredError, checkProLicense } from '../../src/core/license.js';

// Test key pair — matches the public key embedded in license.ts
const TEST_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIDC4YHrgp8w4lONYwkBOXT1utDLL89ew5iYRIndOptyk
-----END PRIVATE KEY-----`;

function makeKey(email: string, expiry: string): string {
  const payload = `${email}:${expiry}`;
  const payloadB64 = Buffer.from(payload).toString('base64url');
  const signature = sign(null, Buffer.from(payload), TEST_PRIVATE_KEY);
  return `GITFLOWPRO-${payloadB64}.${signature.toString('base64url')}`;
}

function futureDate(daysFromNow = 365): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

function pastDate(daysAgo = 1): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

describe('validateLicense', () => {
  it('accepts a valid signed key', () => {
    const key = makeKey('user@example.com', futureDate());
    const info = validateLicense(key);
    expect(info.email).toBe('user@example.com');
  });

  it('returns expiry date', () => {
    const expiry = futureDate(30);
    const key = makeKey('user@example.com', expiry);
    expect(validateLicense(key).expiry).toBe(expiry);
  });

  it('throws on wrong prefix', () => {
    expect(() => validateLicense('WRONG-abc.def')).toThrow('Invalid key format');
  });

  it('throws on tampered payload', () => {
    const key = makeKey('user@example.com', futureDate());
    const parts = key.split('.');
    const tampered = `GITFLOWPRO-${Buffer.from('hacker@evil.com:2099-01-01').toString('base64url')}.${parts[1]}`;
    expect(() => validateLicense(tampered)).toThrow('invalid');
  });

  it('throws on expired key', () => {
    const key = makeKey('user@example.com', pastDate(1));
    expect(() => validateLicense(key)).toThrow('expired');
  });

  it('throws on missing signature part', () => {
    expect(() => validateLicense('GITFLOWPRO-onlyone')).toThrow('Invalid key format');
  });
});

describe('checkProLicense', () => {
  it('throws ProRequiredError with BMaC link when no key set', () => {
    const saved = process.env['GITFLOW_PRO_KEY'];
    delete process.env['GITFLOW_PRO_KEY'];

    try {
      checkProLicense();
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ProRequiredError);
      expect((err as ProRequiredError).suggestion).toContain('buymeacoffee.com');
    } finally {
      if (saved) process.env['GITFLOW_PRO_KEY'] = saved;
    }
  });

  it('passes when valid key is set in env', () => {
    const key = makeKey('pro@example.com', futureDate());
    process.env['GITFLOW_PRO_KEY'] = key;
    try {
      const info = checkProLicense();
      expect(info.email).toBe('pro@example.com');
    } finally {
      delete process.env['GITFLOW_PRO_KEY'];
    }
  });
});
