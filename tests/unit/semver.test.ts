import { describe, it, expect } from 'vitest';
import { determineBump, applyBump, isValidVersion, cleanVersion } from '../../src/core/semver.js';
import type { ConventionalCommit } from '../../src/core/conventional-commits.js';

function makeCommit(type: ConventionalCommit['type'], breaking = false): ConventionalCommit {
  return { type, breaking, description: 'test', raw: `${type}: test` };
}

describe('determineBump', () => {
  it('returns major for breaking changes', () => {
    expect(determineBump([makeCommit('fix', true)])).toBe('major');
  });

  it('returns minor for feat', () => {
    expect(determineBump([makeCommit('feat')])).toBe('minor');
  });

  it('returns patch for fix', () => {
    expect(determineBump([makeCommit('fix')])).toBe('patch');
  });

  it('returns patch for docs/chore', () => {
    expect(determineBump([makeCommit('docs'), makeCommit('chore')])).toBe('patch');
  });

  it('breaking takes precedence over feat', () => {
    expect(determineBump([makeCommit('feat'), makeCommit('fix', true)])).toBe('major');
  });

  it('minor takes precedence over patch', () => {
    expect(determineBump([makeCommit('fix'), makeCommit('feat')])).toBe('minor');
  });

  it('returns patch for empty commits array', () => {
    expect(determineBump([])).toBe('patch');
  });
});

describe('applyBump', () => {
  it('bumps major version', () => {
    expect(applyBump('1.2.3', 'major')).toBe('2.0.0');
  });

  it('bumps minor version', () => {
    expect(applyBump('1.2.3', 'minor')).toBe('1.3.0');
  });

  it('bumps patch version', () => {
    expect(applyBump('1.2.3', 'patch')).toBe('1.2.4');
  });

  it('throws on invalid version', () => {
    expect(() => applyBump('not-a-version', 'patch')).toThrow();
  });
});

describe('isValidVersion', () => {
  it('accepts valid semver strings', () => {
    expect(isValidVersion('1.0.0')).toBe(true);
    expect(isValidVersion('0.1.0-alpha.1')).toBe(true);
    expect(isValidVersion('2.0.0-rc.1')).toBe(true);
  });

  it('rejects invalid strings', () => {
    expect(isValidVersion('not-a-version')).toBe(false);
    expect(isValidVersion('')).toBe(false);
    expect(isValidVersion('v1.0')).toBe(false);
  });
});

describe('cleanVersion', () => {
  it('strips leading v prefix', () => {
    expect(cleanVersion('v1.2.3')).toBe('1.2.3');
  });

  it('returns valid version unchanged', () => {
    expect(cleanVersion('1.2.3')).toBe('1.2.3');
  });
});
