import { simpleGit, type SimpleGit } from 'simple-git';
import { CLIError } from '../ui/output.js';

export interface GitStatus {
  staged: string[];
  unstaged: string[];
  untracked: string[];
}

export interface GitLogEntry {
  hash: string;
  message: string;
  author: string;
  date: string;
}

export interface GitAdapter {
  getStatus(): Promise<GitStatus>;
  getLog(from?: string, to?: string): Promise<GitLogEntry[]>;
  getLastTag(): Promise<string | null>;
  getCurrentBranch(): Promise<string>;
  commit(message: string): Promise<void>;
  push(): Promise<void>;
  addAll(): Promise<void>;
  tag(name: string): Promise<void>;
  pushTags(): Promise<void>;
}

class SimpleGitAdapter implements GitAdapter {
  private readonly git: SimpleGit;

  constructor(cwd: string = process.cwd()) {
    this.git = simpleGit(cwd);
  }

  async getStatus(): Promise<GitStatus> {
    const status = await this.git.status();
    return {
      staged: status.staged,
      unstaged: [...status.modified, ...status.deleted],
      untracked: status.not_added,
    };
  }

  async getLog(from?: string, to = 'HEAD'): Promise<GitLogEntry[]> {
    const options = from ? { from, to } : {};
    const result = await this.git.log(options);
    return result.all.map((entry) => ({
      hash: entry.hash,
      message: entry.message,
      author: entry.author_name,
      date: entry.date,
    }));
  }

  async getLastTag(): Promise<string | null> {
    try {
      const tags = await this.git.tags(['--sort=-version:refname']);
      return tags.latest ?? null;
    } catch {
      return null;
    }
  }

  async getCurrentBranch(): Promise<string> {
    const result = await this.git.branch();
    return result.current;
  }

  async commit(message: string): Promise<void> {
    await this.git.commit(message);
  }

  async push(): Promise<void> {
    try {
      await this.git.push();
    } catch {
      throw new CLIError(
        'Push failed — no remote configured or authentication error.',
        'PUSH_FAILED',
        'Run `git remote -v` to check your remote, or use --no-push to skip.',
      );
    }
  }

  async addAll(): Promise<void> {
    await this.git.add('.');
  }

  async tag(name: string): Promise<void> {
    await this.git.tag([name]);
  }

  async pushTags(): Promise<void> {
    await this.git.pushTags('origin');
  }
}

export function createGitAdapter(cwd?: string): GitAdapter {
  return new SimpleGitAdapter(cwd);
}
