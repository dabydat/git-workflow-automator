import chalk from 'chalk';
import ora, { type Ora } from 'ora';

export class CLIError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly suggestion?: string,
  ) {
    super(message);
    this.name = 'CLIError';
  }
}

export function success(msg: string): void {
  console.log(chalk.green('✔') + ' ' + msg);
}

export function error(msg: string, suggestion?: string): void {
  console.error(chalk.red('✖') + ' ' + chalk.red(msg));
  if (suggestion) {
    console.error(chalk.yellow('  → ') + suggestion);
  }
}

export function info(msg: string): void {
  console.log(chalk.blue('ℹ') + ' ' + msg);
}

export function warn(msg: string): void {
  console.log(chalk.yellow('⚠') + ' ' + msg);
}

export function dim(msg: string): string {
  return chalk.dim(msg);
}

export function bold(msg: string): string {
  return chalk.bold(msg);
}

export function spinner(text: string): Ora {
  return ora({ text, color: 'cyan' }).start();
}

export function handleCLIError(err: unknown): never {
  if (err instanceof CLIError) {
    error(err.message, err.suggestion);
  } else if (isErrorWithSuggestion(err)) {
    error(err.message, err.suggestion);
  } else if (err instanceof Error) {
    error(err.message);
  } else {
    error('An unexpected error occurred');
  }
  process.exit(1);
}

function isErrorWithSuggestion(err: unknown): err is Error & { suggestion: string } {
  return err instanceof Error && 'suggestion' in err && typeof (err as Record<string, unknown>)['suggestion'] === 'string';
}
