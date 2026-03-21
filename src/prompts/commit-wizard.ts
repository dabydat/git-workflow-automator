import { select, input, confirm } from '@inquirer/prompts';
import {
  COMMIT_TYPES,
  COMMIT_TYPE_LABELS,
  isValidDescription,
  type CommitType,
  type FormatOptions,
} from '../core/conventional-commits.js';

export async function runCommitWizard(): Promise<FormatOptions> {
  const type = await selectType();
  const scope = await inputScope();
  const description = await inputDescription();
  const body = await inputBody();
  const breaking = await confirmBreaking();
  const breakingNote = breaking ? await inputBreakingNote() : undefined;

  return {
    type,
    scope: scope || undefined,
    breaking,
    description,
    body: body || undefined,
    breakingNote,
  };
}

async function selectType(): Promise<CommitType> {
  return select<CommitType>({
    message: 'Select commit type:',
    choices: COMMIT_TYPES.map((t) => ({
      value: t,
      name: `${t.padEnd(10)} ${COMMIT_TYPE_LABELS[t]}`,
    })),
  });
}

async function inputScope(): Promise<string> {
  return input({ message: 'Scope (optional, press Enter to skip):' });
}

async function inputDescription(): Promise<string> {
  return input({
    message: 'Short description:',
    validate: (val) => isValidDescription(val),
  });
}

async function inputBody(): Promise<string> {
  return input({ message: 'Body (optional, press Enter to skip):' });
}

async function confirmBreaking(): Promise<boolean> {
  return confirm({ message: 'Is this a breaking change?', default: false });
}

async function inputBreakingNote(): Promise<string> {
  return input({
    message: 'Describe the breaking change:',
    validate: (val) => (val.trim() ? true : 'Please describe the breaking change'),
  });
}
