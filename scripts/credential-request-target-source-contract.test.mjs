import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requireFromFrontend = createRequire(path.join(ROOT, 'frontend', 'package.json'));
const ts = requireFromFrontend('typescript');
const FRONTEND_SOURCE = path.join(ROOT, 'frontend', 'src');
const POLICY_SOURCE = path.join(
  ROOT,
  'foundation',
  'src',
  'main',
  'java',
  'nuri',
  'foundation',
  'security',
  'filter',
  'CredentialRequestTargetPolicy.java',
);

function forbiddenRoots(javaSource) {
  const match = javaSource.match(
    /FORBIDDEN_NAME_ROOTS\s*=\s*Set\.of\((?<entries>[\s\S]*?)\);/u,
  );
  assert.ok(match?.groups?.entries, 'CredentialRequestTargetPolicy forbidden-name SSOT를 읽어야 한다');
  const roots = [...match.groups.entries.matchAll(/"(?<root>[A-Za-z0-9]+)"/gu)]
    .map(({ groups }) => groups.root);
  assert.ok(roots.length >= 10, 'credential name 모집단이 공허하게 축소되면 안 된다');
  assert.equal(new Set(roots).size, roots.length, 'credential name SSOT에 중복이 있으면 안 된다');
  assert.ok(roots.includes('pswd'), '저장소의 legacy pswd spelling은 계속 차단해야 한다');
  return roots;
}

function normalizedName(name) {
  return name.replaceAll(/[^A-Za-z0-9]/gu, '').toLowerCase();
}

function isForbiddenName(name, roots) {
  const normalized = normalizedName(name);
  return roots.some((root) => normalized.includes(root));
}

function propertyName(node) {
  if (!node) return null;
  if (ts.isIdentifier(node) || ts.isPrivateIdentifier(node)
      || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) {
    return node.text;
  }
  if (ts.isComputedPropertyName(node)) {
    return staticText(node.expression);
  }
  return null;
}

function staticText(node) {
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node)
      || ts.isTypeAssertionExpression(node) || ts.isSatisfiesExpression(node)
      || ts.isNonNullExpression(node)) return staticText(node.expression);
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isTemplateExpression(node)) {
    return [node.head.text, ...node.templateSpans.map(({ literal }) => literal.text)].join('${value}');
  }
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    return `${staticText(node.left) ?? '${value}'}${staticText(node.right) ?? '${value}'}`;
  }
  return null;
}

function directQueryNames(text) {
  if (text === null || (!text.includes('?') && !text.includes('&'))) return [];
  return [...text.matchAll(/[?&]([^=&#]+)(?==|&|#|$)/gu)].map((match) => match[1]);
}

function productionTypeScriptFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__') files.push(...productionTypeScriptFiles(absolute));
      continue;
    }
    if (!/\.(?:ts|tsx)$/u.test(entry.name) || /\.(?:test|spec)\.(?:ts|tsx)$/u.test(entry.name)) continue;
    files.push(absolute);
  }
  return files.sort();
}

export function scanCredentialRequestTargetSource(source, file, roots) {
  const kind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, kind);
  const expressionBindings = new Map();
  const functionReturns = new Map();
  const urlSearchParamBindings = new Set();
  const carrierBindings = new Map();
  const violations = [];
  let carrierCount = 0;

  function add(node, carrier, name) {
    if (!isForbiddenName(name, roots)) return;
    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    violations.push({ file, line: line + 1, carrier, name });
  }

  function remember(map, name, expression) {
    const entries = map.get(name) ?? [];
    entries.push(expression);
    map.set(name, entries);
  }

  function returnExpressions(body) {
    if (!ts.isBlock(body)) return [body];
    const expressions = [];
    function collect(node) {
      if (ts.isReturnStatement(node) && node.expression) expressions.push(node.expression);
      if (node !== body && (ts.isFunctionLike(node) || ts.isClassLike(node))) return;
      ts.forEachChild(node, collect);
    }
    collect(body);
    return expressions;
  }

  function resolveObjects(expression, seen = new Set()) {
    if (!expression || seen.has(expression)) return [];
    seen.add(expression);
    if (ts.isObjectLiteralExpression(expression)) return [expression];
    if (ts.isParenthesizedExpression(expression) || ts.isAsExpression(expression)
        || ts.isTypeAssertionExpression(expression) || ts.isSatisfiesExpression(expression)
        || ts.isNonNullExpression(expression)) {
      return resolveObjects(expression.expression, seen);
    }
    if (ts.isConditionalExpression(expression)) {
      return [
        ...resolveObjects(expression.whenTrue, new Set(seen)),
        ...resolveObjects(expression.whenFalse, new Set(seen)),
      ];
    }
    if (ts.isBinaryExpression(expression)
        && (expression.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
          || expression.operatorToken.kind === ts.SyntaxKind.BarBarToken
          || expression.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken)) {
      return [
        ...resolveObjects(expression.left, new Set(seen)),
        ...resolveObjects(expression.right, new Set(seen)),
      ];
    }
    if (ts.isIdentifier(expression)) {
      return (expressionBindings.get(expression.text) ?? [])
        .flatMap((candidate) => resolveObjects(candidate, new Set(seen)));
    }
    if (ts.isCallExpression(expression) && ts.isIdentifier(expression.expression)) {
      return (functionReturns.get(expression.expression.text) ?? [])
        .flatMap((candidate) => resolveObjects(candidate, new Set(seen)));
    }
    return [];
  }

  function inspectObject(expression, carrier, origin) {
    for (const object of resolveObjects(expression)) {
      carrierCount += 1;
      for (const property of object.properties) {
        if (ts.isSpreadAssignment(property)) {
          inspectObject(property.expression, carrier, origin ?? property);
        } else if (ts.isPropertyAssignment(property)
            || ts.isShorthandPropertyAssignment(property)
            || ts.isMethodDeclaration(property)) {
          const name = propertyName(property.name);
          if (name !== null) add(origin ?? property, carrier, name);
        }
      }
    }
  }

  function collectBindings(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      remember(expressionBindings, node.name.text, node.initializer);
      if (ts.isNewExpression(node.initializer)
          && ts.isIdentifier(node.initializer.expression)
          && node.initializer.expression.text === 'URLSearchParams') {
        urlSearchParamBindings.add(node.name.text);
      }
      if ((ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))) {
        for (const expression of returnExpressions(node.initializer.body)) {
          remember(functionReturns, node.name.text, expression);
        }
      }
    } else if (ts.isFunctionDeclaration(node) && node.name && node.body) {
      for (const expression of returnExpressions(node.body)) {
        remember(functionReturns, node.name.text, expression);
      }
    }
    if (ts.isPropertyAssignment(node)) {
      const carrier = propertyName(node.name);
      if ((carrier === 'query' || carrier === 'params') && ts.isIdentifier(node.initializer)) {
        carrierBindings.set(node.initializer.text, carrier);
      }
    } else if (ts.isShorthandPropertyAssignment(node)
        && (node.name.text === 'query' || node.name.text === 'params')) {
      carrierBindings.set(node.name.text, node.name.text);
    }
    ts.forEachChild(node, collectBindings);
  }
  collectBindings(sourceFile);

  function visit(node) {
    if (ts.isPropertyAssignment(node)) {
      const name = propertyName(node.name);
      if (name === 'query' || name === 'params') inspectObject(node.initializer, name, node);
    } else if (ts.isShorthandPropertyAssignment(node)
        && (node.name.text === 'query' || node.name.text === 'params')) {
      inspectObject(node.name, node.name.text, node);
    }

    if (ts.isNewExpression(node)
        && ts.isIdentifier(node.expression)
        && node.expression.text === 'URLSearchParams'
        && node.arguments?.[0]) {
      inspectObject(node.arguments[0], 'URLSearchParams', node);
      for (const candidate of resolveArrayExpressions(node.arguments[0])) {
        for (const element of candidate.elements) {
          if (!ts.isArrayLiteralExpression(element) || element.elements.length === 0) continue;
          const name = staticText(element.elements[0]);
          if (name !== null) add(node, 'URLSearchParams', name);
        }
      }
      const text = staticText(node.arguments[0]);
      for (const name of directQueryNames(text)) add(node, 'URLSearchParams', name);
    }

    if (ts.isCallExpression(node)
        && ts.isPropertyAccessExpression(node.expression)
        && (node.expression.name.text === 'set' || node.expression.name.text === 'append')) {
      const receiver = node.expression.expression;
      const isUrlParams = (ts.isIdentifier(receiver) && urlSearchParamBindings.has(receiver.text))
        || (ts.isNewExpression(receiver)
          && ts.isIdentifier(receiver.expression)
          && receiver.expression.text === 'URLSearchParams');
      const name = node.arguments[0] ? staticText(node.arguments[0]) : null;
      if (isUrlParams && name !== null) add(node, `URLSearchParams.${node.expression.name.text}`, name);
    }

    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      const left = node.left;
      if (ts.isPropertyAccessExpression(left) && ts.isIdentifier(left.expression)) {
        const carrier = carrierBindings.get(left.expression.text);
        if (carrier) add(node, `${carrier}-assignment`, left.name.text);
      } else if (ts.isElementAccessExpression(left) && ts.isIdentifier(left.expression)) {
        const carrier = carrierBindings.get(left.expression.text);
        const name = left.argumentExpression ? staticText(left.argumentExpression) : null;
        if (carrier && name !== null) add(node, `${carrier}-assignment`, name);
      }
    }

    if (ts.isCallExpression(node)
        && ts.isPropertyAccessExpression(node.expression)
        && ts.isIdentifier(node.expression.expression)
        && node.expression.expression.text === 'Object'
        && node.expression.name.text === 'assign'
        && node.arguments[0]
        && ts.isIdentifier(node.arguments[0])) {
      const carrier = carrierBindings.get(node.arguments[0].text);
      if (carrier) {
        for (const argument of node.arguments.slice(1)) inspectObject(argument, `${carrier}-assignment`, node);
      }
    }

    if ((ts.isCallExpression(node) || ts.isNewExpression(node))) {
      for (const argument of node.arguments ?? []) {
        for (const text of resolveStaticTexts(argument)) {
          for (const name of directQueryNames(text)) add(argument, 'request-url', name);
        }
      }
    } else if (ts.isPropertyAssignment(node) && propertyName(node.name) === 'url') {
      for (const text of resolveStaticTexts(node.initializer)) {
        for (const name of directQueryNames(text)) add(node, 'request-url', name);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);

  function resolveArrayExpressions(expression, seen = new Set()) {
    if (!expression || seen.has(expression)) return [];
    seen.add(expression);
    if (ts.isArrayLiteralExpression(expression)) return [expression];
    if (ts.isIdentifier(expression)) {
      return (expressionBindings.get(expression.text) ?? [])
        .flatMap((candidate) => resolveArrayExpressions(candidate, new Set(seen)));
    }
    if (ts.isConditionalExpression(expression)) {
      return [
        ...resolveArrayExpressions(expression.whenTrue, new Set(seen)),
        ...resolveArrayExpressions(expression.whenFalse, new Set(seen)),
      ];
    }
    return [];
  }

  function resolveStaticTexts(expression, seen = new Set()) {
    if (!expression || seen.has(expression)) return [];
    seen.add(expression);
    const text = staticText(expression);
    if (text !== null) return [text];
    if (ts.isIdentifier(expression)) {
      return (expressionBindings.get(expression.text) ?? [])
        .flatMap((candidate) => resolveStaticTexts(candidate, new Set(seen)));
    }
    if (ts.isConditionalExpression(expression)) {
      return [
        ...resolveStaticTexts(expression.whenTrue, new Set(seen)),
        ...resolveStaticTexts(expression.whenFalse, new Set(seen)),
      ];
    }
    if (ts.isCallExpression(expression) && ts.isIdentifier(expression.expression)) {
      return (functionReturns.get(expression.expression.text) ?? [])
        .flatMap((candidate) => resolveStaticTexts(candidate, new Set(seen)));
    }
    return [];
  }

  const unique = new Map(violations.map((violation) => [
    `${violation.file}:${violation.line}:${violation.carrier}:${violation.name}`,
    violation,
  ]));
  return { carrierCount, violations: [...unique.values()] };
}

test('frontend production request builders contain no explicit credential-like query producer', () => {
  const roots = forbiddenRoots(fs.readFileSync(POLICY_SOURCE, 'utf8'));
  const files = productionTypeScriptFiles(FRONTEND_SOURCE);
  const scans = files.map((absolute) => scanCredentialRequestTargetSource(
    fs.readFileSync(absolute, 'utf8'),
    path.relative(ROOT, absolute).replaceAll('\\', '/'),
    roots,
  ));

  assert.ok(files.length > 500, 'frontend production TypeScript 모집단이 공허하면 안 된다');
  assert.ok(scans.reduce((sum, scan) => sum + scan.carrierCount, 0) > 20,
    'query/params/URLSearchParams carrier 모집단이 공허하면 안 된다');
  assert.deepEqual(scans.flatMap(({ violations }) => violations), []);
});

test('frontend source gate turns red for explicit credential query construction', () => {
  const roots = forbiddenRoots(fs.readFileSync(POLICY_SOURCE, 'utf8'));
  const source = `
    const params = new URLSearchParams();
    params.set('api-key', marker);
    executeGenerated(operation, { query: { pswd: marker } });
    axios.delete('/resource', { params: { access_token: marker } });
    fetch(\`/resource?refreshToken=\${marker}\`);
    executeGenerated(operation, { query: enabled ? { currentPasswordConfirmation: marker } : undefined });
    const proof = { clientSecretValue: marker };
    axios.post('/resource', body, { params: { ...proof } });
    new URLSearchParams([['otpCode', marker]]);
    fetch('/resource?credential' + '=' + marker);
    const makeQuery = () => ({ sessionCookie: marker });
    executeGenerated(operation, { query: makeQuery() });
    const query = { jwtAssertion: marker };
    executeGenerated(operation, { query });
    const mutableQuery = {};
    executeGenerated(operation, { query: mutableQuery });
    mutableQuery.pswdHash = marker;
    mutableQuery['old' + 'Password'] = marker;
    Object.assign(mutableQuery, { recoveryTokenValue: marker });
    executeGenerated(operation, { query: { ['one' + 'TimePassword']: marker } });
    executeGenerated(operation, { query: { searchKeyword: marker } });
  `;

  const { violations } = scanCredentialRequestTargetSource(source, 'synthetic.ts', roots);
  assert.deepEqual(
    [...new Set(violations.map(({ name }) => name))].sort(),
    [
      'access_token',
      'api-key',
      'clientSecretValue',
      'credential',
      'currentPasswordConfirmation',
      'jwtAssertion',
      'oldPassword',
      'oneTimePassword',
      'otpCode',
      'pswd',
      'pswdHash',
      'recoveryTokenValue',
      'refreshToken',
      'sessionCookie',
    ].sort(),
  );
});
