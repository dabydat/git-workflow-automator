import type { ConventionalCommit } from './conventional-commits.js';

export type ChangelogFormat = 'keepachangelog' | 'conventional' | 'github';

export interface ChangelogEntry {
  version: string;
  date: string;
  commits: ConventionalCommit[];
}

interface ChangelogStrategy {
  generate(entry: ChangelogEntry): string;
}

// ── Strategies ────────────────────────────────────────────────────────────────

class KeepAChangelogStrategy implements ChangelogStrategy {
  generate(entry: ChangelogEntry): string {
    const lines: string[] = [`## [${entry.version}] - ${entry.date}`];
    const sections = groupBySection(entry.commits);

    for (const [title, commits] of Object.entries(sections)) {
      if (commits.length === 0) continue;
      lines.push(`\n### ${title}`);
      for (const c of commits) {
        const scope = c.scope ? `**${c.scope}:** ` : '';
        lines.push(`- ${scope}${c.description}`);
      }
    }

    return lines.join('\n');
  }
}

class ConventionalStrategy implements ChangelogStrategy {
  generate(entry: ChangelogEntry): string {
    const lines: string[] = [`# ${entry.version} (${entry.date})\n`];
    const byType = groupByType(entry.commits);

    for (const [type, commits] of Object.entries(byType)) {
      lines.push(`### ${type}\n`);
      for (const c of commits) {
        const scope = c.scope ? `**${c.scope}:** ` : '';
        const hash = c.hash ? ` (${c.hash.slice(0, 7)})` : '';
        lines.push(`* ${scope}${c.description}${hash}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}

class GitHubStrategy implements ChangelogStrategy {
  generate(entry: ChangelogEntry): string {
    const lines: string[] = [`## What's Changed in v${entry.version}`];

    const breaking = entry.commits.filter((c) => c.breaking);
    const features = entry.commits.filter((c) => c.type === 'feat' && !c.breaking);
    const fixes = entry.commits.filter((c) => c.type === 'fix' && !c.breaking);
    const other = entry.commits.filter((c) => !['feat', 'fix'].includes(c.type) && !c.breaking);

    if (breaking.length > 0) appendSection(lines, '⚠️ Breaking Changes', breaking);
    if (features.length > 0) appendSection(lines, '✨ New Features', features);
    if (fixes.length > 0) appendSection(lines, '🐛 Bug Fixes', fixes);
    if (other.length > 0) appendSection(lines, '🔧 Other Changes', other);

    return lines.join('\n');
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function appendSection(lines: string[], title: string, commits: ConventionalCommit[]): void {
  lines.push(`\n### ${title}`);
  for (const c of commits) {
    lines.push(`- ${c.description}`);
  }
}

const TYPE_TO_SECTION: Record<string, string> = {
  feat:     'Added',
  fix:      'Fixed',
  revert:   'Removed',
  docs:     'Changed',
  refactor: 'Changed',
  perf:     'Changed',
  chore:    'Changed',
  style:    'Changed',
  test:     'Changed',
  build:    'Changed',
  ci:       'Changed',
};

function groupBySection(commits: ConventionalCommit[]): Record<string, ConventionalCommit[]> {
  const sections: Record<string, ConventionalCommit[]> = {
    Added: [], Changed: [], Fixed: [], Removed: [],
  };

  for (const c of commits) {
    const section = c.breaking ? 'Changed' : (TYPE_TO_SECTION[c.type] ?? 'Changed');
    (sections[section] ??= []).push(c);
  }

  return sections;
}

function groupByType(commits: ConventionalCommit[]): Record<string, ConventionalCommit[]> {
  const result: Record<string, ConventionalCommit[]> = {};
  for (const c of commits) {
    (result[c.type] ??= []).push(c);
  }
  return result;
}

// ── Public API ────────────────────────────────────────────────────────────────

const STRATEGIES: Record<ChangelogFormat, ChangelogStrategy> = {
  keepachangelog: new KeepAChangelogStrategy(),
  conventional:   new ConventionalStrategy(),
  github:         new GitHubStrategy(),
};

export function generateChangelog(
  entry: ChangelogEntry,
  format: ChangelogFormat = 'keepachangelog',
): string {
  return STRATEGIES[format].generate(entry);
}

const CHANGELOG_HEADER =
  '# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n';

export function prependToChangelog(existing: string, newEntry: string): string {
  if (!existing) return CHANGELOG_HEADER + newEntry + '\n';

  if (existing.startsWith('# Changelog')) {
    const insertAt = existing.indexOf('\n## ');
    if (insertAt === -1) return existing + '\n' + newEntry + '\n';
    return existing.slice(0, insertAt + 1) + newEntry + '\n\n' + existing.slice(insertAt + 1);
  }

  return CHANGELOG_HEADER + newEntry + '\n\n' + existing;
}
