// 생성 작업 영역(설계서 14.2·19장, E4b): 진행·결과·실패를 그린다. 실패 문장은 role=alert(#job-error) 안에 하나만 두고,
// 실패 세부(단계·명령·로그 위치)·행동 버튼·접힌 로그 끝부분은 그 밖의 형제 요소에 둔다. 문장은 한 번만 읽히고 버튼은 Tab 으로 닿는다.
// 지울 때 포커스를 지켜야 하는 영역. '상태 다시 확인' 은 다음 그리기에서 숨겨지므로 함께 본다.
const FAILURE_PARTS = ['job-failure', 'job-actions', 'job-log-tail', 'retry-status'];
const JOB_ACTIONS = Object.freeze({ regenerate: '다시 생성', recheck: '생성 환경 다시 점검', 'copy-diagnostics': '진단 정보 복사' });

/** 걸린 시간을 사람이 읽는 말로. 1초 미만은 0.1초 단위, 1분 미만은 초, 그 위는 분·초(초는 두 자리), 1시간 위는 시간·분. */
export function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '';
  if (ms < 1000) return `${Math.max(0.1, Math.round(ms / 100) / 10)}초`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}초`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}분 ${String(seconds % 60).padStart(2, '0')}초`;
  return `${Math.floor(minutes / 60)}시간 ${String(minutes % 60).padStart(2, '0')}분`;
}
const STATUS_TEXT = Object.freeze({ pending: '대기', running: '진행 중', passed: '완료', failed: '실패', skipped: '건너뜀' });
const STATUS_CLASS = Object.freeze({ pending: 'text-muted', running: 'font-semibold', passed: '', failed: 'font-semibold text-danger', skipped: 'text-muted' });
/** 단계 하나의 상태 문장. 진행 중이면 지금까지 걸린 시간을, 끝났으면 걸린 시간을 붙인다. */
export function timelineStatus(item) {
  const time = item.status === 'running' ? item.elapsedMs : item.durationMs;
  const text = STATUS_TEXT[item.status] ?? '';
  return Number.isFinite(time) && ['running', 'passed', 'failed'].includes(item.status) ? `${text} · ${formatDuration(time)}` : text;
}
/** 경과·남은 시간 한 줄. 남은 시간은 같은 배치로 끝까지 마친 기록이 충분할 때만 숫자로 말한다. */
export function elapsedSentence(job) {
  if (!Number.isFinite(job?.elapsedMs)) return '';
  if (job.status !== 'running') return `걸린 시간 ${formatDuration(job.elapsedMs)}`;
  const estimate = job.estimate;
  let rest = '';
  if (estimate && Number.isFinite(estimate.remainingMs)) {
    rest = estimate.remainingMs > 0 ? ` · 최근 ${estimate.runs}회 기록 기준 약 ${formatDuration(estimate.remainingMs)} 남음`
      : ' · 최근 기록보다 오래 걸리고 있습니다';
  } else if (estimate && Number.isInteger(estimate.minRuns)) {
    rest = ` · 남은 시간은 같은 배치로 끝까지 마친 기록이 ${estimate.minRuns}회 이상이면 알려 드립니다(지금 ${estimate.runs}회)`;
  }
  return `경과 ${formatDuration(job.elapsedMs)}${rest}`;
}

/**
 * 진단 정보(클립보드). 코드·단계·원본 커밋·작업 보고서 위치·파일만 담는다. 문장·로그 끝부분·이 컴퓨터의 경로·선택 정보는 넣지 않는다
 * (클립보드는 이슈 트래커 같은 제3자로 나간다). 값은 모두 서버가 다시 거른 식별자다.
 */
export function jobDiagnostics(job) {
  const failure = job.failure ?? {};
  const files = Array.isArray(job.error?.details?.files) ? job.error.details.files : [];
  const more = Number.isInteger(job.error?.details?.fileCount) ? job.error.details.fileCount - files.length : 0;
  return [`코드: ${job.error?.code ?? 'GENERATION_FAILED'}${failure.step ? `:${failure.step}` : ''}`,
    failure.stage && `단계: ${failure.stage}`, failure.sourceCommit && `원본 커밋: ${failure.sourceCommit}`,
    failure.report && `작업 보고서: ${failure.report}`, ...files.map(file => `파일: ${file}`), more > 0 && `파일: 외 ${more}개`]
    .filter(Boolean).join('\n');
}

/** 화면 모듈(app.js)의 도구를 받아 작업 영역을 연결한다. 확인 창은 늦게 만들어지므로 여는 함수로 받는다. */
export function createJobPanel({ $, text, api, state, busy, preview, recipe, validateName, withdrawPlan, restoreRecipe,
  renderFailureActions, planRejectionCodes, openConfirmation }) {
  // 지난 실패의 세부·버튼·로그를 지운다. 그 안에 있던 포커스(누른 버튼, 확인 창이 닫히며 돌려준 포커스)는 작업 제목으로 옮긴다.
  function clearJobFailure() {
    const focused = FAILURE_PARTS.some(id => $(id).contains(document.activeElement));
    $('job-error').replaceChildren(); $('job-error').hidden = true;
    for (const id of ['job-failure', 'job-actions']) { $(id).replaceChildren(); $(id).hidden = true; }
    $('job-log-tail').open = false; $('job-log-tail').hidden = true; $('job-log-tail-lines').textContent = '';
    if (focused) $('job-heading').focus();
  }
  // 진행 단계 목록. 같은 작업이면 항목을 제자리에서 고친다(매번 새로 만들면 화면 낭독기가 읽던 자리를 잃는다).
  function renderTimeline(job) {
    const list = $('job-timeline');
    if (list.dataset.job !== job.id) { list.replaceChildren(); list.dataset.job = job.id; }
    if (!job.timeline) { list.hidden = true; return; }
    const row = (parent, item) => {
      let element = [...parent.children].find(child => child.dataset.id === item.id);
      if (!element) {
        element = document.createElement('li');
        element.dataset.id = item.id;
        // 상태 색·굵기는 이 줄에만 붙인다(목록 항목에 붙이면 안쪽 검증 단계 목록이 물려받는다).
        const line = document.createElement('span');
        line.dataset.part = 'line';
        const status = text('span', '');
        status.dataset.part = 'status';
        line.append(text('span', item.label ?? item.id), document.createTextNode(' · '), status);
        element.append(line);
        parent.append(element);
      }
      const line = element.querySelector(':scope > [data-part="line"]');
      line.querySelector('[data-part="status"]').textContent = timelineStatus(item);
      line.className = STATUS_CLASS[item.status] ?? '';
      if (item.status === 'running') element.setAttribute('aria-current', 'step'); else element.removeAttribute('aria-current');
      return element;
    };
    for (const stage of job.timeline.stages ?? []) {
      const element = row(list, stage);
      if (stage.id !== 'verify') continue;
      let steps = element.querySelector('ol');
      if (!steps) {
        steps = document.createElement('ol');
        steps.className = 'ml-5 mt-1 space-y-0.5 text-xs';
        steps.setAttribute('aria-label', '검증 단계');
        element.append(steps);
      }
      for (const step of job.timeline.steps ?? []) row(steps, step);
    }
    list.hidden = false;
  }
  function renderProgressDetails(job) {
    const sentence = elapsedSentence(job);
    $('job-elapsed').textContent = sentence; $('job-elapsed').hidden = !sentence;
    renderTimeline(job);
  }
  // 새 요청을 보내는 동안 앞 작업의 단계·시간을 이번 요청의 것처럼 남기지 않는다.
  function clearProgressDetails() {
    $('job-elapsed').textContent = ''; $('job-elapsed').hidden = true;
    $('job-timeline').replaceChildren(); $('job-timeline').hidden = true; delete $('job-timeline').dataset.job;
  }
  function renderFailureDetails(failure) {
    const details = $('job-failure');
    if (failure?.stageLabel) details.append(text('p', `실패 단계: ${failure.stageLabel}${failure.stepLabel ? ` · ${failure.stepLabel}` : ''}`));
    if (failure?.commandId) {
      // 실행조차 못 했는지(도구 없음), 종료 코드 없이 끝났는지(신호·시간 초과)를 구분한다.
      const ended = Number.isInteger(failure.exitCode) ? `종료 코드 ${failure.exitCode}` : failure.notStarted ? '실행하지 못함' : '종료 코드 없이 끝남';
      details.append(text('p', `실패 명령: ${failure.commandId} (${ended})`));
    }
    // 실행 로그와 작업 보고서(실패 원인 문장이 남는 곳)의 위치. 둘 다 원본 저장소 기준이다.
    for (const [key, title] of [['log', '실행 로그(원본 저장소 기준, 비밀값은 가림)'], ['report', '작업 보고서(원본 저장소 기준)']]) {
      if (!failure?.[key]) continue;
      const line = text('p', title, 'font-semibold');
      line.append(text('code', failure[key], 'mt-1 block break-all font-mono text-xs font-normal'));
      details.append(line);
    }
    details.hidden = details.childElementCount === 0;
    if (Array.isArray(failure?.logTail) && failure.logTail.length) {
      $('job-log-tail-lines').textContent = failure.logTail.join('\n');
      $('job-log-tail').hidden = false;
    }
  }
  // 작업 실패의 행동. 다시 생성·다시 점검은 최종 확인 창(환경 점검 포함)을 연다. 그 밖의 행동은 요청 오류와 같은 버튼을 쓴다.
  function renderJobActions(job) {
    const container = $('job-actions');
    const action = job.error?.action;
    if (!Object.hasOwn(JOB_ACTIONS, action)) { renderFailureActions(container, job.error ?? {}); return; }
    container.replaceChildren();
    const button = text('button', JOB_ACTIONS[action], 'rounded-lg border border-line px-3 py-1.5 text-sm font-semibold');
    button.type = 'button';
    const status = text('span', '', 'ml-3 text-xs text-muted');
    status.setAttribute('role', 'status');
    button.addEventListener('click', async () => {
      if (action === 'copy-diagnostics') {
        const value = jobDiagnostics(job);
        container.querySelector('code')?.remove();
        try { await navigator.clipboard.writeText(value); status.textContent = '진단 정보를 복사했습니다.'; }
        catch {
          status.textContent = '복사하지 못했습니다. 아래 진단 정보를 직접 선택해 복사해 주세요.';
          container.append(text('code', value, 'mt-2 block whitespace-pre-wrap break-all rounded-lg border border-line px-3 py-2 font-mono text-xs'));
        }
        return;
      }
      // 확인 창은 생성할 수 있는 구성이 있어야 열린다. 열 수 없으면 그 이유를 말한다(죽은 버튼을 남기지 않는다).
      if ($('generate').disabled) { status.textContent = regenerateBlockedReason(); return; }
      status.textContent = '';
      openConfirmation();
    });
    container.append(button, status);
    container.hidden = false;
  }
  // '다시 생성' 을 지금 열 수 없는 실제 이유. 이름은 칸으로 포커스를 옮기고, 막는 구성·실패한 확인은 구성 요약을 가리킨다.
  function regenerateBlockedReason() {
    if (!validateName(true)) return '프로젝트 이름을 확인해 주세요.';
    if (state.plan?.blockers?.length) return '이 구성은 생성할 수 없습니다. 구성 요약의 사유를 확인해 주세요.';
    if (!state.plan && state.planPending) return '구성 확인이 끝나면 다시 생성할 수 있습니다.';
    return '구성을 확인하지 못했습니다. 구성 요약의 안내를 확인한 뒤 다시 생성해 주세요.';
  }
  // 구성이 다시 확인되면 앞서 말한 '다시 생성' 사유는 더 맞지 않는다. 지운다.
  function onPlanChange() {
    for (const status of $('job-actions').querySelectorAll('[role="status"]')) status.textContent = '';
  }
  function renderJob(job) {
    state.job = job;
    clearJobFailure();
    $('job-panel').hidden = false; $('retry-status').hidden = true;
    // 실패 문장은 #job-error(assertive)에서 한 번만 알린다. 같은 문장을 진행 상태 줄(polite)에 두 번 쓰지 않는다.
    $('job-message').textContent = job.status === 'failed' ? '' : job.message;
    $('job-progress').value = job.progress ?? 0;
    renderProgressDetails(job);
    $('job-result').hidden = true;
    if (job.status === 'running') { $('job-heading').textContent = '프로젝트 준비 중'; busy(true); return; }
    busy(false);
    if (job.status === 'failed') {
      state.requestId = null;
      $('job-heading').textContent = '생성을 완료하지 못했습니다';
      $('job-error').textContent = job.error?.message ?? '입력은 유지됩니다. 상태를 확인한 뒤 다시 생성해 주세요.';
      $('job-error').hidden = false;
      renderFailureDetails(job.failure);
      renderJobActions(job);
    } else if (job.status === 'succeeded') {
      $('job-heading').textContent = '프로젝트가 준비되었습니다';
      $('job-result').replaceChildren(); $('job-result').hidden = false;
      for (const [key, title] of [['projectDirectory', '프로젝트 폴더'], ['databaseDirectory', 'DB 스키마 폴더'], ['reportPath', '검증 보고서']]) {
        if (!job.result?.[key]) continue;
        const paragraph = text('p', title, 'font-semibold');
        paragraph.append(text('code', job.result[key], 'mt-1 block break-all font-mono text-xs font-normal text-muted'));
        $('job-result').append(paragraph);
      }
      $('job-result').append(text('p', job.result?.verified ? '생성 프로젝트의 기술 검증을 통과했습니다. 실행할 DB와 기관 환경은 별도로 설정하세요.' : '검증 완료 여부는 보고서에서 확인해 주세요.', 'text-xs text-muted'));
      $('download-recipe').disabled = false;
    }
  }
  async function pollJob() {
    clearTimeout(state.polling);
    if (!state.job) return;
    try {
      const { job } = await api(`/api/jobs/${state.job.id}`);
      renderJob(job);
      if (job.status === 'running') state.polling = setTimeout(pollJob, 1000);
      else if (!state.plan) await preview(false);
    } catch {
      $('job-error').textContent = '진행 상태에 연결하지 못했습니다. 생성이 계속 진행 중일 수 있습니다. 상태를 다시 확인해 주세요.';
      $('job-error').hidden = false; $('retry-status').hidden = false;
    }
  }
  async function generate() {
    if (state.busy || !state.plan || !validateName(true)) return;
    const selectedRecipe = recipe();
    state.requestId ??= crypto.randomUUID();
    const requestId = state.requestId;
    clearJobFailure(); clearProgressDetails();
    busy(true); $('job-panel').hidden = false; $('job-result').hidden = true;
    $('job-heading').textContent = '프로젝트 준비 중'; $('job-message').textContent = '생성을 요청하고 있습니다…';
    try {
      const { job } = await api('/api/jobs', { recipe: selectedRecipe, requestId });
      renderJob(job); if (job.status === 'running') await pollJob();
    } catch (error) {
      // Recover only this accepted request. A different tab's BUSY job must not replace the form.
      try {
        const session = await api('/api/session');
        if (session.job?.requestId === requestId) {
          restoreRecipe(session.job.recipe); renderJob(session.job);
          if (session.job.status === 'running') await pollJob();
          return;
        }
      } catch { /* The original form and request ID remain available for retry. */ }
      busy(false);
      // 계획 단계 검사가 거부했으면 보이던 계획이 더는 맞지 않는다. 계획을 거두고 문장은 계획 상태 줄에, 행동은 그 옆에 둔다.
      // 작업은 시작되지 않았으므로 작업 영역은 닫는다(이전 작업의 결과·실패를 이번 요청의 결과처럼 다시 알리지 않게).
      if (planRejectionCodes.has(error.code)) {
        withdrawPlan();
        $('job-panel').hidden = true;
        $('plan-status').textContent = error.action === 'focus-name' ? '프로젝트 이름을 확인해 주세요.' : error.message;
        // 확인 창의 생성 시작에서 돌아온 포커스(프로젝트 생성)가 잠기므로 요약 제목으로 옮긴다. 이름 오류는 이름 칸으로 간다.
        if (error.action !== 'focus-name') $('summary-heading').focus();
        renderFailureActions($('plan-actions'), error, { focus: true });
        return;
      }
      $('job-heading').textContent = '생성 요청을 확인해 주세요';
      // 요청하던 중이라는 진행 문장과 앞선 작업의 진행률을 남기지 않는다.
      $('job-message').textContent = ''; $('job-progress').value = 0;
      $('job-error').textContent = error.action === 'focus-name' ? '프로젝트 이름을 확인해 주세요.' : error.message; $('job-error').hidden = false;
      renderFailureActions($('plan-actions'), error, { focus: true });
    }
  }
  return { renderJob, pollJob, generate, onPlanChange };
}
