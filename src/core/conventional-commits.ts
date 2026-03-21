export const COMMIT_TYPES = [
  'feat', 'fix', 'docs', 'style', 'refactor',
  'perf', 'test', 'build', 'ci', 'chore', 'revert',
] as const;

export type CommitType = typeof COMMIT_TYPES[number];

export interface ConventionalCommit {
  type: CommitType;
  scope?: string;
  breaking: boolean;
  description: string;
  body?: string;
  footer?: string;
  raw: string;
  hash?: string;
}

export interface FormatOptions {
  type: CommitType;
  scope?: string;
  breaking: boolean;
  description: string;
  body?: string;
  breakingNote?: string;
}

const COMMIT_PATTERN = /^(\w+)(\([\w/-]+\))?(!)?:\s+(.+)$/;
const BREAKING_FOOTER_PATTERN = /^BREAKING[\s-]CHANGE:\s+(.+)/m;
const MAX_DESCRIPTION_LENGTH = 72;

export function parseCommit(raw: string): ConventionalCommit | null {
  const firstLine = raw.split('\n')[0] ?? '';
  const match = COMMIT_PATTERN.exec(firstLine);
  if (!match) return null;

  const typeRaw = match[1];
  const scopeRaw = match[2];
  const breakingMark = match[3];
  const descriptionRaw = match[4];

  if (!typeRaw || !descriptionRaw) return null;
  if (!COMMIT_TYPES.includes(typeRaw as CommitType)) return null;

  const bodyLines = raw.split('\n').slice(1).join('\n').trim();
  const footerMatch = bodyLines ? BREAKING_FOOTER_PATTERN.exec(bodyLines) : null;
  const breaking = breakingMark === '!' || footerMatch !== null;

  return {
    type: typeRaw as CommitType,
    scope: scopeRaw ? scopeRaw.slice(1, -1) : undefined,
    breaking,
    description: descriptionRaw,
    body: bodyLines || undefined,
    footer: footerMatch ? footerMatch[0] : undefined,
    raw,
  };
}

export function formatCommit(opts: FormatOptions): string {
  const scope = opts.scope ? `(${opts.scope})` : '';
  const bang = opts.breaking ? '!' : '';
  let msg = `${opts.type}${scope}${bang}: ${opts.description}`;

  if (opts.body) {
    msg += `\n\n${opts.body}`;
  }

  if (opts.breaking && opts.breakingNote) {
    msg += `\n\nBREAKING CHANGE: ${opts.breakingNote}`;
  }

  return msg;
}

export function isValidCommitMessage(raw: string): boolean {
  return parseCommit(raw) !== null;
}

export function isValidDescription(desc: string): true | string {
  if (!desc.trim()) return 'Description is required';
  if (desc.length > MAX_DESCRIPTION_LENGTH) {
    return `Max ${MAX_DESCRIPTION_LENGTH} characters (got ${desc.length})`;
  }
  return true;
}

export const COMMIT_TYPE_LABELS: Record<CommitType, string> = {
  feat:     'A new feature',
  fix:      'A bug fix',
  docs:     'Documentation only changes',
  style:    'Changes that do not affect code meaning (formatting)',
  refactor: 'A code change that neither fixes a bug nor adds a feature',
  perf:     'A code change that improves performance',
  test:     'Adding missing tests or correcting existing tests',
  build:    'Changes that affect the build system or external dependencies',
  ci:       'Changes to CI configuration files and scripts',
  chore:    "Other changes that don't modify src or test files",
  revert:   'Reverts a previous commit',
};
