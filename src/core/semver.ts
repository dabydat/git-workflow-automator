import semver from 'semver';
import type { ConventionalCommit } from './conventional-commits.js';

export type BumpType = 'major' | 'minor' | 'patch';

export function determineBump(commits: ConventionalCommit[]): BumpType {
  if (commits.some((c) => c.breaking)) return 'major';
  if (commits.some((c) => c.type === 'feat')) return 'minor';
  return 'patch';
}

export function applyBump(currentVersion: string, bump: BumpType): string {
  const next = semver.inc(currentVersion, bump);
  if (!next) throw new Error(`Invalid version: "${currentVersion}"`);
  return next;
}

export function isValidVersion(version: string): boolean {
  return semver.valid(version) !== null;
}

export function compareVersions(a: string, b: string): number {
  return semver.compare(a, b);
}

export function cleanVersion(version: string): string {
  return semver.clean(version) ?? version.replace(/^v/, '');
}
