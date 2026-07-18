import { spawnSync } from 'node:child_process';

const project = process.env.ORIEL_E2E_PROJECT || 'electron';
const playwrightArguments = ['test', `--project=${project}`];
const command = process.platform === 'linux' ? 'xvfb-run' : 'playwright';
const argumentsForPlatform =
  process.platform === 'linux'
    ? ['-a', 'playwright', ...playwrightArguments]
    : playwrightArguments;
const result = spawnSync(command, argumentsForPlatform, {
  shell: process.platform === 'win32',
  stdio: 'inherit',
});

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
