const $ = id => document.getElementById(id);
const state = { catalog: null, csrf: '', preset: 'core', selected: new Set(), plan: null,
  version: 0, job: null, polling: null, requestId: null, busy: false };
let previewTimer;

function text(tag, content, classes = '') {
  const element = document.createElement(tag);
  element.textContent = content;
  if (classes) element.className = classes;
  return element;
}
async function api(path, payload) {
  const response = await fetch(path, {
    method: payload === undefined ? 'GET' : 'POST', credentials: 'same-origin',
    headers: payload === undefined ? {} : { 'Content-Type': 'application/json', 'X-Composer-CSRF': state.csrf },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message ?? '요청에 실패했습니다. 잠시 후 다시 시도해 주세요.');
  return data;
}
function recipe() {
  return { schemaVersion: 1, project: { name: $('project-name').value.trim() }, sourceRef: state.catalog.sourceRef,
    selection: state.preset === 'custom' ? { domains: [...state.selected].sort() } : { preset: state.preset },
    database: { vendor: $('database').value }, backendLayout: document.querySelector('input[name="layout"]:checked').value };
}
function validateName(focus = false) {
  const name = $('project-name').value.trim();
  const valid = name.length <= 63 && /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(name);
  $('project-name').setAttribute('aria-invalid', String(!valid));
  $('name-error').hidden = valid;
  $('name-error').textContent = valid ? '' : '영문 소문자로 시작하는 이름을 입력해 주세요. 최대 63자이며 하이픈은 영문·숫자 사이에 사용할 수 있습니다.';
  if (!valid && focus) $('project-name').focus();
  return valid;
}
function label(id) { return state.catalog.capabilities.find(item => item.id === id)?.label ?? id; }
function renderFeatures() {
  const focusedId = document.activeElement?.id;
  const automatic = new Map((state.plan?.autoIncluded ?? []).map(item => [item.domain, item.reason]));
  const included = new Set(state.plan?.resolvedDomains ?? [...state.selected]);
  $('capabilities').replaceChildren();
  for (const item of state.catalog.capabilities) {
    const row = text('label', '', 'flex cursor-pointer items-start gap-3 rounded-xl border border-line p-4 has-[:checked]:border-accent has-[:checked]:bg-accent-soft');
    const input = document.createElement('input');
    input.type = 'checkbox'; input.value = item.id; input.id = `capability-${item.id}`;
    input.className = 'mt-1 shrink-0 accent-accent';
    input.checked = included.has(item.id);
    input.disabled = item.available === false || automatic.has(item.id);
    input.setAttribute('aria-describedby', `reason-${item.id}`);
    const content = text('span', '', 'min-w-0');
    content.append(text('span', item.label, 'block text-sm font-semibold'));
    const reason = automatic.get(item.id);
    const description = text('span', item.available === false ? '아직 선택할 수 없는 기능입니다.' : reason ? `자동 포함 · ${reason}` : item.description ?? '', 'mt-1 block text-xs leading-5 text-muted');
    description.id = `reason-${item.id}`;
    content.append(description);
    input.addEventListener('change', () => {
      state.preset = 'custom'; $('preset').value = 'custom';
      if (input.checked) state.selected.add(item.id); else state.selected.delete(item.id);
      changed();
    });
    row.append(input, content); $('capabilities').append(row);
  }
  if (focusedId?.startsWith('capability-')) $(focusedId)?.focus({ preventScroll: true });
}
// 계획이 없는 동안(다시 확인 중·실패) 이전 구성의 기능 저하·미배정 권한을 보이지 않는다.
function clearPlanNotes() {
  $('plan-degraded').hidden = true; $('plan-degraded').replaceChildren();
  $('plan-unassigned').hidden = true; $('plan-unassigned-list').replaceChildren();
}
function changed() {
  state.version += 1; state.plan = null; state.requestId = null;
  clearPlanNotes();
  $('generate').disabled = true; $('download-recipe').disabled = true;
  $('plan-status').textContent = '변경한 구성을 확인하고 있습니다…';
  $('summary-heading').textContent = $('project-name').value.trim() || '구성을 확인하세요';
  clearTimeout(previewTimer);
  previewTimer = setTimeout(() => preview(false), 250);
}
function renderPlan() {
  const plan = state.plan;
  $('domain-count').textContent = String(plan.resolvedDomains?.length ?? 0);
  $('table-count').textContent = String(plan.tables?.length ?? 0);
  $('menu-count').textContent = String(plan.menus?.length ?? 0);
  $('summary-heading').textContent = recipe().project.name;
  const blockers = plan.blockers ?? [];
  $('plan-status').textContent = blockers.length ? '이 구성은 생성할 수 없습니다. 아래 사유를 확인해 주세요.' : '포함 범위를 확인했습니다. 이 구성으로 생성할 수 있습니다.';
  $('output-hint').textContent = plan.outputDirectory ? `생성 위치 · ${plan.outputDirectory}` : '생성 위치 · 원본 프로젝트의 build/project-composer 아래 새 폴더';
  $('auto-included').replaceChildren(...(plan.autoIncluded ?? []).map(item => text('p', `${label(item.domain)} · ${item.reason}`)));
  $('plan-warnings').replaceChildren(...blockers.map(blocker => text('p', blocker, 'font-semibold text-danger')), ...(plan.warnings ?? []).map(warning => text('p', warning)));
  // 기능 저하와 미배정 권한은 생성을 막지 않는 안내다. 생성 버튼은 차단 사유로만 막힌다.
  const notes = plan.degradationNotes ?? [];
  $('plan-degraded').hidden = notes.length === 0;
  $('plan-degraded').replaceChildren(...notes.flatMap(group => [text('p', group.heading, 'font-semibold'),
    ...group.reasons.map(row => text('p', row.reason, 'text-muted'))]));
  const unassigned = plan.unassignedPermissions ?? [];
  $('plan-unassigned').hidden = unassigned.length === 0;
  $('plan-unassigned-summary').textContent = `생성 뒤 직접 배정할 권한 ${unassigned.length}개`;
  $('plan-unassigned-list').replaceChildren(...unassigned.map(row => {
    const item = document.createElement('li');
    item.append(text('span', row.name, 'block font-medium'), text('span', `${row.effect} ${row.howToAssign}`, 'block text-xs leading-6 text-muted'));
    return item;
  }));
  $('menu-preview').replaceChildren(...(plan.menus ?? []).map(menu => {
    const row = document.createElement('li');
    row.append(text('span', menu.label ?? menu.name ?? menu.id, 'block font-medium'));
    if (menu.path) row.append(text('span', menu.path, 'block break-all text-xs text-muted'));
    return row;
  }));
  if (!plan.menus?.length) $('menu-preview').append(text('li', '포함된 메뉴가 없습니다.'));
  $('generate').disabled = state.busy || blockers.length > 0; $('download-recipe').disabled = false;
  renderFeatures();
}
async function preview(focus) {
  clearTimeout(previewTimer);
  if (state.busy || !state.catalog) return;
  if (!validateName(focus)) { $('plan-status').textContent = '프로젝트 이름을 확인해 주세요.'; return; }
  const version = state.version;
  $('preview').disabled = true;
  try {
    const { plan } = await api('/api/plan', { recipe: recipe() });
    if (version !== state.version) return;
    state.plan = plan; renderPlan();
  } catch (error) {
    if (version === state.version) { state.plan = null; clearPlanNotes(); $('plan-status').textContent = error.message; $('generate').disabled = true; }
  } finally { if (version === state.version) $('preview').disabled = false; }
}
function busy(value) {
  state.busy = value;
  $('configuration').disabled = value; $('preview').disabled = value;
  $('generate').disabled = value || !state.plan;
  $('generate').textContent = value ? '프로젝트 생성 중…' : '프로젝트 생성';
  $('composer-form').setAttribute('aria-busy', String(value));
}
function restoreRecipe(value) {
  $('project-name').value = value.project.name;
  state.preset = value.selection.preset ?? 'custom'; $('preset').value = state.preset;
  state.selected = new Set(value.selection.domains ?? state.catalog.presets.find(item => item.id === state.preset)?.domains ?? []);
  document.querySelector(`input[name="layout"][value="${value.backendLayout}"]`).checked = true;
  renderFeatures();
}
function renderJob(job) {
  state.job = job;
  $('job-panel').hidden = false; $('job-error').hidden = true; $('retry-status').hidden = true;
  $('job-message').textContent = job.message;
  $('job-progress').value = job.progress ?? 0;
  $('job-result').hidden = true;
  if (job.status === 'running') { $('job-heading').textContent = '프로젝트 준비 중'; busy(true); return; }
  busy(false);
  if (job.status === 'failed') {
    state.requestId = null;
    $('job-heading').textContent = '생성을 완료하지 못했습니다';
    $('job-error').replaceChildren(text('p', job.error?.message ?? '입력은 유지됩니다. 상태를 확인한 뒤 다시 생성해 주세요.'));
    const failure = job.failure;
    if (failure?.stageLabel) $('job-error').append(text('p', `실패 단계: ${failure.stageLabel}`, 'mt-2'));
    if (failure?.commandId) {
      $('job-error').append(text('p', `실패 명령: ${failure.commandId} (${Number.isInteger(failure.exitCode) ? `종료 코드 ${failure.exitCode}` : '실행하지 못함'})`, 'mt-1'));
    }
    if (failure?.log) {
      const log = text('p', '실행 로그(비밀값은 가림)', 'mt-2 font-semibold');
      log.append(text('code', failure.log, 'mt-1 block break-all font-mono text-xs font-normal'));
      $('job-error').append(log);
    }
    $('job-error').hidden = false;
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
  busy(true); $('job-panel').hidden = false; $('job-result').hidden = true; $('job-error').hidden = true;
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
    busy(false); $('job-heading').textContent = '생성 요청을 확인해 주세요';
    $('job-error').textContent = error.message; $('job-error').hidden = false;
  }
}
function downloadRecipe() {
  const value = state.job?.status === 'succeeded' && !state.plan ? state.job.recipe : recipe();
  const url = URL.createObjectURL(new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: 'application/json' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${value.project.name}.recipe.json`;
  document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function connect() {
  $('connection-error').hidden = true; $('loading').hidden = false;
  try {
    const session = await api('/api/session');
    state.catalog = session.catalog; state.csrf = session.csrfToken;
    $('preset').replaceChildren(...state.catalog.presets.map(item => {
      const option = document.createElement('option'); option.value = item.id; option.textContent = `${item.label} · ${item.description}`; return option;
    }));
    const custom = document.createElement('option'); custom.value = 'custom'; custom.textContent = '직접 선택'; $('preset').append(custom);
    $('source-ref').textContent = state.catalog.sourceRef === state.catalog.sourceCommit
      ? state.catalog.sourceCommit.slice(0, 12)
      : state.catalog.sourceCommit ? `${state.catalog.sourceRef} · ${state.catalog.sourceCommit.slice(0, 12)}` : state.catalog.sourceRef;
    $('preset').value = state.preset;
    state.selected = new Set(state.catalog.presets.find(item => item.id === state.preset)?.domains ?? state.selected);
    $('workspace').hidden = false; renderFeatures();
    if (session.job) { restoreRecipe(session.job.recipe); renderJob(session.job); if (session.job.status === 'running') await pollJob(); else await preview(false); }
    else await preview(false);
  } catch {
    $('connection-message').textContent = '로컬 생성기에 연결하지 못했습니다. 생성기 서버가 실행 중인지 확인해 주세요.';
    $('connection-error').hidden = false;
  } finally { $('loading').hidden = true; }
}
$('composer-form').addEventListener('submit', event => { event.preventDefault(); preview(true); });
$('project-name').addEventListener('input', changed);
$('preset').addEventListener('change', () => {
  state.preset = $('preset').value;
  if (state.preset !== 'custom') state.selected = new Set(state.catalog.presets.find(item => item.id === state.preset).domains);
  state.plan = null; renderFeatures(); changed();
});
for (const input of document.querySelectorAll('input[name="layout"]')) input.addEventListener('change', changed);
$('generate').addEventListener('click', generate);
$('download-recipe').addEventListener('click', downloadRecipe);
$('retry-status').addEventListener('click', pollJob);
$('reconnect').addEventListener('click', connect);
connect();
