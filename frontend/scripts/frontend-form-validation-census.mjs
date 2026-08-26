#!/usr/bin/env node
/**
 * Exact frontend form/write-boundary census.
 *
 * The AST is the population authority. The manifest is a reviewed
 * classification/evidence ledger; neither side is allowed to silently grow or
 * shrink. `--audit` and `--check` both fail closed. `--print-draft` is only a
 * baseline collection aid and never mutates the repository.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { Node, Project, SyntaxKind } from 'ts-morph';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const DEFAULT_REPO_ROOT = resolve(dirname(SCRIPT_PATH), '..', '..');
const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx']);
const CLASSIFICATIONS = new Set(['mutation', 'auth', 'search-filter', 'primitive', 'destructive']);
const MUTATION_CLASSIFICATIONS = new Set(['mutation', 'auth', 'destructive']);
const FORM_VALIDATION_MODES = new Set([
  'useAppForm-zod',
  'useManualFormValidation-zod',
  'react-hook-form-zod',
]);
const COMPOSED_VALIDATION_MODE = 'composed-child-form-validation';
const ACTION_ONLY_VALIDATION_MODE = 'action-only-no-editable-payload';
const STRUCTURED_UI_STATE_VALIDATION_MODE = 'structured-ui-state-validation';
const VALIDATED_SECONDARY_ACTION_MODE = 'validated-secondary-ui-action';
const NOT_APPLICABLE = 'not-applicable';
const EDITABLE_TAG = /(?:^|\.)(?:input|textarea|select)$/i;
const EDITABLE_COMPONENT = /(?:Input|Textarea|Select|Editor|Picker|Combobox|Switch|Checkbox|RadioGroup)$/;
const WRITE_NAME = /^(?:create|update|delete|remove|save|submit|send|register|insert|modify|move|join|leave|approve|reject|assign|upload|like|recommend|vote)/i;
const BATCH_WRITE_NAME = /^(?:batch|bulk)(?:Create|Update|Delete|Remove|Save|Submit|Send|Register|Insert|Modify|Move|Assign|Upload)/;
const DESTRUCTIVE_NAME = /^(?:delete|remove|leave|revoke|destroy)/i;
const PENDING_STATE_NAME = /(?:pending|saving|deleting|submitting|loading|request|busy|processing|uploading|sending|joining|leaving|liking|voting|recommending|active.*(?:operation|action|write)|[A-Za-z_$][\w$]*(?:operation|action))/i;
const MISSING_VALUE = new Set(['missing', 'none', 'unverified', '']);
const EVIDENCE_TEST_BLOCK_CACHE = new Map();
const EXACT_SUMMARY_FIELDS = Object.freeze([
  'nativeFormOccurrences',
  'nativeFormFiles',
  'memberFormOccurrences',
  'memberFormFiles',
  'formlessWriteBoundaries',
  'secondaryActionBoundaries',
  'candidateCount',
]);

function posix(value) {
  return value.split(sep).join('/');
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right, 'en'));
}

function isInside(root, target) {
  const rel = relative(root, target);
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}

function walkProductionSources(root) {
  const output = [];
  if (!existsSync(root)) return output;
  function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) continue;
      const target = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        if (!['__tests__', '.next', 'coverage', 'node_modules', 'playwright-report', 'test-results'].includes(entry.name)) {
          visit(target);
        }
      } else if (entry.isFile()) {
        const normalized = posix(target);
        if (SOURCE_EXTENSIONS.has(extname(target).toLowerCase())
          && !/\.(?:spec|test|stories|story)\.[cm]?[jt]sx?$/.test(normalized)) output.push(target);
      }
    }
  }
  visit(root);
  return output.sort((left, right) => posix(left).localeCompare(posix(right), 'en'));
}

function callableOwner(node) {
  let current = node;
  while (current) {
    if (Node.isFunctionDeclaration(current) || Node.isMethodDeclaration(current)) {
      return { name: current.getName() || '<anonymous>', node: current };
    }
    if (Node.isArrowFunction(current) || Node.isFunctionExpression(current)) {
      const parent = current.getParent();
      if (Node.isVariableDeclaration(parent)) return { name: parent.getName(), node: current };
      if (Node.isPropertyAssignment(parent)) return { name: parent.getName(), node: current };
      return { name: '<anonymous>', node: current };
    }
    current = current.getParent();
  }
  return { name: '<module>', node: node.getSourceFile() };
}

function outermostCallableOwner(node) {
  let current = node;
  let owner = null;
  while (current) {
    if (Node.isFunctionDeclaration(current) || Node.isMethodDeclaration(current)) {
      owner = { name: current.getName() || '<anonymous>', node: current };
    } else if (Node.isArrowFunction(current) || Node.isFunctionExpression(current)) {
      const parent = current.getParent();
      if (Node.isVariableDeclaration(parent)) owner = { name: parent.getName(), node: current };
      else if (Node.isPropertyAssignment(parent)) owner = { name: parent.getName(), node: current };
    }
    current = current.getParent();
  }
  return owner ?? callableOwner(node);
}

function jsxTag(node) {
  return node.getTagNameNode().getText();
}

function jsxAttribute(node, name) {
  const attribute = node.getAttribute(name);
  if (!attribute || !Node.isJsxAttribute(attribute)) return '';
  return attribute.getInitializer()?.getText() ?? 'true';
}

function callName(call) {
  const expression = call.getExpression();
  if (Node.isPropertyAccessExpression(expression)) return expression.getName();
  if (Node.isIdentifier(expression)) return expression.getText();
  return '';
}

function isWriteName(name) {
  return WRITE_NAME.test(name) || BATCH_WRITE_NAME.test(name);
}

function resolvedHandlerContract(formNode, ownerNode) {
  if (!formNode) return { explicit: false, text: ownerNode.getText() };
  const attributes = ['onSubmit', 'action']
    .map((name) => formNode.getAttribute(name))
    .filter((attribute) => attribute && Node.isJsxAttribute(attribute));
  if (attributes.length === 0) return { explicit: false, text: ownerNode.getText() };
  const initializerText = attributes.map((attribute) => attribute.getInitializer()?.getText() ?? '').join(' ');
  const identifiers = uniqueSorted(initializerText.match(/[A-Za-z_$][\w$]*/g) ?? []);
  const definitions = [];
  const sourceFile = ownerNode.getSourceFile();
  for (const name of identifiers) {
    const fn = sourceFile.getFunctions().find((declaration) => declaration.getName() === name);
    if (fn) definitions.push(fn.getText());
    const variable = sourceFile.getVariableDeclarations().find((declaration) => declaration.getName() === name);
    if (variable) definitions.push(variable.getText());
  }
  return { explicit: true, text: `${initializerText} ${definitions.join(' ')}` };
}

function localDeclaration(sourceFile, name) {
  return sourceFile.getDescendantsOfKind(SyntaxKind.FunctionDeclaration)
    .find((declaration) => declaration.getName() === name)
    ?? sourceFile.getDescendantsOfKind(SyntaxKind.VariableDeclaration)
      .find((declaration) => declaration.getName() === name)
    ?? null;
}

function stateSetterName(sourceFile, stateName) {
  for (const declaration of sourceFile.getDescendantsOfKind(SyntaxKind.VariableDeclaration)) {
    const nameNode = declaration.getNameNode();
    if (!Node.isArrayBindingPattern(nameNode)) continue;
    const [state, setter] = nameNode.getElements();
    if (!Node.isBindingElement(state) || !Node.isBindingElement(setter)) continue;
    if (state.getNameNode().getText() === stateName) return setter.getNameNode().getText();
  }
  return null;
}

function rootIdentifier(expression) {
  let current = expression;
  while (Node.isPropertyAccessExpression(current) || Node.isElementAccessExpression(current)) {
    current = current.getExpression();
  }
  return Node.isIdentifier(current) ? current.getText() : null;
}

function referencedLocalNames(node) {
  const names = [];
  for (const call of node.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    const expression = call.getExpression();
    if (Node.isIdentifier(expression)) names.push(expression.getText());
    else {
      const receiver = rootIdentifier(expression);
      if (receiver) names.push(receiver);
    }
    for (const argument of call.getArguments()) {
      if (!Node.isIdentifier(argument)) continue;
      const declaration = localDeclaration(node.getSourceFile(), argument.getText());
      const initializer = Node.isVariableDeclaration(declaration) ? declaration.getInitializer() : null;
      if (Node.isFunctionDeclaration(declaration)
        || Node.isArrowFunction(initializer)
        || Node.isFunctionExpression(initializer)) names.push(argument.getText());
    }
  }
  for (const shorthand of node.getDescendantsOfKind(SyntaxKind.ShorthandPropertyAssignment)) {
    names.push(shorthand.getName());
  }
  return uniqueSorted(names);
}

function resolvedControlContract(controlNode) {
  const attribute = [
    ...['onClick', 'onSave']
    .map((name) => controlNode.getAttribute(name))
    .filter((candidate) => candidate && Node.isJsxAttribute(candidate)),
    ...controlNode.getAttributes().filter((candidate) => Node.isJsxAttribute(candidate)
      && /^handle[A-Z]/.test(candidate.getNameNode().getText())),
  ][0];
  if (!attribute || !Node.isJsxAttribute(attribute)) return null;
  const initializer = attribute.getInitializer();
  if (!initializer) return null;
  const sourceFile = controlNode.getSourceFile();
  const nodes = [initializer];
  const seenDeclarations = new Set();
  const queuedNames = [];
  const expression = Node.isJsxExpression(initializer) ? initializer.getExpression() : null;
  if (expression && Node.isIdentifier(expression)) queuedNames.push(expression.getText());
  queuedNames.push(...referencedLocalNames(initializer));

  for (let index = 0; index < queuedNames.length; index += 1) {
    const name = queuedNames[index];
    const declaration = localDeclaration(sourceFile, name);
    if (!declaration || seenDeclarations.has(declaration)) continue;
    seenDeclarations.add(declaration);
    nodes.push(declaration);
    queuedNames.push(...referencedLocalNames(declaration));
  }

  const directNames = [];
  if (expression && Node.isIdentifier(expression)) directNames.push(expression.getText());
  for (const call of initializer.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    const callExpression = call.getExpression();
    if (Node.isIdentifier(callExpression) && localDeclaration(sourceFile, callExpression.getText())) {
      directNames.push(callExpression.getText());
    } else {
      const receiver = rootIdentifier(callExpression);
      if (receiver && localDeclaration(sourceFile, receiver)) directNames.push(receiver);
    }
  }
  const delegatedWriteHandler = directNames.find((name) => {
    const declaration = localDeclaration(sourceFile, name);
    return declaration && actionWriteCalls({ nodes: [declaration] }, sourceFile).length > 0;
  });
  const handler = directNames.find((name) => /^(?:begin|handle|on|delete|remove|save|submit|send|create|update)/i.test(name))
    ?? delegatedWriteHandler
    ?? (expression && Node.isIdentifier(expression) ? expression.getText() : null)
    ?? 'inline-action';
  return {
    forwarded: /^handle[A-Z]/.test(attribute.getNameNode().getText()),
    handler,
    nodes,
    text: nodes.map((node) => node.getText()).join(' '),
    triggerAttribute: attribute.getNameNode().getText(),
  };
}

function resolvedInitializerContract(initializer, sourceFile, handlerOverride = null) {
  const nodes = [initializer];
  const seenDeclarations = new Set();
  const queuedNames = [];
  const expression = Node.isJsxExpression(initializer) ? initializer.getExpression() : initializer;
  if (expression && Node.isIdentifier(expression)) queuedNames.push(expression.getText());
  queuedNames.push(...referencedLocalNames(initializer));
  for (let index = 0; index < queuedNames.length; index += 1) {
    const name = queuedNames[index];
    const declaration = localDeclaration(sourceFile, name);
    if (!declaration || seenDeclarations.has(declaration)) continue;
    seenDeclarations.add(declaration);
    nodes.push(declaration);
    queuedNames.push(...referencedLocalNames(declaration));
  }
  const directNames = [];
  if (expression && Node.isIdentifier(expression)) directNames.push(expression.getText());
  for (const call of initializer.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    const callExpression = call.getExpression();
    if (Node.isIdentifier(callExpression) && localDeclaration(sourceFile, callExpression.getText())) {
      directNames.push(callExpression.getText());
    } else {
      const receiver = rootIdentifier(callExpression);
      if (receiver && localDeclaration(sourceFile, receiver)) directNames.push(receiver);
    }
  }
  const delegatedWriteHandler = directNames.find((name) => {
    const declaration = localDeclaration(sourceFile, name);
    return declaration && actionWriteCalls({ nodes: [declaration] }, sourceFile).length > 0;
  });
  const handler = handlerOverride
    ?? directNames.find((name) => /^(?:begin|handle|on|delete|remove|save|submit|send|create|update)/i.test(name))
    ?? delegatedWriteHandler
    ?? (expression && Node.isIdentifier(expression) ? expression.getText() : null)
    ?? 'inline-action';
  return { handler, nodes, text: nodes.map((node) => node.getText()).join(' ') };
}

function propertyInitializer(object, name) {
  const property = object.getProperty(name);
  return property && Node.isPropertyAssignment(property) ? property.getInitializer() : null;
}

function bulkActionContracts(controlNode) {
  if (jsxTag(controlNode).split('.').at(-1) !== 'StandardDataTable') return [];
  const attribute = controlNode.getAttribute('bulkActions');
  if (!attribute || !Node.isJsxAttribute(attribute)) return [];
  const initializer = attribute.getInitializer();
  const expression = initializer && Node.isJsxExpression(initializer) ? initializer.getExpression() : null;
  let array = expression;
  if (array && Node.isIdentifier(array)) {
    const declaration = localDeclaration(controlNode.getSourceFile(), array.getText());
    array = declaration && Node.isVariableDeclaration(declaration) ? declaration.getInitializer() : null;
  }
  if (!array || !Node.isArrayLiteralExpression(array)) return [];
  return array.getElements().flatMap((element) => {
    if (!Node.isObjectLiteralExpression(element)) return [];
    const handlerInitializer = propertyInitializer(element, 'onClick');
    const labelInitializer = propertyInitializer(element, 'label');
    if (!handlerInitializer || !labelInitializer
      || (!Node.isStringLiteral(labelInitializer) && !Node.isNoSubstitutionTemplateLiteral(labelInitializer))) return [];
    const triggerLabel = labelInitializer.getLiteralText();
    return [{
      ariaBusy: propertyInitializer(element, 'ariaBusy'),
      contract: resolvedInitializerContract(handlerInitializer, controlNode.getSourceFile(), `bulkAction:${triggerLabel}`),
      disabled: propertyInitializer(element, 'disabled'),
      line: handlerInitializer.getStartLineNumber(),
      triggerLabel,
    }];
  });
}

function callbackAttributeContract(controlNode, attributeName) {
  const attribute = controlNode.getAttribute(attributeName);
  if (!attribute || !Node.isJsxAttribute(attribute)) return null;
  const initializer = attribute.getInitializer();
  if (!initializer) return null;
  return {
    ...resolvedInitializerContract(initializer, controlNode.getSourceFile()),
    triggerAttribute: attributeName,
  };
}

function blockingRefNames(contract) {
  const sourceFile = contract.nodes[0]?.getSourceFile();
  if (!sourceFile) return [];
  const result = new Set();
  const addPositiveRefs = (text) => {
    for (const match of text.matchAll(/\b([A-Za-z_$][\w$]*Ref)\.current\b/g)) {
      const refName = match[1];
      const escaped = refName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp('!\\s*\\(?\\s*' + escaped + '\\.current\\b').test(text)) continue;
      if (new RegExp(escaped + '\\.current\\s*(?:===|==)\\s*(?:false|null)\\b').test(text)) continue;
      if (new RegExp(escaped + '\\.current\\s*(?:!==|!=)\\s*true\\b').test(text)) continue;
      result.add(refName);
    }
  };
  for (const node of contract.nodes) {
    for (const statement of node.getDescendantsOfKind(SyntaxKind.IfStatement)) {
      const thenStatement = statement.getThenStatement();
      if (!Node.isReturnStatement(thenStatement)
        && thenStatement.getDescendantsOfKind(SyntaxKind.ReturnStatement).length === 0) continue;
      const condition = statement.getExpression();
      addPositiveRefs(condition.getText());
      const calls = [
        ...(Node.isCallExpression(condition) ? [condition] : []),
        ...condition.getDescendantsOfKind(SyntaxKind.CallExpression),
      ];
      for (const call of calls) {
        if (!Node.isIdentifier(call.getExpression())) continue;
        const helperName = callName(call);
        const escaped = helperName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (new RegExp('!\\s*' + escaped + '\\s*\\(').test(condition.getText())) continue;
        const declaration = localDeclaration(sourceFile, helperName);
        if (declaration) addPositiveRefs(declaration.getText());
      }
    }
  }
  return uniqueSorted([...result]);
}

function importedChildFormImplementation(element, repoRoot, project) {
  const definition = importedComponentDefinition(element, repoRoot, project);
  if (!definition) return { hasPendingControl: false, hasSynchronousLock: false };
  const childElements = [
    ...definition.node.getDescendantsOfKind(SyntaxKind.JsxOpeningElement),
    ...definition.node.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement),
  ];
  const hasPendingControl = childElements.some((control) => (
    hasDynamicPendingAttribute(control.getAttribute('disabled'))
    && hasDynamicPendingAttribute(control.getAttribute('aria-busy'))
  ));
  return {
    hasPendingControl,
    // useAppForm owns a tested same-tick submit lock; explicit child adapters may
    // additionally expose their own ref lock through the parent callback contract.
    hasSynchronousLock: /\buseAppForm\s*\(/.test(definition.node.getText()),
  };
}

function pendingBridgeRefs(element) {
  const refs = new Set();
  for (const attribute of element.getAttributes()) {
    if (!Node.isJsxAttribute(attribute)
      || !/^on[A-Za-z_$][\w$]*(?:Pending|Busy)Change$/.test(attribute.getNameNode().getText())) continue;
    const text = attribute.getInitializer()?.getText() ?? '';
    for (const match of text.matchAll(/\b([A-Za-z_$][\w$]*Ref)\.current\s*=/g)) refs.add(match[1]);
  }
  return uniqueSorted([...refs]);
}

function composedChildSubmitContracts(ownerNode, jsxElements, repoRoot, project) {
  return jsxElements.flatMap((element) => {
    if (outermostCallableOwner(element).node !== ownerNode) return [];
    const component = jsxTag(element);
    if (!/(?:^|\.)(?:[A-Z][A-Za-z0-9_$]*Form)$/.test(component)) return [];
    const contract = callbackAttributeContract(element, 'onSubmit');
    if (!contract) return [];
    const writes = actionWriteCalls(contract, element.getSourceFile());
    if (writes.length === 0) return [];
    const ownPending = element.getAttribute('isPending');
    const externalBusy = element.getAttribute('externalBusy') ?? element.getAttribute('isDisabled') ?? ownPending;
    const pendingControl = linkedPendingControl(ownPending, ownPending, contract);
    const childImplementation = importedChildFormImplementation(element, repoRoot, project);
    return [{
      actionBlockingRefs: blockingRefNames(contract),
      actionLockRefs: synchronousRefLockNames(contract),
      component,
      contract,
      hasExternalBusy: hasDynamicPendingAttribute(externalBusy),
      hasOwnSynchronousRef: hasSynchronousRefLock(contract) || childImplementation.hasSynchronousLock,
      hasPendingControl: (pendingControl.disabled && pendingControl.ariaBusy)
        || childImplementation.hasPendingControl,
      handler: contract.handler,
      writeSinks: uniqueSorted(writes.map((call) => call.getExpression().getText())),
    }];
  });
}

function importedComponentDefinition(element, repoRoot, project) {
  const component = jsxTag(element);
  if (!/^[A-Z][A-Za-z0-9_$]*$/.test(component)) return null;
  const parentSource = element.getSourceFile();
  for (const declaration of parentSource.getImportDeclarations()) {
    let exportName = null;
    if (declaration.getDefaultImport()?.getText() === component) exportName = 'default';
    for (const named of declaration.getNamedImports()) {
      const localName = named.getAliasNode()?.getText() ?? named.getName();
      if (localName === component) exportName = named.getName();
    }
    if (!exportName) continue;
    const moduleName = declaration.getModuleSpecifierValue();
    const base = moduleName.startsWith('@/')
      ? resolve(repoRoot, 'frontend', 'src', moduleName.slice(2))
      : moduleName.startsWith('.')
        ? resolve(dirname(parentSource.getFilePath()), moduleName)
        : null;
    if (!base) return null;
    const source = [...SOURCE_EXTENSIONS]
      .flatMap((extension) => [`${base}${extension}`, resolve(base, `index${extension}`)])
      .map((candidate) => project.getSourceFile(candidate))
      .find(Boolean);
    if (!source) return null;
    const functions = source.getFunctions();
    const variables = source.getVariableDeclarations();
    let node = exportName === 'default'
      ? functions.find((candidate) => candidate.isDefaultExport())
      : functions.find((candidate) => candidate.getName() === exportName);
    if (!node && exportName !== 'default') {
      const variable = variables.find((candidate) => candidate.getName() === exportName);
      const initializer = variable?.getInitializer();
      if (initializer && (Node.isArrowFunction(initializer) || Node.isFunctionExpression(initializer))) node = initializer;
    }
    return node ? { component, node, source } : null;
  }
  return null;
}

function forwardedChildControlContract(element, contract, repoRoot, project) {
  const definition = importedComponentDefinition(element, repoRoot, project);
  if (!definition) return null;
  const controls = [
    ...definition.node.getDescendantsOfKind(SyntaxKind.JsxOpeningElement),
    ...definition.node.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement),
  ].filter((candidate) => ['onClick', 'onSave'].some((attributeName) => {
    const attribute = candidate.getAttribute(attributeName);
    return attribute && Node.isJsxAttribute(attribute)
      && new RegExp(`\\b${contract.triggerAttribute.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`)
        .test(attribute.getInitializer()?.getText() ?? '');
  }));
  if (controls.length === 0) return null;
  const identities = new Set();
  const tokens = new Set();
  let disabled = true;
  let ariaBusy = true;
  for (const control of controls) {
    for (const token of controlEvidenceTokens(control)) tokens.add(token);
    const childDisabled = control.getAttribute('disabled');
    const childBusy = control.getAttribute('aria-busy');
    const sharedNames = [...pendingStateIdentifiers(childDisabled)]
      .filter((name) => pendingStateIdentifiers(childBusy).has(name));
    const linked = sharedNames.some((name) => {
      const parentPending = element.getAttribute(name);
      if (!parentPending || !Node.isJsxAttribute(parentPending)) return false;
      const result = linkedPendingControl(parentPending, parentPending, contract);
      for (const identity of result.busyIdentities) identities.add(identity);
      return result.disabled && result.ariaBusy;
    });
    disabled = disabled && linked && hasDynamicPendingAttribute(childDisabled);
    ariaBusy = ariaBusy && linked && hasDynamicPendingAttribute(childBusy);
  }
  return {
    ariaBusy,
    busyIdentities: uniqueSorted([...identities]),
    controlEvidenceTokens: uniqueSorted([...tokens]),
    disabled,
  };
}

function importedSelfWritingChildFormContracts(ownerNode, jsxElements, repoRoot, project) {
  return jsxElements.flatMap((element) => {
    if (outermostCallableOwner(element).node !== ownerNode || element.getAttribute('onSubmit')) return [];
    if (!/^[A-Z][A-Za-z0-9_$]*Form$/.test(jsxTag(element))) return [];
    const definition = importedComponentDefinition(element, repoRoot, project);
    if (!definition) return [];
    const childElements = [
      ...definition.node.getDescendantsOfKind(SyntaxKind.JsxOpeningElement),
      ...definition.node.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement),
    ];
    const form = childElements.find((candidate) => {
      const tag = jsxTag(candidate);
      return (tag === 'form' || tag.endsWith('.form')) && callableOwner(candidate).node === definition.node;
    });
    if (!form) return [];
    const contract = callbackAttributeContract(form, 'onSubmit');
    if (!contract) return [];
    const writes = actionWriteCalls(contract, definition.source);
    if (writes.length === 0) return [];
    const externalBusy = element.getAttribute('externalBusy') ?? element.getAttribute('isDisabled');
    const bridgeRefs = pendingBridgeRefs(element);
    const disabledControls = childElements.filter((candidate) => hasDynamicPendingAttribute(candidate.getAttribute('disabled')));
    const busyControls = childElements.filter((candidate) => hasDynamicPendingAttribute(candidate.getAttribute('aria-busy')));
    return [{
      actionBlockingRefs: uniqueSorted([...blockingRefNames(contract), ...bridgeRefs]),
      actionLockRefs: uniqueSorted([...synchronousRefLockNames(contract), ...bridgeRefs]),
      component: definition.component,
      contract,
      hasExternalBusy: hasDynamicPendingAttribute(externalBusy) || bridgeRefs.length > 0,
      hasOwnSynchronousRef: hasSynchronousRefLock(contract) || /\buseAppForm\s*\(/.test(definition.node.getText()),
      hasPendingControl: disabledControls.some((disabled) => busyControls.some((busy) => disabled === busy)),
      handler: contract.handler,
      writeSinks: uniqueSorted(writes.map((call) => call.getExpression().getText())),
    }];
  });
}

function discoverComposedChildContracts(ownerNode, jsxElements, repoRoot, project) {
  const contracts = [
    ...composedChildSubmitContracts(ownerNode, jsxElements, repoRoot, project),
    ...importedSelfWritingChildFormContracts(ownerNode, jsxElements, repoRoot, project),
  ];
  const seen = new Set();
  return contracts.filter((contract) => {
    const key = `${contract.component}:${contract.handler}:${JSON.stringify(contract.writeSinks)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function actionWriteCalls(contract, sourceFile) {
  const importedWriteNames = new Set();
  for (const declaration of sourceFile.getImportDeclarations()) {
    if (!/(?:service|actions?|api)/i.test(declaration.getModuleSpecifierValue())) continue;
    const defaultImport = declaration.getDefaultImport()?.getText();
    if (defaultImport) importedWriteNames.add(defaultImport);
    for (const namedImport of declaration.getNamedImports()) {
      importedWriteNames.add(namedImport.getAliasNode()?.getText() ?? namedImport.getName());
    }
  }
  const callsByPosition = new Map();
  for (const node of contract.nodes) {
    for (const call of node.getDescendantsOfKind(SyntaxKind.CallExpression)) {
      callsByPosition.set(call.getStart(), call);
    }
  }
  const calls = [...callsByPosition.values()];
  return calls.filter((call) => {
    const name = callName(call);
    if (/^(?:mutate|mutateAsync)$/.test(name)) return true;
    if (isWriteName(name) && !/^submitHandler$/i.test(name)) {
      const expression = call.getExpression();
      if (Node.isIdentifier(expression) && importedWriteNames.has(expression.getText())) return true;
      if (Node.isPropertyAccessExpression(expression)) {
        if (/(?:service|api|actions?|client)/i.test(expression.getExpression().getText())) return true;
      }
    }
    const expression = call.getExpression();
    if (Node.isPropertyAccessExpression(expression)
      && /^(?:post|put|patch|delete)$/.test(expression.getName())) {
      return /(?:api|client|service|axios|http)/i.test(expression.getExpression().getText());
    }
    return expression.getText() === 'fetch'
      && /method\s*:\s*["'](?:POST|PUT|PATCH|DELETE)["']/i.test(call.getText());
  });
}

function synchronousRefLockNames(contract) {
  const sourceFile = contract.nodes[0]?.getSourceFile();
  if (!sourceFile) return [];
  const writes = actionWriteCalls(contract, sourceFile);
  if (writes.length === 0) return [];
  const refNames = uniqueSorted([...contract.text.matchAll(/\b([A-Za-z_$][\w$]*Ref)\.current\b/g)]
    .map((match) => match[1]));
  const positiveGuards = (node, refName) => node.getDescendantsOfKind(SyntaxKind.IfStatement).filter((statement) => {
    const conditionNode = statement.getExpression();
    const condition = conditionNode.getText();
    const escaped = refName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const directRef = new RegExp(`\\b${escaped}\\.current\\b`).test(condition);
    const helperCallNames = [
      ...(Node.isCallExpression(conditionNode) ? [conditionNode] : []),
      ...conditionNode.getDescendantsOfKind(SyntaxKind.CallExpression),
    ]
      .filter((call) => Node.isIdentifier(call.getExpression()))
      .map((call) => callName(call));
    const positiveHelper = helperCallNames.some((name) => {
      const declaration = localDeclaration(sourceFile, name);
      if (!declaration || !new RegExp(`\\b${escaped}\\.current\\b`).test(declaration.getText())) return false;
      const helperEscaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(`!\\s*${helperEscaped}\\s*\\(`).test(condition)) return false;
      const helperText = declaration.getText();
      if (new RegExp(`!\\s*\\(?\\s*${escaped}\\.current\\b`).test(helperText)) return false;
      if (new RegExp(`${escaped}\\.current\\s*(?:===|==)\\s*(?:false|null)\\b`).test(helperText)) return false;
      if (new RegExp(`${escaped}\\.current\\s*(?:!==|!=)\\s*true\\b`).test(helperText)) return false;
      return true;
    });
    if (!directRef && !positiveHelper) return false;
    if (directRef && new RegExp(`!\\s*\\(?\\s*${escaped}\\.current\\b`).test(condition)) return false;
    if (directRef && new RegExp(`${escaped}\\.current\\s*(?:===|==)\\s*(?:false|null)\\b`).test(condition)) return false;
    if (directRef && new RegExp(`${escaped}\\.current\\s*(?:!==|!=)\\s*true\\b`).test(condition)) return false;
    const thenStatement = statement.getThenStatement();
    return Node.isReturnStatement(thenStatement)
      || thenStatement.getDescendantsOfKind(SyntaxKind.ReturnStatement).length > 0;
  });
  return refNames.filter((refName) => {
    const escaped = refName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const isRefAssignment = (expression) => expression.getOperatorToken().getText() === '='
      && expression.getLeft().getText() === `${refName}.current`;
    const isReleaseAssignment = (expression) => isRefAssignment(expression)
      && /^(?:false|null)$/.test(expression.getRight().getText());
    const coveredWrites = new Set();
    const settledReleaseNodes = contract.nodes.filter((node) => {
      if (!/\bonSettled\b/.test(node.getText())) return false;
      return node.getDescendantsOfKind(SyntaxKind.BinaryExpression)
        .some((expression) => isReleaseAssignment(expression));
    });
    const declarationName = (node) => Node.isVariableDeclaration(node) || Node.isFunctionDeclaration(node)
      ? node.getName()
      : null;
    const isWithin = (child, ancestor) => child === ancestor || child.getAncestors().includes(ancestor);
    const mutationDeclarationFor = (call) => {
      const expression = call.getExpression();
      if (!Node.isPropertyAccessExpression(expression) || !/^(?:mutate|mutateAsync)$/.test(callName(call))) return null;
      const receiver = rootIdentifier(expression.getExpression());
      return contract.nodes.find((node) => Node.isVariableDeclaration(node) && node.getName() === receiver) ?? null;
    };
    const hasMatchingOnSettled = (call) => {
      const declaration = mutationDeclarationFor(call);
      return Boolean(declaration && settledReleaseNodes.includes(declaration));
    };
    const coverWrite = (write) => {
      coveredWrites.add(write);
      const declaration = mutationDeclarationFor(write);
      if (!declaration) return;
      for (const nestedWrite of writes) {
        if (isWithin(nestedWrite, declaration)) coveredWrites.add(nestedWrite);
      }
    };
    const isFinallyReleaseAfter = (release, call) => release.getStart() > call.getStart()
      && release.getAncestors().some((ancestor) => {
        if (!Node.isBlock(ancestor)) return false;
        const parent = ancestor.getParent();
        return Node.isTryStatement(parent) && parent.getFinallyBlock() === ancestor;
      });
    let foundLockPath = false;

    for (const node of contract.nodes) {
      const guards = positiveGuards(node, refName);
      let guard = guards[0];
      const claimAssignment = node.getDescendantsOfKind(SyntaxKind.BinaryExpression)
        .find((expression) => isRefAssignment(expression) && !isReleaseAssignment(expression));
      let claimIndex = claimAssignment ? claimAssignment.getStart() - node.getStart() : -1;
      let collectionKey = null;
      if (claimIndex < 0) {
        for (const call of node.getDescendantsOfKind(SyntaxKind.CallExpression)) {
          const expression = call.getExpression();
          if (!Node.isPropertyAccessExpression(expression)
            || expression.getName() !== 'add'
            || expression.getExpression().getText() !== `${refName}.current`) continue;
          const key = call.getArguments()[0]?.getText();
          if (!key) continue;
          const compactHas = `${refName}.current.has(${key})`.replace(/\s+/g, '');
          const matchingGuard = guards.find((statement) => statement.getExpression().getText()
            .replace(/\s+/g, '').includes(compactHas));
          if (!matchingGuard) continue;
          guard = matchingGuard;
          claimIndex = call.getStart() - node.getStart();
          collectionKey = key;
          break;
        }
      }
      if (!guard || claimIndex < 0 || guard.getStart() - node.getStart() >= claimIndex) continue;

      const callable = Node.isFunctionDeclaration(node)
        ? node
        : Node.isVariableDeclaration(node) && (Node.isArrowFunction(node.getInitializer()) || Node.isFunctionExpression(node.getInitializer()))
          ? node.getInitializer()
          : null;
      const callbackParameters = callable?.getParameters() ?? [];
      const releases = node.getDescendantsOfKind(SyntaxKind.BinaryExpression)
        .filter((expression) => isReleaseAssignment(expression));
      if (collectionKey !== null) {
        releases.push(...node.getDescendantsOfKind(SyntaxKind.CallExpression).filter((call) => {
          const expression = call.getExpression();
          return Node.isPropertyAccessExpression(expression)
            && expression.getName() === 'delete'
            && expression.getExpression().getText() === `${refName}.current`
            && call.getArguments()[0]?.getText().replace(/\s+/g, '') === collectionKey.replace(/\s+/g, '');
        }));
      }
      for (const write of writes.filter((call) => isWithin(call, node))) {
        const afterClaim = write.getStart() - node.getStart() > claimIndex;
        const safelyReleased = releases.some((release) => isFinallyReleaseAfter(release, write))
          || (write.getAncestors().some((ancestor) => releases.includes(ancestor)) && /\bonSettled\b/.test(write.getText()))
          || hasMatchingOnSettled(write);
        if (afterClaim && safelyReleased) {
          foundLockPath = true;
          coverWrite(write);
        }
      }

      const wrapperName = declarationName(node);
      if (!wrapperName || !callable) continue;
      for (const parameterCall of node.getDescendantsOfKind(SyntaxKind.CallExpression)) {
        if (!Node.isIdentifier(parameterCall.getExpression())) continue;
        const parameterIndex = callbackParameters.findIndex((parameter) => parameter.getName() === callName(parameterCall));
        if (parameterIndex < 0 || parameterCall.getStart() - node.getStart() <= claimIndex) continue;
        const locallyReleased = releases.some((release) => isFinallyReleaseAfter(release, parameterCall));
        for (const invocationNode of contract.nodes) {
          for (const invocation of invocationNode.getDescendantsOfKind(SyntaxKind.CallExpression)) {
            if (!Node.isIdentifier(invocation.getExpression()) || callName(invocation) !== wrapperName) continue;
            const argument = invocation.getArguments()[parameterIndex];
            if (!argument) continue;
            const callbackWrites = writes.filter((write) => isWithin(write, argument));
            const mutationSettled = callbackWrites.length > 0 && callbackWrites.every((write) => hasMatchingOnSettled(write));
            if (callbackWrites.length === 0 || (!locallyReleased && !mutationSettled)) continue;
            foundLockPath = true;
            for (const write of callbackWrites) coverWrite(write);
          }
        }
      }
    }

    const claimHelpers = new Set(contract.nodes.flatMap((node) => {
      const name = declarationName(node);
      if (!name) return [];
      const guard = positiveGuards(node, refName)[0];
      const claim = node.getDescendantsOfKind(SyntaxKind.BinaryExpression)
        .find((expression) => isRefAssignment(expression) && !isReleaseAssignment(expression));
      return guard && claim && guard.getStart() < claim.getStart() ? [name] : [];
    }));
    const releaseHelpers = new Set(contract.nodes.flatMap((node) => {
      const name = declarationName(node);
      if (!name || !new RegExp(`\\b${escaped}\\.current\\s*=\\s*(?:false|null)\\b`).test(node.getText())) return [];
      return [name];
    }));
    if (claimHelpers.size > 0 && releaseHelpers.size > 0) {
      for (const node of contract.nodes) {
        const text = node.getText();
        const calls = node.getDescendantsOfKind(SyntaxKind.CallExpression);
        const claimCalls = calls.filter((call) => Node.isIdentifier(call.getExpression())
          && claimHelpers.has(callName(call))
          && new RegExp(`if\\s*\\([^)]*\\b${callName(call)}\\s*\\([^)]*\\)[^)]*\\)\\s*(?:return\\b|\\{[^}]*\\breturn\\b)`, 's')
            .test(text));
        const releaseCalls = calls.filter((call) => Node.isIdentifier(call.getExpression())
          && releaseHelpers.has(callName(call))
          && call.getAncestors().some((ancestor) => {
            if (!Node.isBlock(ancestor)) return false;
            const parent = ancestor.getParent();
            return Node.isTryStatement(parent) && parent.getFinallyBlock() === ancestor;
          }));
        for (const claimCall of claimCalls) {
          for (const releaseCall of releaseCalls) {
            const protectedWrites = writes.filter((write) => isWithin(write, node)
              && claimCall.getStart() < write.getStart() && write.getStart() < releaseCall.getStart());
            if (protectedWrites.length === 0) continue;
            foundLockPath = true;
            for (const write of protectedWrites) coverWrite(write);
          }
        }
      }
    }
    return foundLockPath && writes.every((write) => coveredWrites.has(write));
  });
}

function hasSynchronousRefLock(contract) {
  return synchronousRefLockNames(contract).length > 0;
}

function hasDynamicPendingAttribute(attribute) {
  if (!attribute || !Node.isJsxAttribute(attribute)) return false;
  const initializer = attribute.getInitializer();
  return hasDynamicPendingInitializer(initializer);
}

function pendingStateIdentifiers(initializerOrAttribute) {
  const initializer = initializerOrAttribute && Node.isJsxAttribute(initializerOrAttribute)
    ? initializerOrAttribute.getInitializer()
    : initializerOrAttribute;
  if (!hasDynamicPendingInitializer(initializer)) return new Set();
  const expression = Node.isJsxExpression(initializer) ? initializer.getExpression() : initializer;
  const queued = expression?.getText().match(/[A-Za-z_$][\w$]*/g) ?? [];
  const expressionTexts = [expression?.getText() ?? ''];
  const qualified = new Set();
  const collectQualified = (candidate) => {
    const accesses = [
      ...(Node.isPropertyAccessExpression(candidate) ? [candidate] : []),
      ...candidate.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression),
    ];
    for (const access of accesses) {
      if (!PENDING_STATE_NAME.test(access.getName())) continue;
      qualified.add(access.getText());
    }
  };
  collectQualified(expression);
  const seen = new Set();
  for (let index = 0; index < queued.length && index < 40; index += 1) {
    const name = queued[index];
    if (seen.has(name)) continue;
    seen.add(name);
    const declaration = localDeclaration(expression.getSourceFile(), name);
    if (!declaration || !Node.isVariableDeclaration(declaration)) continue;
    const declarationInitializer = declaration.getInitializer();
    if (!declarationInitializer) continue;
    expressionTexts.push(declarationInitializer.getText());
    collectQualified(declarationInitializer);
    queued.push(...(declarationInitializer.getText().match(/[A-Za-z_$][\w$]*/g) ?? []));
  }
  const names = [...seen].filter((name) => {
    if (!PENDING_STATE_NAME.test(name)) return false;
    if (!/^(?:isPending|isLoading)$/.test(name)) return true;
    return expressionTexts.some((text) => new RegExp(`(?:^|[^.\\w$])${name}\\b`).test(text));
  });
  return new Set([...names, ...qualified]);
}

function pendingStateIdentityTokens(initializerOrAttribute) {
  const initializer = initializerOrAttribute && Node.isJsxAttribute(initializerOrAttribute)
    ? initializerOrAttribute.getInitializer()
    : initializerOrAttribute;
  if (!hasDynamicPendingInitializer(initializer)) return new Set();
  const expression = Node.isJsxExpression(initializer) ? initializer.getExpression() : initializer;
  const tokens = pendingStateIdentifiers(initializerOrAttribute);
  const binaries = [
    ...(Node.isBinaryExpression(expression) ? [expression] : []),
    ...expression.getDescendantsOfKind(SyntaxKind.BinaryExpression),
  ];
  for (const binary of binaries) {
    if (!/^(?:===|==|!==|!=)$/.test(binary.getOperatorToken().getText())) continue;
    if (!PENDING_STATE_NAME.test(binary.getText())) continue;
    tokens.add(binary.getText().replace(/\s+/g, ''));
  }
  return tokens;
}

function pendingStateSpansWrite(contract, identifier) {
  const root = identifier.split('.')[0];
  if (identifier.includes('.')) {
    const escapedRoot = root.replace(/[.*+?^$(){}|[\]\\]/g, '\\$&');
    return new RegExp('\\b' + escapedRoot + '\\.(?:mutate|mutateAsync)\\s*\\(').test(contract.text);
  }
  const sourceFile = contract.nodes[0]?.getSourceFile();
  if (!sourceFile) return false;
  const setter = stateSetterName(sourceFile, identifier)
    ?? 'set' + (identifier[0]?.toUpperCase() ?? '') + identifier.slice(1);
  const writes = actionWriteCalls(contract, sourceFile);
  if (writes.length === 0) return false;
  const isWithin = (child, ancestor) => child === ancestor || child.getAncestors().includes(ancestor);
  const declarationName = (node) => Node.isVariableDeclaration(node) || Node.isFunctionDeclaration(node)
    ? node.getName()
    : null;
  const setterCalls = (node) => node.getDescendantsOfKind(SyntaxKind.CallExpression)
    .filter((call) => Node.isIdentifier(call.getExpression()) && callName(call) === setter);
  const isRelease = (call) => {
    const argument = call.getArguments()[0]?.getText() ?? '';
    return /^(?:false|null|undefined)$/.test(argument)
      || /\.(?:delete|filter)\s*\(/.test(argument)
      || /=>[\s\S]*\b(?:false|null|undefined)\b/.test(argument);
  };
  const safelyReleasesAfter = (call, write) => call.getStart() > write.getStart()
    && call.getAncestors().some((ancestor) => {
      if (Node.isBlock(ancestor)) {
        const parent = ancestor.getParent();
        if (Node.isTryStatement(parent) && parent.getFinallyBlock() === ancestor) return true;
      }
      return (Node.isPropertyAssignment(ancestor) || Node.isMethodDeclaration(ancestor))
        && ancestor.getName() === 'onSettled';
    });
  const mutationDeclarationFor = (call) => {
    const expression = call.getExpression();
    if (!Node.isPropertyAccessExpression(expression) || !/^(?:mutate|mutateAsync)$/.test(callName(call))) return null;
    const receiver = rootIdentifier(expression.getExpression());
    return sourceFile.getDescendantsOfKind(SyntaxKind.VariableDeclaration)
      .find((node) => node.getName() === receiver) ?? null;
  };
  const hasMatchingOnSettledRelease = (write) => {
    const declaration = mutationDeclarationFor(write);
    return Boolean(declaration && setterCalls(declaration).some((call) => isRelease(call)
      && call.getAncestors().some((ancestor) => (
        (Node.isPropertyAssignment(ancestor) || Node.isMethodDeclaration(ancestor))
        && ancestor.getName() === 'onSettled'
      ))));
  };

  for (const node of contract.nodes) {
    const starts = setterCalls(node).filter((call) => !isRelease(call));
    const releases = setterCalls(node).filter(isRelease);
    for (const write of writes.filter((call) => isWithin(call, node))) {
      if (starts.some((call) => call.getStart() < write.getStart())
        && (releases.some((call) => safelyReleasesAfter(call, write))
          || hasMatchingOnSettledRelease(write))) return true;
    }
  }

  for (const node of contract.nodes) {
    const callable = Node.isFunctionDeclaration(node)
      ? node
      : Node.isVariableDeclaration(node) && (Node.isArrowFunction(node.getInitializer()) || Node.isFunctionExpression(node.getInitializer()))
        ? node.getInitializer()
        : null;
    const wrapperName = declarationName(node);
    if (!callable || !wrapperName) continue;
    const parameters = callable.getParameters();
    const starts = setterCalls(node).filter((call) => !isRelease(call));
    const releases = setterCalls(node).filter(isRelease);
    for (const parameterCall of node.getDescendantsOfKind(SyntaxKind.CallExpression)) {
      if (!Node.isIdentifier(parameterCall.getExpression())) continue;
      const parameterIndex = parameters.findIndex((parameter) => parameter.getName() === callName(parameterCall));
      if (parameterIndex < 0
        || !starts.some((call) => call.getStart() < parameterCall.getStart())) continue;
      for (const invocationNode of contract.nodes) {
        for (const invocation of invocationNode.getDescendantsOfKind(SyntaxKind.CallExpression)) {
          if (!Node.isIdentifier(invocation.getExpression()) || callName(invocation) !== wrapperName) continue;
          const callback = invocation.getArguments()[parameterIndex];
          if (!callback) continue;
          const callbackWrites = writes.filter((write) => isWithin(write, callback));
          if (callbackWrites.length > 0
            && (releases.some((call) => safelyReleasesAfter(call, parameterCall))
              || callbackWrites.some(hasMatchingOnSettledRelease))) return true;
        }
      }
    }
  }

  const startHelpers = new Set(contract.nodes.flatMap((node) => {
    const name = declarationName(node);
    return name && setterCalls(node).some((call) => !isRelease(call)) ? [name] : [];
  }));
  const releaseHelpers = new Set(contract.nodes.flatMap((node) => {
    const name = declarationName(node);
    return name && setterCalls(node).some(isRelease) ? [name] : [];
  }));
  for (const node of contract.nodes) {
    const calls = node.getDescendantsOfKind(SyntaxKind.CallExpression);
    const starts = calls.filter((call) => Node.isIdentifier(call.getExpression())
      && startHelpers.has(callName(call)));
    const releases = calls.filter((call) => Node.isIdentifier(call.getExpression())
      && releaseHelpers.has(callName(call)));
    for (const write of writes.filter((call) => isWithin(call, node))) {
      if (starts.some((call) => call.getStart() < write.getStart())
        && releases.some((call) => safelyReleasesAfter(call, write))) return true;
    }
  }
  return false;
}

function linkedPendingControl(disabled, ariaBusy, contract = null) {
  const disabledIdentifiers = pendingStateIdentifiers(disabled);
  const busyIdentifiers = pendingStateIdentifiers(ariaBusy);
  const sharedIdentifiers = [...disabledIdentifiers].filter((identifier) => busyIdentifiers.has(identifier));
  const linkedToHandler = contract && sharedIdentifiers.some((identifier) => {
    const root = identifier.split('.')[0];
    if (identifier.includes('.')) {
      const escapedRoot = root.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`\\b${escapedRoot}\\.(?:mutate|mutateAsync)\\s*\\(`).test(contract.text);
    }
    const sourceFile = contract.nodes[0]?.getSourceFile();
    const setter = (sourceFile ? stateSetterName(sourceFile, identifier) : null)
      ?? `set${identifier[0]?.toUpperCase() ?? ''}${identifier.slice(1)}`;
    return new RegExp(`\\b${setter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\(`).test(contract.text);
  });
  const pendingSpansWrite = contract && sharedIdentifiers.some((identifier) => (
    pendingStateSpansWrite(contract, identifier)
  ));
  const linked = sharedIdentifiers.length > 0 && linkedToHandler && pendingSpansWrite;
  return {
    disabled: linked && (disabled && Node.isJsxAttribute(disabled) ? hasDynamicPendingAttribute(disabled) : hasDynamicPendingInitializer(disabled)),
    ariaBusy: linked && (ariaBusy && Node.isJsxAttribute(ariaBusy) ? hasDynamicPendingAttribute(ariaBusy) : hasDynamicPendingInitializer(ariaBusy)),
    busyIdentities: [...pendingStateIdentityTokens(ariaBusy)],
  };
}

function hasDynamicPendingInitializer(initializer) {
  if (!initializer) return false;
  const expression = Node.isJsxExpression(initializer) ? initializer.getExpression() : initializer;
  if (!expression) return false;
  const text = expression.getText().trim();
  if (/^(?:false|true|null|undefined|0|["']{2})$/.test(text)) return false;
  return /[A-Za-z_$][\w$]*/.test(text);
}

function hasFailureFeedback(contract) {
  const isFeedbackCall = (call) => /^toast(?:\.[A-Za-z_$][\w$]*)?$/.test(call.getExpression().getText())
    || /^(?:set[A-Za-z_$][\w$]*Error|setFormErrors|setError)$/.test(callName(call));
  const containsFeedback = (node) => node.getDescendantsOfKind(SyntaxKind.CallExpression).some(isFeedbackCall);
  for (const node of contract.nodes) {
    if (node.getDescendantsOfKind(SyntaxKind.CatchClause).some(containsFeedback)) return true;
    if (node.getDescendantsOfKind(SyntaxKind.PropertyAssignment)
      .some((property) => property.getName() === 'onError' && containsFeedback(property))) return true;
    if (node.getDescendantsOfKind(SyntaxKind.MethodDeclaration)
      .some((method) => method.getName() === 'onError' && containsFeedback(method))) return true;
    const hasOnErrorShorthand = node.getDescendantsOfKind(SyntaxKind.ShorthandPropertyAssignment)
      .some((property) => property.getName() === 'onError');
    if (hasOnErrorShorthand && contract.nodes.some((candidate) => (
      (Node.isVariableDeclaration(candidate) || Node.isFunctionDeclaration(candidate))
      && candidate.getName() === 'onError'
      && containsFeedback(candidate)
    ))) return true;
  }
  return false;
}

function actionEvidenceTokens(writes, handler) {
  const tokens = [];
  if (handler && !/^(?:begin|handle|on)?(?:delete|remove|save|submit|send|create|update)?$/i.test(handler)) {
    tokens.push(handler);
  }
  for (const call of writes) {
    const expression = call.getExpression();
    const name = callName(call);
    if (/^(?:mutate|mutateAsync)$/.test(name) && Node.isPropertyAccessExpression(expression)) {
      const receiver = rootIdentifier(expression.getExpression());
      if (receiver) tokens.push(receiver);
    } else if (name && !/^(?:post|put|patch)$/i.test(name)) {
      tokens.push(name);
      if (/Action$/.test(name)) tokens.push(name.replace(/Action$/, ''));
    }
  }
  return uniqueSorted(tokens.filter((token) => token.length > 3));
}

function controlEvidenceTokens(element) {
  const tokens = [];
  const genericKoreanActions = new Set(['삭제', '저장', '수정', '등록', '생성', '전송', '처리 중', '삭제 중', '저장 중']);
  const add = (value, { exact = false } = {}) => {
    const normalized = value.replace(/\s+/g, ' ').replace(/^[\s${}·….-]+|[\s${}·….-]+$/g, '').trim();
    const genericAction = genericKoreanActions.has(normalized)
      || /^(?:삭제|저장|수정|등록|생성|전송)(?:\s*중)?$/.test(normalized);
    if (!normalized || normalized.length > 100 || (!exact && genericAction)) return;
    const longEnough = exact ? normalized.length >= 3 : /[가-힣]/.test(normalized) && normalized.length >= 2;
    if (longEnough) tokens.push(normalized);
  };
  for (const name of ['aria-label', 'title', 'data-testid']) {
    const attribute = element.getAttribute(name);
    if (!attribute || !Node.isJsxAttribute(attribute)) continue;
    const text = attribute.getInitializer()?.getText() ?? '';
    for (const match of text.matchAll(/["'`]([^"'`]+)["'`]/g)) add(match[1], { exact: name === 'data-testid' });
    for (const match of text.matchAll(/[가-힣][가-힣0-9 ()·…-]*/g)) add(match[0]);
  }
  const parent = element.getParent();
  if (Node.isJsxElement(parent)) {
    for (const child of parent.getJsxChildren()) {
      if (Node.isJsxText(child)) add(child.getText());
      if (!Node.isJsxExpression(child)) continue;
      const expression = child.getExpression();
      if (!expression) continue;
      if (Node.isStringLiteral(expression) || Node.isNoSubstitutionTemplateLiteral(expression)) {
        add(expression.getLiteralText());
      }
      for (const literal of expression.getDescendantsOfKind(SyntaxKind.StringLiteral)) add(literal.getLiteralText());
      for (const literal of expression.getDescendantsOfKind(SyntaxKind.NoSubstitutionTemplateLiteral)) {
        add(literal.getLiteralText());
      }
    }
  }
  return uniqueSorted(tokens);
}

function actionWritePayloads(writes) {
  return uniqueSorted(writes.flatMap((call) => call.getArguments().map((argument) => argument.getText())));
}

function actionValidationMetadata(contract) {
  const adapters = [];
  const schemas = [];
  const fields = [];
  const seenCalls = new Set();
  for (const node of contract.nodes) {
    for (const call of node.getDescendantsOfKind(SyntaxKind.CallExpression)) {
      if (seenCalls.has(call.getStart()) || callName(call) !== 'validate') continue;
      seenCalls.add(call.getStart());
      const expression = call.getExpression();
      if (!Node.isPropertyAccessExpression(expression)) continue;
      const adapter = rootIdentifier(expression.getExpression());
      if (!adapter) continue;
      adapters.push(adapter);
      const declaration = localDeclaration(node.getSourceFile(), adapter);
      const initializer = declaration && Node.isVariableDeclaration(declaration) ? declaration.getInitializer() : null;
      if (initializer && Node.isCallExpression(initializer) && callName(initializer) === 'useManualFormValidation') {
        const schema = initializer.getArguments()[0];
        if (schema && Node.isIdentifier(schema)) schemas.push(schema.getText());
      }
      const payload = call.getArguments()[0];
      if (payload && Node.isObjectLiteralExpression(payload)) {
        for (const property of payload.getProperties()) {
          if (Node.isPropertyAssignment(property) || Node.isShorthandPropertyAssignment(property)) {
            fields.push(property.getName());
          }
        }
      }
    }
  }
  const uniqueAdapters = uniqueSorted(adapters);
  const sourceText = contract.nodes[0]?.getSourceFile().getFullText() ?? '';
  const hasSummary = uniqueAdapters.some((adapter) => new RegExp(
    `FormErrorSummary[\\s\\S]{0,400}errors\\s*=\\s*\\{\\s*${adapter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.errors`,
  ).test(sourceText));
  const hasInline = uniqueAdapters.some((adapter) => sourceText.includes(`${adapter}.messageProps(`));
  const mapsServerErrors = uniqueAdapters.some((adapter) => contract.text.includes(`${adapter}.setFormErrors(`));
  return {
    adapters: uniqueAdapters,
    fields: uniqueSorted(fields),
    hasInline,
    hasSummary,
    mapsServerErrors,
    schemas: uniqueSorted(schemas),
  };
}

function compileTimeDisabledWrite(ownerNode, controlNode = null, requireAllWriteEntryControls = false) {
  const declaration = ownerNode.getDescendantsOfKind(SyntaxKind.VariableDeclaration)
    .find((candidate) => candidate.getName() === 'WRITE_NOT_IMPLEMENTED'
      && candidate.getInitializer()?.getText() === 'true');
  if (!declaration || !/(?:501\s*(?:Not\s+Implemented)?|미구현)/i.test(ownerNode.getText())) return null;
  const isDisabledByFlag = (control) => {
    const attribute = control.getAttribute('disabled');
    if (!attribute || !Node.isJsxAttribute(attribute)) return false;
    return /\bWRITE_NOT_IMPLEMENTED\b/.test(attribute.getInitializer()?.getText() ?? '');
  };
  if (controlNode) return isDisabledByFlag(controlNode) ? 'WRITE_NOT_IMPLEMENTED' : null;
  const controls = [
    ...ownerNode.getDescendantsOfKind(SyntaxKind.JsxOpeningElement),
    ...ownerNode.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement),
  ];
  if (requireAllWriteEntryControls) {
    const writeEntryIntent = /(?:create|edit|update|delete|remove|save|submit|send|register|insert|modify|등록|수정|삭제|저장|생성|추가|전송)/i;
    const entryControls = controls.filter((control) => {
      const tag = jsxTag(control).split('.').at(-1) ?? '';
      if (tag !== 'button' && !tag.endsWith('Button')) return false;
      const contract = resolvedControlContract(control);
      return contract?.triggerAttribute === 'onClick'
        && writeEntryIntent.test(`${contract.handler} ${control.getText()}`);
    });
    return entryControls.length > 0 && entryControls.every(isDisabledByFlag)
      ? 'WRITE_NOT_IMPLEMENTED'
      : null;
  }
  return controls.some(isDisabledByFlag) ? 'WRITE_NOT_IMPLEMENTED' : null;
}

function collectSignals(ownerNode, formNode, sourceText, file, kind) {
  const ownerText = ownerNode.getText();
  const calls = ownerNode.getDescendantsOfKind(SyntaxKind.CallExpression);
  const importedWriteNames = new Set();
  for (const declaration of ownerNode.getSourceFile().getImportDeclarations()) {
    if (!/(?:service|actions?|api)/i.test(declaration.getModuleSpecifierValue())) continue;
    const defaultImport = declaration.getDefaultImport()?.getText();
    if (defaultImport) importedWriteNames.add(defaultImport);
    for (const namedImport of declaration.getNamedImports()) importedWriteNames.add(namedImport.getAliasNode()?.getText() ?? namedImport.getName());
  }
  const mutationCalls = calls.filter((call) => /^(?:mutate|mutateAsync)$/.test(callName(call)));
  const handleSubmitCalls = calls.filter((call) => callName(call) === 'handleSubmit');
  const namedWrites = calls.filter((call) => {
    const name = callName(call);
    if (!WRITE_NAME.test(name) || /^submitHandler$/i.test(name)) return false;
    const expression = call.getExpression();
    if (Node.isIdentifier(expression)) return importedWriteNames.has(expression.getText());
    if (!Node.isPropertyAccessExpression(expression)) return false;
    return /(?:service|api|actions?|client)/i.test(expression.getExpression().getText());
  });
  const transportWrites = calls.filter((call) => {
    const expressionNode = call.getExpression();
    const expression = expressionNode.getText();
    if (Node.isPropertyAccessExpression(expressionNode)
      && /^(?:post|put|patch|delete)$/.test(expressionNode.getName())) {
      // Set.delete, Map.delete, URLSearchParams.delete 같은 로컬 상태 조작을
      // 네트워크 mutation으로 세지 않는다. 명시적인 transport/service receiver만 인정한다.
      const receiver = expressionNode.getExpression().getText();
      return /(?:api|client|service|axios|http)/i.test(receiver);
    }
    return expression === 'fetch' && /method\s*:\s*["'](?:POST|PUT|PATCH|DELETE)["']/i.test(call.getText());
  });
  const writes = [...mutationCalls, ...handleSubmitCalls, ...namedWrites, ...transportWrites];
  const destructiveWrites = writes.filter((call) => DESTRUCTIVE_NAME.test(callName(call))
    || DESTRUCTIVE_NAME.test(call.getExpression().getText().split('.')[0] ?? ''));
  const formText = formNode?.getText() ?? '';
  const handler = resolvedHandlerContract(formNode, ownerNode);
  const submitText = `${handler.text} ${formNode ? jsxAttribute(formNode, 'method') : ''}`;
  const primitiveSignal = (
    /\/components\/(?:ui|patterns)\//.test(file)
    || /\/src\/app\/admin\/patterns\//.test(file)
  ) && kind !== 'formless-write';
  const authSignal = /\/src\/app\/(?:login|auth|otp)\//i.test(file);
  const searchSignal = /(?:role\s*=\s*["']search|method\s*=\s*["']get|action\s*=\s*["'][^"']*search|handleSearch|onSearch|searchGroups|handleFilter)/i
    .test(`${formText} ${submitText}`);
  const useAppFormCall = calls.find((call) => callName(call) === 'useAppForm');
  const usesAppForm = Boolean(useAppFormCall);
  const usesManualFormValidation = /\buseManualFormValidation\s*\(/.test(ownerText);
  const appFormSchemaArgument = useAppFormCall?.getArguments()[0];
  const appFormMatch = ownerText.match(/\buseManualFormValidation\s*\(\s*([A-Za-z_$][\w$]*)/);
  const usesReactHookForm = /\buseForm\s*(?:<[^>]+>)?\s*\(/.test(ownerText) || /\.handleSubmit\s*\(/.test(submitText);
  const applyServerErrors = /(?:\.applyServerErrors|extractFieldErrors)\s*\(/.test(ownerText);
  const pendingGuard = /(?:isSubmitting|isPending|\.isPending|pending\s*=|(?:pending|submitting|saving|sending|registering|deleting)\w*Ref)/i.test(ownerText)
    && /\bdisabled\s*=/.test(ownerText);
  const explicitWrite = /\.mutate(?:Async)?\s*\(|\.handleSubmit\s*\(|\b(?:onFormSubmit|onSubmit|handleSubmit|handleSend|handleSave|handleCreate|handleRegister|handleUpdate)\b/.test(handler.text);
  const strongWrite = formNode
    ? (handler.explicit ? explicitWrite && !searchSignal : writes.length > 0)
    : writes.length > 0;
  const relevantDestructive = handler.explicit
    ? /\b(?:delete|remove|leave|revoke|destroy)\w*\b/i.test(handler.text)
    : destructiveWrites.length > 0;
  return {
    authSignal,
    destructiveOnly: strongWrite && relevantDestructive && (handler.explicit || destructiveWrites.length === writes.length),
    primitiveSignal,
    searchSignal,
    strongWrite,
    writeEvidence: uniqueSorted(writes.slice(0, 8).map((call) => `${file}:${call.getStartLineNumber()}:${call.getExpression().getText()}`)),
    implementation: {
      applyServerErrors,
      compileTimeDisabledWrite: compileTimeDisabledWrite(
        ownerNode,
        null,
        kind === 'formless-write',
      ),
      hasFormErrorSummary: /\bFormErrorSummary\b/.test(sourceText),
      noValidate: !formNode || /\bnoValidate\b/.test(formText),
      pendingGuard,
      schemaIdentifier: appFormSchemaArgument && Node.isIdentifier(appFormSchemaArgument)
        ? appFormSchemaArgument.getText()
        : appFormMatch?.[1] ?? null,
      sourceAppliesServerErrors: /(?:\.applyServerErrors|extractFieldErrors|\.setFormErrors)\s*\(/.test(sourceText),
      sourceHasDisabledControl: /\bdisabled\s*=/.test(sourceText),
      sourceHasSynchronousRef: /(?:pending|submitting|saving|sending|registering|deleting|request)\w*Ref/i.test(sourceText),
      sourceUsesAppForm: ownerNode.getSourceFile().getDescendantsOfKind(SyntaxKind.CallExpression)
        .some((call) => callName(call) === 'useAppForm'),
      sourceUsesManualFormValidation: /\buseManualFormValidation\s*\(/.test(sourceText),
      usesAppForm,
      usesManualFormValidation,
      usesReactHookForm,
      generatedSchemaImport: /from\s+["'][^"']*generated-zod["']/.test(sourceText),
    },
  };
}

function suggestedClassification(signals) {
  if (signals.authSignal) return 'auth';
  if (signals.primitiveSignal) return 'primitive';
  if (signals.searchSignal && !signals.strongWrite) return 'search-filter';
  if (signals.destructiveOnly) return 'destructive';
  return 'mutation';
}

function candidateKey(kind, file, owner, ordinal, handler = null) {
  const suffix = kind === 'formless-write'
    ? owner
    : kind === 'secondary-action'
      ? `${owner}.${handler ?? 'inline-action'}[${ordinal}]`
      : `${owner}[${ordinal}]`;
  return `${kind}:${file}#${suffix}`;
}

function loadProject(files) {
  const project = new Project({
    compilerOptions: { allowJs: true, jsx: 4 },
    skipAddingFilesFromTsConfig: true,
  });
  for (const file of files) project.addSourceFileAtPath(file);
  return project;
}

export function discoverFormValidationBoundaries({
  repoRoot = DEFAULT_REPO_ROOT,
  sourceRoot = resolve(repoRoot, 'frontend', 'src'),
  project,
} = {}) {
  const absoluteRepoRoot = resolve(repoRoot);
  const absoluteSourceRoot = resolve(sourceRoot);
  if (!isInside(absoluteRepoRoot, absoluteSourceRoot)) throw new Error('sourceRoot must be inside repoRoot');
  const files = walkProductionSources(absoluteSourceRoot);
  const ast = project ?? loadProject(files);
  const candidates = [];
  const formContextViolations = [];
  const inlineAlertViolations = [];

  for (const sourceFile of ast.getSourceFiles().sort((a, b) => a.getFilePath().localeCompare(b.getFilePath(), 'en'))) {
    const absoluteFile = resolve(sourceFile.getFilePath());
    if (!files.includes(absoluteFile)) continue;
    const file = posix(relative(absoluteRepoRoot, absoluteFile));
    const sourceText = sourceFile.getFullText();
    const jsxElements = [
      ...sourceFile.getDescendantsOfKind(SyntaxKind.JsxOpeningElement),
      ...sourceFile.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement),
    ].sort((left, right) => left.getStart() - right.getStart());

    for (const element of jsxElements) {
      const usesMessageProps = element.getAttributes().some((attribute) => Node.isJsxSpreadAttribute(attribute)
        && /\.messageProps\s*\(/.test(attribute.getExpression().getText()));
      const role = element.getAttribute('role');
      const explicitAlertRole = role && Node.isJsxAttribute(role)
        && /^(?:["']alert["']|\{\s*["']alert["']\s*\})$/.test(role.getInitializer()?.getText() ?? '');
      if (usesMessageProps && explicitAlertRole) {
        inlineAlertViolations.push({
          file,
          line: element.getStartLineNumber(),
          tag: jsxTag(element),
        });
      }
    }

    // FormLabel은 FormField + FormItem 문맥을 모두 요구한다. FormControl과
    // FormMessage는 문맥 안에서 호출되는 보조 컴포넌트로 추출될 수 있어
    // 단순 AST 조상만으로 판정하지 않는다. 레이블의 직접 문맥 누락만
    // census에서 신규 회귀로 fail-closed 처리한다.
    if (/from\s+["']@\/components\/ui\/form["']/.test(sourceText)) {
      for (const element of jsxElements) {
        const tag = jsxTag(element);
        if (tag !== 'FormLabel') continue;
        let current = element.getParent();
        let hasField = false;
        let hasItem = false;
        while (current) {
          if (Node.isJsxElement(current)) {
            const ancestorTag = current.getOpeningElement().getTagNameNode().getText();
            if (ancestorTag === 'FormItem') hasItem = true;
            if (ancestorTag === 'FormField' || ancestorTag.endsWith('FormField')) hasField = true;
          } else if (Node.isJsxSelfClosingElement(current)) {
            const ancestorTag = current.getTagNameNode().getText();
            if (ancestorTag === 'FormField' || ancestorTag.endsWith('FormField')) hasField = true;
          }
          current = current.getParent();
        }
        if (!hasField || !hasItem) {
          formContextViolations.push({
            file,
            line: element.getStartLineNumber(),
            tag,
            hasField,
            hasItem,
          });
        }
      }
    }
    const formOwners = new Set();
    const formRootOwners = new Set();
    const primaryFormHandlersByRoot = new Map();
    const editableOwners = new Map();
    const editableRootOwners = new Set();
    const ordinalByOwner = new Map();

    const actionOrdinalByOwner = new Map();
    const forwardedActionSignatures = new Set();
    for (const element of jsxElements) {
      const tag = jsxTag(element);
      const kind = tag === 'form' ? 'native-form' : tag.endsWith('.form') ? 'member-form' : null;
      if (!kind) continue;
      const owner = callableOwner(element);
      const rootOwner = outermostCallableOwner(element);
      formOwners.add(owner.node);
      formRootOwners.add(rootOwner.node);
      const primaryContract = callbackAttributeContract(element, 'onSubmit');
      if (primaryContract) {
        const handlers = primaryFormHandlersByRoot.get(rootOwner.node) ?? new Set();
        handlers.add(primaryContract.handler);
        primaryFormHandlersByRoot.set(rootOwner.node, handlers);
      }
      const ordinalKey = `${kind}:${owner.name}`;
      const ordinal = (ordinalByOwner.get(ordinalKey) ?? 0) + 1;
      ordinalByOwner.set(ordinalKey, ordinal);
      const signals = collectSignals(owner.node, element, sourceText, file, kind);
      candidates.push({
        key: candidateKey(kind, file, owner.name, ordinal),
        kind,
        file,
        owner: owner.name,
        ordinal,
        line: element.getStartLineNumber(),
        tag,
        suggestedClassification: suggestedClassification(signals),
        signals,
      });
    }

    for (const element of jsxElements) {
      const tag = jsxTag(element);
      const editable = EDITABLE_TAG.test(tag)
        || EDITABLE_COMPONENT.test(tag)
        || element.getAttributes().some((attribute) => Node.isJsxAttribute(attribute) && attribute.getNameNode().getText() === 'contentEditable');
      if (!editable) continue;
      const owner = callableOwner(element);
      editableOwners.set(owner.node, owner);
      editableRootOwners.add(outermostCallableOwner(element).node);
    }

    for (const element of jsxElements) {
      const owner = outermostCallableOwner(element);
      for (const bulkAction of bulkActionContracts(element)) {
        const writes = actionWriteCalls(bulkAction.contract, sourceFile);
        if (writes.length === 0) continue;
        const ordinalKey = `${owner.name}:${bulkAction.contract.handler}`;
        const ordinal = (actionOrdinalByOwner.get(ordinalKey) ?? 0) + 1;
        actionOrdinalByOwner.set(ordinalKey, ordinal);
        const writeSinks = uniqueSorted(writes.map((call) => call.getExpression().getText()));
        const destructive = /(?:delete|remove|leave|revoke|destroy|말소)/i.test(
          `${bulkAction.triggerLabel} ${writeSinks.join(' ')}`,
        );
        const pendingControl = linkedPendingControl(bulkAction.disabled, bulkAction.ariaBusy, bulkAction.contract);
        candidates.push({
          key: candidateKey('secondary-action', file, owner.name, ordinal, bulkAction.contract.handler),
          kind: 'secondary-action',
          file,
          owner: owner.name,
          handler: bulkAction.contract.handler,
          triggerLabel: bulkAction.triggerLabel,
          writeSinks,
          writePayloads: actionWritePayloads(writes),
          ordinal,
          line: bulkAction.line,
          tag: 'StandardDataTable.bulkActions',
          suggestedClassification: destructive ? 'destructive' : 'mutation',
          signals: {
            authSignal: false,
            destructiveOnly: destructive,
            primitiveSignal: false,
            searchSignal: false,
            strongWrite: true,
            writeEvidence: uniqueSorted(writes.map((call) => `${file}:${call.getStartLineNumber()}:${call.getExpression().getText()}`)),
            evidenceTokens: uniqueSorted([...actionEvidenceTokens(writes, bulkAction.contract.handler), bulkAction.triggerLabel]),
            controlEvidenceTokens: [bulkAction.triggerLabel],
            implementation: {
              actionControlHasAriaBusy: pendingControl.ariaBusy,
              actionControlHasDisabled: pendingControl.disabled,
              actionControlPendingIdentities: pendingControl.busyIdentities,
              actionHandlerBlockingRefs: blockingRefNames(bulkAction.contract),
              actionHandlerHasFailureFeedback: hasFailureFeedback(bulkAction.contract),
              actionHandlerHasSynchronousRef: hasSynchronousRefLock(bulkAction.contract),
              actionHandlerLockRefs: synchronousRefLockNames(bulkAction.contract),
            },
          },
        });
      }
    }

    for (const element of jsxElements) {
      const owner = outermostCallableOwner(element);
      const belongsToFormOwner = formRootOwners.has(owner.node);
      const belongsToFormlessEditableOwner = !belongsToFormOwner && editableRootOwners.has(owner.node);
      const contract = resolvedControlContract(element);
      if (!contract) continue;
      if (belongsToFormOwner && primaryFormHandlersByRoot.get(owner.node)?.has(contract.handler)) continue;
      const writes = actionWriteCalls(contract, sourceFile);
      if (writes.length === 0) continue;
      const actionValidation = actionValidationMetadata(contract);
      const destructive = /(?:delete|remove|leave|revoke|destroy)/i.test(
        `${contract.handler} ${writes.map((call) => call.getExpression().getText()).join(' ')}`,
      );
      // A form-less editable owner's schema-backed primary submit is represented by
      // its aggregate validated boundary. Other concrete write controls are independent
      // and must not borrow that submit's lock, feedback, or behavioral evidence.
      if (belongsToFormlessEditableOwner && actionValidation.schemas.length > 0) continue;
      const writeSinks = uniqueSorted(writes.map((call) => call.getExpression().getText()));
      const forwardedControl = contract.forwarded
        ? forwardedChildControlContract(element, contract, absoluteRepoRoot, ast)
        : null;
      if (contract.forwarded && !forwardedControl) continue;
      if (contract.forwarded) {
        const signature = `${owner.name}:${contract.handler}:${JSON.stringify(writeSinks)}`;
        if (forwardedActionSignatures.has(signature)) continue;
        forwardedActionSignatures.add(signature);
      }
      const ordinalKey = `${owner.name}:${contract.handler}`;
      const ordinal = (actionOrdinalByOwner.get(ordinalKey) ?? 0) + 1;
      actionOrdinalByOwner.set(ordinalKey, ordinal);
      const customSavePending = contract.triggerAttribute === 'onSave' ? element.getAttribute('isSaving') : null;
      const disabled = customSavePending ?? element.getAttribute('disabled');
      const ariaBusy = customSavePending ?? element.getAttribute('aria-busy');
      const pendingControl = forwardedControl ?? linkedPendingControl(disabled, ariaBusy, contract);
      const actionControlTokens = forwardedControl?.controlEvidenceTokens ?? controlEvidenceTokens(element);
      candidates.push({
        key: candidateKey('secondary-action', file, owner.name, ordinal, contract.handler),
        kind: 'secondary-action',
        file,
        owner: owner.name,
        handler: contract.handler,
        writeSinks,
        writePayloads: actionWritePayloads(writes),
        validatedFields: actionValidation.fields,
        validationSchemas: actionValidation.schemas,
        ordinal,
        line: element.getStartLineNumber(),
        tag: jsxTag(element),
        suggestedClassification: destructive ? 'destructive' : 'mutation',
        signals: {
          authSignal: false,
          destructiveOnly: destructive,
          primitiveSignal: false,
          searchSignal: false,
          strongWrite: true,
          writeEvidence: uniqueSorted(writes.map((call) => `${file}:${call.getStartLineNumber()}:${call.getExpression().getText()}`)),
          evidenceTokens: uniqueSorted([
            ...actionEvidenceTokens(writes, contract.handler),
            ...actionControlTokens,
          ]),
          controlEvidenceTokens: actionControlTokens,
          implementation: {
            actionControlHasAriaBusy: pendingControl.ariaBusy,
            actionControlHasDisabled: pendingControl.disabled,
            actionControlPendingIdentities: pendingControl.busyIdentities,
            actionHandlerBlockingRefs: blockingRefNames(contract),
            actionHandlerHasFailureFeedback: hasFailureFeedback(contract),
            actionHandlerHasSynchronousRef: hasSynchronousRefLock(contract),
            actionHandlerLockRefs: synchronousRefLockNames(contract),
            compileTimeDisabledWrite: compileTimeDisabledWrite(owner.node, element),
            actionValidation,
          },
        },
      });
    }

    const aggregateOwners = new Map(editableOwners);
    const rootOwners = new Map();
    const childContractsByOwner = new Map();
    for (const element of jsxElements) {
      const owner = outermostCallableOwner(element);
      rootOwners.set(owner.node, owner);
    }
    for (const owner of rootOwners.values()) {
      const childContracts = discoverComposedChildContracts(owner.node, jsxElements, absoluteRepoRoot, ast);
      childContractsByOwner.set(owner.node, childContracts);
      if (childContracts.length > 0) {
        aggregateOwners.set(owner.node, owner);
      }
    }

    for (const owner of aggregateOwners.values()) {
      if (formOwners.has(owner.node) || formRootOwners.has(owner.node)) continue;
      const signals = collectSignals(owner.node, null, sourceText, file, 'formless-write');
      if (!signals.strongWrite) continue;
      const childSubmits = childContractsByOwner.get(owner.node)
        ?? discoverComposedChildContracts(owner.node, jsxElements, absoluteRepoRoot, ast);
      const parentActions = candidates.filter((candidate) => candidate.kind === 'secondary-action'
        && candidate.file === file
        && candidate.owner === owner.name
        && !childSubmits.some((child) => candidate.tag === child.component
          && candidate.handler === child.handler
          && JSON.stringify(candidate.writeSinks) === JSON.stringify(child.writeSinks)));
      signals.implementation.composedParentActionSinks = Object.fromEntries(
        uniqueSorted(parentActions.map(({ handler }) => handler)).map((handler) => [
          handler,
          uniqueSorted(parentActions.filter((action) => action.handler === handler)
            .flatMap((action) => action.writeSinks)),
        ]),
      );
      const composedChildContracts = childSubmits.map((child) => {
        const childRefNames = new Set([...child.actionBlockingRefs, ...child.actionLockRefs]);
        const lockRelatedActions = parentActions.filter((action) => [
          ...(action.signals.implementation.actionHandlerLockRefs ?? []),
          ...(action.signals.implementation.actionHandlerBlockingRefs ?? []),
        ].some((refName) => childRefNames.has(refName)));
        const scopedParentActions = lockRelatedActions.length > 0 ? lockRelatedActions : parentActions;
        const mutuallyLockedActionHandlers = scopedParentActions.filter((action) => {
          const actionLockRefs = action.signals.implementation.actionHandlerLockRefs ?? [];
          const actionBlockingRefs = action.signals.implementation.actionHandlerBlockingRefs ?? [];
          return actionLockRefs.some((refName) => child.actionBlockingRefs.includes(refName))
            && child.actionLockRefs.some((refName) => actionBlockingRefs.includes(refName));
        }).map(({ handler }) => handler);
        return {
          actionHandlers: uniqueSorted(scopedParentActions.map(({ handler }) => handler)),
          component: child.component,
          handler: child.handler,
          hasExternalBusy: child.hasExternalBusy,
          hasOwnPendingControl: child.hasPendingControl,
          hasOwnSynchronousRef: child.hasOwnSynchronousRef ?? child.actionLockRefs.length > 0,
          mutuallyLockedActionHandlers: uniqueSorted(mutuallyLockedActionHandlers),
          writeSinks: child.writeSinks,
        };
      });
      signals.implementation.composedChildContracts = composedChildContracts;
      candidates.push({
        key: candidateKey('formless-write', file, owner.name, 1),
        kind: 'formless-write',
        file,
        owner: owner.name,
        composedChildContracts: composedChildContracts.map((contract) => ({
          actionHandlers: contract.actionHandlers,
          component: contract.component,
          handler: contract.handler,
          writeSinks: contract.writeSinks,
        })),
        ordinal: 1,
        line: owner.node.getStartLineNumber(),
        tag: null,
        suggestedClassification: suggestedClassification(signals),
        signals,
      });
    }
  }

  const secondaryCandidates = candidates.filter(({ kind }) => kind === 'secondary-action');
  for (const candidate of secondaryCandidates) {
    const competingActions = secondaryCandidates.filter((other) => other !== candidate
      && other.file === candidate.file
      && other.owner === candidate.owner
      && other.handler !== candidate.handler);
    if (competingActions.length === 0) continue;
    const identities = candidate.signals.implementation.actionControlPendingIdentities ?? [];
    const hasActionSpecificIdentity = identities.some((identity) => competingActions.every((other) => (
      !(other.signals.implementation.actionControlPendingIdentities ?? []).includes(identity)
    )));
    if (hasActionSpecificIdentity) continue;
    candidate.signals.implementation.actionControlHasAriaBusy = false;
    candidate.signals.implementation.actionControlHasDisabled = false;
  }

  candidates.sort((left, right) => left.key.localeCompare(right.key, 'en'));
  const native = candidates.filter(({ kind }) => kind === 'native-form');
  const member = candidates.filter(({ kind }) => kind === 'member-form');
  const formless = candidates.filter(({ kind }) => kind === 'formless-write');
  const secondary = candidates.filter(({ kind }) => kind === 'secondary-action');
  return {
    candidates,
    formContextViolations,
    inlineAlertViolations,
    summary: {
      sourceFiles: files.length,
      nativeFormOccurrences: native.length,
      nativeFormFiles: new Set(native.map(({ file }) => file)).size,
      memberFormOccurrences: member.length,
      memberFormFiles: new Set(member.map(({ file }) => file)).size,
      formlessWriteBoundaries: formless.length,
      secondaryActionBoundaries: secondary.length,
      candidateCount: candidates.length,
    },
  };
}

function safeEvidencePath(repoRoot, source) {
  if (typeof source !== 'string' || source.trim() === '' || source.includes('\\') || source.startsWith('/') || source.split('/').includes('..')) return false;
  const target = resolve(repoRoot, source);
  return isInside(repoRoot, target) && existsSync(target) && statSync(target).isFile();
}

function evidenceMentionsCandidate(repoRoot, source, candidate) {
  if (!safeEvidencePath(repoRoot, source)) return false;
  const text = readFileSync(resolve(repoRoot, source), 'utf8');
  const sourceName = basename(candidate.file, extname(candidate.file));
  const tokens = [sourceName, candidate.owner]
    .filter((token) => typeof token === 'string' && token !== '<anonymous>' && token.length > 2);
  return tokens.some((token) => text.includes(token));
}

function evidenceMentionsAction(repoRoot, source, candidate) {
  if (!safeEvidencePath(repoRoot, source)) return false;
  const text = readFileSync(resolve(repoRoot, source), 'utf8');
  const tokens = candidate.signals?.evidenceTokens ?? [];
  return tokens.some((token) => text.includes(token));
}

function evidenceTestBlocks(repoRoot, source) {
  const target = resolve(repoRoot, source);
  const stats = statSync(target);
  const cached = EVIDENCE_TEST_BLOCK_CACHE.get(target);
  if (cached?.mtimeMs === stats.mtimeMs && cached?.size === stats.size) return cached.blocks;
  const text = readFileSync(target, 'utf8');
  const project = new Project({
    compilerOptions: { allowJs: true, jsx: 4 },
    skipAddingFilesFromTsConfig: true,
    useInMemoryFileSystem: true,
  });
  const sourceFile = project.createSourceFile(source, text);
  const blocks = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)
    .filter((call) => {
      const expression = call.getExpression();
      if (Node.isIdentifier(expression)) return /^(?:it|test)$/.test(expression.getText());
      if (!Node.isCallExpression(expression)) return false;
      const factory = expression.getExpression();
      return Node.isPropertyAccessExpression(factory)
        && /^(?:it|test)$/.test(factory.getExpression().getText())
        && /^(?:each|concurrent)$/.test(factory.getName());
    })
    .map((call) => call.getText());
  EVIDENCE_TEST_BLOCK_CACHE.set(target, { mtimeMs: stats.mtimeMs, size: stats.size, blocks });
  return blocks;
}

function evidenceControlMatches(text, candidate) {
  const clicked = new Set();
  for (const match of text.matchAll(/\b(?:fireEvent|userEvent|user)\.click\s*\(\s*([A-Za-z_$][\w$]*)/g)) clicked.add(match[1]);
  for (const match of text.matchAll(/\b([A-Za-z_$][\w$]*)\.click\s*\(\s*\)/g)) {
    if (!/^(?:fireEvent|userEvent|user)$/.test(match[1])) clicked.add(match[1]);
  }
  const disabled = new Set([...text.matchAll(
    /expect\s*\(\s*([A-Za-z_$][\w$]*)\s*\)\s*\.\s*toBeDisabled\s*\(/g,
  )].map((match) => match[1]));
  const busy = new Set([...text.matchAll(
    /expect\s*\(\s*([A-Za-z_$][\w$]*)\s*\)\s*\.\s*toHaveAttribute\s*\(\s*['"]aria-busy['"]/g,
  )].map((match) => match[1]));
  const addQueryLabels = (target, pattern) => {
    for (const match of text.matchAll(pattern)) target.add('@label:' + match[1]);
  };
  addQueryLabels(clicked,
    /\b(?:fireEvent|userEvent|user)\.click\s*\([\s\S]{0,240}?\bname\s*:\s*['"]([^'"]{3,100})['"][\s\S]{0,80}?\)\s*\)/g);
  addQueryLabels(disabled,
    /expect\s*\([\s\S]{0,240}?\bname\s*:\s*['"]([^'"]{3,100})['"][\s\S]{0,80}?\)\s*\)\s*\.\s*toBeDisabled\s*\(/g);
  addQueryLabels(busy,
    /expect\s*\([\s\S]{0,240}?\bname\s*:\s*['"]([^'"]{3,100})['"][\s\S]{0,80}?\)\s*\)\s*\.\s*toHaveAttribute\s*\(\s*['"]aria-busy['"]/g);
  if (clicked.size === 0 || disabled.size === 0 || busy.size === 0) return false;

  const initializers = new Map();
  for (const match of text.matchAll(/\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*([^;]+);/g)) {
    initializers.set(match[1], match[2]);
  }
  const ignored = new Set(['button', 'true', 'false', 'dialog', 'alert']);
  const normalizeLabel = (value) => value
    .toLowerCase()
    .replace(/\s*(?:처리\s*)?중[.…!]*$/u, '')
    .replace(/\s+/g, ' ')
    .trim();
  const candidateLabels = (candidate.signals?.controlEvidenceTokens ?? []).map(normalizeLabel);
  const canonicalTokens = (subject) => {
    const source = subject.startsWith('@label:') ? subject.slice(7) : (initializers.get(subject) ?? subject);
    const values = [
      ...(subject.startsWith('@label:') ? [source] : []),
      ...[...source.matchAll(/['"]([^'"]{3,100})['"]/g)].map((match) => match[1]),
      ...(candidate.signals?.controlEvidenceTokens ?? []).filter((token) => source.includes(token)),
    ];
    return uniqueSorted(values.map(normalizeLabel)
      .filter((value) => (value.length >= 3 || candidateLabels.includes(value)) && !ignored.has(value)));
  };
  const sameControl = (left, right) => {
    if (left === right) return true;
    const leftTokens = canonicalTokens(left);
    const rightTokens = canonicalTokens(right);
    const directMatch = leftTokens.some((leftToken) => rightTokens.some((rightToken) => (
      leftToken === rightToken
      || (Math.min(leftToken.length, rightToken.length) >= 4
        && (leftToken.includes(rightToken) || rightToken.includes(leftToken)))
    )));
    if (directMatch) return true;
    const isCandidateLabel = (value) => candidateLabels.some((candidateLabel) => (
      value === candidateLabel
      || (Math.min(value.length, candidateLabel.length) >= 2
        && /[\u3131-\uD79D]/u.test(value)
        && (value.includes(candidateLabel) || candidateLabel.includes(value)))
    ));
    if (leftTokens.some(isCandidateLabel) && rightTokens.some(isCandidateLabel)
      && leftTokens.some((leftToken) => rightTokens.some((rightToken) => (
        Math.min(leftToken.length, rightToken.length) >= 2
        && /[\u3131-\uD79D]/u.test(leftToken + rightToken)
        && (leftToken.includes(rightToken) || rightToken.includes(leftToken))
      )))) return true;
    const queryName = (subject) => {
      const source = initializers.get(subject);
      return source?.match(/\bname\s*:\s*([A-Za-z_$][\w$]*)/)?.[1] ?? null;
    };
    const leftProperty = queryName(left);
    const rightProperty = queryName(right);
    if (!leftProperty || !rightProperty || leftProperty === rightProperty) return false;
    const valuesFor = (property) => {
      const escaped = property.replace(/[.*+?^$(){}|[\]\\]/g, '\\$&');
      return [...text.matchAll(new RegExp("\\b" + escaped + "\\s*:\\s*['\\\"]([^'\\\"]{3,100})['\\\"]", 'g'))]
        .map((match) => normalizeLabel(match[1]));
    };
    const leftValues = valuesFor(leftProperty);
    const rightValues = valuesFor(rightProperty);
    return leftValues.some((leftValue) => rightValues.some((rightValue) => (
      leftValue === rightValue
      || (Math.min(leftValue.length, rightValue.length) >= 4
        && (leftValue.includes(rightValue) || rightValue.includes(leftValue)))
    )));
  };
  return [...clicked].some((control) => [...disabled].some((pendingControl) => (
    sameControl(control, pendingControl)
    && [...busy].some((busyControl) => sameControl(control, busyControl))
  )));
}

function evidenceProvesActionBehavior(repoRoot, source, candidate) {
  if (!safeEvidencePath(repoRoot, source)) return false;
  const sourceText = readFileSync(resolve(repoRoot, source), 'utf8');
  const tokens = candidate.signals?.evidenceTokens ?? [];
  const assertionTokens = new Set((candidate.writeSinks ?? []).flatMap((sink) => {
    const parts = sink.split('.');
    return [sink, parts[0], parts.at(-1)];
  }).filter((token) => token && !/^(?:mutate|mutateAsync)$/.test(token)));
  for (const token of [...assertionTokens]) {
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    for (const match of sourceText.matchAll(new RegExp(`\\b${escaped}\\s*:\\s*([A-Za-z_$][\\w$]*(?:\\.[A-Za-z_$][\\w$]*)*)`, 'g'))) {
      assertionTokens.add(match[1]);
    }
    for (const match of sourceText.matchAll(new RegExp(
      `\\b${escaped}\\s*:\\s*[^,\\r\\n]{0,180}?\\b([A-Za-z_$][\\w$]*(?:\\.[A-Za-z_$][\\w$]*)+)\\s*\\(`,
      'g',
    ))) {
      assertionTokens.add(match[1]);
    }
  }
  for (const match of sourceText.matchAll(
    /\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*vi\.mocked\s*\(\s*([A-Za-z_$][\w$]*)\s*\)/g,
  )) {
    const [, alias, target] = match;
    for (const sink of candidate.writeSinks ?? []) {
      if (sink === target) assertionTokens.add(alias);
      if (sink.startsWith(`${target}.`)) assertionTokens.add(`${alias}.${sink.slice(target.length + 1)}`);
    }
  }
  for (const match of sourceText.matchAll(
    /\bimport\s+\*\s+as\s+([A-Za-z_$][\w$]*)\s+from\s+['"][^'"]+['"]/g,
  )) {
    const alias = match[1];
    for (const sink of candidate.writeSinks ?? []) assertionTokens.add(`${alias}.${sink.split('.').at(-1)}`);
  }
  for (let pass = 0; pass < 4; pass += 1) {
    const before = assertionTokens.size;
    for (const token of [...assertionTokens]) {
      const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      for (const match of sourceText.matchAll(new RegExp(
        `\\b([A-Za-z_$][\\w$]*)\\s*:\\s*${escaped}\\b`,
        'g',
      ))) {
        assertionTokens.add(match[1]);
      }
    }
    if (assertionTokens.size === before) break;
  }
  const relatedBlocks = evidenceTestBlocks(repoRoot, source)
    .filter((text) => tokens.some((token) => text.includes(token)));
  return relatedBlocks.some((text) => {
    const actionCallCount = [...assertionTokens].some((token) => {
      const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(
        `expect\\s*\\(\\s*${escaped}\\s*\\)\\s*\\.\\s*(?:toHaveBeenCalledTimes\\s*\\(\\s*1\\s*\\)|toHaveBeenCalledOnce\\s*\\()`,
      ).test(text);
    });
    const exactControlState = evidenceControlMatches(text, candidate);
    const failureInjection = hasExactSinkFailure(text, assertionTokens);
    const visibleFeedback = /findByText|getByText|getByRole\s*\(\s*['"]alert|toHaveBeenCalledWith/.test(text);
    return actionCallCount && exactControlState && failureInjection && visibleFeedback;
  });
}

function evidenceSinkTokens(sourceText, writeSinks) {
  const tokens = new Set((writeSinks ?? []).flatMap((sink) => {
    const parts = sink.split('.');
    return [sink, parts[0], parts.at(-1)];
  }).filter((token) => token && !/^(?:mutate|mutateAsync)$/.test(token)));
  for (const token of [...tokens]) {
    const escaped = token.replace(/[.*+?^$(){}|[\]\\]/g, '\\$&');
    for (const match of sourceText.matchAll(new RegExp('\\b' + escaped + '\\s*:\\s*([A-Za-z_$][\\w$]*(?:\\.[A-Za-z_$][\\w$]*)*)', 'g'))) {
      tokens.add(match[1]);
    }
    for (const match of sourceText.matchAll(new RegExp(
      '\\b' + escaped + '\\s*:\\s*[^,\\r\\n]{0,180}?\\b([A-Za-z_$][\\w$]*(?:\\.[A-Za-z_$][\\w$]*)+)\\s*\\(',
      'g',
    ))) {
      tokens.add(match[1]);
    }
  }
  for (const match of sourceText.matchAll(
    /\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*vi\.mocked\s*\(\s*([A-Za-z_$][\w$]*)\s*\)/g,
  )) {
    const [, alias, target] = match;
    for (const sink of writeSinks ?? []) {
      if (sink === target) tokens.add(alias);
      if (sink.startsWith(target + '.')) tokens.add(alias + '.' + sink.slice(target.length + 1));
    }
  }
  for (const match of sourceText.matchAll(
    /\bimport\s+\*\s+as\s+([A-Za-z_$][\w$]*)\s+from\s+['"][^'"]+['"]/g,
  )) {
    const alias = match[1];
    for (const sink of writeSinks ?? []) tokens.add(alias + '.' + sink.split('.').at(-1));
  }
  for (let pass = 0; pass < 4; pass += 1) {
    const before = tokens.size;
    for (const token of [...tokens]) {
      const escaped = token.replace(/[.*+?^$(){}|[\]\\]/g, '\\$&');
      for (const match of sourceText.matchAll(new RegExp(
        '\\b([A-Za-z_$][\\w$]*)\\s*:\\s*' + escaped + '\\b',
        'g',
      ))) {
        tokens.add(match[1]);
      }
    }
    if (tokens.size === before) break;
  }
  return tokens;
}

function hasExactSinkCallCount(text, tokens) {
  return [...tokens].some((token) => {
    const escaped = token.replace(/[.*+?^$(){}|[\]\\]/g, '\\$&');
    return new RegExp(
      'expect\\s*\\(\\s*' + escaped + '\\s*\\)\\s*\\.\\s*(?:toHaveBeenCalledTimes\\s*\\(\\s*1\\s*\\)|toHaveBeenCalledOnce\\s*\\()',
    ).test(text);
  });
}

function hasExactSinkNotCalled(text, tokens) {
  return [...tokens].some((token) => {
    const escaped = token.replace(/[.*+?^$(){}|[\]\\]/g, '\\$&');
    return new RegExp(
      'expect\\s*\\(\\s*' + escaped + '\\s*\\)\\s*\\.\\s*not\\s*\\.\\s*(?:toHaveBeenCalled\\s*\\(|toHaveBeenCalledTimes\\s*\\(\\s*0\\s*\\))',
    ).test(text);
  });
}

function hasExactSinkFailure(text, tokens) {
  return [...tokens].some((token) => {
    const escaped = token.replace(/[.*+?^$(){}|[\]\\]/g, '\\$&');
    const target = '(?:\\b' + escaped + '|vi\\.mocked\\s*\\(\\s*' + escaped + '\\s*\\))';
    return new RegExp(target + '\\s*\\.\\s*mockRejected(?:Value|ValueOnce)?\\s*\\(').test(text)
      || (new RegExp(target + '\\s*\\.\\s*mock(?:ReturnValue|Implementation)(?:Once)?\\s*\\(').test(text)
        && (/\b[A-Za-z_$][\w$]*\.reject\s*\(|\breject[A-Za-z_$]*\s*(?:\?\.)?\s*\(|Promise\.reject\s*\(|throw\s+new\s+Error\s*\(/.test(text)))
      || (new RegExp(target + '\\s*\\.\\s*mockResolvedValue(?:Once)?\\s*\\(').test(text)
        && /success\s*:\s*false/.test(text));
  });
}

function evidenceProvesComposedBehavior(repoRoot, source, candidate) {
  if (!safeEvidencePath(repoRoot, source)) return false;
  const sourceText = readFileSync(resolve(repoRoot, source), 'utf8');
  const blocks = evidenceTestBlocks(repoRoot, source);
  const childContracts = candidate.composedChildContracts ?? [];
  const actionSinks = Object.values(
    candidate.signals.implementation.composedParentActionSinks ?? {},
  ).flat();
  const parentTokens = evidenceSinkTokens(sourceText, actionSinks);
  return childContracts.length > 0 && childContracts.every((child) => {
    const childTokens = evidenceSinkTokens(sourceText, child.writeSinks);
    const hasParentActions = child.actionHandlers.length > 0;
    const forward = blocks.some((text) => hasExactSinkCallCount(text, childTokens)
      && hasExactSinkFailure(text, childTokens)
      && (!hasParentActions || hasExactSinkNotCalled(text, parentTokens))
      && /toBeDisabled\s*\(/.test(text)
      && /aria-busy/.test(text)
      && /toHaveBeenCalledWith/.test(text));
    const reverse = !hasParentActions || blocks.some((text) => hasExactSinkCallCount(text, parentTokens)
      && hasExactSinkNotCalled(text, childTokens)
      && /toBeDisabled\s*\(/.test(text));
    return forward && reverse;
  });
}

function allowedClassifications(candidate) {
  if (candidate.signals.authSignal) return new Set(['auth']);
  if (candidate.kind === 'formless-write') return new Set(['mutation', 'destructive']);
  if (candidate.signals.primitiveSignal) return new Set(['primitive']);
  if (candidate.signals.searchSignal && !candidate.signals.strongWrite) return new Set(['search-filter']);
  if (candidate.signals.strongWrite) return new Set(['mutation', 'destructive']);
  return new Set(['mutation']);
}

function validateComplianceMetadata(entry, candidate) {
  const errors = [];
  const add = (field, message) => errors.push({ field, message });
  const mode = entry.validationMode;

  if (FORM_VALIDATION_MODES.has(mode)) {
    if (candidate.kind !== 'formless-write' && !candidate.signals.implementation.noValidate) {
      add('validationMode', 'validated native/member forms require noValidate so custom summary/focus owns invalid submission');
    }
    if (!candidate.signals.implementation.hasFormErrorSummary) {
      add('errorNavigation', 'validated forms require a visible FormErrorSummary in the owning source');
    }
    if (mode === 'useAppForm-zod' && !candidate.signals.implementation.sourceUsesAppForm) {
      add('validationMode', 'useAppForm-zod metadata requires a real useAppForm consumer');
    }
    if (mode === 'useManualFormValidation-zod'
      && !candidate.signals.implementation.sourceUsesManualFormValidation) {
      add('validationMode', 'manual adapter metadata requires a real useManualFormValidation consumer');
    }
    if (entry.classification !== 'auth' && !candidate.signals.implementation.sourceAppliesServerErrors) {
      add('serverErrors', 'validated mutation forms must wire structured server errors in their owning source');
    }
    if (!candidate.signals.implementation.sourceHasDisabledControl) {
      add('pendingGuard', 'validated forms require a disabled control while submission is pending');
    }
    if ((mode === 'useManualFormValidation-zod' || mode === 'react-hook-form-zod')
      && !candidate.signals.implementation.sourceHasSynchronousRef) {
      add('pendingGuard', `${mode} requires a source-level ref lock before asynchronous submission`);
    }
    if (!/^(?:generated|generated-or-derived|local|backend-and-generated):/.test(entry.schemaSource ?? '')) {
      add('schemaSource', 'validated forms require a reviewed generated/local schema identifier');
    }
    if (entry.errorNavigation !== 'summary-inline-focus-first-invalid') {
      add('errorNavigation', 'validated forms require summary + inline error + first-invalid focus');
    }
    const authRootError = entry.classification === 'auth'
      && entry.serverErrors === 'form-level-auth-error-with-value-retention';
    if (!authRootError && entry.serverErrors !== 'field-errors-mapped-with-value-retention') {
      add('serverErrors', 'validated forms require field mapping, or an auth-specific form error, with value retention');
    }
    if (entry.pendingGuard !== 'synchronous-submit-lock-and-disabled') {
      add('pendingGuard', 'validated forms require a synchronous submit lock and disabled pending state');
    }
    const commonEvidence = mode === 'useAppForm-zod'
      ? 'frontend/src/hooks/__tests__/useAppForm.test.tsx'
      : mode === 'useManualFormValidation-zod'
        ? 'frontend/src/hooks/__tests__/useManualFormValidation.test.tsx'
        : null;
    if (commonEvidence && !entry.testEvidence?.includes(commonEvidence)) {
      add('testEvidence', `${mode} consumers must include the shared behavioral adapter contract`);
    }
  } else if (mode === COMPOSED_VALIDATION_MODE) {
    if (!/^composed:/.test(entry.schemaSource ?? '')) {
      add('schemaSource', 'composed boundaries must name their child schema ownership');
    }
    if (entry.errorNavigation !== 'composed-child-summary-inline-focus-first-invalid') {
      add('errorNavigation', 'composed boundaries must preserve child summary/focus navigation');
    }
    if (entry.serverErrors !== 'composed-child-field-errors-mapped-with-value-retention') {
      add('serverErrors', 'composed boundaries must return field errors to the owning child form');
    }
    if (entry.pendingGuard !== 'composed-child-submit-and-action-locks') {
      add('pendingGuard', 'composed boundaries require both child-submit and parent-action locks');
    }
    if (!Array.isArray(entry.composedChildContracts)
      || JSON.stringify(entry.composedChildContracts) !== JSON.stringify(candidate.composedChildContracts)) {
      add('composedChildContracts', 'composed child/action ledger must exact-match ' + JSON.stringify(candidate.composedChildContracts));
    }
    const childContracts = candidate.signals.implementation.composedChildContracts ?? [];
    if (childContracts.length === 0) {
      add('pendingGuard', 'composed boundaries require at least one exact child onSubmit contract');
    }
    for (const contract of childContracts) {
      if (!contract.hasOwnSynchronousRef || !contract.hasOwnPendingControl) {
        add('pendingGuard', contract.component + '.' + contract.handler + ' requires its own ref lock and linked pending control');
      }
      if (contract.actionHandlers.length > 0 && !contract.hasExternalBusy) {
        add('pendingGuard', contract.component + '.' + contract.handler + ' requires an external parent-action busy contract');
      }
      if (contract.actionHandlers.length > 0
        && JSON.stringify(contract.mutuallyLockedActionHandlers) !== JSON.stringify(contract.actionHandlers)) {
        add('pendingGuard', contract.component + '.' + contract.handler + ' must mutually lock every exact parent write action');
      }
    }
  } else if (mode === VALIDATED_SECONDARY_ACTION_MODE) {
    const expectedSchemaSource = `local:${(candidate.validationSchemas ?? []).join('+')}`;
    if (candidate.kind !== 'secondary-action' || (candidate.validationSchemas?.length ?? 0) === 0) {
      add('validationMode', 'validated secondary mode requires a concrete action-level validation adapter');
    }
    if (entry.schemaSource !== expectedSchemaSource) {
      add('schemaSource', `validated secondary action schema must exact-match ${expectedSchemaSource}`);
    }
    if (!Array.isArray(entry.validatedFields)
      || JSON.stringify(entry.validatedFields) !== JSON.stringify(candidate.validatedFields)) {
      add('validatedFields', `validated fields must exact-match ${JSON.stringify(candidate.validatedFields)}`);
    }
    if (entry.errorNavigation !== 'summary-inline-focus-first-invalid') {
      add('errorNavigation', 'validated secondary actions require summary + inline error + first-invalid focus');
    }
    if (entry.serverErrors !== 'field-errors-mapped-with-value-retention') {
      add('serverErrors', 'validated secondary actions require field mapping with editable value retention');
    }
    if (entry.pendingGuard !== 'action-pending-lock-and-disabled') {
      add('pendingGuard', 'validated secondary actions require a synchronous action lock and disabled pending state');
    }
    const actionValidation = candidate.signals.implementation.actionValidation;
    if (!actionValidation?.hasSummary || !actionValidation?.hasInline) {
      add('errorNavigation', 'the action validation adapter must own both summary and inline error UI');
    }
    if (!actionValidation?.mapsServerErrors) {
      add('serverErrors', 'the action validation adapter must map structured server field errors');
    }
    if (!candidate.signals.implementation.actionHandlerHasSynchronousRef
      || !candidate.signals.implementation.actionControlHasDisabled
      || !candidate.signals.implementation.actionControlHasAriaBusy) {
      add('pendingGuard', 'the actual validated action requires a ref lock and linked disabled/aria-busy control');
    }
    if (!candidate.signals.implementation.actionHandlerHasFailureFeedback) {
      add('serverErrors', 'the actual validated action requires visible non-field failure feedback');
    }
  } else if (mode === STRUCTURED_UI_STATE_VALIDATION_MODE) {
    if (candidate.kind !== 'secondary-action') {
      add('validationMode', 'structured UI state validation is only valid for a concrete secondary action');
    }
    if (!/^structured-ui-state:/.test(entry.schemaSource ?? '')) {
      add('schemaSource', 'structured UI state writes must name their invariant/schema source');
    }
    if (entry.errorNavigation !== 'structured-state-action-feedback') {
      add('errorNavigation', 'structured UI state writes require actionable state-level feedback');
    }
    if (entry.serverErrors !== 'action-error-feedback-preserves-state') {
      add('serverErrors', 'structured UI state writes require visible failure feedback and state preservation');
    }
    if (entry.pendingGuard !== 'action-pending-lock-and-disabled') {
      add('pendingGuard', 'structured UI state writes require a synchronous action lock and disabled pending state');
    }
    if (typeof entry.stateInvariant !== 'string' || entry.stateInvariant.trim().length < 12) {
      add('stateInvariant', 'structured UI state writes require a reviewed concrete invariant');
    }
    if (!Array.isArray(entry.structuredPayloads)
      || JSON.stringify(entry.structuredPayloads) !== JSON.stringify(candidate.writePayloads)) {
      add('structuredPayloads', `structured payloads must exact-match ${JSON.stringify(candidate.writePayloads)}`);
    }
    if (!candidate.signals.implementation.actionHandlerHasSynchronousRef) {
      add('pendingGuard', 'the actual trigger handler requires a synchronous ref lock before its write sink');
    }
    if (!candidate.signals.implementation.actionControlHasDisabled
      || !candidate.signals.implementation.actionControlHasAriaBusy) {
      add('pendingGuard', 'the actual trigger control requires both disabled and aria-busy pending state');
    }
    if (!candidate.signals.implementation.actionHandlerHasFailureFeedback) {
      add('serverErrors', 'the actual trigger handler requires visible failure feedback that preserves screen state');
    }
  } else if (mode === ACTION_ONLY_VALIDATION_MODE) {
    if ((candidate.validationSchemas?.length ?? 0) > 0) {
      add('validationMode', 'an action with a validated editable payload cannot claim action-only metadata');
    }
    if (entry.schemaSource !== 'not-applicable:no-editable-payload') {
      add('schemaSource', 'action-only boundaries must state that no editable payload exists');
    }
    if (entry.errorNavigation !== 'not-applicable-action-only') {
      add('errorNavigation', 'action-only boundaries must not claim field navigation');
    }
    if (entry.serverErrors !== 'action-error-feedback-preserves-state') {
      add('serverErrors', 'action-only boundaries require visible failure feedback and state preservation');
    }
    if (entry.pendingGuard !== 'action-pending-lock-and-disabled') {
      add('pendingGuard', 'action-only boundaries require a synchronous action lock and disabled pending state');
    }
    if (candidate.kind === 'secondary-action') {
      if (!candidate.signals.implementation.actionHandlerHasSynchronousRef) {
        add('pendingGuard', 'the actual trigger handler requires a synchronous ref lock before its write sink');
      }
      if (!candidate.signals.implementation.actionControlHasDisabled
        || !candidate.signals.implementation.actionControlHasAriaBusy) {
        add('pendingGuard', 'the actual trigger control requires both disabled and aria-busy pending state');
      }
      if (!candidate.signals.implementation.actionHandlerHasFailureFeedback) {
        add('serverErrors', 'the actual trigger handler requires visible failure feedback that preserves screen state');
      }
    } else if (!candidate.signals.implementation.sourceHasDisabledControl
      || !candidate.signals.implementation.sourceHasSynchronousRef) {
      add('pendingGuard', 'action-only boundaries require source-level disabled controls and synchronous refs');
    }
  } else {
    add('validationMode', `unsupported compliance mode '${mode ?? ''}'`);
  }

  return errors;
}

export function validateFormValidationCensus({ discovery, manifest, repoRoot = DEFAULT_REPO_ROOT, now = new Date() }) {
  const errors = [];
  const candidates = discovery?.candidates ?? [];
  const entries = Array.isArray(manifest?.entries) ? manifest.entries : [];
  if (candidates.length === 0) errors.push({ code: 'EMPTY_DISCOVERY', message: 'AST discovery returned zero candidates' });
  if ((discovery?.summary?.nativeFormOccurrences ?? 0) === 0) errors.push({ code: 'EMPTY_NATIVE_POPULATION', message: 'native form population is empty' });
  for (const violation of discovery?.formContextViolations ?? []) {
    errors.push({
      code: 'FORM_CONTEXT_VIOLATION',
      key: `${violation.file}:${violation.line}`,
      message: `${violation.tag} requires both FormField and FormItem context`,
    });
  }
  for (const violation of discovery?.inlineAlertViolations ?? []) {
    errors.push({
      code: 'DUPLICATE_INLINE_ALERT_LIVE_REGION',
      key: `${violation.file}:${violation.line}`,
      message: `${violation.tag} uses messageProps and must leave assertive announcement to FormErrorSummary`,
    });
  }
  if (entries.length === 0) {
    errors.push({ code: 'EMPTY_MANIFEST', message: 'manifest entries must be non-empty' });
  }
  if (manifest.schemaVersion !== 1) errors.push({ code: 'SCHEMA_VERSION', message: 'schemaVersion must be 1' });
  const expected = manifest.expected ?? {};
  for (const field of EXACT_SUMMARY_FIELDS) {
    const actual = discovery.summary[field];
    if (expected[field] !== actual) errors.push({ code: 'POPULATION_DRIFT', message: `expected.${field}=${expected[field] ?? '<missing>'}, actual=${actual}` });
  }
  const candidateByKey = new Map(candidates.map((candidate) => [candidate.key, candidate]));
  const entryByKey = new Map();
  for (const entry of entries) {
    if (typeof entry?.key !== 'string' || entry.key.trim() === '') {
      errors.push({ code: 'INVALID_ENTRY', message: 'entry key is missing' });
      continue;
    }
    if (entryByKey.has(entry.key)) errors.push({ code: 'DUPLICATE_ENTRY', key: entry.key, message: 'manifest key is duplicated' });
    entryByKey.set(entry.key, entry);
  }
  for (const candidate of candidates) {
    if (!entryByKey.has(candidate.key)) errors.push({ code: 'UNREGISTERED_CANDIDATE', key: candidate.key, message: `${candidate.kind} at ${candidate.file}:${candidate.line}` });
  }
  for (const entry of entries) {
    const candidate = candidateByKey.get(entry.key);
    if (!candidate) {
      errors.push({ code: 'STALE_ENTRY', key: entry.key, message: 'manifest entry no longer resolves to an AST candidate' });
      continue;
    }
    for (const field of ['kind', 'file', 'owner', ...(candidate.kind === 'secondary-action' ? ['handler'] : [])]) {
      if (entry[field] !== candidate[field]) errors.push({ code: 'STALE_METADATA', key: entry.key, message: `${field}=${entry[field] ?? '<missing>'}, actual=${candidate[field]}` });
    }
    if (candidate.kind === 'secondary-action'
      && (!Array.isArray(entry.writeSinks)
        || JSON.stringify(entry.writeSinks) !== JSON.stringify(candidate.writeSinks))) {
      errors.push({
        code: 'STALE_ACTION_SINKS',
        key: entry.key,
        message: `writeSinks=${JSON.stringify(entry.writeSinks ?? null)}, actual=${JSON.stringify(candidate.writeSinks)}`,
      });
    }
    if (candidate.kind === 'secondary-action' && candidate.triggerLabel !== undefined
      && entry.triggerLabel !== candidate.triggerLabel) {
      errors.push({
        code: 'STALE_ACTION_TRIGGER',
        key: entry.key,
        message: `triggerLabel=${JSON.stringify(entry.triggerLabel ?? null)}, actual=${JSON.stringify(candidate.triggerLabel)}`,
      });
    }
    if (!CLASSIFICATIONS.has(entry.classification)) {
      errors.push({ code: 'INVALID_CLASSIFICATION', key: entry.key, message: `unknown classification '${entry.classification ?? ''}'` });
    } else if (!allowedClassifications(candidate).has(entry.classification)) {
      errors.push({ code: 'CLASSIFICATION_CONTRADICTION', key: entry.key, message: `${candidate.kind} signals do not permit '${entry.classification}'` });
    }

    if (MUTATION_CLASSIFICATIONS.has(entry.classification)) {
      for (const field of ['status', 'validationMode', 'schemaSource', 'errorNavigation', 'serverErrors', 'pendingGuard', 'testEvidence']) {
        if (!(field in entry)) errors.push({ code: 'MISSING_MUTATION_METADATA', key: entry.key, message: `${field} is required` });
      }
      if (entry.status === 'noncompliant') {
        errors.push({ code: 'NONCOMPLIANT_CANDIDATE', key: entry.key, message: 'mutation boundary is not compliant' });
      } else if (entry.status === 'compliant') {
        for (const field of ['validationMode', 'schemaSource', 'errorNavigation', 'serverErrors', 'pendingGuard']) {
          if (typeof entry[field] !== 'string' || MISSING_VALUE.has(entry[field].trim().toLowerCase())) {
            errors.push({ code: 'INCOMPLETE_COMPLIANT_EVIDENCE', key: entry.key, message: `${field} cannot be missing for a compliant mutation` });
          }
        }
        if (!Array.isArray(entry.testEvidence) || entry.testEvidence.length === 0) {
          errors.push({ code: 'MISSING_TEST_EVIDENCE', key: entry.key, message: 'compliant mutation needs executable test evidence' });
        } else {
          for (const evidence of entry.testEvidence) {
            if (!safeEvidencePath(resolve(repoRoot), evidence)) errors.push({ code: 'INVALID_TEST_EVIDENCE', key: entry.key, message: `missing or unsafe evidence path: ${evidence}` });
          }
          if (!entry.testEvidence.some((evidence) => evidenceMentionsCandidate(resolve(repoRoot), evidence, candidate))) {
            errors.push({
              code: 'UNRELATED_TEST_EVIDENCE',
              key: entry.key,
              message: 'at least one executable test must name the boundary owner or source module',
            });
          }
          if (candidate.kind === 'secondary-action'
            && !entry.testEvidence.some((evidence) => evidenceMentionsAction(resolve(repoRoot), evidence, candidate))) {
            errors.push({
              code: 'UNRELATED_ACTION_TEST_EVIDENCE',
              key: entry.key,
              message: `at least one executable test must name this action handler or write sink (${candidate.signals.evidenceTokens.join(', ')})`,
            });
          }
          if (candidate.kind === 'secondary-action'
            && !entry.testEvidence.some((evidence) => evidenceProvesActionBehavior(resolve(repoRoot), evidence, candidate))) {
            errors.push({
              code: 'INCOMPLETE_ACTION_TEST_EVIDENCE',
              key: entry.key,
              message: 'one action-specific test must exercise duplicate blocking, disabled/aria-busy pending state, and visible failure feedback',
            });
          }
          if (entry.validationMode === COMPOSED_VALIDATION_MODE
            && !entry.testEvidence.some((evidence) => evidenceProvesComposedBehavior(resolve(repoRoot), evidence, candidate))) {
            errors.push({
              code: 'INCOMPLETE_COMPOSED_TEST_EVIDENCE',
              key: entry.key,
              message: 'composed evidence must prove exact child submit pending/failure behavior and both directions of the parent-action lock',
            });
          }
        }
        for (const metadataError of validateComplianceMetadata(entry, candidate)) {
          errors.push({
            code: 'INVALID_COMPLIANCE_METADATA',
            key: entry.key,
            message: `${metadataError.field}: ${metadataError.message}`,
          });
        }
      } else if (entry.status !== 'exception') {
        errors.push({ code: 'INVALID_STATUS', key: entry.key, message: `unknown status '${entry.status ?? ''}'` });
      }
    } else {
      if (entry.status !== 'compliant') {
        errors.push({ code: 'INVALID_STATUS', key: entry.key, message: `non-write boundary status must be compliant` });
      }
      for (const field of ['validationMode', 'schemaSource', 'errorNavigation', 'serverErrors', 'pendingGuard']) {
        if (entry[field] !== NOT_APPLICABLE) {
          errors.push({ code: 'INVALID_NON_WRITE_METADATA', key: entry.key, message: `${field} must be '${NOT_APPLICABLE}'` });
        }
      }
    }
  }

  const exceptions = Array.isArray(manifest.exceptions) ? manifest.exceptions : [];
  const exceptionByKey = new Map();
  for (const exception of exceptions) {
    if (exceptionByKey.has(exception?.candidateKey)) errors.push({ code: 'DUPLICATE_EXCEPTION', key: exception?.candidateKey, message: 'duplicate exception' });
    exceptionByKey.set(exception?.candidateKey, exception);
    for (const field of ['id', 'candidateKey', 'reason', 'owner', 'expiresAt']) {
      if (typeof exception?.[field] !== 'string' || exception[field].trim() === '') errors.push({ code: 'INVALID_EXCEPTION', key: exception?.candidateKey, message: `${field} is required` });
    }
    const expiry = new Date(`${exception?.expiresAt}T23:59:59.999Z`);
    if (Number.isNaN(expiry.getTime()) || expiry < now) errors.push({ code: 'EXPIRED_EXCEPTION', key: exception?.candidateKey, message: `exception expired at ${exception?.expiresAt ?? '<invalid>'}` });
    if (!candidateByKey.has(exception?.candidateKey)) errors.push({ code: 'STALE_EXCEPTION', key: exception?.candidateKey, message: 'exception candidate is not discovered' });
    if (exception?.disabledBy !== undefined) {
      const candidate = candidateByKey.get(exception.candidateKey);
      const entry = entryByKey.get(exception.candidateKey);
      const disabledBy = candidate?.signals?.implementation?.compileTimeDisabledWrite;
      if (exception.disabledBy !== disabledBy) {
        errors.push({
          code: 'INACTIVE_DISABLED_WRITE_EXCEPTION',
          key: exception.candidateKey,
          message: `disabledBy=${exception.disabledBy}, actual=${disabledBy ?? '<active-or-unproven>'}`,
        });
      }
      if (entry?.validationMode !== 'not-applicable-disabled-write'
        || !/(?:501|Not Implemented|미구현)/i.test(exception.reason ?? '')) {
        errors.push({ code: 'INVALID_DISABLED_WRITE_EXCEPTION', key: exception.candidateKey, message: 'disabled 501 writes require exact not-applicable metadata and reason' });
      }
      const evidence = entry?.testEvidence ?? [];
      if (!Array.isArray(evidence) || evidence.length === 0 || !evidence.every((source) => {
        if (!safeEvidencePath(resolve(repoRoot), source)) return false;
        const text = readFileSync(resolve(repoRoot, source), 'utf8');
        return text.includes(exception.disabledBy) && /(?:501\s*Not Implemented|미구현)/i.test(text);
      })) {
        errors.push({ code: 'INVALID_DISABLED_WRITE_EVIDENCE', key: exception.candidateKey, message: 'disabled write evidence must prove the exact flag and 501 state' });
      }
    }
  }
  for (const entry of entries) {
    if (entry.status === 'exception' && !exceptionByKey.has(entry.key)) errors.push({ code: 'MISSING_EXCEPTION', key: entry.key, message: 'exception status requires a reasoned, expiring exception' });
    if (entry.status !== 'exception' && exceptionByKey.has(entry.key)) errors.push({ code: 'UNUSED_EXCEPTION', key: entry.key, message: 'exception exists but entry is not exception status' });
  }
  return errors;
}

export function createDraftManifest(discovery) {
  const expected = Object.fromEntries(EXACT_SUMMARY_FIELDS.map((field) => [field, discovery.summary[field]]));
  return {
    schemaVersion: 1,
    authority: 'frontend-form-validation-census',
    generatedAt: new Date().toISOString().slice(0, 10),
    expected,
    entries: discovery.candidates.map((candidate) => {
      const classification = candidate.suggestedClassification;
      const mutation = MUTATION_CLASSIFICATIONS.has(classification);
      const implementation = candidate.signals.implementation;
      const secondaryAction = candidate.kind === 'secondary-action';
      const validatedSecondaryAction = secondaryAction && (candidate.validationSchemas?.length ?? 0) > 0;
      const validationMode = secondaryAction
        ? validatedSecondaryAction ? VALIDATED_SECONDARY_ACTION_MODE : ACTION_ONLY_VALIDATION_MODE
        : implementation.usesAppForm
        ? 'useAppForm-zod'
        : implementation.usesManualFormValidation
          ? 'useManualFormValidation-zod'
        : implementation.usesReactHookForm ? 'react-hook-form' : mutation ? 'manual-or-native' : 'not-applicable';
      const schemaSource = secondaryAction
        ? validatedSecondaryAction
          ? `local:${candidate.validationSchemas.join('+')}`
          : 'not-applicable:no-editable-payload'
        : implementation.schemaIdentifier
        ? `${implementation.generatedSchemaImport ? 'generated-or-derived' : 'local'}:${implementation.schemaIdentifier}`
        : mutation ? 'unverified' : 'not-applicable';
      return {
        key: candidate.key,
        kind: candidate.kind,
        file: candidate.file,
        owner: candidate.owner,
        ...(secondaryAction ? {
          handler: candidate.handler,
          ...(candidate.triggerLabel !== undefined ? { triggerLabel: candidate.triggerLabel } : {}),
          writeSinks: candidate.writeSinks,
          ...(validatedSecondaryAction ? { validatedFields: candidate.validatedFields } : {}),
        } : {}),
        ...((candidate.composedChildContracts?.length ?? 0) > 0
          ? { composedChildContracts: candidate.composedChildContracts }
          : {}),
        classification,
        status: mutation ? 'noncompliant' : 'compliant',
        validationMode,
        schemaSource,
        errorNavigation: secondaryAction
          ? validatedSecondaryAction ? 'summary-inline-focus-first-invalid' : 'not-applicable-action-only'
          : implementation.usesAppForm || implementation.usesManualFormValidation
          ? 'summary-inline-focus-first-invalid'
          : mutation ? 'missing' : 'not-applicable',
        serverErrors: secondaryAction
          ? validatedSecondaryAction ? 'field-errors-mapped-with-value-retention' : 'action-error-feedback-preserves-state'
          : implementation.applyServerErrors
          ? 'field-errors-mapped-with-value-retention'
          : mutation ? 'missing' : 'not-applicable',
        pendingGuard: secondaryAction
          ? 'action-pending-lock-and-disabled'
          : implementation.pendingGuard
          ? 'synchronous-submit-lock-and-disabled'
          : mutation ? 'missing' : 'not-applicable',
        testEvidence: [],
      };
    }),
    exceptions: [],
  };
}

function parseArguments(argv) {
  const mode = argv.includes('--print-draft') ? 'print-draft' : argv.includes('--audit') ? 'audit' : 'check';
  const valueAfter = (flag) => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  return { mode, repoRoot: valueAfter('--repo-root'), manifestPath: valueAfter('--manifest') };
}

export function runCli(argv = process.argv.slice(2)) {
  const args = parseArguments(argv);
  const repoRoot = resolve(args.repoRoot ?? DEFAULT_REPO_ROOT);
  const manifestPath = resolve(repoRoot, args.manifestPath ?? 'config/governance/frontend-form-validation-census.json');
  const discovery = discoverFormValidationBoundaries({ repoRoot });
  if (args.mode === 'print-draft') {
    process.stdout.write(`${JSON.stringify(createDraftManifest(discovery), null, 2)}\n`);
    return 0;
  }
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    console.error(`❌ form validation census manifest unreadable: ${error.message}`);
    return 1;
  }
  const errors = validateFormValidationCensus({ discovery, manifest, repoRoot });
  console.log(`form validation population: native=${discovery.summary.nativeFormOccurrences}/${discovery.summary.nativeFormFiles} files, member=${discovery.summary.memberFormOccurrences}, formless=${discovery.summary.formlessWriteBoundaries}, secondary=${discovery.summary.secondaryActionBoundaries}, total=${discovery.summary.candidateCount}`);
  if (args.mode === 'audit') {
    for (const classification of [...CLASSIFICATIONS]) {
      const count = manifest.entries?.filter((entry) => entry.classification === classification).length ?? 0;
      console.log(`  ${classification}: ${count}`);
    }
  }
  if (errors.length > 0) {
    console.error(`❌ frontend form validation census failed (${errors.length}):`);
    for (const error of errors) console.error(`  - [${error.code}]${error.key ? ` ${error.key}` : ''}: ${error.message}`);
    return 1;
  }
  console.log('✅ frontend form validation census is exact and compliant');
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) process.exitCode = runCli();
