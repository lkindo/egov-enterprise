import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const OPERATIONAL_RUNNER = 'node --test "scripts/*.test.mjs" ".agent/scripts/*.test.js"';
const CONTRACT_ASSET = 'scripts/playwright-auth-artifact-contract.test.mjs';
const requireFromFrontend = createRequire(new URL('../frontend/package.json', import.meta.url));
const ts = requireFromFrontend('typescript');

function readAuthSetupSource() {
  return readFileSync(
    new URL('../frontend/e2e/auth.setup.ts', import.meta.url),
    'utf8',
  ).replace(/\r\n/gu, '\n');
}

function callExpressions(sourceFile, functionName) {
  const calls = [];
  const visit = (node) => {
    if (ts.isCallExpression(node)
      && ts.isIdentifier(node.expression)
      && node.expression.text === functionName) {
      calls.push(node);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return calls;
}

function functionDeclarations(sourceFile, functionName) {
  const declarations = [];
  const visit = (node) => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === functionName) {
      declarations.push(node);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return declarations;
}

function hasConflictingBindingOrWrite(sourceFile, bindingName) {
  let conflict = false;
  const visit = (node) => {
    const namedDeclaration = (ts.isVariableDeclaration(node)
      || ts.isParameter(node)
      || ts.isBindingElement(node)
      || ts.isClassDeclaration(node))
      && ts.isIdentifier(node.name)
      && node.name.text === bindingName;
    const assignment = ts.isBinaryExpression(node)
      && ts.isIdentifier(node.left)
      && node.left.text === bindingName
      && node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment
      && node.operatorToken.kind <= ts.SyntaxKind.LastAssignment;
    if (namedDeclaration || assignment) conflict = true;
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return conflict;
}

function objectProperty(objectLiteral, propertyName) {
  return objectLiteral.properties.find((property) => {
    if (!ts.isPropertyAssignment(property)) return false;
    if (ts.isIdentifier(property.name)) return property.name.text === propertyName;
    return ts.isStringLiteral(property.name) && property.name.text === propertyName;
  }) ?? null;
}

function hasExactProperties(objectLiteral, expectedNames) {
  const names = [];
  for (const property of objectLiteral.properties) {
    if (!ts.isPropertyAssignment(property)) return false;
    if (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) {
      names.push(property.name.text);
    } else {
      return false;
    }
  }
  return names.length === new Set(names).size
    && names.sort().join(',') === [...expectedNames].sort().join(',');
}

function directContainingBlock(call) {
  return ts.isExpressionStatement(call.parent) && ts.isBlock(call.parent.parent)
    ? call.parent.parent
    : null;
}

function unwrapExpression(expression) {
  let current = expression;
  while (ts.isAsExpression(current) || ts.isParenthesizedExpression(current)) {
    current = current.expression;
  }
  return current;
}

function fixtureCookiePolicyAstErrors(source) {
  const errors = [];
  const sourceFile = ts.createSourceFile(
    'auth.setup.ts',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  if (sourceFile.parseDiagnostics.length > 0) {
    return ['authentication fixture source must remain valid TypeScript syntax'];
  }

  const authenticateFunctions = functionDeclarations(sourceFile, 'authenticate');
  const authenticateBody = authenticateFunctions.length === 1
    ? authenticateFunctions[0].body
    : undefined;
  const writerFunctions = functionDeclarations(sourceFile, 'writePrivateStorageState');
  const writerCalls = callExpressions(sourceFile, 'writePrivateStorageState');
  const writerCall = writerCalls.length === 1 ? writerCalls[0] : null;
  const writerState = writerCall
    && authenticateBody
    && directContainingBlock(writerCall) === authenticateBody
    && writerCall.arguments.length === 2
    && ts.isIdentifier(writerCall.arguments[0])
    && writerCall.arguments[0].text === 'authFilePath'
    && ts.isObjectLiteralExpression(writerCall.arguments[1])
    ? writerCall.arguments[1]
    : null;
  if (writerFunctions.length !== 1
    || writerFunctions[0].parent !== sourceFile
    || hasConflictingBindingOrWrite(sourceFile, 'writePrivateStorageState')) {
    errors.push('private writer binding must remain the single top-level function');
  }
  if (!writerState) {
    errors.push('private writer must receive the verified fixture object directly');
  } else if (!hasExactProperties(writerState, ['cookies', 'origins'])) {
    errors.push('private writer fixture must not contain duplicate or spread properties');
  }

  const cookiesProperty = writerState
    ? objectProperty(writerState, 'cookies')
    : null;
  const cookies = cookiesProperty && ts.isArrayLiteralExpression(cookiesProperty.initializer)
    ? cookiesProperty.initializer.elements
    : [];

  if (cookies.length !== 2 || cookies.some((cookie) => !ts.isObjectLiteralExpression(cookie))) {
    errors.push('authentication fixture must contain exactly the accessToken and refreshToken cookies');
    return errors;
  }

  const cookieNames = [];
  for (const cookie of cookies) {
    if (!hasExactProperties(cookie, [
      'name',
      'value',
      'domain',
      'path',
      'expires',
      'httpOnly',
      'secure',
      'sameSite',
    ])) {
      errors.push('authentication fixture cookies must not contain duplicate or spread properties');
      continue;
    }
    const nameProperty = objectProperty(cookie, 'name');
    const valueProperty = objectProperty(cookie, 'value');
    const domainProperty = objectProperty(cookie, 'domain');
    const pathProperty = objectProperty(cookie, 'path');
    const expiresProperty = objectProperty(cookie, 'expires');
    const httpOnlyProperty = objectProperty(cookie, 'httpOnly');
    const secureProperty = objectProperty(cookie, 'secure');
    const sameSiteProperty = objectProperty(cookie, 'sameSite');
    const nameValue = nameProperty && unwrapExpression(nameProperty.initializer);
    const valueValue = valueProperty && unwrapExpression(valueProperty.initializer);
    const domainValue = domainProperty && unwrapExpression(domainProperty.initializer);
    const pathValue = pathProperty && unwrapExpression(pathProperty.initializer);
    const expiresValue = expiresProperty && unwrapExpression(expiresProperty.initializer);
    const httpOnlyValue = httpOnlyProperty && unwrapExpression(httpOnlyProperty.initializer);
    const secureValue = secureProperty && unwrapExpression(secureProperty.initializer);
    const sameSiteValue = sameSiteProperty && unwrapExpression(sameSiteProperty.initializer);

    const cookieName = nameValue && ts.isStringLiteral(nameValue) ? nameValue.text : null;
    if (cookieName) cookieNames.push(cookieName);
    const expectedValueName = cookieName === 'accessToken'
      ? 'token'
      : cookieName === 'refreshToken'
        ? 'refreshToken'
        : null;
    const hasExpectedTransportShape = expectedValueName !== null
      && valueValue && ts.isIdentifier(valueValue) && valueValue.text === expectedValueName
      && domainValue && ts.isIdentifier(domainValue) && domainValue.text === 'domain'
      && pathValue && ts.isStringLiteral(pathValue) && pathValue.text === '/'
      && expiresValue && ts.isPrefixUnaryExpression(expiresValue)
      && expiresValue.operator === ts.SyntaxKind.MinusToken
      && ts.isNumericLiteral(expiresValue.operand) && expiresValue.operand.text === '1'
      && httpOnlyValue?.kind === ts.SyntaxKind.TrueKeyword;
    if (!hasExpectedTransportShape) {
      errors.push('authentication fixture cookies must preserve value, domain, path, expiry and HttpOnly');
    }
    if (secureValue?.kind !== ts.SyntaxKind.TrueKeyword) {
      errors.push('both authentication fixture cookies must keep Secure=true');
      if (secureValue?.kind === ts.SyntaxKind.FalseKeyword) {
        errors.push('authentication fixture cookies must not hard-code Secure=false');
      }
    }
    if (!sameSiteValue || !ts.isStringLiteral(sameSiteValue) || sameSiteValue.text !== 'Strict') {
      errors.push('both authentication fixture cookies must use SameSite=Strict');
      if (sameSiteValue && ts.isStringLiteral(sameSiteValue) && sameSiteValue.text === 'Lax') {
        errors.push('authentication fixture cookies must not weaken SameSite to Lax');
      }
    }
  }
  if (cookieNames.sort().join(',') !== 'accessToken,refreshToken') {
    errors.push('authentication fixture must contain exactly the accessToken and refreshToken cookies');
  }

  return [...new Set(errors)];
}

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
    ['hardened writer call', 'writePrivateStorageState(authFilePath, {'],
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
  errors.push(...fixtureCookiePolicyAstErrors(source));

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
  const source = readAuthSetupSource();
  assert.deepEqual(authArtifactContractErrors(source), []);
});

test('the contract turns red when private modes are weakened', () => {
  const source = readAuthSetupSource();
  const unsafeFixture = source
    .replace('const PRIVATE_DIRECTORY_MODE = 0o700;', 'const PRIVATE_DIRECTORY_MODE = 0o755;')
    .replace('const PRIVATE_FILE_MODE = 0o600;', 'const PRIVATE_FILE_MODE = 0o644;');

  assert.deepEqual(
    authArtifactContractErrors(unsafeFixture).filter((error) => error.includes('mode')),
    ['missing private directory mode', 'missing private file mode'],
  );
});

test('the contract turns red when credentials are written before descriptor tightening', () => {
  const source = readAuthSetupSource();
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
  const source = readAuthSetupSource();
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
  const source = readAuthSetupSource();
  const unsafeFixture = `${source}\nconsole.log(\`authenticated \${id}\`);`;

  assert.ok(
    authArtifactContractErrors(unsafeFixture)
      .includes('credential identifiers must not be written to logs or thrown error messages'),
  );
});

test('the contract turns red when fixture cookie transport attributes are weakened', () => {
  const source = readAuthSetupSource();
  const insecureFixture = source.replace('secure: true', 'secure: false');
  const laxFixture = source.replace("sameSite: 'Strict'", "sameSite: 'Lax'");
  const readableFixture = source.replace('httpOnly: true', 'httpOnly: false');

  assert.notEqual(insecureFixture, source, 'Secure mutation fixture must change the source');
  assert.notEqual(laxFixture, source, 'SameSite mutation fixture must change the source');
  assert.notEqual(readableFixture, source, 'HttpOnly mutation fixture must change the source');
  assert.ok(
    authArtifactContractErrors(insecureFixture)
      .includes('authentication fixture cookies must not hard-code Secure=false'),
  );
  assert.ok(
    authArtifactContractErrors(laxFixture)
      .includes('authentication fixture cookies must not weaken SameSite to Lax'),
  );
  assert.ok(
    authArtifactContractErrors(readableFixture)
      .includes('authentication fixture cookies must preserve value, domain, path, expiry and HttpOnly'),
  );
});

test('the contract turns red when a mutable state is inserted before the private writer', () => {
  const source = readAuthSetupSource();
  const mutableFixture = source
    .replace('    writePrivateStorageState(authFilePath, {', '    const mutableState = {')
    .replace(
      '    });\n    console.log',
      '    };\n    mutableState.cookies[0].secure = false;\n    writePrivateStorageState(authFilePath, mutableState);\n    console.log',
    );

  assert.notEqual(mutableFixture, source, 'mutable writer fixture must change the source');
  assert.ok(
    authArtifactContractErrors(mutableFixture)
      .includes('private writer must receive the verified fixture object directly'),
  );
});

test('the contract turns red when spread properties override the verified cookie state', () => {
  const source = readAuthSetupSource();
  const cookieOverride = source.replace(
    'secure: true, sameSite:',
    'secure: true, ...JSON.parse(\'{"secure":false}\'), sameSite:',
  );
  const stateOverride = source.replace(
    '        origins: [',
    '        ...JSON.parse(\'{"cookies":[]}\'),\n        origins: [',
  );

  assert.notEqual(cookieOverride, source, 'cookie spread fixture must change the source');
  assert.notEqual(stateOverride, source, 'state spread fixture must change the source');
  assert.ok(
    authArtifactContractErrors(cookieOverride)
      .includes('authentication fixture cookies must not contain duplicate or spread properties'),
  );
  assert.ok(
    authArtifactContractErrors(stateOverride)
      .includes('private writer fixture must not contain duplicate or spread properties'),
  );
});

test('the contract turns red when the private writer binding is shadowed', () => {
  const source = readAuthSetupSource();
  const callStart = source.indexOf('    writePrivateStorageState(authFilePath, {');
  assert.ok(callStart >= 0, 'writer call fixture must be found');
  const shadowedFixture = `${source.slice(0, callStart)}    const writePrivateStorageState = (_path: string, _state: unknown) => {};\n${source.slice(callStart)}`;

  assert.ok(
    authArtifactContractErrors(shadowedFixture)
      .includes('private writer binding must remain the single top-level function'),
  );
});

test('commented or dead-string writer code cannot satisfy the executable fixture contract', () => {
  const source = readAuthSetupSource();
  const callStart = source.indexOf('    writePrivateStorageState(authFilePath, {');
  const callEnd = source.indexOf('\n    console.log', callStart);
  assert.ok(callStart >= 0 && callEnd > callStart, 'writer call fixture must be found');
  const writer = source.slice(callStart, callEnd);
  const commentedFixture = `${source.slice(0, callStart)}    /*${writer}*/${source.slice(callEnd)}`;
  const deadStringFixture = `${source.slice(0, callStart)}    void \`${writer.replaceAll('`', '\\`')}\`;${source.slice(callEnd)}`;
  assert.ok(
    authArtifactContractErrors(commentedFixture)
      .includes('private writer must receive the verified fixture object directly'),
  );
  assert.ok(
    authArtifactContractErrors(deadStringFixture)
      .includes('private writer must receive the verified fixture object directly'),
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
