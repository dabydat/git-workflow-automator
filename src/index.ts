import { Command } from 'commander';
import { commitCommand } from './commands/commit.js';
import { changelogCommand } from './commands/changelog.js';

const program = new Command();

program
  .name('gitflow')
  .description('Automate conventional commits, changelogs, and semantic versioning')
  .version('0.1.0');

program.addCommand(commitCommand);
program.addCommand(changelogCommand);

program.parse(process.argv);
