#!/usr/bin/env node
/**
 * generated-boundary-census
 *
 * Production TypeScript/TSX의 HTTP 소비 경계를 TypeScript AST로 호출 단위 수집한다.
 * generated executor 채택률과 legacy/direct/unmapped 부채를 분리하며, OpenAPI 바깥의
 * BFF·Actuator·binary·multipart 경계는 실행 증거가 있는 경우에만 explicit special로
 * 분류한다. Snapshot green은 "현 상태보다 나빠지지 않음"이고 100% 완료와 동의어가 아니다.
 *
 * Usage:
 *   node scripts/generated-boundary-census.mjs --json
 *   node scripts/generated-boundary-census.mjs --write
 *   node scripts/generated-boundary-census.mjs --check
 *   node scripts/generated-boundary-census.mjs --check --require-complete
 */
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import {
  dirname,
  extname,
  join,
  relative,
  resolve,
  sep,
} from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const DEFAULT_REPO_ROOT = resolve(dirname(SCRIPT_PATH), '..');
const DEFAULT_MANIFEST_PATH = join(
  DEFAULT_REPO_ROOT,
  'config',
  'governance',
  'generated-api-boundaries.json',
);
const requireFromFrontend = createRequire(join(DEFAULT_REPO_ROOT, 'frontend', 'package.json'));
const ts = requireFromFrontend('typescript');

const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options']);
const OPENAPI_METHODS = [...HTTP_METHODS, 'trace'];
const GENERATED_EXECUTOR_EXPORTS = new Set([
  'executeGeneratedOperation',
  'executeGeneratedMultipartOperation',
]);
const GENERATED_EXECUTOR_NAMES = new Set([
  'executeGenerated',
  'executeGeneratedMultipart',
  ...GENERATED_EXECUTOR_EXPORTS,
]);
const GENERATED_SERVICE_METHODS = new Set(['executeGenerated', 'executeGeneratedMultipart']);
const GENERATED_SERVICE_BASES = new Set(['ApiService', 'AdminService', 'UserService']);
const CLASSIFICATIONS = ['generated', 'legacy', 'direct', 'unmapped', 'special'];
const SPECIAL_CASES = ['auth-bff', 'auth-route-client', 'binary', 'multipart', 'actuator'];
const COMPLETION_TARGET = Object.freeze({
  generatedPercent: 100,
  maxLegacy: 0,
  maxDirect: 0,
  maxUnmapped: 0,
  explicitSpecialCases: SPECIAL_CASES,
});
const SOURCE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mts',
  '.cts',
  '.mjs',
  '.cjs',
]);
const SHARED_API_CLIENT_FILE = 'frontend/src/lib/api/client.ts';
const INFRASTRUCTURE_FILES = new Set([
  'frontend/src/lib/api/generated-api-client.ts',
  'frontend/src/lib/navigation/full-result-download.ts',
  'frontend/src/app/components/patterns/full-result-export.ts',
  'frontend/src/services/core/ApiService.ts',
]);

function normalizePath(path) {
  return path.split(sep).join('/');
}

function isExactFrontendModule(resolvedModuleName, projectPath) {
  const withoutExtension = resolvedModuleName.replace(/\.[cm]?[jt]sx?$/, '');
  return withoutExtension === `@/${projectPath}`
    || withoutExtension === `frontend/src/${projectPath}`;
}

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function walk(dir, output = []) {
  if (!existsSync(dir)) return output;
  for (const name of readdirSync(dir)) {
    const absolute = join(dir, name);
    const stat = statSync(absolute);
    if (stat.isDirectory()) walk(absolute, output);
    else output.push(absolute);
  }
  return output;
}

function isProductionSource(file, sourceRoot, repoRoot) {
  if (!SOURCE_EXTENSIONS.has(extname(file))) return false;
  const relativeToSource = normalizePath(relative(sourceRoot, file));
  const relativeToRepo = normalizePath(relative(repoRoot, file));
  if (relativeToSource.split('/').includes('__tests__')) return false;
  if (/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(relativeToSource)) return false;
  if (/\.d\.[cm]?ts$/.test(relativeToSource)) return false;
  if (INFRASTRUCTURE_FILES.has(relativeToRepo)) return false;
  return true;
}

function loadOpenApiOperations(repoRoot) {
  const apiDocsPath = join(repoRoot, 'api-docs.json');
  if (!existsSync(apiDocsPath)) throw new Error(`OpenAPI source is missing: ${apiDocsPath}`);
  const document = JSON.parse(readFileSync(apiDocsPath, 'utf8'));
  const operations = [];
  for (const [path, pathItem] of Object.entries(document.paths ?? {})) {
    for (const method of OPENAPI_METHODS) {
      const operation = pathItem?.[method];
      if (!operation) continue;
      operations.push({ method, path, operationId: operation.operationId ?? null });
    }
  }
  return operations.sort((left, right) => (
    left.path.localeCompare(right.path) || left.method.localeCompare(right.method)
  ));
}

function loadGeneratedDescriptors(repoRoot) {
  const generatedPath = join(repoRoot, 'frontend', 'src', 'types', 'generated-operations.ts');
  if (!existsSync(generatedPath)) return new Map();
  const source = readFileSync(generatedPath, 'utf8');
  const descriptors = new Map();
  const pattern = /export const\s+(\w+Operation)\s*=\s*[^;]*?defineGeneratedOperation\s*\(\s*\{([\s\S]*?)\n\s*\}\s*\);/g;
  for (const match of source.matchAll(pattern)) {
    const body = match[2];
    const id = body.match(/\bid:\s*"([^"]+)"/)?.[1];
    const method = body.match(/\bmethod:\s*"([^"]+)"/)?.[1];
    const path = body.match(/\bpath:\s*"([^"]+)"/)?.[1];
    const requestKind = body.match(/\brequestKind:\s*"([^"]+)"/)?.[1];
    const responseKind = body.match(/\bresponseKind:\s*"([^"]+)"/)?.[1];
    if (id && method && path) {
      descriptors.set(match[1], { operationId: id, method, path, requestKind, responseKind });
    }
  }
  return descriptors;
}

function propertyNameText(name) {
  if (!name) return '<anonymous>';
  if (ts.isIdentifier(name) || ts.isPrivateIdentifier(name)) return name.text;
  if (ts.isStringLiteralLike(name) || ts.isNumericLiteral(name)) return name.text;
  return name.getText().replace(/\s+/g, ' ');
}

function ownerName(node) {
  let current = node.parent;
  while (current) {
    if (ts.isMethodDeclaration(current) || ts.isGetAccessor(current) || ts.isSetAccessor(current)) {
      const classNode = current.parent;
      const className = ts.isClassLike(classNode) && classNode.name ? classNode.name.text : '<class>';
      return `${className}.${propertyNameText(current.name)}`;
    }
    if (ts.isConstructorDeclaration(current)) {
      const classNode = current.parent;
      const className = ts.isClassLike(classNode) && classNode.name ? classNode.name.text : '<class>';
      return `${className}.constructor`;
    }
    if (ts.isFunctionDeclaration(current)) return current.name?.text ?? '<function>';
    if (ts.isArrowFunction(current) || ts.isFunctionExpression(current)) {
      if (ts.isVariableDeclaration(current.parent) && ts.isIdentifier(current.parent.name)) {
        return current.parent.name.text;
      }
      if (ts.isPropertyAssignment(current.parent)) return propertyNameText(current.parent.name);
      return '<anonymous-function>';
    }
    current = current.parent;
  }
  return '<module>';
}

function enclosingClass(node) {
  let current = node.parent;
  while (current) {
    if (ts.isClassDeclaration(current) || ts.isClassExpression(current)) return current;
    current = current.parent;
  }
  return null;
}

function expressionName(expression) {
  if (ts.isIdentifier(expression)) return expression.text;
  if (expression.kind === ts.SyntaxKind.ThisKeyword) return 'this';
  if (expression.kind === ts.SyntaxKind.SuperKeyword) return 'super';
  if (ts.isPropertyAccessExpression(expression)) {
    return `${expressionName(expression.expression)}.${expression.name.text}`;
  }
  return expression.getText().replace(/\s+/g, ' ');
}

function addExactImportBinding(bindings, localName, importedName, declaration) {
  const entries = bindings.get(localName) ?? [];
  entries.push({ declaration, importedName });
  bindings.set(localName, entries);
}

function bindingNameContains(bindingName, expectedName) {
  if (ts.isIdentifier(bindingName)) return bindingName.text === expectedName;
  return bindingName.elements.some((element) => (
    !ts.isOmittedExpression(element) && bindingNameContains(element.name, expectedName)
  ));
}

function directStatementBindings(statement, expectedName, includeVar) {
  const bindings = [];
  if (ts.isVariableStatement(statement)) {
    const isBlockScoped = (statement.declarationList.flags & ts.NodeFlags.BlockScoped) !== 0;
    if (isBlockScoped || includeVar) {
      for (const declaration of statement.declarationList.declarations) {
        if (bindingNameContains(declaration.name, expectedName)) bindings.push(declaration);
      }
    }
  }
  if ((ts.isFunctionDeclaration(statement)
    || ts.isClassDeclaration(statement)
    || ts.isEnumDeclaration(statement))
    && statement.name?.text === expectedName) {
    bindings.push(statement);
  }
  if (ts.isImportDeclaration(statement)) {
    const clause = statement.importClause;
    if (clause?.name?.text === expectedName) bindings.push(clause);
    if (clause?.namedBindings && ts.isNamespaceImport(clause.namedBindings)
      && clause.namedBindings.name.text === expectedName) {
      bindings.push(clause.namedBindings);
    }
    if (clause?.namedBindings && ts.isNamedImports(clause.namedBindings)) {
      for (const element of clause.namedBindings.elements) {
        if (element.name.text === expectedName) bindings.push(element);
      }
    }
  }
  if (ts.isImportEqualsDeclaration(statement) && statement.name.text === expectedName) {
    bindings.push(statement);
  }
  return bindings;
}

function functionScopedVarBindings(root, expectedName) {
  const bindings = [];
  function visit(node) {
    if (node !== root && (ts.isFunctionLike(node) || ts.isClassLike(node))) return;
    if (ts.isVariableDeclaration(node)
      && ts.isVariableDeclarationList(node.parent)
      && (node.parent.flags & ts.NodeFlags.BlockScoped) === 0
      && bindingNameContains(node.name, expectedName)) {
      bindings.push(node);
    }
    ts.forEachChild(node, visit);
  }
  visit(root);
  return bindings;
}

function scopeBindings(scope, expectedName) {
  const bindings = [];
  if (ts.isSourceFile(scope) || ts.isBlock(scope)) {
    const includeVar = ts.isSourceFile(scope);
    for (const statement of scope.statements) {
      bindings.push(...directStatementBindings(statement, expectedName, includeVar));
    }
    if (includeVar) bindings.push(...functionScopedVarBindings(scope, expectedName));
  }
  if (ts.isCaseBlock(scope)) {
    for (const clause of scope.clauses) {
      for (const statement of clause.statements) {
        bindings.push(...directStatementBindings(statement, expectedName, false));
      }
    }
  }
  if (ts.isFunctionLike(scope)) {
    for (const parameter of scope.parameters) {
      if (bindingNameContains(parameter.name, expectedName)) bindings.push(parameter);
    }
    if ((ts.isFunctionDeclaration(scope) || ts.isFunctionExpression(scope))
      && scope.name?.text === expectedName) {
      bindings.push(scope);
    }
    if (scope.body) bindings.push(...functionScopedVarBindings(scope.body, expectedName));
  }
  if ((ts.isClassDeclaration(scope) || ts.isClassExpression(scope))
    && scope.name?.text === expectedName) {
    bindings.push(scope);
  }
  if (ts.isCatchClause(scope)
    && scope.variableDeclaration
    && bindingNameContains(scope.variableDeclaration.name, expectedName)) {
    bindings.push(scope.variableDeclaration);
  }
  if ((ts.isForStatement(scope) || ts.isForInStatement(scope) || ts.isForOfStatement(scope))
    && scope.initializer
    && ts.isVariableDeclarationList(scope.initializer)
    && (scope.initializer.flags & ts.NodeFlags.BlockScoped) !== 0) {
    for (const declaration of scope.initializer.declarations) {
      if (bindingNameContains(declaration.name, expectedName)) bindings.push(declaration);
    }
  }
  return [...new Set(bindings)];
}

function exactImportedNameAtUse(bindings, localName, useNode) {
  const candidates = bindings.get(localName) ?? [];
  if (candidates.length !== 1) return null;
  const [candidate] = candidates;
  let scope = useNode;
  while (scope) {
    const declarations = scopeBindings(scope, localName);
    if (declarations.length > 0) {
      return declarations.length === 1 && declarations[0] === candidate.declaration
        ? candidate.importedName
        : null;
    }
    scope = scope.parent;
  }
  return null;
}

function placeholderName(expression) {
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text;
  return 'value';
}

function findReturnExpression(node) {
  if (ts.isArrowFunction(node) && !ts.isBlock(node.body)) return node.body;
  const body = node.body;
  if (!body || !ts.isBlock(body)) return null;
  for (const statement of body.statements) {
    if (ts.isReturnStatement(statement) && statement.expression) return statement.expression;
  }
  return null;
}

function collectSourceSymbols(sourceFile) {
  const symbols = {
    axiosAliases: new Set(),
    axiosInstances: new Map(),
    clientAliases: new Set(),
    constants: new Map(),
    fetchAliases: new Set(),
    formDataSymbols: new Set(),
    generatedDescriptorBindings: new Map(),
    generatedExecutorBindings: new Map(),
    generatedExecutorLookalikeAliases: new Set(),
    generatedServiceBaseBindings: new Map(),
    helpers: new Map(),
    navigationHelperBindings: new Map(),
    navigationHelpers: new Map(),
  };

  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
      const moduleName = statement.moduleSpecifier.text;
      const resolvedModuleName = moduleName.startsWith('.')
        ? normalizePath(join(dirname(sourceFile.fileName), moduleName))
        : moduleName;
      const clause = statement.importClause;
      if (moduleName === 'axios' && clause?.name) symbols.axiosAliases.add(clause.name.text);
      if (/(?:^|\/)lib\/api\/client$/.test(resolvedModuleName) && clause?.name) {
        symbols.clientAliases.add(clause.name.text);
      }
      if (!clause?.isTypeOnly && clause?.namedBindings && ts.isNamedImports(clause.namedBindings)) {
        for (const element of clause.namedBindings.elements) {
          if (element.isTypeOnly) continue;
          const importedName = element.propertyName?.text ?? element.name.text;
          if (GENERATED_EXECUTOR_EXPORTS.has(importedName)) {
            symbols.generatedExecutorLookalikeAliases.add(element.name.text);
            if (isExactFrontendModule(resolvedModuleName, 'lib/api/generated-api-client')) {
              addExactImportBinding(
                symbols.generatedExecutorBindings,
                element.name.text,
                importedName,
                element,
              );
            }
          }
          if (isExactFrontendModule(resolvedModuleName, 'types/generated-operations')
            && importedName.endsWith('Operation')) {
            addExactImportBinding(
              symbols.generatedDescriptorBindings,
              element.name.text,
              importedName,
              element,
            );
          }
          if (isExactFrontendModule(resolvedModuleName, 'services/core/ApiService')
            && GENERATED_SERVICE_BASES.has(importedName)) {
            addExactImportBinding(
              symbols.generatedServiceBaseBindings,
              element.name.text,
              importedName,
              element,
            );
          }
          if (importedName === 'requestFullExport') {
            symbols.navigationHelpers.set(element.name.text, 'full-export');
            if (isExactFrontendModule(
              resolvedModuleName,
              'app/components/patterns/full-result-export',
            )) {
              addExactImportBinding(
                symbols.navigationHelperBindings,
                element.name.text,
                importedName,
                element,
              );
            }
          }
          if (importedName === 'navigateToDownload') {
            symbols.navigationHelpers.set(element.name.text, 'generated-download');
            if (isExactFrontendModule(resolvedModuleName, 'lib/navigation/full-result-download')) {
              addExactImportBinding(
                symbols.navigationHelperBindings,
                element.name.text,
                importedName,
                element,
              );
            }
          }
        }
      }
    }
    if (ts.isFunctionDeclaration(statement) && statement.name) {
      symbols.helpers.set(statement.name.text, statement);
    }
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || !declaration.initializer) continue;
      symbols.constants.set(declaration.name.text, declaration.initializer);
      if (ts.isArrowFunction(declaration.initializer) || ts.isFunctionExpression(declaration.initializer)) {
        symbols.helpers.set(declaration.name.text, declaration.initializer);
      }
    }
  }

  function visit(node) {
    if (ts.isParameter(node) && ts.isIdentifier(node.name) && node.type?.getText() === 'FormData') {
      symbols.formDataSymbols.add(node.name.text);
    }
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      if (isFetchReference(node.initializer, symbols)) {
        symbols.fetchAliases.add(node.name.text);
      }
      if (ts.isNewExpression(node.initializer) && expressionName(node.initializer.expression) === 'FormData') {
        symbols.formDataSymbols.add(node.name.text);
      }
      if (ts.isCallExpression(node.initializer) && ts.isPropertyAccessExpression(node.initializer.expression)) {
        const receiver = expressionName(node.initializer.expression.expression);
        if (symbols.axiosAliases.has(receiver) && node.initializer.expression.name.text === 'create') {
          symbols.axiosInstances.set(node.name.text, axiosInstanceBase(node.initializer, symbols));
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return symbols;
}

function isFetchReference(expression, symbols) {
  if (ts.isParenthesizedExpression(expression)) return isFetchReference(expression.expression, symbols);
  if (ts.isIdentifier(expression)) return expression.text === 'fetch';
  if (ts.isPropertyAccessExpression(expression)) {
    return expression.name.text === 'fetch'
      && ['window', 'globalThis'].includes(expressionName(expression.expression));
  }
  if (ts.isElementAccessExpression(expression)) {
    return ['window', 'globalThis'].includes(expressionName(expression.expression))
      && evaluateText(expression.argumentExpression, symbols) === 'fetch';
  }
  return false;
}

function axiosInstanceBase(createCall, symbols) {
  const config = createCall.arguments[0];
  if (!config || !ts.isObjectLiteralExpression(config)) return null;
  for (const property of config.properties) {
    if (!ts.isPropertyAssignment(property) || propertyNameText(property.name) !== 'baseURL') continue;
    return evaluateText(property.initializer, symbols) ?? null;
  }
  return null;
}

function evaluateTemplate(expression, symbols, substitutions, seen) {
  let value = expression.head.text;
  for (const span of expression.templateSpans) {
    const substituted = ts.isIdentifier(span.expression) ? substitutions.get(span.expression.text) : null;
    const actual = substituted ?? span.expression;
    const constant = ts.isIdentifier(actual) ? symbols.constants.get(actual.text) : null;
    const staticValue = constant && ts.isStringLiteralLike(constant) ? constant.text : null;
    const nestedValue = ts.isCallExpression(actual)
      ? evaluateText(actual, symbols, substitutions, seen)
      : null;
    value += staticValue ?? nestedValue ?? `{${placeholderName(actual)}}`;
    value += span.literal.text;
  }
  return value;
}

function evaluateHelper(expression, symbols, substitutions, seen) {
  if (!ts.isIdentifier(expression.expression)) return null;
  const helper = symbols.helpers.get(expression.expression.text);
  if (!helper || seen.has(helper)) return null;
  const returned = findReturnExpression(helper);
  if (!returned) return null;
  const helperSubstitutions = new Map(substitutions);
  helper.parameters.forEach((parameter, index) => {
    if (ts.isIdentifier(parameter.name) && expression.arguments[index]) {
      helperSubstitutions.set(parameter.name.text, expression.arguments[index]);
    }
  });
  return evaluateText(returned, symbols, helperSubstitutions, new Set([...seen, helper]));
}

function evaluateText(expression, symbols, substitutions = new Map(), seen = new Set()) {
  if (!expression) return null;
  if (ts.isStringLiteralLike(expression) || ts.isNumericLiteral(expression)) return expression.text;
  if (ts.isParenthesizedExpression(expression)) {
    return evaluateText(expression.expression, symbols, substitutions, seen);
  }
  if (ts.isTemplateExpression(expression)) {
    return evaluateTemplate(expression, symbols, substitutions, seen);
  }
  if (ts.isBinaryExpression(expression) && expression.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const left = evaluateText(expression.left, symbols, substitutions, seen);
    const right = evaluateText(expression.right, symbols, substitutions, seen);
    return left === null || right === null ? null : `${left}${right}`;
  }
  if (ts.isIdentifier(expression)) {
    if (substitutions.has(expression.text)) {
      const actual = substitutions.get(expression.text);
      return `{${placeholderName(actual)}}`;
    }
    const initializer = symbols.constants.get(expression.text);
    if (!initializer || seen.has(initializer)) return null;
    return evaluateText(initializer, symbols, substitutions, new Set([...seen, initializer]));
  }
  if (ts.isCallExpression(expression)) {
    return evaluateHelper(expression, symbols, substitutions, seen);
  }
  return null;
}

function classExtendsName(classNode) {
  const heritage = classNode.heritageClauses?.find(({ token }) => token === ts.SyntaxKind.ExtendsKeyword);
  return heritage?.types[0] ? expressionName(heritage.types[0].expression) : null;
}

function classExtendsExpression(classNode) {
  const heritage = classNode.heritageClauses?.find(({ token }) => token === ts.SyntaxKind.ExtendsKeyword);
  return heritage?.types[0]?.expression ?? null;
}

function constructorSuperCall(classNode) {
  const constructor = classNode.members.find(ts.isConstructorDeclaration);
  if (!constructor?.body) return null;
  for (const statement of constructor.body.statements) {
    if (!ts.isExpressionStatement(statement) || !ts.isCallExpression(statement.expression)) continue;
    if (statement.expression.expression.kind === ts.SyntaxKind.SuperKeyword) return statement.expression;
  }
  return null;
}

function serviceBasePath(call, symbols) {
  const classNode = enclosingClass(call);
  if (!classNode) return null;
  const superCall = constructorSuperCall(classNode);
  if (!superCall) return null;
  const domain = evaluateText(superCall.arguments[0], symbols);
  if (domain === null) return null;
  const cleanedDomain = domain.replace(/^\/+|\/+$/g, '');
  const parent = classExtendsName(classNode);
  if (parent === 'AdminService') {
    const category = evaluateText(superCall.arguments[1], symbols) ?? 'system';
    return `/api/v1/admin/${category.replace(/^\/+|\/+$/g, '')}/${cleanedDomain}`;
  }
  return `/api/v1/${cleanedDomain}`.replace(/\/+$/g, '');
}

function joinRequestTarget(base, requestPath) {
  if (requestPath === null) return null;
  if (/^https?:\/\//.test(requestPath)) return requestPath.replace(/[?#].*$/, '');
  if (requestPath.startsWith('/api/v1/')) return requestPath.replace(/[?#].*$/, '');
  if (requestPath.startsWith('/api/auth/')) return requestPath.replace(/[?#].*$/, '');
  if (base) return `${base.replace(/\/+$/, '')}/${requestPath.replace(/^\/+/, '')}`.replace(/\/+$/g, '');
  return `/api/v1/${requestPath.replace(/^\/+/, '')}`.replace(/\/+$/g, '').replace(/[?#].*$/, '');
}

function pathSegments(path) {
  return path.replace(/^https?:\/\/[^/]+/, '').replace(/[?#].*$/, '').split('/').filter(Boolean);
}

function isParameterSegment(segment) {
  return /^\{[^{}]+\}$/.test(segment);
}

function exactRouteMatch(candidate, documented) {
  const candidateSegments = pathSegments(candidate);
  const documentedSegments = pathSegments(documented);
  if (candidateSegments.length !== documentedSegments.length) return false;
  return candidateSegments.every((segment, index) => {
    const documentedSegment = documentedSegments[index];
    if (isParameterSegment(segment) || isParameterSegment(documentedSegment)) {
      return isParameterSegment(segment) && isParameterSegment(documentedSegment);
    }
    return segment === documentedSegment;
  });
}

function mapOpenApi(method, target, operations) {
  if (!method || !target) return { mappingStatus: 'unresolved-target', operationId: null };
  const matches = operations.filter((operation) => (
    operation.method === method && exactRouteMatch(target, operation.path)
  ));
  if (matches.length === 1) {
    return { mappingStatus: 'openapi-route', operationId: matches[0].operationId };
  }
  if (matches.length > 1) return { mappingStatus: 'ambiguous-openapi-route', operationId: null };
  return { mappingStatus: 'no-exact-openapi-route', operationId: null };
}

function containsBlobResponse(call) {
  let found = false;
  function visit(node) {
    if (ts.isPropertyAssignment(node) && propertyNameText(node.name) === 'responseType') {
      if (ts.isStringLiteralLike(node.initializer) && node.initializer.text === 'blob') found = true;
    }
    if (!found) ts.forEachChild(node, visit);
  }
  boundaryArguments(call).forEach(visit);
  return found;
}

function containsMultipart(call, symbols) {
  let found = false;
  function visit(node) {
    if (ts.isNewExpression(node) && expressionName(node.expression) === 'FormData') found = true;
    if (ts.isIdentifier(node) && symbols.formDataSymbols.has(node.text)) found = true;
    if (ts.isStringLiteralLike(node) && node.text.toLowerCase() === 'multipart/form-data') found = true;
    if (!found) ts.forEachChild(node, visit);
  }
  boundaryArguments(call).forEach(visit);
  return found;
}

function boundaryArguments(boundary, recognized = null) {
  if (recognized?.targetExpression) return [recognized.targetExpression];
  return boundary.arguments ?? [];
}

function isExplicitApiNavigationTarget(target) {
  if (target === null) return false;
  const path = target.replace(/^https?:\/\/[^/]+/, '');
  return /^\/api\/(?:v1|auth)(?:\/|$)/.test(path);
}

function recognizeCall(call, context) {
  const expression = call.expression;
  if (ts.isIdentifier(expression) && context.symbols.navigationHelpers.has(expression.text)) {
    const hasExactHelperBinding = exactImportedNameAtUse(
      context.symbols.navigationHelperBindings,
      expression.text,
      expression,
    ) !== null;
    return {
      kind: 'binary-navigation',
      method: null,
      receiver: expression.text,
      transport: 'browser-navigation',
      navigationHelper: context.symbols.navigationHelpers.get(expression.text),
      helperBinding: hasExactHelperBinding ? 'exact' : 'unbound',
    };
  }
  if (ts.isIdentifier(expression)) {
    const hasExactExecutorBinding = exactImportedNameAtUse(
      context.symbols.generatedExecutorBindings,
      expression.text,
      expression,
    ) !== null;
    const looksLikeGeneratedExecutor = hasExactExecutorBinding
      || context.symbols.generatedExecutorLookalikeAliases.has(expression.text)
      || GENERATED_EXECUTOR_NAMES.has(expression.text);
    if (looksLikeGeneratedExecutor) {
      return {
        kind: 'generated',
        method: null,
        receiver: expression.text,
        transport: 'generated-executor',
        executorBinding: hasExactExecutorBinding ? 'exact' : 'unbound',
      };
    }
  }
  if (ts.isIdentifier(expression) && context.symbols.fetchAliases.has(expression.text)) {
    return { kind: 'direct', method: null, receiver: expression.text, transport: 'fetch-alias' };
  }
  if (ts.isIdentifier(expression) && expression.text === 'fetch') {
    return { kind: 'direct', method: 'get', receiver: 'fetch', transport: 'fetch' };
  }
  if (ts.isIdentifier(expression) && context.symbols.axiosAliases.has(expression.text)) {
    return { kind: 'direct', method: 'request', receiver: expression.text, transport: 'axios' };
  }
  if (ts.isElementAccessExpression(expression)) {
    const receiver = expressionName(expression.expression);
    if (['window', 'globalThis'].includes(receiver)) {
      if (evaluateText(expression.argumentExpression, context.symbols) === 'fetch') {
        return { kind: 'direct', method: null, receiver, transport: 'fetch-dynamic' };
      }
      const requestTarget = evaluateText(call.arguments[0], context.symbols);
      if (isExplicitApiNavigationTarget(requestTarget)) {
        return { kind: 'direct', method: null, receiver, transport: 'dynamic-global-callee' };
      }
    }
    return null;
  }
  if (!ts.isPropertyAccessExpression(expression)) return null;

  const method = expression.name.text;
  const receiver = expressionName(expression.expression);
  if (method === 'fetch' && ['window', 'globalThis'].includes(receiver)) {
    return { kind: 'direct', method: 'get', receiver, transport: 'fetch' };
  }
  if (method === 'open' && ['window', 'globalThis'].includes(receiver)) {
    return {
      apiNavigationOnly: true,
      kind: 'direct',
      method: 'get',
      receiver,
      transport: 'browser-navigation',
    };
  }
  if (['assign', 'replace'].includes(method)
    && ['window.location', 'globalThis.location'].includes(receiver)) {
    return {
      apiNavigationOnly: true,
      kind: 'direct',
      method: 'get',
      receiver,
      transport: 'browser-navigation',
    };
  }
  if (GENERATED_SERVICE_METHODS.has(method)) {
    const classNode = enclosingClass(call);
    const parentExpression = classNode ? classExtendsExpression(classNode) : null;
    const hasExactServiceBinding = ['this', 'super'].includes(receiver)
      && parentExpression !== null
      && ts.isIdentifier(parentExpression)
      && exactImportedNameAtUse(
        context.symbols.generatedServiceBaseBindings,
        parentExpression.text,
        parentExpression,
      ) !== null;
    return {
      kind: 'generated',
      method: null,
      receiver,
      transport: 'generated-executor',
      executorBinding: hasExactServiceBinding ? 'exact' : 'unbound',
    };
  }
  if (context.isService && ['this', 'super'].includes(receiver) && HTTP_METHODS.has(method)) {
    return { kind: 'legacy', method, receiver, transport: 'legacy-api-service' };
  }
  if (context.symbols.clientAliases.has(receiver) && [...HTTP_METHODS, 'request', 'requestRaw'].includes(method)) {
    return { kind: 'direct', method, receiver, transport: method.includes('request') ? 'raw-api-client' : 'api-client' };
  }
  if (receiver === 'this.client' && [...HTTP_METHODS, 'request', 'requestRaw'].includes(method)) {
    return { kind: 'direct', method, receiver, transport: method.includes('request') ? 'raw-api-client' : 'api-client' };
  }
  if (context.symbols.axiosAliases.has(receiver) && [...HTTP_METHODS, 'request'].includes(method)) {
    return { kind: 'direct', method, receiver, transport: 'axios' };
  }
  if (context.symbols.axiosInstances.has(receiver) && [...HTTP_METHODS, 'request'].includes(method)) {
    return { kind: 'direct', method, receiver, transport: 'axios-instance' };
  }
  return null;
}

function recognizeNavigationAssignment(node) {
  if (!ts.isBinaryExpression(node)
    || node.operatorToken.kind !== ts.SyntaxKind.EqualsToken
    || !ts.isPropertyAccessExpression(node.left)
    || node.left.name.text !== 'href') return null;
  const receiver = expressionName(node.left.expression);
  if (!['window.location', 'globalThis.location'].includes(receiver)) return null;
  return {
    apiNavigationOnly: true,
    callee: expressionName(node.left),
    kind: 'direct',
    method: 'get',
    receiver,
    targetExpression: node.right,
    transport: 'browser-navigation',
  };
}

function generatedMetadata(call, recognized, context) {
  const operationExpression = call.arguments[0];
  const localDescriptorName = operationExpression
    ? expressionName(operationExpression)
    : '<missing-operation>';
  const descriptorName = operationExpression && ts.isIdentifier(operationExpression)
    ? exactImportedNameAtUse(
      context.symbols.generatedDescriptorBindings,
      localDescriptorName,
      operationExpression,
    )
    : null;
  const descriptor = descriptorName ? context.descriptors.get(descriptorName) : null;
  const operationId = descriptor?.operationId ?? null;
  const target = descriptor?.path ?? `operation:${localDescriptorName.replace(/Operation$/, '')}`;
  if (recognized.executorBinding !== 'exact') {
    return {
      descriptorName,
      mappingStatus: 'unbound-generated-executor',
      method: descriptor?.method ?? null,
      operationId,
      target,
    };
  }
  if (!descriptor) {
    return {
      descriptorName,
      mappingStatus: 'unbound-generated-descriptor',
      method: null,
      operationId: null,
      target,
    };
  }
  return {
    descriptorName,
    mappingStatus: 'generated-operation',
    method: descriptor.method,
    operationId,
    target,
  };
}

function objectPropertyInitializer(expression, name) {
  if (!expression || !ts.isObjectLiteralExpression(expression)) return null;
  for (const property of expression.properties) {
    if (ts.isPropertyAssignment(property) && propertyNameText(property.name) === name) {
      return property.initializer;
    }
    if (ts.isShorthandPropertyAssignment(property) && property.name.text === name) {
      return property.name;
    }
  }
  return null;
}

function binaryNavigationMetadata(call, recognized, context) {
  const operationExpression = recognized.navigationHelper === 'full-export'
    ? objectPropertyInitializer(call.arguments[0], 'operation')
    : call.arguments[0];
  const localDescriptorName = operationExpression ? expressionName(operationExpression) : '<missing-operation>';
  const descriptorName = operationExpression && ts.isIdentifier(operationExpression)
    ? exactImportedNameAtUse(
      context.symbols.generatedDescriptorBindings,
      localDescriptorName,
      operationExpression,
    ) ?? '<unregistered-operation>'
    : '<unregistered-operation>';
  const descriptor = context.descriptors.get(descriptorName);
  if (!descriptor) {
    return {
      descriptorName,
      mappingStatus: 'unresolved-target',
      method: null,
      operationId: null,
      target: `operation:${localDescriptorName.replace(/Operation$/, '')}`,
    };
  }
  const metadata = {
    descriptorName,
    method: descriptor.method,
    operationId: descriptor.operationId,
    target: descriptor.path,
  };
  if (recognized.helperBinding !== 'exact') {
    return { ...metadata, mappingStatus: 'unbound-generated-navigation-helper' };
  }
  if (descriptor.method !== 'get'
    || descriptor.requestKind !== 'none'
    || descriptor.responseKind !== 'binary') {
    return { ...metadata, mappingStatus: 'invalid-binary-navigation-operation' };
  }
  const mapping = mapOpenApi(descriptor.method, descriptor.path, context.operations);
  if (mapping.mappingStatus !== 'openapi-route') return { ...metadata, ...mapping };
  if (mapping.operationId !== descriptor.operationId) {
    return { ...metadata, mappingStatus: 'descriptor-operation-mismatch' };
  }
  return { ...metadata, mappingStatus: 'generated-binary-navigation' };
}

function directOrLegacyMetadata(call, recognized, context) {
  let method = recognized.method;
  if (method === 'request' || method === 'requestRaw') method = null;
  let base = null;
  if (recognized.kind === 'legacy') base = serviceBasePath(call, context.symbols);
  if (recognized.transport === 'axios-instance') {
    base = context.symbols.axiosInstances.get(recognized.receiver);
  }
  const args = boundaryArguments(call, recognized);
  const requestPath = args.length === 0 && recognized.kind === 'legacy'
    ? ''
    : evaluateText(args[0], context.symbols) ?? null;
  let target;
  if (args[0]
    && ts.isPropertyAccessExpression(args[0])
    && expressionName(args[0]) === 'this.basePath') {
    target = serviceBasePath(call, context.symbols);
  } else {
    target = joinRequestTarget(base, requestPath);
  }
  const mapping = mapOpenApi(method, target, context.operations);
  return { descriptorName: null, method, target, ...mapping };
}

function specialCaseFor(call, metadata, recognized, context) {
  if (recognized.kind === 'generated') return null;
  if (recognized.kind === 'binary-navigation'
    && metadata.mappingStatus === 'generated-binary-navigation') return 'binary';
  if (/^frontend\/src\/app\/api\/auth\/(?:login|logout|reissue)\/route\.ts$/.test(context.file)) {
    return 'auth-bff';
  }
  if (metadata.target?.startsWith('/api/auth/')) return 'auth-route-client';
  if (containsBlobResponse(call)) return 'binary';
  if (containsMultipart(call, context.symbols)) return 'multipart';
  const instanceBase = context.symbols.axiosInstances.get(recognized.receiver);
  if (instanceBase?.includes('/actuator') || metadata.target?.includes('/actuator/')) return 'actuator';
  return null;
}

function classify(recognized, metadata, specialCase) {
  if (specialCase) return 'special';
  if (recognized.kind === 'generated') {
    return metadata.mappingStatus === 'generated-operation' ? 'generated' : 'unmapped';
  }
  if (metadata.mappingStatus !== 'openapi-route') return 'unmapped';
  return recognized.kind;
}

function semanticRecord(record) {
  const {
    column: _column,
    line: _line,
    id: _id,
    ...semantic
  } = record;
  return semantic;
}

function recordId(record) {
  return sha256(JSON.stringify(semanticRecord(record))).slice(0, 20);
}

function scanSourceFile({ absolutePath, repoRoot, operations, descriptors }) {
  const file = normalizePath(relative(repoRoot, absolutePath));
  const source = readFileSync(absolutePath, 'utf8');
  const scriptKind = extname(absolutePath).includes('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, scriptKind);
  if (sourceFile.parseDiagnostics.length > 0) {
    const codes = uniqueSorted(sourceFile.parseDiagnostics.map(({ code }) => `TS${code}`));
    throw new Error(`Could not parse production source '${file}' (${codes.join(', ')})`);
  }
  const symbols = collectSourceSymbols(sourceFile);
  const context = {
    descriptors,
    file,
    isService: file.startsWith('frontend/src/services/'),
    operations,
    symbols,
  };
  const ownerCounts = new Map();
  const records = [];

  function visit(node) {
    const recognized = ts.isCallExpression(node)
      ? recognizeCall(node, context)
      : recognizeNavigationAssignment(node);
    if (recognized) {
      const rawTarget = evaluateText(boundaryArguments(node, recognized)[0], symbols);
      if (!recognized.apiNavigationOnly || isExplicitApiNavigationTarget(rawTarget)) {
        const metadata = recognized.kind === 'generated'
          ? generatedMetadata(node, recognized, context)
          : recognized.kind === 'binary-navigation'
            ? binaryNavigationMetadata(node, recognized, context)
            : directOrLegacyMetadata(node, recognized, context);
        const specialCase = specialCaseFor(node, metadata, recognized, context);
        const isGeneralSharedTransportCall = file === SHARED_API_CLIENT_FILE
          && specialCase !== 'auth-route-client';
        if (!isGeneralSharedTransportCall) {
          const owner = ownerName(node);
          const ordinal = (ownerCounts.get(owner) ?? 0) + 1;
          ownerCounts.set(owner, ordinal);
          const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
          const record = {
            file,
            owner,
            ordinal,
            line: position.line + 1,
            column: position.character + 1,
            classification: classify(recognized, metadata, specialCase),
            transport: recognized.transport,
            callee: recognized.callee ?? expressionName(node.expression),
            method: metadata.method,
            target: metadata.target,
            operationId: metadata.operationId,
            descriptorName: metadata.descriptorName,
            mappingStatus: specialCase ? 'explicit-special-case' : metadata.mappingStatus,
            specialCase,
          };
          record.id = recordId(record);
          records.push(record);
        }
    }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return records;
}

function summarize(records) {
  const byClassification = Object.fromEntries(CLASSIFICATIONS.map((name) => [name, 0]));
  const bySpecialCase = Object.fromEntries(SPECIAL_CASES.map((name) => [name, 0]));
  for (const record of records) {
    byClassification[record.classification] += 1;
    if (record.specialCase) bySpecialCase[record.specialCase] += 1;
  }
  const total = records.length;
  const eligible = total - byClassification.special;
  const generated = byClassification.generated;
  const adoptionPercent = eligible === 0 ? 0 : Number(((generated / eligible) * 100).toFixed(1));
  const complete = eligible > 0
    && generated === eligible
    && byClassification.legacy === 0
    && byClassification.direct === 0
    && byClassification.unmapped === 0;
  return {
    total,
    eligible,
    adoptionPercent,
    complete,
    byClassification,
    bySpecialCase,
  };
}

function inventoryHash(records) {
  return sha256(JSON.stringify(records.map(semanticRecord)));
}

export function buildBoundaryCensus({ repoRoot = DEFAULT_REPO_ROOT } = {}) {
  const sourceRoot = join(repoRoot, 'frontend', 'src');
  const operations = loadOpenApiOperations(repoRoot);
  const descriptors = loadGeneratedDescriptors(repoRoot);
  const files = walk(sourceRoot)
    .filter((file) => isProductionSource(file, sourceRoot, repoRoot))
    .sort((left, right) => normalizePath(left).localeCompare(normalizePath(right)));
  const records = files.flatMap((absolutePath) => scanSourceFile({
    absolutePath,
    descriptors,
    operations,
    repoRoot,
  }));
  return {
    schemaVersion: 1,
    scope: {
      sourceRoot: 'frontend/src',
      parser: 'typescript-ast',
      exclusions: [...INFRASTRUCTURE_FILES].sort(),
      testAndDeclarationFilesExcluded: true,
      openApiSource: 'api-docs.json',
      openApiOperationCount: operations.length,
      generatedDescriptorCount: descriptors.size,
    },
    target: structuredClone(COMPLETION_TARGET),
    summary: summarize(records),
    inventoryHash: inventoryHash(records),
    records,
  };
}

export function validateBoundaryCensus(census) {
  const errors = [];
  if (census?.schemaVersion !== 1) errors.push('schemaVersion must be 1');
  if (JSON.stringify(census?.target) !== JSON.stringify(COMPLETION_TARGET)) {
    errors.push('completion target was weakened or drifted');
  }
  if (census?.scope?.parser !== 'typescript-ast') errors.push('census parser must remain typescript-ast');
  if ((census?.scope?.openApiOperationCount ?? 0) < 1) errors.push('OpenAPI operation population is empty');
  if (!Array.isArray(census?.records)) return [...errors, 'records must be an array'];
  const ids = new Set();
  for (const record of census.records) {
    if (!CLASSIFICATIONS.includes(record.classification)) {
      errors.push(`unknown classification '${record.classification}' at ${record.file}`);
    }
    if (ids.has(record.id)) errors.push(`duplicate boundary id '${record.id}'`);
    ids.add(record.id);
    if (record.id !== recordId(record)) errors.push(`boundary id drifted at ${record.file}:${record.line}`);
    if (record.classification === 'special' && !SPECIAL_CASES.includes(record.specialCase)) {
      errors.push(`special boundary lacks an exact supported case at ${record.file}:${record.line}`);
    }
    if (record.classification !== 'special' && record.specialCase !== null) {
      errors.push(`non-special boundary carries specialCase at ${record.file}:${record.line}`);
    }
    if (record.classification === 'unmapped' && ![
      'unresolved-target',
      'no-exact-openapi-route',
      'ambiguous-openapi-route',
      'invalid-binary-navigation-operation',
      'descriptor-operation-mismatch',
      'unbound-generated-executor',
      'unbound-generated-descriptor',
      'unbound-generated-navigation-helper',
    ].includes(record.mappingStatus)) {
      errors.push(`unmapped boundary lacks fail-closed mapping status at ${record.file}:${record.line}`);
    }
  }
  const expectedSummary = summarize(census.records);
  if (JSON.stringify(census.summary) !== JSON.stringify(expectedSummary)) errors.push('summary drifted from records');
  const expectedHash = inventoryHash(census.records);
  if (census.inventoryHash !== expectedHash) errors.push('inventoryHash drifted from semantic records');
  if (census.records.length === 0) errors.push('production HTTP boundary population is empty');
  return uniqueSorted(errors);
}

function boundaryLabel(record) {
  return `${record.file}#${record.owner}[${record.ordinal}] ${record.callee} -> ${record.target ?? '<unresolved>'}`;
}

export function compareBoundaryCensus(expected, actual) {
  const errors = [
    ...validateBoundaryCensus(expected).map((error) => `expected snapshot invalid: ${error}`),
    ...validateBoundaryCensus(actual).map((error) => `actual census invalid: ${error}`),
  ];
  const expectedById = new Map((expected.records ?? []).map((record) => [record.id, record]));
  const actualById = new Map((actual.records ?? []).map((record) => [record.id, record]));
  if (JSON.stringify(expected.scope) !== JSON.stringify(actual.scope)) {
    errors.push('census scope or contract population drifted');
  }
  for (const [id, record] of actualById) {
    if (!expectedById.has(id)) errors.push(`new ${record.classification} boundary: ${boundaryLabel(record)}`);
  }
  for (const [id, record] of expectedById) {
    if (!actualById.has(id)) errors.push(`removed or reclassified boundary: ${boundaryLabel(record)}`);
  }
  for (const classification of ['legacy', 'direct', 'unmapped', 'special']) {
    const before = expected.summary?.byClassification?.[classification] ?? 0;
    const after = actual.summary?.byClassification?.[classification] ?? 0;
    if (after > before) errors.push(`${classification} boundary budget regressed: ${before} -> ${after}`);
  }
  const beforeAdoption = expected.summary?.adoptionPercent ?? 0;
  const afterAdoption = actual.summary?.adoptionPercent ?? 0;
  if (afterAdoption < beforeAdoption) {
    errors.push(`generated boundary adoption regressed: ${beforeAdoption}% -> ${afterAdoption}%`);
  }
  return uniqueSorted(errors);
}

export function evaluateBoundaryCompletion(census) {
  const errors = [];
  const summary = census.summary ?? summarize(census.records ?? []);
  if (summary.eligible === 0) errors.push('eligible production boundary population is empty');
  for (const classification of ['legacy', 'direct', 'unmapped']) {
    const count = summary.byClassification?.[classification] ?? 0;
    if (count > 0) errors.push(`${classification}=${count}; target=0`);
  }
  if (summary.eligible > 0 && summary.byClassification.generated !== summary.eligible) {
    errors.push(`generated=${summary.byClassification.generated}; eligible=${summary.eligible}; target=100%`);
  }
  return { complete: errors.length === 0, errors: uniqueSorted(errors) };
}

function printSummary(census) {
  const summary = census.summary;
  console.log('\n=== Generated API/Zod Service Boundary Census ===');
  console.log(`total=${summary.total} eligible=${summary.eligible} special=${summary.byClassification.special}`);
  console.log(`generated=${summary.byClassification.generated} legacy=${summary.byClassification.legacy} direct=${summary.byClassification.direct} unmapped=${summary.byClassification.unmapped}`);
  console.log(`adoption=${summary.adoptionPercent}% complete=${summary.complete}`);
  console.log(`inventoryHash=${census.inventoryHash}`);
}

function runCli() {
  const census = buildBoundaryCensus();
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(census, null, 2));
    return;
  }
  if (process.argv.includes('--write')) {
    mkdirSync(dirname(DEFAULT_MANIFEST_PATH), { recursive: true });
    writeFileSync(DEFAULT_MANIFEST_PATH, `${JSON.stringify(census, null, 2)}\n`);
    printSummary(census);
    console.log(`snapshot written: ${normalizePath(relative(DEFAULT_REPO_ROOT, DEFAULT_MANIFEST_PATH))}`);
    return;
  }
  if (!existsSync(DEFAULT_MANIFEST_PATH)) {
    console.error(`snapshot missing: ${normalizePath(relative(DEFAULT_REPO_ROOT, DEFAULT_MANIFEST_PATH))}`);
    process.exitCode = 1;
    return;
  }
  const expected = JSON.parse(readFileSync(DEFAULT_MANIFEST_PATH, 'utf8'));
  const errors = compareBoundaryCensus(expected, census);
  if (process.argv.includes('--require-complete')) {
    errors.push(...evaluateBoundaryCompletion(census).errors);
  }
  printSummary(census);
  if (errors.length > 0) {
    console.error('\nBoundary contract violations:');
    for (const error of uniqueSorted(errors)) console.error(`  - ${error}`);
    process.exitCode = 1;
  } else {
    console.log('\nBoundary snapshot/ratchet contract passed.');
  }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(SCRIPT_PATH);
if (isMain) runCli();
