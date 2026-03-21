import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { simpleGit } from 'simple-git';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createGitAdapter } from '../../src/core/git.js';
import { parseCommit } from '../../src/core/conventional-commits.js';
import { determineBump, applyBump, cleanVersion } from '../../src/core/semver.js';
import { generateChangelog, prependToChangelog } from '../../src/core/changelog-generator.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = mkdtempSync(join(tmpdir(), 'gitflow-release-'));
  const git = simpleGit(tmpDir);
  await git.init();
  await git.addConfig('user.email', 'test@example.com');
  await git.addConfig('user.name', 'Test User');
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

async function scaffoldRepo(commits: Array<[string, string]>): Promise<void> {
  const adapter = createGitAdapter(tmpDir);
  writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({ name: 'test', version: '0.1.0' }, null, 2));
  await adapter.addAll();
  await adapter.commit('chore: init');
  await adapter.tag('v0.1.0');

  for (const [file, msg] of commits) {
    writeFileSync(join(tmpDir, file), 'x');
    await adapter.addAll();
    await adapter.commit(msg);
  }
}

describe('release flow — version bump', () => {
  it('bumps minor when feat commits exist', async () => {
    await scaffoldRepo([['a.ts', 'feat: add search'], ['b.ts', 'fix: crash on load']]);

    const adapter = createGitAdapter(tmpDir);
    const lastTag = await adapter.getLastTag();
    const logs = await adapter.getLog(lastTag ?? undefined);
    const commits = logs.map((e) => parseCommit(e.message)).filter(Boolean) as ReturnType<typeof parseCommit>[];

    const bump = determineBump(commits.filter((c) => c !== null));
    expect(bump).toBe('minor');
    expect(applyBump('0.1.0', bump)).toBe('0.2.0');
  });

  it('bumps major on breaking change', async () => {
    await scaffoldRepo([['a.ts', 'feat!: remove v1 endpoints']]);

    const adapter = createGitAdapter(tmpDir);
    const lastTag = await adapter.getLastTag();
    const logs = await adapter.getLog(lastTag ?? undefined);
    const commits = logs.map((e) => parseCommit(e.message)).filter((c) => c !== null);

    expect(determineBump(commits)).toBe('major');
  });

  it('bumps patch for fix-only commits', async () => {
    await scaffoldRepo([['a.ts', 'fix: null check'], ['b.ts', 'chore: update deps']]);

    const adapter = createGitAdapter(tmpDir);
    const logs = await adapter.getLog('v0.1.0');
    const commits = logs.map((e) => parseCommit(e.message)).filter((c) => c !== null);

    expect(determineBump(commits)).toBe('patch');
  });
});

describe('release flow — changelog + tag', () => {
  it('writes changelog and creates tag', async () => {
    await scaffoldRepo([['f.ts', 'feat: add export command'], ['g.ts', 'fix(cli): wrong exit code']]);

    const adapter = createGitAdapter(tmpDir);
    const lastTag = await adapter.getLastTag();
    const logs = await adapter.getLog(lastTag ?? undefined);
    const commits = logs.map((e) => parseCommit(e.message)).filter((c) => c !== null);

    const bump = determineBump(commits);
    const next = applyBump(cleanVersion('0.1.0'), bump);
    const date = '2026-03-21';
    const entry = generateChangelog({ version: next, date, commits }, 'keepachangelog');
    const changelogPath = join(tmpDir, 'CHANGELOG.md');
    writeFileSync(changelogPath, prependToChangelog('', entry), 'utf8');

    const content = readFileSync(changelogPath, 'utf8');
    expect(content).toContain(`## [${next}]`);
    expect(content).toContain('add export command');
    expect(content).toContain('wrong exit code');

    await adapter.addAll();
    await adapter.commit(`chore(release): v${next}`);
    await adapter.tag(`v${next}`);

    const newTag = await adapter.getLastTag();
    expect(newTag).toBe(`v${next}`);
  });
});

describe('release flow — dirty tree validation', () => {
  it('detects uncommitted changes', async () => {
    await scaffoldRepo([]);
    writeFileSync(join(tmpDir, 'dirty.ts'), 'unstaged');

    const adapter = createGitAdapter(tmpDir);
    const status = await adapter.getStatus();
    expect(status.untracked.length + status.unstaged.length).toBeGreaterThan(0);
  });

  it('passes when tree is clean', async () => {
    await scaffoldRepo([]);
    const adapter = createGitAdapter(tmpDir);
    const status = await adapter.getStatus();
    const dirty = status.staged.length + status.unstaged.length + status.untracked.length;
    expect(dirty).toBe(0);
  });
});
