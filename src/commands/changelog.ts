import { Command } from 'commander';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createGitAdapter } from '../core/git.js';
import { parseCommit } from '../core/conventional-commits.js';
import {
  generateChangelog,
  prependToChangelog,
  type ChangelogFormat,
} from '../core/changelog-generator.js';
import { success, info, spinner, handleCLIError } from '../ui/output.js';

const VALID_FORMATS: ChangelogFormat[] = ['keepachangelog', 'conventional', 'github'];

interface ChangelogOptions {
  from?: string;
  to: string;
  output: string;
  format: string;
  dryRun: boolean;
}

export const changelogCommand = new Command('changelog')
  .description('Generate CHANGELOG.md from conventional commits')
  .option('--from <tag>', 'Start tag or commit (default: last tag)')
  .option('--to <ref>', 'End tag or commit (default: HEAD)', 'HEAD')
  .option('--output <file>', 'Output file path', 'CHANGELOG.md')
  .option('--format <fmt>', 'keepachangelog | conventional | github', 'keepachangelog')
  .option('--dry-run', 'Print to stdout without writing file')
  .action(async (opts: ChangelogOptions) => {
    try {
      await runChangelogAction(opts);
    } catch (err) {
      handleCLIError(err);
    }
  });

async function runChangelogAction(opts: ChangelogOptions): Promise<void> {
  const git = createGitAdapter();
  const spin = spinner('Reading git log...');

  const from = opts.from ?? (await git.getLastTag()) ?? undefined;
  const logs = await git.getLog(from, opts.to);
  spin.stop();

  const commits = logs
    .map((entry) => {
      const parsed = parseCommit(entry.message);
      if (!parsed) return null;
      return { ...parsed, hash: entry.hash };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  if (commits.length === 0) {
    info('No conventional commits found in the specified range.');
    return;
  }

  info(`Found ${commits.length} conventional commit(s).`);

  const version = resolveVersion(from, opts.to);
  const date = new Date().toISOString().slice(0, 10);
  const format = resolveFormat(opts.format);
  const newEntry = generateChangelog({ version, date, commits }, format);

  if (opts.dryRun) {
    console.log('\n' + newEntry);
    return;
  }

  const existing = existsSync(opts.output) ? readFileSync(opts.output, 'utf8') : '';
  const updated = prependToChangelog(existing, newEntry);
  writeFileSync(opts.output, updated, 'utf8');
  success(`${opts.output} updated with ${commits.length} entries.`);
}

function resolveVersion(from: string | undefined, to: string): string {
  if (to !== 'HEAD') return to.replace(/^v/, '');
  if (from) return 'Unreleased';
  return '0.1.0';
}

function resolveFormat(raw: string): ChangelogFormat {
  return VALID_FORMATS.includes(raw as ChangelogFormat)
    ? (raw as ChangelogFormat)
    : 'keepachangelog';
}
