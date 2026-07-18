import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, readFile, rename, rm, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';

const desktopRoot = resolve(import.meta.dirname, '..');
const repositoryRoot = resolve(desktopRoot, '../..');
const manifestPath = resolve(desktopRoot, 'tests/fixtures/raw/manifest.json');
const fixtureRoot = resolve(repositoryRoot, '.cache/raw-fixtures');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

async function digest(path) {
  const hash = createHash('sha256');
  await pipeline(createReadStream(path), hash);
  return hash.digest('hex');
}

async function ensureFixture(fixture) {
  const destination = resolve(fixtureRoot, fixture.fileName);
  const existing = await Promise.all([digest(destination), stat(destination)]).catch(
    () => null,
  );
  if (existing?.[0] === fixture.sha256 && existing[1].size === fixture.bytes) {
    console.log(`verified ${fixture.fileName}`);
    return;
  }
  const temporary = `${destination}.partial`;
  await rm(temporary, { force: true });
  const response = await fetch(fixture.url, { redirect: 'follow' });
  if (!response.ok || !response.body) {
    throw new Error(`Could not download ${fixture.fileName}: HTTP ${response.status}`);
  }
  await pipeline(response.body, createWriteStream(temporary, { flags: 'wx', mode: 0o600 }));
  const [actualHash, details] = await Promise.all([digest(temporary), stat(temporary)]);
  if (actualHash !== fixture.sha256 || details.size !== fixture.bytes) {
    await rm(temporary, { force: true });
    throw new Error(
      `Fixture mismatch for ${fixture.fileName}: ${details.size} bytes, SHA-256 ${actualHash}`,
    );
  }
  await rm(destination, { force: true });
  await rename(temporary, destination);
  console.log(`downloaded and verified ${fixture.fileName}`);
}

await mkdir(fixtureRoot, { recursive: true });
for (const fixture of manifest.fixtures) await ensureFixture(fixture);
