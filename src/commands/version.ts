import { Command } from 'commander';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createGitAdapter } from '../core/git.js';
import { parseCommit } from '../core/conventional-commits.js';
import { determineBump, applyBump, cleanVersion, type BumpType } from '../core/semver.js';
import { success, info, warn, handleCLIError, CLIError } from '../ui/output.js';

const VALID_BUMPS: BumpType[] = ['major', 'minor', 'patch'];

interface VersionOptions {
  bump?: string;
  preview: boolean;
}

export const versionCommand = new Command('version')
  .description('Bump the semantic version in package.json')
  .option('--bump <type>', 'major | minor | patch (auto-detected if omitted)')
  .option('--preview', 'Show next version without applying it')
  .action(async (opts: VersionOptions) => {
    try {
      await runVersionAction(opts);
    } catch (err) {
      handleCLIError(err);
    }
  });

async function runVersionAction(opts: VersionOptions): Promise<void> {
  const pkgPath = join(process.cwd(), 'package.json');
  const pkg = readPackageJson(pkgPath);
  const current = cleanVersion(pkg.version as string);

  const bump = opts.bump
    ? validateBump(opts.bump)
    : await detectBump();

  const next = applyBump(current, bump);

  info(`${current} → ${next}  (${bump})`);

  if (opts.preview) {
    info('Preview only — no changes made.');
    return;
  }

  pkg.version = next;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  success(`package.json updated to ${next}`);
}

async function detectBump(): Promise<BumpType> {
  const git = createGitAdapter();
  const lastTag = await git.getLastTag();
  const logs = await git.getLog(lastTag ?? undefined);

  if (logs.length === 0) {
    warn('No commits since last tag — defaulting to patch bump.');
    return 'patch';
  }

  const commits = logs
    .map((e) => parseCommit(e.message))
    .filter((c): c is NonNullable<typeof c> => c !== null);

  const bump = determineBump(commits);
  info(`Auto-detected bump: ${bump} (from ${commits.length} commit(s))`);
  return bump;
}

function validateBump(raw: string): BumpType {
  if (!VALID_BUMPS.includes(raw as BumpType)) {
    throw new CLIError(
      `Invalid bump type: "${raw}"`,
      'INVALID_BUMP',
      'Use one of: major, minor, patch',
    );
  }
  return raw as BumpType;
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
