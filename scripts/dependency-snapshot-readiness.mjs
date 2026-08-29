#!/usr/bin/env node

import { pathToFileURL } from 'node:url';

const SHA_PATTERN = /^[0-9a-f]{40}$/i;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

export function buildRetryDelays(maxWaitSeconds, { initialSeconds = 10, capSeconds = 60 } = {}) {
  if (!Number.isInteger(maxWaitSeconds) || maxWaitSeconds < 0 || maxWaitSeconds > 3600) {
    throw new Error('SNAPSHOT_WAIT_SECONDS must be an integer between 0 and 3600');
  }
  if (!Number.isInteger(initialSeconds) || initialSeconds <= 0 || !Number.isInteger(capSeconds) || capSeconds <= 0) {
    throw new Error('retry delays must be positive integers');
  }

  const delays = [0];
  let remaining = maxWaitSeconds;
  let next = initialSeconds;
  while (remaining > 0) {
    const delay = Math.min(next, capSeconds, remaining);
    delays.push(delay);
    remaining -= delay;
    next = Math.min(next * 2, capSeconds);
  }
  return delays;
}

export function validateSnapshotInputs({ repository, baseSha, headSha, token, apiUrl }) {
  if (!/^[^/\s]+\/[^/\s]+$/.test(repository ?? '')) {
    throw new Error('GITHUB_REPOSITORY must have owner/repository form');
  }
  if (!SHA_PATTERN.test(baseSha ?? '')) {
    throw new Error('BASE_SHA must be a full 40-hex commit SHA');
  }
  if (!SHA_PATTERN.test(headSha ?? '')) {
    throw new Error('HEAD_SHA must be a full 40-hex commit SHA');
  }
  if (!token) {
    throw new Error('GITHUB_TOKEN is required');
  }
  if (!/^https:\/\//i.test(apiUrl ?? '')) {
    throw new Error('GITHUB_API_URL must be an HTTPS URL');
  }
}

export function comparisonUrl({ apiUrl, repository, baseSha, headSha }) {
  const [owner, repo] = repository.split('/').map(encodeURIComponent);
  return `${apiUrl.replace(/\/$/, '')}/repos/${owner}/${repo}/dependency-graph/compare/${baseSha}...${headSha}`;
}

export function decodeSnapshotWarning(rawWarning) {
  if (!rawWarning) return '';
  try {
    return Buffer.from(rawWarning, 'base64').toString('utf8').trim() || rawWarning;
  } catch {
    return rawWarning;
  }
}

/**
 * 경고 문자열을 실패 축으로 분류한다.
 *
 * ⚠ 이 함수가 아는 것은 **어느 쪽 SHA 의 스냅샷이 없는가**뿐이다. head 부재의 하위 원인
 * (producer 미실행·빌드 실패·concurrency 취소·fork 승인 대기·publisher 실패·artifact 만료)은
 * 전부 **글자 그대로 같은 경고**를 내므로 문자열만으로는 절대 갈리지 않는다. 그래서 안내는
 * 원인을 단정하지 않고 가르는 명령을 준다 — 모르는 것을 아는 척하면 잘못된 곳을 고치게 된다.
 *
 * 알 수 없는 경고는 반드시 `unknown` 으로 떨어뜨리고 원문을 그대로 보여 준다. GitHub 이 문구를
 * 바꿨을 때 오분류로 엉뚱한 해소 명령을 권하는 것이 원문을 보여 주는 것보다 나쁘다.
 */
export function classifySnapshotWarning(rawWarning) {
  const warning = (rawWarning ?? '').trim();
  if (!warning) return { kind: 'none', warning };

  // "snapshots compared for the base SHA (0) and the head SHA (1) do not match" — 실측 문자열.
  const counted = /snapshots?\s+compared\s+for\s+the\s+base\s+sha\s*\((\d+)\)\s+and\s+the\s+head\s+sha\s*\((\d+)\)/i.exec(warning);
  if (counted) {
    const baseCount = Number(counted[1]);
    const headCount = Number(counted[2]);
    // ⚠ (0,0) 은 관측된 적이 없고 원리상 나오지 않을 가능성이 크다 — 0 == 0 이면 "do not match"
    //   자체가 성립하지 않는다. 양쪽이 모두 비면 GitHub 이 **경고를 아예 안 보낼** 수 있고
    //   (PR #452: "only repositories that have canonical snapshots will receive warnings"),
    //   그러면 이 스크립트는 ✅ 로 통과한다 — fail-open 축이다. GAP-DEP-001 에 기록했다.
    if (baseCount === 0 && headCount === 0) return { kind: 'both-missing', warning, baseCount, headCount };
    if (baseCount === 0) return { kind: 'base-missing', warning, baseCount, headCount };
    if (headCount === 0) return { kind: 'head-missing', warning, baseCount, headCount };
    // 양쪽 다 있는데 개수가 어긋난다 — 부재가 아니라 correlator/스코프 불일치 쪽이다.
    return { kind: 'count-mismatch', warning, baseCount, headCount };
  }

  // "No snapshots were found for the head SHA <sha>." — 실측 문자열이며, GitHub 자체 액션이
  // 부분 문자열로 특수 처리하는 유일한 경고다(dependency-review-action summary.ts).
  const headAbsent = /no\s+snapshots?\s+(?:were\s+|was\s+)?found\s+for\s+the\s+head\s+sha/i.test(warning);
  // ⚠ base 쪽 전용 문구는 **관측된 적이 없다**(공개 PR 코멘트 279 표본 0건, 액션 소스에도
  //   base special-case 없음). base 부재는 위 count 형태의 숫자로만 나타난다. 이 분기를 남기는
  //   이유는 방어적 파싱이지 관측이 아니다 — 경고 문자열은 비공개 서버가 만들고 문서화돼 있지
  //   않아 언제든 바뀔 수 있고, 매칭되지 않으면 unknown 으로 안전하게 떨어진다.
  const baseAbsent = /no\s+snapshots?\s+(?:were\s+|was\s+)?found\s+for\s+the\s+base\s+sha/i.test(warning);
  if (headAbsent && baseAbsent) return { kind: 'both-missing', warning };
  if (headAbsent) return { kind: 'head-missing', warning };
  if (baseAbsent) return { kind: 'base-missing', warning };

  return { kind: 'unknown', warning };
}

/** 하위 원인을 가르는 조회 명령. 권한을 늘리지 않으려고 스크립트가 직접 부르지 않는다. */
function probeCommand(repository, sha, label) {
  return `  gh api "repos/${repository}/actions/runs?head_sha=${sha}" \\\n`
    + `    --jq '.workflow_runs[] | select(.name=="Gradle Dependency Graph Producer")`
    + ` | "\\(.event) \\(.status)/\\(.conclusion) run=\\(.id)"'   # ${label}`;
}

/**
 * 실패 축별 해소 안내. **기다림이 해소하는가**를 먼저 말한다 — 종전 메시지의 가장 큰 결함이
 * "무엇을 기다려야 하는지 알 수 없다" 였고, head/base 부재는 대부분 기다려도 해소되지 않는다.
 */
export function resolutionGuidance(classification, { repository, baseSha, headSha }) {
  const lines = [];
  switch (classification.kind) {
    case 'base-missing':
      lines.push('❗ base(main) 쪽 의존성 스냅샷이 없습니다. **기다려도 해소되지 않습니다.**');
      lines.push(`   base SHA ${baseSha} 의 push 이벤트에서 producer 가 실행되지 않았을 때 생깁니다.`);
      lines.push('   해소(권한 있는 사람이 1회 실행):');
      lines.push('     gh workflow run dependency-submission.yml --ref main');
      lines.push('   그 뒤 이 PR 의 secret-scan 을 재실행하십시오.');
      break;
    case 'head-missing':
      lines.push('❗ head(PR) 쪽 의존성 스냅샷이 없습니다.');
      lines.push('   PR 직후 잠깐은 정상입니다(producer → publisher 제출까지 보통 2분 이내).');
      lines.push('   제한 시간까지 남아 있다면 **스스로 해소되지 않는 상태**입니다 — 원인이 여러 갈래라');
      lines.push('   문자열만으로는 갈리지 않으므로, 아래로 producer 실행 상태를 먼저 확인하십시오.');
      lines.push(probeCommand(repository, headSha, 'head SHA 의 producer 실행'));
      lines.push('   결과별 해소:');
      lines.push('     · 행이 없다        → 커밋을 하나 더 push 해 producer 를 다시 트리거합니다');
      lines.push("                          git commit --allow-empty -m 'chore(ci): 스냅샷 재트리거' && git push");
      lines.push('     · action_required  → gh api -X POST repos/' + repository + '/actions/runs/<run>/approve');
      lines.push('     · failure/cancelled→ gh run view <run> --log-failed 로 원인을 본 뒤 gh run rerun <run>');
      lines.push('     · success          → publisher 쪽 실패입니다:');
      lines.push('                          gh run list --workflow=dependency-submission-publish.yml --limit 10');
      lines.push('   ⚠ PR 브랜치를 producer 에 dispatch 하지 마십시오 — 그 잡은 contents:write 로 해당');
      lines.push('     브랜치의 Gradle 빌드를 실행하므로 "write 토큰 잡은 PR 코드를 실행하지 않는다" 는');
      lines.push('     이 워크플로의 신뢰 경계를 깹니다. 위 경로는 전부 read-only 잡만 다시 돌립니다.');
      break;
    case 'both-missing':
      lines.push('❗ base·head 양쪽 모두 스냅샷이 없습니다. **기다려도 해소되지 않습니다.**');
      lines.push('   먼저 base 를 만들고(gh workflow run dependency-submission.yml --ref main),');
      lines.push('   그 뒤 head 쪽 producer 실행 상태를 확인하십시오:');
      lines.push(probeCommand(repository, headSha, 'head SHA 의 producer 실행'));
      break;
    case 'count-mismatch':
      lines.push('❗ 양쪽에 스냅샷이 있으나 개수가 어긋납니다(부재가 아닙니다).');
      lines.push(`   base ${classification.baseCount}건 / head ${classification.headCount}건 —`);
      lines.push('   correlator 나 포함 스코프가 갈라졌을 때 생깁니다. producer 의');
      lines.push('   GITHUB_DEPENDENCY_GRAPH_JOB_CORRELATOR 와 DEPENDENCY_GRAPH_RUNTIME_INCLUDE_CONFIGURATIONS 가');
      lines.push('   trusted 잡과 PR 잡에서 같은 값인지 확인하십시오.');
      break;
    default:
      lines.push('❗ 분류되지 않은 스냅샷 경고입니다 — 원문을 그대로 싣습니다.');
      lines.push(`   ${classification.warning}`);
      lines.push('   양쪽 SHA 의 producer 실행부터 확인하십시오:');
      lines.push(probeCommand(repository, baseSha, 'base SHA'));
      lines.push(probeCommand(repository, headSha, 'head SHA'));
      break;
  }
  return lines.join('\n');
}

export async function fetchSnapshotWarning({ fetchImpl = fetch, ...inputs }) {
  const response = await fetchImpl(comparisonUrl(inputs), {
    method: 'GET',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${inputs.token}`,
      'X-GitHub-Api-Version': '2026-03-10',
    },
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    const error = new Error(`dependency review API returned HTTP ${response.status}${detail ? `: ${detail}` : ''}`);
    error.status = response.status;
    throw error;
  }

  const rawWarning = response.headers.get('x-github-dependency-graph-snapshot-warnings')?.trim() ?? '';
  await response.body?.cancel();
  return decodeSnapshotWarning(rawWarning);
}

export async function isPublisherConfiguredOnBase({ apiUrl, repository, baseSha, token, fetchImpl = fetch }) {
  const [owner, repo] = repository.split('/').map(encodeURIComponent);
  const url = `${apiUrl.replace(/\/$/, '')}/repos/${owner}/${repo}/contents/.github/workflows/dependency-submission-publish.yml?ref=${encodeURIComponent(baseSha)}`;
  try {
    const response = await fetchImpl(url, {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2026-03-10',
      },
    });
    if (response.status === 404) {
      await response.body?.cancel();
      return false;
    }
    await response.body?.cancel();
    return true;
  } catch {
    return true;
  }
}

export async function waitForCompleteSnapshots(inputs, {
  maxWaitSeconds = 600,
  fetchImpl = fetch,
  sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)),
  log = console.log,
} = {}) {
  validateSnapshotInputs(inputs);

  const publisherActive = await isPublisherConfiguredOnBase({ ...inputs, fetchImpl });
  if (!publisherActive) {
    log(`ℹ️ dependency-submission-publish.yml is not present on base branch (${inputs.baseSha}) — bootstrap phase allows proceeding.`);
    return;
  }

  const delays = buildRetryDelays(maxWaitSeconds);
  let lastWarning = '';
  let lastError = null;
  let lastKind = '';

  for (let index = 0; index < delays.length; index += 1) {
    const delaySeconds = delays[index];
    if (delaySeconds > 0) await sleep(delaySeconds * 1000);

    try {
      const warning = await fetchSnapshotWarning({ ...inputs, fetchImpl });
      if (!warning) {
        log(`✅ dependency snapshots are complete for ${inputs.baseSha}...${inputs.headSha}`);
        return;
      }
      lastWarning = warning;
      lastError = null;
      log(`⏳ dependency snapshot is not complete yet (${index + 1}/${delays.length})`);
      // 분류는 **처음 한 번만** 남긴다. 매 시도마다 같은 안내를 반복하면 로그가 길어져
      // 정작 마지막 실패 안내가 스크롤 밖으로 밀린다. 축이 바뀌면(head→base 등) 다시 남긴다.
      const kind = classifySnapshotWarning(warning).kind;
      if (kind !== lastKind) {
        lastKind = kind;
        log(resolutionGuidance(classifySnapshotWarning(warning), inputs));
      }
    } catch (error) {
      lastError = error;
      const retryable = error.status === undefined || RETRYABLE_STATUS.has(error.status);
      if (!retryable || index === delays.length - 1) {
        // 마지막 시도가 API 오류로 끝나면 예외 메시지는 HTTP 상태만 말한다. 앞선 시도에서
        // 스냅샷 경고를 이미 봤다면 그 진단이 통째로 사라지므로 던지기 전에 함께 남긴다.
        if (lastWarning) log(resolutionGuidance(classifySnapshotWarning(lastWarning), inputs));
        throw error;
      }
      const cause = error.status === undefined ? 'network error' : `HTTP ${error.status}`;
      log(`⏳ dependency review API is temporarily unavailable (${cause})`);
    }
  }

  // 안내는 log 로 내보내고 예외 메시지 형식은 건드리지 않는다 — required-checks/계약 테스트가
  // 접두사와 경고 원문이 **같은 줄**에 있는 형태를 정규식으로 고정하고 있다.
  // 여기 도달하는 경로는 마지막 시도가 **경고를 반환**한 경우뿐이다 — API 오류로 끝나면 위
  // catch 가 이미 던졌다. 그래서 lastError 분기를 따로 두지 않는다(두면 죽은 코드가 된다).
  if (lastWarning) {
    log(resolutionGuidance(classifySnapshotWarning(lastWarning), inputs));
  }

  const diagnostic = (lastWarning || lastError?.message || 'snapshot warning remained present')
    .replace(/[\r\n]+/g, ' ')
    .slice(0, 500);
  throw new Error(
    `dependency snapshot completeness was not proven within ${maxWaitSeconds}s: ${diagnostic}`,
  );
}

export async function main(env = process.env) {
  const maxWaitSeconds = Number(env.SNAPSHOT_WAIT_SECONDS ?? '600');
  await waitForCompleteSnapshots({
    repository: env.GITHUB_REPOSITORY,
    baseSha: env.BASE_SHA,
    headSha: env.HEAD_SHA,
    token: env.GITHUB_TOKEN,
    apiUrl: env.GITHUB_API_URL ?? 'https://api.github.com',
  }, { maxWaitSeconds });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(`❌ ${error.message}`);
    process.exitCode = 1;
  });
}
