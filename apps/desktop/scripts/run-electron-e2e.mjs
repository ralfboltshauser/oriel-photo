import { spawnSync } from 'node:child_process';

const playwrightArguments = ['test', '--project=electron'];
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
