const WORKFLOW_PATH = '.github/workflows/ci.yml';

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function unquote(value) {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"'))
    || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function normalizeExpression(value) {
  const unquoted = unquote(value);
  const expression = /^\$\{\{\s*(.*?)\s*\}\}$/.exec(unquoted);
  return expression ? expression[1] : unquoted;
}

function directScalar(block, key) {
  const pattern = new RegExp(`^ {4}${escapeRegExp(key)}:\\s*([^#\\r\\n]*?)(?:\\s+#.*)?$`, 'm');
  const match = pattern.exec(block);
  return match ? unquote(match[1]) : null;
}

function stepScalar(block, key) {
  const pattern = new RegExp(`^ {8}${escapeRegExp(key)}:\\s*([^#\\r\\n]*?)(?:\\s+#.*)?$`, 'm');
  const match = pattern.exec(block);
  return match ? unquote(match[1]) : null;
}

function nestedBlock(parent, header, indent) {
  const lines = parent.replace(/\r\n/g, '\n').split('\n');
  const prefix = ' '.repeat(indent);
  const start = lines.findIndex(line => new RegExp(`^${prefix}${escapeRegExp(header)}:\\s*(?:#.*)?$`).test(line));
  if (start < 0) return null;

  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    const indentation = line.length - line.trimStart().length;
    if (indentation <= indent) {
      end = index;
      break;
    }
  }
  return lines.slice(start, end).join('\n');
}

function parseMatrix(jobBlock) {
  const strategy = nestedBlock(jobBlock, 'strategy', 4);
  if (!strategy) return null;
  const matrix = nestedBlock(strategy, 'matrix', 6);
  if (!matrix) return null;

  const entries = [];
  for (const line of matrix.split('\n')) {
    const match = /^ {8}([A-Za-z0-9_-]+):\s*([^#\r\n]*?)(?:\s+#.*)?$/.exec(line);
    if (!match) continue;
    const [, key, rawValue] = match;
    const inlineList = /^\[([^\]]*)\]$/.exec(rawValue.trim());
    entries.push({
      key,
      values: inlineList
        ? inlineList[1].split(',').map(value => unquote(value))
        : null,
    });
  }
  return entries;
}

function parseNamedSteps(jobBlock) {
  const stepsBlock = nestedBlock(jobBlock, 'steps', 4);
  if (!stepsBlock) return new Map();
  const lines = stepsBlock.split('\n');
  const starts = [];
  for (let index = 0; index < lines.length; index += 1) {
    const match = /^ {6}- name:\s*(.*?)\s*$/.exec(lines[index]);
    if (match) starts.push({ index, name: unquote(match[1]) });
  }

  const steps = new Map();
  for (let index = 0; index < starts.length; index += 1) {
    const start = starts[index];
    let end = starts[index + 1]?.index ?? lines.length;
    for (let cursor = start.index + 1; cursor < end; cursor += 1) {
      if (/^ {6}- (?:name|uses|run):/.test(lines[cursor])) {
        end = cursor;
        break;
      }
    }
    steps.set(start.name, lines.slice(start.index, end).join('\n'));
  }
  return steps;
}

function nestedScalarMap(parent, header, indent) {
  const block = nestedBlock(parent, header, indent);
  if (!block) return null;
  const entries = new Map();
  const entryIndent = ' '.repeat(indent + 2);
  const pattern = new RegExp(`^${entryIndent}([A-Za-z_][A-Za-z0-9_]*):\\s*(.*?)\\s*$`);
  for (const line of block.split('\n')) {
    const match = pattern.exec(line);
    if (match) entries.set(match[1], unquote(match[2]));
  }
  return entries;
}

function stepRun(stepBlock) {
  const lines = stepBlock.split('\n');
  const runIndex = lines.findIndex(line => /^ {8}run:\s*/.test(line));
  if (runIndex < 0) return null;
  const first = lines[runIndex].replace(/^ {8}run:\s*/, '');
  if (first !== '|' && first !== '>-') return unquote(first);

  const body = [];
  for (let index = runIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim() && line.length - line.trimStart().length <= 8) break;
    body.push(line.replace(/^ {10}/, ''));
  }
  return body.join('\n').trim();
}

function validateAggregate(check, jobs) {
  const aggregate = check.aggregate;
  if (!aggregate || typeof aggregate !== 'object') return [];
  const errors = [];
  const requiredFields = [
    'sourceJobId',
    'sourceStepName',
    'sourceRun',
    'aggregateStepName',
    'resultExpression',
    'successResult',
  ];
  for (const field of requiredFields) {
    if (typeof aggregate[field] !== 'string' || aggregate[field].length === 0) {
      errors.push(`aggregate mapping for '${check.context}' requires '${field}'`);
    }
  }
  if (!aggregate.sourceEnv || typeof aggregate.sourceEnv !== 'object'
    || Array.isArray(aggregate.sourceEnv) || Object.keys(aggregate.sourceEnv).length === 0) {
    errors.push(`aggregate mapping for '${check.context}' requires non-empty 'sourceEnv'`);
  }
  if (errors.length > 0) return errors;

  const aggregateJob = jobs.get(check.jobId);
  const sourceJob = jobs.get(aggregate.sourceJobId);
  if (!sourceJob) {
    return [`aggregate source job '${aggregate.sourceJobId}' for '${check.context}' does not exist`];
  }
  if (directScalar(aggregateJob, 'needs') !== aggregate.sourceJobId) {
    errors.push(`aggregate job '${check.jobId}' must need exactly '${aggregate.sourceJobId}'`);
  }
  if (directScalar(sourceJob, 'continue-on-error') !== null) {
    errors.push(`aggregate source job '${aggregate.sourceJobId}' cannot use job-level continue-on-error`);
  }

  const sourceStep = parseNamedSteps(sourceJob).get(aggregate.sourceStepName);
  if (!sourceStep) {
    errors.push(`aggregate source step '${aggregate.sourceStepName}' does not exist in '${aggregate.sourceJobId}'`);
  } else {
    if (stepScalar(sourceStep, 'continue-on-error') !== null) {
      errors.push(`aggregate source step '${aggregate.sourceStepName}' cannot use continue-on-error`);
    }
    if (stepRun(sourceStep) !== aggregate.sourceRun) {
      errors.push(`aggregate source step '${aggregate.sourceStepName}' must run '${aggregate.sourceRun}'`);
    }
    const sourceEnv = nestedScalarMap(sourceStep, 'env', 8) ?? new Map();
    for (const [key, expectedValue] of Object.entries(aggregate.sourceEnv)) {
      if (sourceEnv.get(key) !== expectedValue) {
        errors.push(`aggregate source step '${aggregate.sourceStepName}' env '${key}' must remain '${expectedValue}'`);
      }
    }
  }

  const aggregateStep = parseNamedSteps(aggregateJob).get(aggregate.aggregateStepName);
  if (!aggregateStep) {
    errors.push(`aggregate result step '${aggregate.aggregateStepName}' does not exist in '${check.jobId}'`);
    return errors;
  }
  if (stepScalar(aggregateStep, 'continue-on-error') !== null) {
    errors.push(`aggregate result step '${aggregate.aggregateStepName}' cannot use continue-on-error`);
  }
  const run = stepRun(aggregateStep) ?? '';
  const resultAssignment = new RegExp(
    `RESULT=["']\\$\\{\\{\\s*${escapeRegExp(aggregate.resultExpression)}\\s*\\}\\}["']`,
  );
  if (!resultAssignment.test(run)) {
    errors.push(`aggregate result step must consume '${aggregate.resultExpression}'`);
  }
  const failureCondition = new RegExp(
    `if\\s+\\[\\s*["']?\\$RESULT["']?\\s*!=\\s*["']${escapeRegExp(aggregate.successResult)}["']\\s*\\]\\s*;\\s*then[\\s\\S]*?\\bexit\\s+1\\b[\\s\\S]*?\\bfi\\b`,
  );
  if (!failureCondition.test(run)) {
    errors.push(`aggregate result step must exit 1 when result is not '${aggregate.successResult}'`);
  }
  return errors;
}

export function parseWorkflowJobs(ciContent) {
  const normalized = ciContent.replace(/\r\n/g, '\n');
  const jobsHeader = /^jobs:\s*(?:#.*)?$/m.exec(normalized);
  if (!jobsHeader) return new Map();

  const afterHeader = jobsHeader.index + jobsHeader[0].length;
  const rest = normalized.slice(afterHeader);
  const nextTopLevel = /^\S[^:\n]*:\s*(?:#.*)?$/m.exec(rest);
  const section = normalized.slice(
    jobsHeader.index,
    nextTopLevel ? afterHeader + nextTopLevel.index : normalized.length,
  );
  const jobPattern = /^ {2}([A-Za-z0-9_-]+):\s*(?:#.*)?$/gm;
  const matches = [...section.matchAll(jobPattern)];
  const jobs = new Map();

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const end = matches[index + 1]?.index ?? section.length;
    jobs.set(match[1], section.slice(match.index, end));
  }
  return jobs;
}

export function validateStaticContract({ manifest, ciContent, workflowPath = WORKFLOW_PATH }) {
  const errors = [];
  if (!manifest || manifest.version !== 1 || !Array.isArray(manifest.requiredChecks)) {
    return ['invalid manifest: version 1 and requiredChecks array are mandatory'];
  }
  if (manifest.workflow !== workflowPath) {
    errors.push(`manifest workflow '${manifest.workflow ?? ''}' does not match '${workflowPath}'`);
  }
  if (typeof manifest.branch !== 'string' || !/^[A-Za-z0-9._/-]+$/.test(manifest.branch)) {
    errors.push('manifest branch must be a non-empty safe branch name');
  }
  if (!Number.isSafeInteger(manifest.integrationId) || manifest.integrationId <= 0) {
    errors.push('manifest integrationId must be a positive integer');
  }
  if (manifest.requiredChecks.length === 0) {
    errors.push('invalid manifest: requiredChecks must not be empty');
    return errors;
  }

  const jobs = parseWorkflowJobs(ciContent);
  if (jobs.size < 3) {
    errors.push(`workflow job parsing failed: only ${jobs.size} job(s) found`);
  }

  const seenContexts = new Set();
  const checksByJob = new Map();
  for (const check of manifest.requiredChecks) {
    const context = typeof check?.context === 'string' ? check.context.trim() : '';
    const jobId = typeof check?.jobId === 'string' ? check.jobId.trim() : '';
    if (!context || !jobId) {
      errors.push('invalid required check: non-empty context and jobId are mandatory');
      continue;
    }
    if (seenContexts.has(context)) errors.push(`duplicate required context: ${context}`);
    seenContexts.add(context);
    const group = checksByJob.get(jobId) ?? [];
    group.push({ ...check, context, jobId });
    checksByJob.set(jobId, group);
  }

  for (const [jobId, checks] of checksByJob) {
    const jobBlock = jobs.get(jobId);
    if (!jobBlock) {
      for (const { context } of checks) {
        errors.push(`source job '${jobId}' for required context '${context}' does not exist`);
      }
      continue;
    }

    const jobName = directScalar(jobBlock, 'name');
    if (jobName !== null) {
      errors.push(`job-level name override on required job '${jobId}' changes its check context`);
    }
    const continueOnError = directScalar(jobBlock, 'continue-on-error');
    if (continueOnError !== null) {
      errors.push(`job-level continue-on-error on required job '${jobId}' weakens its blocking result`);
    }

    const expectedConditions = new Set(checks.map(check => check.jobIf ?? ''));
    if (expectedConditions.size !== 1) {
      errors.push(`required check mappings for job '${jobId}' disagree on jobIf`);
    } else {
      const expectedCondition = [...expectedConditions][0];
      const actualCondition = directScalar(jobBlock, 'if');
      if (!expectedCondition && actualCondition !== null) {
        errors.push(`unexpected job-level if on required job '${jobId}': ${actualCondition}`);
      } else if (expectedCondition && normalizeExpression(actualCondition ?? '') !== normalizeExpression(expectedCondition)) {
        errors.push(`job-level if on required job '${jobId}' must remain '${expectedCondition}'`);
      }
    }

    const matrixChecks = checks.filter(check => check.matrix);
    const matrixEntries = parseMatrix(jobBlock);
    if (matrixChecks.length === 0) {
      if (matrixEntries !== null) {
        errors.push(`non-matrix required job '${jobId}' unexpectedly defines a matrix`);
      }
      for (const { context } of checks) {
        if (context !== jobId) errors.push(`context '${context}' must equal non-matrix job ID '${jobId}'`);
      }
      continue;
    }

    if (matrixChecks.length !== checks.length) {
      errors.push(`job '${jobId}' mixes matrix and non-matrix required check mappings`);
      continue;
    }

    const matrixKeys = new Set(matrixChecks.map(check => check.matrix?.key));
    if (matrixKeys.size !== 1 || matrixKeys.has('') || matrixKeys.has(undefined)) {
      errors.push(`matrix mappings for required job '${jobId}' must use exactly one non-empty key`);
      continue;
    }
    const expectedKey = [...matrixKeys][0];
    if (matrixEntries === null) {
      errors.push(`matrix key '${expectedKey}' for required job '${jobId}' is missing from strategy.matrix`);
      continue;
    }

    for (const entry of matrixEntries) {
      if (entry.key === 'include' || entry.key === 'exclude') {
        errors.push(`matrix ${entry.key} is unsupported for required job '${jobId}' because exact contexts become ambiguous`);
      } else if (entry.key !== expectedKey) {
        errors.push(`unexpected matrix axis '${entry.key}' on required job '${jobId}'`);
      }
    }

    const axis = matrixEntries.find(entry => entry.key === expectedKey);
    if (!axis?.values) {
      errors.push(`matrix key '${expectedKey}' for required job '${jobId}' must be an inline list under strategy.matrix`);
      continue;
    }

    const expectedValues = matrixChecks.map(check => String(check.matrix.value));
    if (axis.values.some(value => value.length === 0)) {
      errors.push(`empty matrix value on required job '${jobId}'`);
    }
    if (new Set(axis.values).size !== axis.values.length) {
      errors.push(`duplicate actual matrix value on required job '${jobId}'`);
    }
    const expectedSet = new Set(expectedValues);
    const actualSet = new Set(axis.values);
    for (const value of expectedSet) {
      if (!actualSet.has(value)) errors.push(`missing matrix value '${value}' on required job '${jobId}'`);
    }
    for (const value of actualSet) {
      if (!expectedSet.has(value)) errors.push(`unexpected matrix value '${value}' on required job '${jobId}'`);
    }
    if (expectedSet.size !== expectedValues.length) {
      errors.push(`duplicate matrix value mapping on required job '${jobId}'`);
    }

    for (const check of matrixChecks) {
      const value = String(check.matrix.value);
      if (check.context !== `${jobId} (${value})`) {
        errors.push(`matrix context '${check.context}' does not match GitHub check name '${jobId} (${value})'`);
      }
    }
  }

  for (const check of manifest.requiredChecks) {
    errors.push(...validateAggregate(check, jobs));
  }

  return errors;
}

export function compareRequiredChecks(expectedContexts, actualChecks, expectedIntegrationId) {
  const expected = new Set(expectedContexts);
  const actualByContext = new Map();
  const errors = [];

  for (const check of actualChecks) {
    const context = typeof check === 'string' ? check : check?.context;
    if (!context) {
      errors.push('actual required check has no context');
      continue;
    }
    if (actualByContext.has(context)) errors.push(`duplicate actual required context: ${context}`);
    actualByContext.set(context, typeof check === 'string' ? null : check.integrationId ?? null);
  }
  for (const context of expected) {
    if (!actualByContext.has(context)) {
      errors.push(`missing required context: ${context}`);
    } else if (expectedIntegrationId !== undefined
      && actualByContext.get(context) !== expectedIntegrationId) {
      errors.push(`required context '${context}' must be bound to integration ${expectedIntegrationId}`);
    }
  }
  for (const context of actualByContext.keys()) {
    if (!expected.has(context)) errors.push(`unexpected required context: ${context}`);
  }
  return errors;
}

export function compareRequiredContexts(expectedContexts, actualContexts) {
  return compareRequiredChecks(expectedContexts, actualContexts);
}
