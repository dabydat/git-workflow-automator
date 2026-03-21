# gitflow-auto

> Automate conventional commits, changelogs, and semantic versioning — in seconds.

[![npm version](https://img.shields.io/npm/v/gitflow-auto.svg)](https://www.npmjs.com/package/gitflow-auto)
[![CI](https://github.com/YOUR_USERNAME/gitflow-auto/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/gitflow-auto/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Stop wasting 15 minutes a day on git busywork. `gitflow-auto` guides you through [Conventional Commits](https://www.conventionalcommits.org/), auto-generates your `CHANGELOG.md`, and calculates the right semantic version — all from the terminal.

---

## Install

```bash
# Use without installing
npx gitflow-auto commit

# Or install globally
npm install -g gitflow-auto
```

---

## Commands

### `gitflow commit` — Interactive conventional commit

No more staring at "what did I even change here". A guided wizard builds your commit message.

```bash
gitflow commit
```

```
ℹ 3 file(s) staged for commit.

? Select commit type:
  feat       A new feature
  fix        A bug fix
  docs       Documentation only changes
  refactor   A code change that neither fixes a bug nor adds a feature
  ...

? Scope (optional): auth
? Short description: add JWT refresh token rotation
? Body (optional):
? Is this a breaking change? No

──────────────────────────────────────────────────
feat(auth): add JWT refresh token rotation
──────────────────────────────────────────────────

✔ Committed successfully.
✔ Pushed to remote.
```

**Options:**
| Flag | Description |
|------|-------------|
| `--no-push` | Commit only, skip push |
| `--dry-run` | Preview message without committing |

---

### `gitflow changelog` — Generate CHANGELOG.md

Reads your git history and produces a properly formatted changelog.

```bash
# Generate from last tag to HEAD
gitflow changelog

# Custom range
gitflow changelog --from v1.0.0 --to v1.1.0

# Preview without writing file
gitflow changelog --dry-run

# Different formats
gitflow changelog --format github
gitflow changelog --format conventional
```

**Output (Keep a Changelog format):**
```markdown
## [1.2.0] - 2026-03-21

### Added
- **auth:** add JWT refresh token rotation
- support dark mode toggle

### Fixed
- fix null pointer in session handler

### Changed
- update dependencies to latest
```

**Options:**
| Flag | Default | Description |
|------|---------|-------------|
| `--from <tag>` | last tag | Start of range |
| `--to <ref>` | `HEAD` | End of range |
| `--output <file>` | `CHANGELOG.md` | Output file |
| `--format <fmt>` | `keepachangelog` | `keepachangelog` \| `conventional` \| `github` |
| `--dry-run` | — | Print to stdout only |

---

## Commit types

| Type | When to use |
|------|-------------|
| `feat` | New feature → bumps **minor** version |
| `fix` | Bug fix → bumps **patch** version |
| `feat!` / `BREAKING CHANGE` | Breaking change → bumps **major** version |
| `docs` | Documentation only |
| `refactor` | Code restructuring, no behavior change |
| `perf` | Performance improvement |
| `test` | Tests only |
| `chore` | Build, config, dependencies |
| `ci` | CI/CD pipeline changes |
| `style` | Formatting, whitespace |
| `revert` | Reverts a previous commit |

---

## Why gitflow-auto?

| Problem | Without | With gitflow-auto |
|---------|---------|-------------------|
| Commit messages | `fix stuff`, `WIP`, `asdf` | `fix(api): handle null session token` |
| Changelog | Written by hand (or skipped) | Auto-generated from git history |
| Version bumps | Guessed manually | Calculated from commit types |
| Time per release | 20-30 min | < 60 seconds |

---

## Requirements

- Node.js ≥ 18
- Git ≥ 2.x

---

## Roadmap

- [x] `gitflow commit` — interactive conventional commit
- [x] `gitflow changelog` — auto-generated changelog (3 formats)
- [ ] `gitflow release` — full release automation (tag + push + GitHub Release) — **Pro**
- [ ] `gitflow version` — semver bump with auto-detection — **Pro**
- [ ] Team config sync via `.gitflowrc` — **Pro**

> **Pro tier ($8/mo)** — coming soon. Early supporters get lifetime discount.

---

## License

MIT — free for personal use.
Commercial license available for teams. Contact: [your@email.com]
