import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { simpleGit } from 'simple-git';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createGitAdapter } from '../../src/core/git.js';
import { parseCommit } from '../../src/core/conventional-commits.js';
import { generateChangelog } from '../../src/core/changelog-generator.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = mkdtempSync(join(tmpdir(), 'gitflow-test-'));
  const git = simpleGit(tmpDir);
  await git.init();
  await git.addConfig('user.email', 'test@example.com');
  await git.addConfig('user.name', 'Test User');
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('GitAdapter.getStatus', () => {
  it('detects staged files', async () => {
    writeFileSync(join(tmpDir, 'hello.txt'), 'hello');
    const git = simpleGit(tmpDir);
    await git.add('hello.txt');

    const adapter = createGitAdapter(tmpDir);
    const status = await adapter.getStatus();
    expect(status.staged).toHaveLength(1);
    expect(status.staged[0]).toBe('hello.txt');
  });

  it('reports empty staged list when nothing staged', async () => {
    const adapter = createGitAdapter(tmpDir);
    const status = await adapter.getStatus();
    expect(status.staged).toHaveLength(0);
  });
});

describe('GitAdapter.commit + getLog', () => {
  it('commits and reads back the log', async () => {
    writeFileSync(join(tmpDir, 'file.txt'), 'content');
    const adapter = createGitAdapter(tmpDir);
    await adapter.addAll();
    await adapter.commit('feat: initial commit');

    const logs = await adapter.getLog();
    expect(logs).toHaveLength(1);
    expect(logs[0]?.message).toBe('feat: initial commit');
  });

  it('filters log by range', async () => {
    writeFileSync(join(tmpDir, 'a.txt'), 'a');
    const adapter = createGitAdapter(tmpDir);
    await adapter.addAll();
    await adapter.commit('feat: first commit');

    const git = simpleGit(tmpDir);
    await git.tag(['v0.1.0']);

    writeFileSync(join(tmpDir, 'b.txt'), 'b');
    await adapter.addAll();
    await adapter.commit('fix: second commit');

    const logs = await adapter.getLog('v0.1.0', 'HEAD');
    expect(logs).toHaveLength(1);
    expect(logs[0]?.message).toBe('fix: second commit');
  });
});

describe('GitAdapter.getLastTag', () => {
  it('returns null when no tags exist', async () => {
    const adapter = createGitAdapter(tmpDir);
    expect(await adapter.getLastTag()).toBeNull();
  });

  it('returns the latest tag', async () => {
    writeFileSync(join(tmpDir, 'f.txt'), 'x');
    const adapter = createGitAdapter(tmpDir);
    await adapter.addAll();
    await adapter.commit('chore: init');
    await adapter.tag('v1.0.0');

    expect(await adapter.getLastTag()).toBe('v1.0.0');
  });
});

describe('Full pipeline: git log → parse → changelog', () => {
  it('produces a valid changelog from real commits', async () => {
    const adapter = createGitAdapter(tmpDir);

    for (const [file, msg] of [
      ['a.txt', 'feat: add user auth'],
      ['b.txt', 'fix(api): fix null pointer'],
      ['c.txt', 'docs: update readme'],
    ]) {
      writeFileSync(join(tmpDir, file as string), 'x');
      await adapter.addAll();
      await adapter.commit(msg as string);
    }

    const logs = await adapter.getLog();
    const commits = logs
      .map((e) => parseCommit(e.message))
      .filter((c): c is NonNullable<typeof c> => c !== null);

    expect(commits).toHaveLength(3);

    const changelog = generateChangelog({ version: '1.0.0', date: '2026-03-21', commits }, 'keepachangelog');
    expect(changelog).toContain('## [1.0.0] - 2026-03-21');
    expect(changelog).toContain('add user auth');
    expect(changelog).toContain('fix null pointer');
  });
});
