import { describe, it, expect } from 'vitest';
import { generateChangelog, prependToChangelog, type ChangelogEntry } from '../../src/core/changelog-generator.js';
import type { ConventionalCommit } from '../../src/core/conventional-commits.js';

function makeCommit(
  type: ConventionalCommit['type'],
  description: string,
  opts: { breaking?: boolean; scope?: string; hash?: string } = {},
): ConventionalCommit {
  return { type, description, breaking: opts.breaking ?? false, scope: opts.scope, hash: opts.hash, raw: `${type}: ${description}` };
}

const baseEntry: ChangelogEntry = {
  version: '1.0.0',
  date: '2026-03-21',
  commits: [
    makeCommit('feat', 'add login button'),
    makeCommit('fix', 'fix token refresh'),
    makeCommit('docs', 'update readme'),
  ],
};

describe('generateChangelog - keepachangelog', () => {
  it('includes version header with date', () => {
    const result = generateChangelog(baseEntry, 'keepachangelog');
    expect(result).toContain('## [1.0.0] - 2026-03-21');
  });

  it('groups feat commits under Added', () => {
    const result = generateChangelog(baseEntry, 'keepachangelog');
    expect(result).toContain('### Added');
    expect(result).toContain('add login button');
  });

  it('groups fix commits under Fixed', () => {
    const result = generateChangelog(baseEntry, 'keepachangelog');
    expect(result).toContain('### Fixed');
    expect(result).toContain('fix token refresh');
  });

  it('includes scope in entry when present', () => {
    const entry: ChangelogEntry = {
      ...baseEntry,
      commits: [makeCommit('feat', 'add rate limit', { scope: 'api' })],
    };
    const result = generateChangelog(entry, 'keepachangelog');
    expect(result).toContain('**api:**');
  });

  it('omits empty sections', () => {
    const entry: ChangelogEntry = { ...baseEntry, commits: [makeCommit('feat', 'something')] };
    const result = generateChangelog(entry, 'keepachangelog');
    expect(result).not.toContain('### Fixed');
  });
});

describe('generateChangelog - github', () => {
  it('shows breaking changes section', () => {
    const entry: ChangelogEntry = {
      ...baseEntry,
      commits: [makeCommit('feat', 'remove v1', { breaking: true })],
    };
    const result = generateChangelog(entry, 'github');
    expect(result).toContain('Breaking Changes');
  });

  it('shows new features section', () => {
    const result = generateChangelog(baseEntry, 'github');
    expect(result).toContain('New Features');
    expect(result).toContain('add login button');
  });

  it('shows bug fixes section', () => {
    const result = generateChangelog(baseEntry, 'github');
    expect(result).toContain('Bug Fixes');
  });

  it('omits missing sections', () => {
    const entry: ChangelogEntry = { ...baseEntry, commits: [makeCommit('feat', 'something')] };
    const result = generateChangelog(entry, 'github');
    expect(result).not.toContain('Bug Fixes');
  });
});

describe('generateChangelog - conventional', () => {
  it('includes version and date', () => {
    const result = generateChangelog(baseEntry, 'conventional');
    expect(result).toContain('1.0.0');
    expect(result).toContain('2026-03-21');
  });

  it('includes commit hash when present', () => {
    const entry: ChangelogEntry = {
      ...baseEntry,
      commits: [makeCommit('feat', 'something', { hash: 'abc1234def' })],
    };
    const result = generateChangelog(entry, 'conventional');
    expect(result).toContain('abc1234');
  });
});

describe('generateChangelog - default format', () => {
  it('defaults to keepachangelog when no format specified', () => {
    const result = generateChangelog(baseEntry);
    expect(result).toContain('## [1.0.0]');
  });
});

describe('prependToChangelog', () => {
  it('creates full file with header when existing is empty', () => {
    const result = prependToChangelog('', '## [1.0.0] - 2026-03-21\n- something');
    expect(result).toContain('# Changelog');
    expect(result).toContain('## [1.0.0]');
  });

  it('inserts before existing entries', () => {
    const existing = '# Changelog\n\nAll notable changes.\n\n## [0.9.0] - 2026-01-01\n- old';
    const result = prependToChangelog(existing, '## [1.0.0] - 2026-03-21\n- new');
    expect(result.indexOf('1.0.0')).toBeLessThan(result.indexOf('0.9.0'));
  });

  it('prepends to non-changelog existing file', () => {
    const result = prependToChangelog('Some old content', '## [1.0.0]\n- new');
    expect(result).toContain('# Changelog');
    expect(result.indexOf('1.0.0')).toBeLessThan(result.indexOf('old content'));
  });
});
