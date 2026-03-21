import { Command } from 'commander';
import { createGitAdapter } from '../core/git.js';
import { formatCommit } from '../core/conventional-commits.js';
import { runCommitWizard } from '../prompts/commit-wizard.js';
import { success, info, dim, handleCLIError, CLIError } from '../ui/output.js';

interface CommitOptions {
  push: boolean;
  dryRun: boolean;
}

export const commitCommand = new Command('commit')
  .description('Create a conventional commit interactively')
  .option('--no-push', 'Skip pushing to remote after commit')
  .option('--dry-run', 'Preview the commit message without committing')
  .action(async (opts: CommitOptions) => {
    try {
      await runCommitAction(opts);
    } catch (err) {
      handleCLIError(err);
    }
  });

async function runCommitAction(opts: CommitOptions): Promise<void> {
  const git = createGitAdapter();
  const status = await git.getStatus();

  if (status.staged.length === 0) {
    throw new CLIError(
      'No staged changes found.',
      'NO_STAGED_CHANGES',
      'Stage your changes first:  git add <files>  or  git add .',
    );
  }

  info(`${status.staged.length} file(s) staged for commit.`);

  const wizardResult = await runCommitWizard();
  const message = formatCommit(wizardResult);

  printPreview(message);

  if (opts.dryRun) {
    info('Dry run — no commit created.');
    return;
  }

  await git.commit(message);
  success('Committed successfully.');

  if (opts.push) {
    await git.push();
    success('Pushed to remote.');
  }
}

function printPreview(message: string): void {
  const separator = dim('─'.repeat(50));
  console.log('\n' + separator);
  console.log(message);
  console.log(separator + '\n');
}
