import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const OPERATIONAL_RUNNER = 'node --test "scripts/*.test.mjs" ".agent/scripts/*.test.js"';
const CONTRACT_ASSET = 'scripts/playwright-auth-artifact-contract.test.mjs';

function authArtifactContractErrors(source) {
  const errors = [];
  const requiredSnippets = [
    ['private directory mode', 'const PRIVATE_DIRECTORY_MODE = 0o700;'],
    ['private file mode', 'const PRIVATE_FILE_MODE = 0o600;'],
    ['explicit POSIX branch', "const IS_POSIX = process.platform !== 'win32';"],
    ['new-directory mode', 'fs.mkdirSync(directoryPath, { recursive: true, mode: PRIVATE_DIRECTORY_MODE });'],
    ['existing-directory tightening', 'fs.chmodSync(directoryPath, PRIVATE_DIRECTORY_MODE);'],
    ['directory mode verification', "assertPrivatePosixMode(directoryPath, PRIVATE_DIRECTORY_MODE, 'directory');"],
    ['no-follow file open', '(IS_POSIX ? fs.constants.O_NOFOLLOW : 0)'],
    ['private file creation', 'fs.openSync(authFilePath, openFlags, PRIVATE_FILE_MODE);'],
    ['pre-write descriptor tightening', 'fs.fchmodSync(descriptor, PRIVATE_FILE_MODE);'],
    ['descriptor-only credential write', 'fs.writeFileSync(descriptor, serializedState, { encoding: \'utf8\' });'],
    ['post-write path tightening', 'fs.chmodSync(authFilePath, PRIVATE_FILE_MODE);'],
    ['final file mode verification', "assertPrivatePosixMode(authFilePath, PRIVATE_FILE_MODE, 'file');"],
    ['hardened writer call', 'writePrivateStorageState(authFilePath, storageState);'],
  ];

  for (const [label, snippet] of requiredSnippets) {
    if (!source.includes(snippet)) errors.push(`missing ${label}`);
  }

  if (source.includes('fs.writeFileSync(authFilePath')) {
    errors.push('storage state must not be written directly by path');
  }
  if (/\b(?:console\.(?:log|warn|error)|throw new Error)\([^\n]*\$\{id\}/u.test(source)) {
    errors.push('credential identifiers must not be written to logs or thrown error messages');
  }

  const directoryChmod = source.indexOf('fs.chmodSync(directoryPath, PRIVATE_DIRECTORY_MODE);');
  const directoryVerification = source.indexOf("assertPrivatePosixMode(directoryPath, PRIVATE_DIRECTORY_MODE, 'directory');");
  const fileOpen = source.indexOf('fs.openSync(authFilePath, openFlags, PRIVATE_FILE_MODE);');
  const descriptorChmod = source.indexOf('fs.fchmodSync(descriptor, PRIVATE_FILE_MODE);');
  const credentialWrite = source.indexOf('fs.writeFileSync(descriptor, serializedState, { encoding: \'utf8\' });');
  const descriptorClose = source.indexOf('fs.closeSync(descriptor);');
  const finalFileChmod = source.indexOf('fs.chmodSync(authFilePath, PRIVATE_FILE_MODE);');
  const finalFileVerification = source.indexOf("assertPrivatePosixMode(authFilePath, PRIVATE_FILE_MODE, 'file');");

  if (!(directoryChmod >= 0 && directoryChmod < directoryVerification && directoryVerification < fileOpen)) {
    errors.push('directory must be tightened and verified before the credential file is opened');
  }
  if (!(fileOpen >= 0 && fileOpen < descriptorChmod && descriptorChmod < credentialWrite)) {
    errors.push('file descriptor must be tightened before credentials are written');
  }
  if (!(credentialWrite >= 0
    && credentialWrite < descriptorClose
    && descriptorClose < finalFileChmod
    && finalFileChmod < finalFileVerification)) {
    errors.push('credential file must be closed, tightened, and verified after the write');
  }

  return errors;
}

function operationalRunnerErrors(packageJson) {
  return packageJson.scripts?.['test:operational-contracts'] === OPERATIONAL_RUNNER
    ? []
    : [`test:operational-contracts must equal: ${OPERATIONAL_RUNNER}`];
}

function governanceAssetErrors(source) {
  return source.includes(`'${CONTRACT_ASSET}'`)
    ? []
    : [`governance asset list must include ${CONTRACT_ASSET}`];
}

test('Playwright authentication storage state is written with a POSIX-private lifecycle', () => {
  const source = readFileSync(
    new URL('../frontend/e2e/auth.setup.ts', import.meta.url),
    'utf8',
  );
  assert.deepEqual(authArtifactContractErrors(source), []);
});

test('the contract turns red when private modes are weakened', () => {
  const source = readFileSync(
    new URL('../frontend/e2e/auth.setup.ts', import.meta.url),
    'utf8',
  );
  const unsafeFixture = source
    .replace('const PRIVATE_DIRECTORY_MODE = 0o700;', 'const PRIVATE_DIRECTORY_MODE = 0o755;')
    .replace('const PRIVATE_FILE_MODE = 0o600;', 'const PRIVATE_FILE_MODE = 0o644;');

  assert.deepEqual(
    authArtifactContractErrors(unsafeFixture).filter((error) => error.includes('mode')),
    ['missing private directory mode', 'missing private file mode'],
  );
});

test('the contract turns red when credentials are written before descriptor tightening', () => {
  const source = readFileSync(
    new URL('../frontend/e2e/auth.setup.ts', import.meta.url),
    'utf8',
  );
  const fchmod = 'fs.fchmodSync(descriptor, PRIVATE_FILE_MODE);';
  const write = 'fs.writeFileSync(descriptor, serializedState, { encoding: \'utf8\' });';
  const unsafeFixture = source
    .replace(fchmod, '/* descriptor mode was not tightened */')
    .replace(write, `${write}\n            ${fchmod}`);

  assert.ok(
    authArtifactContractErrors(unsafeFixture)
      .includes('file descriptor must be tightened before credentials are written'),
  );
});

test('the contract turns red when the post-write permission repair is removed', () => {
  const source = readFileSync(
    new URL('../frontend/e2e/auth.setup.ts', import.meta.url),
    'utf8',
  );
  const unsafeFixture = source.replace(
    'fs.chmodSync(authFilePath, PRIVATE_FILE_MODE);',
    '/* post-write permission repair removed */',
  );

  assert.ok(
    authArtifactContractErrors(unsafeFixture)
      .includes('credential file must be closed, tightened, and verified after the write'),
  );
});

test('the contract turns red when a credential identifier is interpolated into output', () => {
  const source = readFileSync(
    new URL('../frontend/e2e/auth.setup.ts', import.meta.url),
    'utf8',
  );
  const unsafeFixture = `${source}\nconsole.log(\`authenticated \${id}\`);`;

  assert.ok(
    authArtifactContractErrors(unsafeFixture)
      .includes('credential identifiers must not be written to logs or thrown error messages'),
  );
});

test('the required operational runner and governance asset list bind this contract', () => {
  const packageJson = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
  );
  const governanceTest = readFileSync(
    new URL('./governance-gates-contract.test.mjs', import.meta.url),
    'utf8',
  );

  assert.deepEqual(operationalRunnerErrors(packageJson), []);
  assert.deepEqual(governanceAssetErrors(governanceTest), []);
});

test('binding fixtures turn red when the runner or central asset registration is removed', () => {
  assert.deepEqual(operationalRunnerErrors({ scripts: {} }), [
    `test:operational-contracts must equal: ${OPERATIONAL_RUNNER}`,
  ]);
  assert.deepEqual(governanceAssetErrors('const assets = [];'), [
    `governance asset list must include ${CONTRACT_ASSET}`,
  ]);
});
