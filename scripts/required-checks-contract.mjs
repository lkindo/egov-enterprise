const WORKFLOW_PATH = '.github/workflows/ci.yml';
/*
  이 목록 하나가 두 가지를 구동한다 — 명세가 정확히 이 필드들만 선언해야 하고(누락·잉여 모두 오류),
  원격 ruleset 과의 비교 대상도 이 목록이다. 즉 여기 없는 필드는 **원격에 있어도 비교되지 않는다.**

  `requireExtraApprovalForUnattributedChanges` 는 GitHub 가 DEC-OPS-009 이후 추가한 승인 축인데
  목록에 없어 검증기가 보지 못했다 — 원격이 true 로 켜져 있어도 `verify:ops` 는 green 이었다.
  단독 운영에서 승인 요구는 병합을 막을 수 있는 축이므로 선언·비교 대상에 넣는다(DEC-OPS-108).
  ⚠ 현재 값을 명세에 적는 것은 그 값을 옳다고 판정하는 것이 아니라 **드리프트를 보이게** 하는 것이다.
*/
const PULL_REQUEST_POLICY_FIELDS = [
  'requiredApprovingReviewCount',
  'requireCodeOwnerReview',
  'requireLastPushApproval',
  'dismissStaleReviewsOnPush',
  'requiredReviewThreadResolution',
  'requireExtraApprovalForUnattributedChanges',
];

/**
 * 결정된 review policy (DEC-OPS-009, 2026-08-20 — DEC-OPS-007 대체).
 *
 * 단독 운영이라 작성자 외 reviewer 가 없다. approval ≥ 1 을 원격에 적용하면 자기 PR 을
 * 자기가 승인할 수 없어 **모든 병합이 막히고**, 명세만 강하게 두면 verify:ops 가 영구
 * red 로 남아 신호로서 죽는다. 그래서 명세를 현실에 맞추되 이 상수에 **양방향으로 동결**
 * 한다 — 완화든 (reviewer 확보 전의) 강화든 이 상수와 decisions.md 를 함께 고쳐야 한다.
 * reviewer 가 생기면 이 값을 DEC-OPS-007 수준으로 올리는 후속 DEC 를 만든다.
 */
const DECIDED_PULL_REQUEST_POLICY = {
  requiredApprovingReviewCount: 0,
  requireCodeOwnerReview: false,
  requireLastPushApproval: false,
  dismissStaleReviewsOnPush: false,
  requiredReviewThreadResolution: false,
  /*
    [DEC-OPS-108 · 2026-09-21] GitHub 가 DEC-OPS-009 이후 추가한 여섯 번째 승인 축이다.
    값 `true` 는 **원격 실측치를 기록한 것이지 "그래야 한다" 는 판정이 아니다** — 비교 목록에만
    넣고 여기서 빼면 이 필드만 양방향 동결을 못 받아 반쪽으로 결속되므로 함께 적는다.
    ⚠ 끄는 것이 DEC-OPS-009 의 취지(단독 운영에서 승인 요구는 병합을 막는다)에 맞을 수 있으나
      원격 ruleset 변경은 승인 경계라 별도 결정이다. 그때 이 값과 명세를 함께 고친다.
  */
  requireExtraApprovalForUnattributedChanges: true,
};

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

function scalarAtIndent(block, key, indent) {
  const pattern = new RegExp(`^ {${indent}}${escapeRegExp(key)}:\\s*([^#\\r\\n]*?)(?:\\s+#.*)?$`, 'm');
  const match = pattern.exec(block);
  return match ? unquote(match[1]) : null;
}

function directNeeds(block) {
  const raw = directScalar(block, 'needs');
  if (raw === null) return [];
  const inline = /^\[([^\]]*)\]$/.exec(raw);
  return inline
    ? inline[1].split(',').map(value => unquote(value)).filter(Boolean)
    : [raw];
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

function runShellDefault(parent, defaultsIndent) {
  const defaults = nestedBlock(parent, 'defaults', defaultsIndent);
  if (!defaults) return null;
  const run = nestedBlock(defaults, 'run', defaultsIndent + 2);
  return run ? scalarAtIndent(run, 'shell', defaultsIndent + 4) : null;
}

function checkoutProvenanceErrors(jobBlock, jobId) {
  const lines = jobBlock.replace(/\r\n/g, '\n').split('\n');
  const starts = lines
    .map((line, index) => /^ {6}- uses:\s*actions\/checkout@/.test(line) ? index : -1)
    .filter(index => index >= 0);
  if (starts.length === 0) return [`job '${jobId}' must checkout the workflow commit`];

  const errors = [];
  for (const start of starts) {
    let end = lines.length;
    for (let index = start + 1; index < lines.length; index += 1) {
      if (/^ {6}- /.test(lines[index])) {
        end = index;
        break;
      }
    }
    if (/\bref\s*:/.test(lines.slice(start, end).join('\n'))) {
      errors.push(`job '${jobId}' checkout cannot override ref; it must test the workflow commit`);
    }
  }
  return errors;
}

function validateCriticalSteps(criticalSteps, jobs) {
  if (!Array.isArray(criticalSteps) || criticalSteps.length === 0) {
    return ['manifest criticalSteps must be a non-empty array'];
  }

  const errors = [];
  const seen = new Set();
  for (const criticalStep of criticalSteps) {
    const jobId = typeof criticalStep?.jobId === 'string' ? criticalStep.jobId.trim() : '';
    const name = typeof criticalStep?.name === 'string' ? criticalStep.name.trim() : '';
    if (!jobId || !name) {
      errors.push('critical step requires non-empty jobId and name');
      continue;
    }
    const identity = `${jobId}:${name}`;
    if (seen.has(identity)) errors.push(`duplicate critical step mapping '${identity}'`);
    seen.add(identity);

    const job = jobs.get(jobId);
    if (!job) {
      errors.push(`critical step job '${jobId}' does not exist`);
      continue;
    }
    const step = parseNamedSteps(job).get(name);
    if (!step) {
      errors.push(`critical step '${name}' does not exist in '${jobId}'`);
      continue;
    }

    const hasRun = typeof criticalStep.run === 'string' && criticalStep.run.length > 0;
    const hasUses = typeof criticalStep.uses === 'string' && criticalStep.uses.length > 0;
    if (hasRun === hasUses) {
      errors.push(`critical step '${name}' must declare exactly one of run or uses`);
    } else if (hasRun && stepRun(step) !== criticalStep.run) {
      errors.push(`critical step '${name}' must run its manifest command exactly`);
    } else if (hasUses && stepScalar(step, 'uses') !== criticalStep.uses) {
      errors.push(`critical step '${name}' must use '${criticalStep.uses}' exactly`);
    }

    const expectedIf = typeof criticalStep.if === 'string' ? criticalStep.if : null;
    const actualIf = stepScalar(step, 'if');
    if (expectedIf === null ? actualIf !== null
      : normalizeExpression(actualIf ?? '') !== normalizeExpression(expectedIf)) {
      errors.push(`critical step '${name}' must retain its exact if condition`);
    }
    if (Object.hasOwn(criticalStep, 'env')) {
      if (!criticalStep.env || typeof criticalStep.env !== 'object' || Array.isArray(criticalStep.env)) {
        errors.push(`critical step '${name}' env must be an object`);
      } else {
        const expectedEnv = new Map(Object.entries(criticalStep.env));
        const actualEnv = nestedScalarMap(step, 'env', 8) ?? new Map();
        const expectedEntries = [...expectedEnv.entries()].sort();
        const actualEntries = [...actualEnv.entries()].sort();
        if (JSON.stringify(actualEntries) !== JSON.stringify(expectedEntries)) {
          errors.push(`critical step '${name}' must retain its exact env`);
        }
      }
    }
    if (stepScalar(step, 'continue-on-error') !== null) {
      errors.push(`critical step '${name}' cannot use continue-on-error`);
    }
    if (stepScalar(step, 'shell') !== null) {
      errors.push(`critical step '${name}' cannot override the runner shell`);
    }
  }
  return errors;
}

export function validatePinnedWorkflowUses(workflowFiles) {
  if (!Array.isArray(workflowFiles)) {
    return ['workflow action pin contract requires an array of workflow files'];
  }

  const errors = [];
  for (const workflowFile of workflowFiles) {
    const filePath = typeof workflowFile?.path === 'string' && workflowFile.path
      ? workflowFile.path
      : '(unknown workflow)';
    const content = typeof workflowFile?.content === 'string' ? workflowFile.content : '';
    const lines = content.replace(/\r\n/g, '\n').split('\n');

    for (let index = 0; index < lines.length; index += 1) {
      const match = /^\s*(?:-\s*)?uses:\s*(.*?)\s*$/.exec(lines[index]);
      if (!match) continue;
      const action = unquote(match[1].replace(/\s+#.*$/, ''));
      if (action.startsWith('./') || action.startsWith('docker://')) continue;

      const pinnedAction = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_./-]+)?@[0-9a-fA-F]{40}$/;
      if (!pinnedAction.test(action)) {
        errors.push(`${filePath}:${index + 1} third-party action '${action}' must use a 40-character commit SHA`);
      }
      if (action.startsWith('gradle/actions/setup-gradle@')) {
        // v6.3.0 uses the current cache client. Select the MIT basic provider explicitly;
        // the v6 default is the separately licensed enhanced provider.
        if (action !== 'gradle/actions/setup-gradle@9c971963bec38e04b3d30dcc455b5382be2fdbfb') {
          errors.push(`${filePath}:${index + 1} Gradle setup must use the reviewed cache-compatible action pin`);
        }
        const usesIndent = lines[index].match(/^\s*/)[0].length;
        const stepIndent = /^\s*-/.test(lines[index]) ? usesIndent : usesIndent - 2;
        let end = index + 1;
        while (end < lines.length) {
          const line = lines[end];
          if (line.trim() && !line.trimStart().startsWith('#')
            && line.length - line.trimStart().length <= stepIndent) break;
          end += 1;
        }
        const inputs = nestedBlock(lines.slice(index, end).join('\n'), 'with', stepIndent + 2) ?? '';
        const provider = scalarAtIndent(inputs, 'cache-provider', stepIndent + 4);
        if (provider !== 'basic') {
          errors.push(`${filePath}:${index + 1} Gradle setup must explicitly select cache-provider: basic`);
        }
      }
    }
  }
  return errors;
}

/**
 * 한 required context 가 소스 잡을 여럿 가질 수 있다(2026-09-16 DEC-OPS-104).
 *
 * <p>⚠ 빈 배열을 허용하면 "소스를 한 번도 돌지 않는" 무검사 통과가 된다 — 루프 기반 일반화에서
 * 가장 흔한 약화 경로라 명시적으로 거부한다. 단수 객체 형태는 나머지 context 를 위해 유지한다.
 */
function aggregateSourceList(check) {
  const declared = check.aggregate;
  if (declared === undefined) return { sources: [], errors: [] };
  if (Array.isArray(declared)) {
    if (declared.length === 0) {
      return { sources: [], errors: [`aggregate mapping for '${check.context}' must declare at least one source`] };
    }
    return { sources: declared, errors: [] };
  }
  if (!declared || typeof declared !== 'object') return { sources: [], errors: [] };
  return { sources: [declared], errors: [] };
}

function validateAggregate(check, jobs) {
  const { sources, errors } = aggregateSourceList(check);
  const seenSourceJobs = new Set();
  const seenStepNames = new Set();
  for (const source of sources) {
    errors.push(...validateAggregateSource(check, source, jobs));
    // 같은 집계 잡 안에서 결과 스텝 이름이 겹치면 검증기가 한쪽만 보고 나머지 소스를 놓친다.
    const stepName = typeof source?.aggregateStepName === 'string' ? source.aggregateStepName : '';
    if (stepName !== "") {
      if (seenStepNames.has(stepName)) {
        errors.push(`aggregate mapping for '${check.context}' reuses result step '${stepName}'`);
      }
      seenStepNames.add(stepName);
    }
    const sourceJobId = typeof source?.sourceJobId === 'string' ? source.sourceJobId : '';
    if (sourceJobId !== "") {
      if (seenSourceJobs.has(sourceJobId)) {
        errors.push(`aggregate mapping for '${check.context}' declares source job '${sourceJobId}' twice`);
      }
      seenSourceJobs.add(sourceJobId);
    }
  }
  return errors;
}

function validateAggregateSource(check, aggregate, jobs) {
  if (!aggregate || typeof aggregate !== 'object' || Array.isArray(aggregate)) {
    return [`aggregate mapping for '${check.context}' requires an object source`];
  }
  const errors = [];
  const requiredFields = [
    'sourceJobId',
    'sourceStepName',
    'sourceRun',
    'aggregateStepName',
    'aggregateRun',
    'resultExpression',
    'successResult',
    'sourceJobIf',
    'scopeExpression',
    'classifierResultExpression',
    'skippedResult',
  ];
  for (const field of requiredFields) {
    if (typeof aggregate[field] !== 'string' || aggregate[field].length === 0) {
      errors.push(`aggregate mapping for '${check.context}' requires '${field}'`);
    }
  }
  if (!aggregate.sourceEnv || typeof aggregate.sourceEnv !== 'object'
    || Array.isArray(aggregate.sourceEnv)) {
    errors.push(`aggregate mapping for '${check.context}' requires object 'sourceEnv'`);
  }
  if (!Array.isArray(aggregate.sourceNeeds)
    || aggregate.sourceNeeds.some(value => typeof value !== 'string' || value.length === 0)) {
    errors.push(`aggregate mapping for '${check.context}' requires string-array 'sourceNeeds'`);
  }
  if (!Object.hasOwn(aggregate, 'sourceWorkingDirectory')
    || (aggregate.sourceWorkingDirectory !== null
      && (typeof aggregate.sourceWorkingDirectory !== 'string'
        || aggregate.sourceWorkingDirectory.length === 0))) {
    errors.push(`aggregate mapping for '${check.context}' requires string-or-null 'sourceWorkingDirectory'`);
  }
  if (aggregate.successResult !== 'success') {
    errors.push(`aggregate mapping for '${check.context}' successResult must remain canonical 'success'`);
  }
  if (aggregate.skippedResult !== 'skipped') {
    errors.push(`aggregate mapping for '${check.context}' skippedResult must remain canonical 'skipped'`);
  }
  if (errors.length > 0) return errors;

  const aggregateJob = jobs.get(check.jobId);
  const sourceJob = jobs.get(aggregate.sourceJobId);
  // ⚠ 누적 오류를 버리고 단일 배열을 돌려주면, 소스가 여럿일 때 한쪽의 부재가 다른 쪽의 실제 위반을 삼킨다.
  if (!aggregateJob) {
    errors.push(`aggregate job '${check.jobId}' for '${check.context}' does not exist`);
    return errors;
  }
  if (!sourceJob) {
    errors.push(`aggregate source job '${aggregate.sourceJobId}' for '${check.context}' does not exist`);
    return errors;
  }
  errors.push(...checkoutProvenanceErrors(sourceJob, aggregate.sourceJobId));
  if (JSON.stringify(directNeeds(sourceJob)) !== JSON.stringify(aggregate.sourceNeeds)) {
    errors.push(`aggregate source job '${aggregate.sourceJobId}' needs must exactly match ${JSON.stringify(aggregate.sourceNeeds)}`);
  }
  if (!directNeeds(aggregateJob).includes(aggregate.sourceJobId)) {
    errors.push(`aggregate job '${check.jobId}' must need '${aggregate.sourceJobId}'`);
  }
  if (directScalar(sourceJob, 'continue-on-error') !== null) {
    errors.push(`aggregate source job '${aggregate.sourceJobId}' cannot use job-level continue-on-error`);
  }
  if (normalizeExpression(directScalar(sourceJob, 'if') ?? '') !== normalizeExpression(aggregate.sourceJobIf)) {
    errors.push(`aggregate source job '${aggregate.sourceJobId}' must retain its fail-closed scope condition`);
  }
  if (aggregate.sourceMatrix !== undefined) {
    const expectedMatrix = aggregate.sourceMatrix;
    const actualEntries = parseMatrix(sourceJob) ?? [];
    const axis = actualEntries.find(({ key }) => key === expectedMatrix.key);
    if (actualEntries.length !== 1 || !axis?.values
      || JSON.stringify(axis.values) !== JSON.stringify(expectedMatrix.values)) {
      errors.push(`aggregate source job '${aggregate.sourceJobId}' matrix must exactly match ${JSON.stringify(expectedMatrix.values)}`);
    }
    if (expectedMatrix.completeCoordinates === true) {
      const coordinates = expectedMatrix.values?.map(value => /^(\d+)\/(\d+)$/.exec(value)) ?? [];
      const denominator = coordinates[0] ? Number(coordinates[0][2]) : 0;
      const numerators = coordinates.map(match => match ? Number(match[1]) : 0).sort((a, b) => a - b);
      const complete = denominator === coordinates.length
        && coordinates.every(match => match && Number(match[2]) === denominator)
        && numerators.every((value, index) => value === index + 1);
      if (!complete) {
        errors.push(`aggregate source job '${aggregate.sourceJobId}' must define complete 1/N..N/N coordinates`);
      }
    }
  }

  const sourceStep = parseNamedSteps(sourceJob).get(aggregate.sourceStepName);
  if (!sourceStep) {
    errors.push(`aggregate source step '${aggregate.sourceStepName}' does not exist in '${aggregate.sourceJobId}'`);
  } else {
    if (stepScalar(sourceStep, 'shell') !== null) {
      errors.push(`aggregate source step '${aggregate.sourceStepName}' cannot override the runner shell`);
    }
    if (stepScalar(sourceStep, 'if') !== null) {
      errors.push(`aggregate source step '${aggregate.sourceStepName}' cannot use a step-level if`);
    }
    if (stepScalar(sourceStep, 'continue-on-error') !== null) {
      errors.push(`aggregate source step '${aggregate.sourceStepName}' cannot use continue-on-error`);
    }
    if (stepRun(sourceStep) !== aggregate.sourceRun) {
      errors.push(`aggregate source step '${aggregate.sourceStepName}' must run '${aggregate.sourceRun}'`);
    }
    const actualWorkingDirectory = stepScalar(sourceStep, 'working-directory');
    if (actualWorkingDirectory !== aggregate.sourceWorkingDirectory) {
      errors.push(`aggregate source step '${aggregate.sourceStepName}' working-directory must remain ${JSON.stringify(aggregate.sourceWorkingDirectory)}`);
    }
    const sourceEnv = nestedScalarMap(sourceStep, 'env', 8) ?? new Map();
    const expectedSourceEnv = new Map(Object.entries(aggregate.sourceEnv));
    if (sourceEnv.size !== expectedSourceEnv.size) {
      errors.push(`aggregate source step '${aggregate.sourceStepName}' env keys must exactly match the manifest`);
    }
    for (const [key, expectedValue] of expectedSourceEnv) {
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
  if (stepScalar(aggregateStep, 'if') !== null) {
    errors.push(`aggregate result step '${aggregate.aggregateStepName}' cannot use a step-level if`);
  }
  if (stepScalar(aggregateStep, 'continue-on-error') !== null) {
    errors.push(`aggregate result step '${aggregate.aggregateStepName}' cannot use continue-on-error`);
  }
  if (stepRun(aggregateStep) !== aggregate.aggregateRun) {
    errors.push(`aggregate result step must run '${aggregate.aggregateRun}' exactly`);
  }
  if (stepScalar(aggregateStep, 'shell') !== null) {
    errors.push(`aggregate result step '${aggregate.aggregateStepName}' cannot override the runner shell`);
  }
  const aggregateEnv = nestedScalarMap(aggregateStep, 'env', 8) ?? new Map();
  const expectedAggregateEnv = new Map([
    ['CLASSIFIER_RESULT', `\${{ ${aggregate.classifierResultExpression} }}`],
    ['EXPECTED_WORK', `\${{ ${aggregate.scopeExpression} }}`],
    ['SOURCE_RESULT', `\${{ ${aggregate.resultExpression} }}`],
  ]);
  if (aggregateEnv.size !== expectedAggregateEnv.size) {
    errors.push('aggregate result step env keys must exactly match the manifest expressions');
  }
  for (const [key, expectedValue] of expectedAggregateEnv) {
    if (aggregateEnv.get(key) !== expectedValue) {
      errors.push(`aggregate result step env '${key}' must consume '${expectedValue}'`);
    }
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
  const pullRequestPolicy = manifest.pullRequestPolicy;
  if (!pullRequestPolicy || typeof pullRequestPolicy !== 'object' || Array.isArray(pullRequestPolicy)) {
    errors.push('manifest pullRequestPolicy must be an object');
  } else {
    const actualFields = Object.keys(pullRequestPolicy).sort();
    const expectedFields = [...PULL_REQUEST_POLICY_FIELDS].sort();
    if (JSON.stringify(actualFields) !== JSON.stringify(expectedFields)) {
      errors.push(`manifest pullRequestPolicy must define exactly: ${expectedFields.join(', ')}`);
    }
    if (!Number.isSafeInteger(pullRequestPolicy.requiredApprovingReviewCount)
      || pullRequestPolicy.requiredApprovingReviewCount < 0) {
      errors.push('manifest pullRequestPolicy requiredApprovingReviewCount must be a non-negative integer');
    }
    for (const field of PULL_REQUEST_POLICY_FIELDS.filter(
      field => field !== 'requiredApprovingReviewCount',
    )) {
      if (typeof pullRequestPolicy[field] !== 'boolean') {
        errors.push(`manifest pullRequestPolicy '${field}' must be boolean`);
      }
    }
    // [DEC-OPS-009 · 2026-08-20] 종전 규칙은 'approval ≥ 1 + 3개 플래그 true 미만은 전부 오류'
    // 였다(= DEC-OPS-007 의 집행부). 단독 운영 결정으로 그 목표가 대체됐다 — reviewer 가
    // 없는 상태에서 그 정책을 원격에 적용하면 자기 PR 을 자기가 승인할 수 없어 모든 병합이
    // 막히고, 명세만 강하게 두면 verify:ops 가 영구 red 로 남아 신호 가치가 죽는다.
    // '약화 금지' 를 '결정된 정책과 정확 일치' 로 바꾼다: 어느 방향의 drift 든 red 다.
    // 완화도, (reviewer 확보 전의) 임의 강화도 이 상수와 결정 기록을 함께 고쳐야만 지나간다.
    for (const [field, decided] of Object.entries(DECIDED_PULL_REQUEST_POLICY)) {
      if (pullRequestPolicy[field] !== decided) {
        errors.push(`manifest pullRequestPolicy '${field}' must equal the decided policy `
          + `(${JSON.stringify(decided)}, DEC-OPS-009) — found ${JSON.stringify(pullRequestPolicy[field])}`);
      }
    }
  }
  if (manifest.requiredChecks.length === 0) {
    errors.push('invalid manifest: requiredChecks must not be empty');
    return errors;
  }

  const jobs = parseWorkflowJobs(ciContent);
  if (jobs.size < 3) {
    errors.push(`workflow job parsing failed: only ${jobs.size} job(s) found`);
  }
  // 60분은 실측으로 30분을 넘은 migration-validate-verify 에만 허용한다. 그 스코프가 전용 잡으로
  //   옮겨졌으므로(DEC-OPS-104) 제품 스코프 잡은 30분 고정이고 60분 표현식은 이관 잡에만 있어야 한다.
  //   둘을 함께 고정해야 "제품 잡에 60분을 주는" 되돌림도 red 가 된다.
  const mutationTimeouts = [
    ['mutation-scope', '30'],
    ['mutation-scope-migration', "${{ matrix.scope == 'migration-validate-verify' && 60 || 30 }}"],
  ];
  for (const [jobId, expected] of mutationTimeouts) {
    const job = jobs.get(jobId) ?? '';
    const declared = [...job.matchAll(/^ {4}timeout-minutes:\s*([^\r\n]*)$/gm)];
    if (declared.length !== 1 || declared[0][1].trim() !== expected) {
      errors.push(`${jobId} timeout must be exactly ${expected}`);
    }
    // 한 스코프가 깨져도 나머지를 끝까지 돌려야 어디까지 무너졌는지 한 번에 본다.
    //   fail-fast 가 true 로 돌아가면 형제 스코프가 취소되고, 그 결과가 없는 채로 집계가 진행된다.
    if (!/^ {6}fail-fast: false$/m.test(job)) {
      errors.push(`${jobId} strategy must keep fail-fast: false`);
    }
  }
  errors.push(...validatePinnedWorkflowUses([{ path: workflowPath, content: ciContent }]));
  if (runShellDefault(ciContent, 0) !== null) {
    errors.push('workflow-level defaults.run.shell cannot override required command execution');
  }

  const changeScopeJob = jobs.get('change-scope');
  if (!changeScopeJob) {
    errors.push("job 'change-scope' must exist and checkout the workflow commit");
  } else {
    errors.push(...checkoutProvenanceErrors(changeScopeJob, 'change-scope'));
  }

  // [2026-09-16 DEC-OPS-104] 조건이 참조하는 분류기 출력이 실제로 선언돼 있어야 한다.
  //   ⚠ 선언이 없으면 표현식은 빈 값으로 평가돼 조건이 **영구 거짓**이 되고, 그 잡은 초록인 채로
  //   영영 건너뛰어진다 — 잡 조건 문자열만 대조하는 검사로는 절대 잡히지 않는 경로다.
  const declaredScopeOutputs = new Set([...(changeScopeJob ?? '')
    .matchAll(/^ {6}([A-Za-z0-9_-]+):\s*\$\{\{\s*steps\./gm)].map((match) => match[1]));
  for (const check of manifest.requiredChecks) {
    for (const source of aggregateSourceList(check).sources) {
      for (const expression of [source?.scopeExpression, source?.sourceJobIf]) {
        if (typeof expression !== 'string') continue;
        const referenced = expression
          .matchAll(/needs\.change-scope\.outputs(?:\.([A-Za-z0-9_-]+)|\['([^']+)'\])/g);
        for (const match of referenced) {
          const name = match[1] ?? match[2];
          if (!declaredScopeOutputs.has(name)) {
            errors.push(`change-scope must declare output '${name}' consumed by '${check.context}'`);
          }
        }
      }
    }
  }

  const secretScanJob = jobs.get('secret-scan');
  if (secretScanJob) {
    const operationalStepName = 'Verify repository operational contracts';
    const operationalStep = parseNamedSteps(secretScanJob).get(operationalStepName);
    if (!operationalStep) {
      errors.push(`required operational contracts step '${operationalStepName}' is missing from job 'secret-scan'`);
    } else {
      if (stepScalar(operationalStep, 'if') !== null) {
        errors.push('required operational contracts step cannot use a step-level if');
      }
      if (stepScalar(operationalStep, 'continue-on-error') !== null) {
        errors.push('required operational contracts step cannot use continue-on-error');
      }
      if (stepScalar(operationalStep, 'shell') !== null) {
        errors.push('required operational contracts step cannot override the runner shell');
      }
      if (stepRun(operationalStep) !== 'npm run test:operational-contracts') {
        errors.push("required operational contracts step must run 'npm run test:operational-contracts' exactly");
      }
    }
  }

  errors.push(...validateCriticalSteps(manifest.criticalSteps, jobs));

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
    errors.push(...checkoutProvenanceErrors(jobBlock, jobId));

    const jobName = directScalar(jobBlock, 'name');
    if (jobName !== null) {
      errors.push(`job-level name override on required job '${jobId}' changes its check context`);
    }
    const continueOnError = directScalar(jobBlock, 'continue-on-error');
    if (continueOnError !== null) {
      errors.push(`job-level continue-on-error on required job '${jobId}' weakens its blocking result`);
    }

    const serializedNeeds = checks.map(check => JSON.stringify(check.needs ?? []));
    const expectedNeedsDefinitions = new Set(serializedNeeds);
    if (expectedNeedsDefinitions.size !== 1) {
      errors.push(`required check mappings for job '${jobId}' disagree on needs`);
    } else {
      const expectedNeeds = JSON.parse(serializedNeeds[0]);
      if (!Array.isArray(expectedNeeds) || expectedNeeds.some(value => typeof value !== 'string' || !value)) {
        errors.push(`required check mappings for job '${jobId}' have invalid needs`);
      } else {
        const actualNeeds = directNeeds(jobBlock);
        if (JSON.stringify(actualNeeds) !== JSON.stringify(expectedNeeds)) {
          errors.push(`required job '${jobId}' needs ${JSON.stringify(expectedNeeds)} but workflow has ${JSON.stringify(actualNeeds)}`);
        }
      }
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

  const shellProtectedJobs = new Set(['change-scope', 'secret-scan']);
  for (const check of manifest.requiredChecks) {
    if (typeof check?.jobId === 'string') shellProtectedJobs.add(check.jobId);
    for (const source of aggregateSourceList(check).sources) {
      if (typeof source?.sourceJobId === 'string') shellProtectedJobs.add(source.sourceJobId);
    }
  }
  for (const jobId of shellProtectedJobs) {
    const job = jobs.get(jobId);
    if (job && runShellDefault(job, 4) !== null) {
      errors.push(`job '${jobId}' defaults.run.shell cannot override required command execution`);
    }
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

export function comparePullRequestPolicy(expectedPolicy, actualPolicy) {
  const errors = [];
  if (!actualPolicy || typeof actualPolicy !== 'object' || Array.isArray(actualPolicy)) {
    return ['pull request policy is missing or unreadable'];
  }
  for (const field of PULL_REQUEST_POLICY_FIELDS) {
    if (actualPolicy[field] !== expectedPolicy?.[field]) {
      errors.push(`pull request policy '${field}' expected ${String(expectedPolicy?.[field])} but found ${String(actualPolicy[field])}`);
    }
  }
  return errors;
}
