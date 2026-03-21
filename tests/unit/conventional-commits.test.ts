import { describe, it, expect } from 'vitest';
import {
  parseCommit,
  formatCommit,
  isValidCommitMessage,
  isValidDescription,
} from '../../src/core/conventional-commits.js';

describe('parseCommit', () => {
  it('parses a simple feat commit', () => {
    const result = parseCommit('feat: add login button');
    expect(result).toMatchObject({ type: 'feat', description: 'add login button', breaking: false });
  });

  it('parses commit with scope', () => {
    const result = parseCommit('fix(auth): handle expired tokens');
    expect(result).toMatchObject({ type: 'fix', scope: 'auth', description: 'handle expired tokens' });
  });

  it('parses commit with nested scope', () => {
    const result = parseCommit('feat(api/v2): add rate limiting');
    expect(result?.scope).toBe('api/v2');
  });

  it('detects breaking change via bang', () => {
    const result = parseCommit('feat!: remove legacy API');
    expect(result?.breaking).toBe(true);
  });

  it('detects breaking change via footer', () => {
    const raw = 'feat: new auth flow\n\nBREAKING CHANGE: token format changed';
    expect(parseCommit(raw)?.breaking).toBe(true);
  });

  it('captures body text', () => {
    const raw = 'fix: patch null check\n\nSome extra detail here.';
    expect(parseCommit(raw)?.body).toContain('extra detail');
  });

  it('returns null for non-conventional message', () => {
    expect(parseCommit('fixed some stuff')).toBeNull();
    expect(parseCommit('WIP')).toBeNull();
    expect(parseCommit('')).toBeNull();
  });

  it('returns null for unknown type', () => {
    expect(parseCommit('unknown: something')).toBeNull();
  });

  it('parses all valid types', () => {
    const types = ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore', 'revert'];
    for (const t of types) {
      expect(parseCommit(`${t}: something`)).not.toBeNull();
    }
  });
});

describe('formatCommit', () => {
  it('formats a simple commit', () => {
    expect(formatCommit({ type: 'feat', breaking: false, description: 'add login' }))
      .toBe('feat: add login');
  });

  it('formats commit with scope', () => {
    expect(formatCommit({ type: 'fix', scope: 'api', breaking: false, description: 'fix crash' }))
      .toBe('fix(api): fix crash');
  });

  it('adds bang for breaking change', () => {
    const result = formatCommit({ type: 'feat', breaking: true, description: 'remove v1', breakingNote: 'v1 removed' });
    expect(result).toContain('feat!: remove v1');
    expect(result).toContain('BREAKING CHANGE: v1 removed');
  });

  it('includes body when provided', () => {
    const result = formatCommit({ type: 'docs', breaking: false, description: 'update readme', body: 'Added section.' });
    expect(result).toBe('docs: update readme\n\nAdded section.');
  });

  it('does not add BREAKING CHANGE footer if no breakingNote', () => {
    const result = formatCommit({ type: 'feat', breaking: true, description: 'big change' });
    expect(result).not.toContain('BREAKING CHANGE:');
  });
});

describe('isValidCommitMessage', () => {
  it('accepts valid messages', () => {
    expect(isValidCommitMessage('feat: something')).toBe(true);
    expect(isValidCommitMessage('fix(scope): something')).toBe(true);
  });

  it('rejects invalid messages', () => {
    expect(isValidCommitMessage('just a message')).toBe(false);
    expect(isValidCommitMessage('')).toBe(false);
  });
});

describe('isValidDescription', () => {
  it('rejects empty description', () => {
    expect(isValidDescription('')).not.toBe(true);
    expect(isValidDescription('   ')).not.toBe(true);
  });

  it('rejects description over 72 chars', () => {
    const long = 'a'.repeat(73);
    expect(isValidDescription(long)).not.toBe(true);
  });

  it('accepts valid description', () => {
    expect(isValidDescription('add login button')).toBe(true);
  });
});
