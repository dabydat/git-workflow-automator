import { Command } from 'commander';
import { commitCommand } from './commands/commit.js';
import { changelogCommand } from './commands/changelog.js';
import { versionCommand } from './commands/version.js';
import { releaseCommand } from './commands/release.js';

const program = new Command();

program
  .name('gitflow')
  .description('Automate conventional commits, changelogs, and semantic versioning')
  .version('0.2.0');

program.addCommand(commitCommand);
program.addCommand(changelogCommand);
program.addCommand(versionCommand);
program.addCommand(releaseCommand);

program.parse(process.argv);
