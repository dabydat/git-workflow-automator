import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { applyBump, determineBump } from '../../src/core/semver.js';
import type { ConventionalCommit } from '../../src/core/conventional-commits.js';

// Unit-test the logic used by the version command without invoking Commander

function makeCommit(type: ConventionalCommit['type'], breaking = false): ConventionalCommit {
  return { type, breaking, description: 'test', raw: `${type}: test` };
}

describe('version command — bump detection logic', () => {
  it('detects major bump from breaking commit', () => {
    expect(determineBump([makeCommit('fix', true)])).toBe('major');
  });

  it('detects minor bump from feat', () => {
    expect(determineBump([makeCommit('feat')])).toBe('minor');
  });

  it('detects patch bump from fix', () => {
    expect(determineBump([makeCommit('fix')])).toBe('patch');
  });

  it('applies bump to version string', () => {
    expect(applyBump('1.0.0', 'minor')).toBe('1.1.0');
    expect(applyBump('1.1.0', 'patch')).toBe('1.1.1');
    expect(applyBump('1.1.1', 'major')).toBe('2.0.0');
  });

  it('throws on malformed version in package.json', () => {
    expect(() => applyBump('not-semver', 'patch')).toThrow();
  });
});

describe('version command — package.json read/write', () => {
  const tmpPath = '/tmp/test-pkg.json';

  beforeEach(() => {
    writeFileSync(tmpPath, JSON.stringify({ name: 'test', version: '1.2.3' }, null, 2));
  });

  afterEach(() => {
    try { require('node:fs').rmSync(tmpPath); } catch { /* ignore */ }
  });

  it('reads current version correctly', () => {
    const pkg = JSON.parse(readFileSync(tmpPath, 'utf8')) as { version: string };
    expect(pkg.version).toBe('1.2.3');
  });

  it('writes bumped version back to file', () => {
    const pkg = JSON.parse(readFileSync(tmpPath, 'utf8')) as Record<string, unknown>;
    pkg.version = applyBump(pkg.version as string, 'minor');
    writeFileSync(tmpPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    const updated = JSON.parse(readFileSync(tmpPath, 'utf8')) as { version: string };
    expect(updated.version).toBe('1.3.0');
  });
});
