import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  target: 'node18',
  clean: true,
  shims: true,
  banner: { js: '#!/usr/bin/env node' },
  noExternal: ['chalk', 'ora', '@inquirer/prompts'],
});
