import { Command } from 'commander';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { createGitAdapter } from '../core/git.js';
import { parseCommit } from '../core/conventional-commits.js';
import { determineBump, applyBump, cleanVersion } from '../core/semver.js';
import { generateChangelog, prependToChangelog } from '../core/changelog-generator.js';
import { success, info, warn, spinner, handleCLIError, CLIError } from '../ui/output.js';

interface ReleaseOptions {
  dryRun: boolean;
  pre?: string;
  noGithub: boolean;
}

export const releaseCommand = new Command('release')
  .description('Cut a full release: bump version, update changelog, tag, and push')
  .option('--dry-run', 'Preview all steps without executing')
  .option('--pre <tag>', 'Pre-release identifier (alpha, beta, rc)')
  .option('--no-github', 'Skip creating a GitHub Release')
  .action(async (opts: ReleaseOptions) => {
    try {
      await runReleaseAction(opts);
    } catch (err) {
      handleCLIError(err);
    }
  });

async function runReleaseAction(opts: ReleaseOptions): Promise<void> {
  const git = createGitAdapter();

  await validateRepo(git);

  const spin = spinner('Analyzing commits...');
  const lastTag = await git.getLastTag();
  const logs = await git.getLog(lastTag ?? undefined);
  spin.stop();

  if (logs.length === 0) {
    warn('No commits since last tag. Nothing to release.');
    return;
  }

  const commits = logs
    .map((e) => parseCommit(e.message))
    .filter((c): c is NonNullable<typeof c> => c !== null);

  const pkgPath = join(process.cwd(), 'package.json');
  const pkg = readPackageJson(pkgPath);
  const current = cleanVersion(pkg.version as string);

  const bump = determineBump(commits);
  const next = opts.pre
    ? `${applyBump(current, bump)}-${opts.pre}`
    : applyBump(current, bump);
  const tag = `v${next}`;

  printReleasePlan(current, next, tag, bump, commits.length, opts.dryRun);

  if (opts.dryRun) {
    info('Dry run complete — no changes made.');
    return;
  }

  // 1. Update package.json
  pkg.version = next;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  success(`package.json → ${next}`);

  // 2. Update CHANGELOG.md
  const date = new Date().toISOString().slice(0, 10);
  const newEntry = generateChangelog({ version: next, date, commits }, 'keepachangelog');
  const changelogPath = join(process.cwd(), 'CHANGELOG.md');
  const existing = existsSync(changelogPath) ? readFileSync(changelogPath, 'utf8') : '';
  writeFileSync(changelogPath, prependToChangelog(existing, newEntry), 'utf8');
  success('CHANGELOG.md updated');

  // 3. Commit + tag + push
  await git.addAll();
  await git.commit(`chore(release): ${tag}`);
  await git.tag(tag);
  await git.push();
  await git.pushTags();
  success(`Tagged and pushed ${tag}`);

  // 4. GitHub Release (optional)
  if (!opts.noGithub && isGhAvailable()) {
    createGitHubRelease(tag, newEntry);
    success(`GitHub Release created for ${tag}`);
  } else if (!opts.noGithub) {
    info('gh CLI not found — skipping GitHub Release. Install: https://cli.github.com');
  }

  success(`Released ${tag}`);
}

async function validateRepo(git: ReturnType<typeof createGitAdapter>): Promise<void> {
  const branch = await git.getCurrentBranch();
  if (!['main', 'master'].includes(branch)) {
    throw new CLIError(
      `Releases must be cut from main or master (current: ${branch})`,
      'WRONG_BRANCH',
      'Switch to main:  git checkout main',
    );
  }

  const status = await git.getStatus();
  const dirty = status.staged.length + status.unstaged.length + status.untracked.length;
  if (dirty > 0) {
    throw new CLIError(
      'Working tree is not clean. Commit or stash changes first.',
      'DIRTY_TREE',
      'Run `git status` to see what needs to be committed.',
    );
  }
}

function printReleasePlan(
  current: string,
  next: string,
  tag: string,
  bump: string,
  commitCount: number,
  dryRun: boolean,
): void {
  const label = dryRun ? '[DRY RUN] ' : '';
  info(`${label}Release plan:`);
  info(`  ${commitCount} commit(s) since last release`);
  info(`  Bump: ${bump}  →  ${current} → ${next}`);
  info(`  Tag: ${tag}`);
}

function readPackageJson(path: string): Record<string, unknown> {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
  } catch {
    throw new CLIError(
      'No package.json found in current directory.',
      'NO_PACKAGE_JSON',
      'Run this command from the root of your project.',
    );
  }
}

function isGhAvailable(): boolean {
  try {
    execSync('gh --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function createGitHubRelease(tag: string, notes: string): void {
  const escaped = notes.replace(/'/g, `'\\''`);
  execSync(`gh release create ${tag} --title "${tag}" --notes '${escaped}'`);
}
