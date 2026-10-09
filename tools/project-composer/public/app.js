import { createFinalConfirmation } from './confirm.js';
import { createJobPanel } from './job.js';
import { NAME_RULE_MESSAGE, projectNameIsValid } from './name-rule.js';

const $ = id => document.getElementById(id);
// planPending: 구성 확인을 기다리는 중(변경 직후 대기·요청 중). '다시 생성' 이 막힌 이유를 말할 때 쓴다.
const state = { catalog: null, csrf: '', preset: 'core', selected: new Set(), plan: null, planPending: true,
  version: 0, job: null, polling: null, requestId: null, busy: false, previews: new Map(), notice: '' };
// 계획 단계 검사가 붙이는 요청 오류 코드(서버 REQUEST_ERRORS 와 같다 — 시험이 대조한다). 생성 요청이 이 코드로 거부되면
// 보이던 계획이 더는 맞지 않는다.
const PLAN_REJECTION_CODES = new Set(['INVALID_NAME', 'INVALID_RECIPE', 'SOURCE_CHANGED', 'MENU_SNAPSHOT_STALE', 'CATALOG_DRIFT', 'TOOL_UNAVAILABLE']);
let previewTimer;
// 포커스와 마우스는 따로 기다린다. 마우스가 다른 카드를 지나가도 포커스된 카드의 요청을 지우지 않는다.
const previewTimers = { focus: undefined, hover: undefined };

function text(tag, content, classes = '') {
  const element = document.createElement(tag);
  element.textContent = content;
  if (classes) element.className = classes;
  return element;
}
// 연결이 끊기거나 응답이 JSON 이 아니면 브라우저 영문 오류 대신 한국어로 알린다.
const CONNECTION_FAILED = '생성기 서버에 연결하지 못했습니다. 생성기가 실행 중인지 확인한 뒤 다시 시도해 주세요.';
async function api(path, payload) {
  let response;
  let data;
  try {
    response = await fetch(path, {
      method: payload === undefined ? 'GET' : 'POST', credentials: 'same-origin',
      headers: payload === undefined ? {} : { 'Content-Type': 'application/json', 'X-Composer-CSRF': state.csrf },
      body: payload === undefined ? undefined : JSON.stringify(payload),
    });
    data = await response.json();
  } catch { throw new Error(CONNECTION_FAILED); }
  if (!response.ok) {
    // 서버 오류는 코드·행동·입력 칸·세부 정보를 함께 준다(설계서 14.2). 연결 실패에는 status 가 없다.
    const failure = data?.error ?? {};
    throw Object.assign(new Error(failure.message ?? '요청에 실패했습니다. 잠시 후 다시 시도해 주세요.'),
      { status: response.status, code: failure.code, action: failure.action, field: failure.field, details: failure.details });
  }
  return data;
}
/*
 * 오류의 행동(action)을 버튼으로 잇는다. 행동 영역은 상태 문장(live region) 밖에 두어, 문장은 한 번만 읽히고 버튼은 Tab 으로 닿는다.
 * reload-source: 입력을 둔 채 기능 목록을 새 원본으로 다시 받는다. copy-command: 서버가 준 명령을 보이고 복사한다.
 * show-violations: 접힌 개발자 정보에 첫 위반을 보인다. focus-name: 이름 칸에 문장을 달고(명시 동작일 때만) 포커스를 옮긴다.
 */
function renderFailureActions(container, error, { focus = false, onReload = reloadCatalog } = {}) {
  container.replaceChildren();
  container.hidden = true;
  if (error?.action === 'focus-name') {
    $('project-name').setAttribute('aria-invalid', 'true');
    $('name-error').textContent = error.message; $('name-error').hidden = false;
    if (focus) $('project-name').focus();
    return;
  }
  if (error?.action === 'reload-source') {
    const button = text('button', '새 원본으로 다시 불러오기', 'rounded-lg border border-line px-3 py-1.5 text-sm font-semibold');
    button.type = 'button';
    button.addEventListener('click', () => onReload({ focus: true }));
    container.append(button);
  } else if (error?.action === 'copy-command' && typeof error.details?.command === 'string') {
    const command = text('code', error.details.command, 'block break-all rounded-lg border border-line px-3 py-2 font-mono text-xs');
    const button = text('button', '명령 복사', 'mt-2 rounded-lg border border-line px-3 py-1.5 text-sm font-semibold');
    button.type = 'button';
    const status = text('span', '', 'ml-3 text-xs text-muted');
    status.setAttribute('role', 'status');
    button.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(error.details.command); status.textContent = '복사했습니다.'; }
      catch { status.textContent = '복사하지 못했습니다. 명령을 직접 선택해 복사해 주세요.'; }
    });
    container.append(command, button, status);
  } else if (error?.action === 'show-violations' && Array.isArray(error.details?.violations) && error.details.violations.length) {
    const details = document.createElement('details');
    details.append(text('summary', '개발자 정보', 'cursor-pointer text-sm font-semibold'),
      text('p', '선언 검사는 첫 위반에서 멈춥니다. 이 위반을 고친 뒤에도 다른 위반이 나올 수 있습니다.', 'mt-2 text-xs text-muted'),
      text('code', error.details.violations[0], 'mt-2 block break-all font-mono text-xs'));
    container.append(details);
  }
  container.hidden = container.childElementCount === 0;
}
// 세션 응답을 화면에 적용한다. 원본 표시·프리셋 목록·CSRF 를 바꾸고, 새 목록에 없는 직접 선택은 뺀다.
// 뺀 기능과 사라진 시작 구성은 조용히 버리지 않고 알릴 문장으로 돌려준다.
function applySession(session) {
  const previous = state.catalog;
  const previousLabel = id => previous?.capabilities.find(item => item.id === id)?.label ?? id;
  state.catalog = session.catalog; state.csrf = session.csrfToken;
  $('preset').replaceChildren(...state.catalog.presets.map(item => {
    const option = document.createElement('option'); option.value = item.id; option.textContent = presetLabel(item); return option;
  }));
  const custom = document.createElement('option'); custom.value = 'custom'; custom.textContent = '직접 선택'; $('preset').append(custom);
  $('source-ref').textContent = state.catalog.sourceRef === state.catalog.sourceCommit
    ? state.catalog.sourceCommit.slice(0, 12)
    : state.catalog.sourceCommit ? `${state.catalog.sourceRef} · ${state.catalog.sourceCommit.slice(0, 12)}` : state.catalog.sourceRef;
  const droppedPreset = state.preset !== 'custom' && !state.catalog.presets.some(item => item.id === state.preset) ? state.preset : null;
  if (droppedPreset) state.preset = 'custom';
  $('preset').value = state.preset;
  const known = new Set(state.catalog.capabilities.map(item => item.id));
  const dropped = [...state.selected].filter(id => !known.has(id));
  state.selected = new Set([...state.selected].filter(id => known.has(id)));
  const notes = [];
  if (droppedPreset) notes.push(`새 원본에 없는 시작 구성(${previous?.presentation?.presets?.[droppedPreset]?.label ?? droppedPreset})을 직접 선택으로 바꿨습니다.`);
  if (dropped.length) notes.push(`새 원본에 없는 기능을 선택에서 뺐습니다: ${dropped.map(previousLabel).join(', ')}.`);
  return notes.join(' ');
}
// 계획을 거둔다(생성 요청 거부·다시 불러오기 실패). 진행 중 확인과 카드 미리보기도 버리고, 카드는 계획 없이 다시 그린다.
// 진행 중 확인이 버려지면 그 확인이 '구성 다시 확인' 을 다시 열지 않으므로 여기서 연다.
function withdrawPlan() {
  state.version += 1; state.plan = null; state.previews.clear();
  clearPlanNotes();
  // 거둔 계획의 개수·메뉴·경고·생성 위치도 남기지 않는다(계산할 수 없다는 문장 옆에 계산된 값이 남지 않게).
  for (const id of ['domain-count', 'table-count', 'menu-count']) $(id).textContent = '—';
  $('plan-warnings').replaceChildren(); $('menu-preview').replaceChildren(); $('output-hint').textContent = '';
  $('generate').disabled = true; $('download-recipe').disabled = true; $('preview').disabled = false;
  renderFeatures();
}
// 다시 불러오기로 바뀐 선택을 알리는 문장은 다음 구성 변경 전까지 계획 상태 줄에 함께 싣는다.
function withNotice(sentence) {
  return state.notice ? `${sentence} ${state.notice}` : sentence;
}
// 원본이 바뀌었을 때: 이름·선택·구조는 그대로 두고 기능 목록과 원본 표시만 새로 받은 뒤 구성을 다시 확인한다.
// (connect 는 진행 중 작업의 입력으로 화면을 덮으므로 쓰지 않는다.)
async function reloadCatalog({ focus = false } = {}) {
  if (state.busy) return;
  // 누른 버튼이 곧 사라지므로 포커스를 요약 제목으로 옮긴다(키보드·화면 낭독기 사용자가 위치를 잃지 않게).
  if (focus) $('summary-heading').focus();
  $('plan-actions').replaceChildren(); $('plan-actions').hidden = true;
  // 원본이 바뀐 것을 알았으므로 다시 받는 동안 옛 계획으로 생성하거나 저장하지 못하게 먼저 거둔다.
  withdrawPlan();
  $('plan-status').textContent = '기능 목록을 새 원본으로 다시 불러오고 있습니다…';
  try {
    const session = await api('/api/session');
    const notice = applySession(session);
    if (state.preset !== 'custom') state.selected = new Set(state.catalog.presets.find(item => item.id === state.preset)?.domains ?? []);
    changed(); renderFeatures();
    // 빠진 기능 안내는 다음 계획을 기다리지 않고 바로 알린다(그사이 구성을 바꿔도 사용자가 들었다).
    state.notice = notice;
    $('plan-status').textContent = withNotice('변경한 구성을 확인하고 있습니다…');
  } catch (error) {
    // 새 목록을 받지 못했으면 보이던 계획도 믿을 수 없다. 계획을 거두고 생성·저장을 잠근다.
    withdrawPlan();
    $('plan-status').textContent = error.message;
    renderFailureActions($('plan-actions'), error);
  }
}
function recipe() {
  return { schemaVersion: 1, project: { name: $('project-name').value.trim() }, sourceRef: state.catalog.sourceRef,
    selection: state.preset === 'custom' ? { domains: [...state.selected].sort() } : { preset: state.preset },
    database: { vendor: $('database').value }, backendLayout: document.querySelector('input[name="layout"]:checked').value };
}
// 서버·해석기와 같은 규칙(name-rule.js)이다. 예약 이름(con 등)은 요청을 보내기 전에 막는다.
function nameIsValid() {
  return projectNameIsValid($('project-name').value.trim());
}
function validateName(focus = false) {
  const valid = nameIsValid();
  $('project-name').setAttribute('aria-invalid', String(!valid));
  $('name-error').hidden = valid;
  $('name-error').textContent = valid ? '' : NAME_RULE_MESSAGE;
  if (!valid && focus) $('project-name').focus();
  return valid;
}
function label(id) { return state.catalog.capabilities.find(item => item.id === id)?.label ?? id; }
function presetLabel(preset) {
  const count = preset.domains.length;
  return `${state.catalog.presentation.presets[preset.id].label} · ${count ? `업무 기능 ${count}개` : '업무 기능 없음'}`;
}
// 검색어는 기능 이름·요약·영역 이름에서 찾는다. 대소문자와 앞뒤 공백은 무시한다.
function matchesSearch(item, area) {
  const query = $('capability-search').value.trim().toLowerCase();
  if (!query) return true;
  return [item.label, state.catalog.presentation.summaries[item.id], area.label, item.id].join(' ').toLowerCase().includes(query);
}
function capabilityCard(item, { automatic, included }) {
  const row = text('label', '', 'flex cursor-pointer items-start gap-3 rounded-xl border border-line p-4 has-[:checked]:border-accent has-[:checked]:bg-accent-soft');
  const input = document.createElement('input');
  input.type = 'checkbox'; input.value = item.id; input.id = `capability-${item.id}`;
  input.className = 'mt-1 shrink-0 accent-accent';
  input.checked = included.has(item.id);
  input.disabled = item.available === false || automatic.has(item.id);
  // 이름은 기능 이름만이다. 요약과 배지는 설명으로 한 번만 읽힌다.
  input.setAttribute('aria-labelledby', `title-${item.id}`);
  input.setAttribute('aria-describedby', `reason-${item.id} badges-${item.id} preview-${item.id}`);
  const content = text('span', '', 'min-w-0');
  const title = text('span', item.label, 'block text-sm font-semibold');
  title.id = `title-${item.id}`;
  content.append(title);
  const reason = automatic.get(item.id);
  const summary = state.catalog.presentation.summaries[item.id];
  const description = text('span', item.available === false ? '아직 선택할 수 없는 기능입니다.' : reason ? `자동 포함 · ${reason}` : summary, 'mt-1 block text-xs leading-5 text-muted');
  description.id = `reason-${item.id}`;
  // 배지는 카탈로그가 실제로 소유한 수를 보인다(테이블이 없는 기능은 0 이다). 화면은 리다이렉트 별칭을 빼고 센다.
  const badges = text('span', `테이블 ${item.database.tables.length} · 화면 ${state.catalog.presentation.screens[item.id]} · 권한 ${item.permissionCodes.length}`, 'mt-2 block text-xs text-muted');
  badges.id = `badges-${item.id}`;
  if (item.requirements.length) badges.append(text('span', `외부 설정: ${item.requirements.join(', ')}`, 'mt-1 block font-medium text-ink'));
  // 고르거나 빼면 무엇이 늘고 주는지 미리 보인다(설계서 10장·E3). 자동 포함 카드는 직접 바꿀 수 없어 보이지 않는다.
  const changeable = item.available !== false && !automatic.has(item.id);
  const preview = text('span', changeable ? state.previews.get(item.id) ?? '' : '', 'mt-1 block break-words text-xs font-medium text-accent');
  preview.id = `preview-${item.id}`;
  preview.hidden = !preview.textContent;
  content.append(description, badges, preview);
  if (changeable) {
    row.addEventListener('focusin', () => requestPreview(item.id, 'focus'));
    row.addEventListener('mouseenter', () => requestPreview(item.id, 'hover'));
  }
  input.addEventListener('change', () => {
    state.preset = 'custom'; $('preset').value = 'custom';
    if (input.checked) state.selected.add(item.id); else state.selected.delete(item.id);
    changed();
  });
  row.append(input, content);
  return row;
}
function renderFeatures() {
  const focusedId = document.activeElement?.id;
  const automatic = new Map((state.plan?.inclusionNotes ?? []).map(note => [note.domain, note.path]));
  const included = new Set(state.plan?.resolvedDomains ?? [...state.selected]);
  const byId = new Map(state.catalog.capabilities.map(item => [item.id, item]));
  const query = $('capability-search').value.trim();
  let visible = 0;
  $('capabilities').replaceChildren();
  // 업무 영역마다 묶음을 하나 두고, 검색에 맞는 기능이 없는 영역은 숨긴다. 숨긴 기능의 선택은 그대로다.
  for (const area of state.catalog.presentation.areas) {
    const group = document.createElement('fieldset');
    group.id = `area-${area.id}`;
    const matched = area.domains.filter(id => matchesSearch(byId.get(id), area));
    visible += matched.length;
    group.hidden = matched.length === 0;
    const legend = text('legend', area.label, 'mb-3 text-sm font-semibold');
    legend.append(text('span', ` ${matched.length}개`, 'ml-1 font-normal text-muted'));
    const cards = text('div', '', 'grid gap-3 sm:grid-cols-2');
    for (const id of area.domains) {
      const card = capabilityCard(byId.get(id), { automatic, included });
      card.hidden = !matched.includes(id);
      cards.append(card);
    }
    group.append(legend, cards);
    $('capabilities').append(group);
  }
  if (query && visible === 0) $('capabilities').append(text('p', `‘${query}’에 맞는 기능이 없습니다.`, 'break-all text-sm text-muted'));
  // 계획이 다시 그려질 때마다 같은 결과를 다시 알리지 않도록, 문구가 바뀔 때만 쓴다.
  const status = query ? `‘${query}’ 검색 결과 기능 ${visible}개` : '';
  if ($('capability-search-status').textContent !== status) $('capability-search-status').textContent = status;
  if (focusedId?.startsWith('capability-')) $(focusedId)?.focus({ preventScroll: true });
}
// 계획이 없는 동안(다시 확인 중·실패) 이전 구성의 자동 포함·기능 저하·미배정 권한을 보이지 않는다.
function clearPlanNotes() {
  $('auto-included').replaceChildren();
  $('plan-degraded').hidden = true; $('plan-degraded').replaceChildren();
  $('plan-unassigned').hidden = true; $('plan-unassigned-list').replaceChildren();
}
// 계획 차이를 받아 카드의 미리보기 줄에 넣는다. 구성이 바뀌면(changed) 기억한 결과를 비운다.
// 어느 카드가 자동 포함인지 알아야 하므로 계획을 확인한 뒤에만 묻고(계획이 도착해 카드를 다시 그리면 포커스가
// 돌아오며 다시 묻는다), 판정은 요청을 예약한 때의 구성으로 한다. 카드를 누르면 포커스가 먼저 요청을 예약하고
// 바로 구성이 바뀌는데, 그 요청이 계획 확인 전의 새 구성으로 나가면 곧 자동 포함될 카드에 문장이 붙는다.
function requestPreview(id, source) {
  if (state.busy || !state.plan || !nameIsValid()) return;
  if (state.previews.has(id)) return;
  clearTimeout(previewTimers[source]);
  const version = state.version;
  previewTimers[source] = setTimeout(async () => {
    if (version !== state.version) return;
    try {
      const { diff } = await api('/api/plan/diff', { recipe: recipe(), domain: id });
      if (version !== state.version) return;
      state.previews.set(id, diff.summary);
      const target = $(`preview-${id}`);
      if (target) { target.textContent = diff.summary; target.hidden = false; }
      // 포커스를 받은 뒤에 도착한 설명은 화면 낭독기가 읽지 않는다. 그 카드에 포커스가 있으면 한 번 알린다.
      if (document.activeElement?.id === `capability-${id}`) $('capability-preview-status').textContent = `${label(id)}: ${diff.summary}`;
    } catch { /* 미리보기는 보조 정보다. 실패하면 줄을 비워 둔다. */ }
  }, 120);
}
function changed() {
  state.version += 1; state.plan = null; state.requestId = null; state.previews.clear(); state.notice = '';
  // 이미 그려진 미리보기 줄도 비운다. 옛 구성 기준 문장이 새 구성 위에 남지 않게 한다.
  for (const line of $('capabilities').querySelectorAll('[id^="preview-"]')) { line.textContent = ''; line.hidden = true; }
  $('capability-preview-status').textContent = '';
  clearPlanNotes();
  $('generate').disabled = true; $('download-recipe').disabled = true;
  $('plan-status').textContent = '변경한 구성을 확인하고 있습니다…';
  $('plan-actions').replaceChildren(); $('plan-actions').hidden = true;
  state.planPending = true; onPlanChange();
  $('summary-heading').textContent = $('project-name').value.trim() || '구성을 확인하세요';
  clearTimeout(previewTimer);
  previewTimer = setTimeout(() => preview(false), 250);
}
// 자동 포함: 경로 사슬과 사용자 문장, 해제 방법을 보이고 개발자 근거(종류·파일)는 한 번 더 접는다(E2).
function renderInclusions(notes) {
  const host = $('auto-included');
  // 같은 구성을 다시 확인해도 사용자가 펼친 설명과 키보드 포커스는 그 자리에 남긴다.
  const opened = new Set([...host.querySelectorAll('details[open]')].map(node => node.dataset.key));
  const focusKey = host.contains(document.activeElement) ? document.activeElement.dataset.key : undefined;
  const keyed = (element, key) => { element.dataset.key = key; return element; };
  host.replaceChildren();
  if (!notes.length) return;
  host.append(text('p', `함께 포함되는 기능 ${notes.length}개`, 'font-semibold'));
  for (const note of notes) {
    const item = text('div', '', 'rounded-xl border border-dashed border-line p-3');
    item.id = `auto-${note.domain}`;
    const title = text('p', note.label, 'font-medium');
    title.append(text('span', '자동 포함', 'ml-2 text-xs font-normal text-muted'));
    item.append(title, text('p', note.path, 'text-xs text-muted'));
    const why = keyed(document.createElement('details'), `why-${note.domain}`);
    why.className = 'mt-2';
    why.open = opened.has(why.dataset.key);
    why.append(keyed(text('summary', '왜 포함됐나', 'cursor-pointer text-xs font-semibold'), `why-summary-${note.domain}`));
    const steps = text('ul', '', 'mt-2 space-y-1 text-xs');
    steps.append(...note.steps.map(step => text('li', step.text)));
    const removal = text('p', note.removal, 'mt-2 text-xs');
    removal.id = `removal-${note.domain}`;
    const drop = keyed(text('button', `${note.roots.map(label).join(', ')} 해제하기`,
      'mt-2 rounded-lg border border-line px-3 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50'), `drop-${note.domain}`);
    drop.type = 'button';
    drop.setAttribute('aria-describedby', removal.id);
    drop.addEventListener('click', () => {
      state.preset = 'custom'; $('preset').value = 'custom';
      for (const root of note.roots) state.selected.delete(root);
      changed(); renderFeatures();
      // 해제한 기능이 검색으로 가려져 있으면 포커스를 둘 곳이 없다. 검색을 비워 그 카드를 보인다.
      if ($(`capability-${note.roots[0]}`)?.closest('[hidden]')) { $('capability-search').value = ''; renderFeatures(); }
      $(`capability-${note.roots[0]}`)?.focus();
    });
    const evidence = keyed(document.createElement('details'), `evidence-${note.domain}`);
    evidence.className = 'mt-2';
    evidence.open = opened.has(evidence.dataset.key);
    evidence.append(keyed(text('summary', '개발자 근거', 'cursor-pointer text-xs text-muted'), `evidence-summary-${note.domain}`));
    const files = text('ul', '', 'mt-1 space-y-1 text-xs text-muted');
    files.append(...note.steps.map(step => {
      const row = text('li', `${label(step.from)} → ${label(step.to)} · ${step.evidence.join(' · ')}`);
      row.append(...step.files.map(file => text('code', file, 'block break-all font-mono')));
      return row;
    }));
    evidence.append(files);
    why.append(steps, removal, drop, evidence);
    item.append(why);
    host.append(item);
  }
  if (focusKey) host.querySelector(`[data-key="${focusKey}"]`)?.focus({ preventScroll: true });
}
function renderPlan() {
  const plan = state.plan;
  $('domain-count').textContent = String(plan.resolvedDomains?.length ?? 0);
  $('table-count').textContent = String(plan.tables?.length ?? 0);
  $('menu-count').textContent = String(plan.menus?.length ?? 0);
  $('summary-heading').textContent = recipe().project.name;
  const blockers = plan.blockers ?? [];
  $('plan-status').textContent = withNotice(blockers.length ? '이 구성은 생성할 수 없습니다. 아래 사유를 확인해 주세요.' : '포함 범위를 확인했습니다. 이 구성으로 생성할 수 있습니다.');
  $('output-hint').textContent = plan.outputDirectory ? `생성 위치 · ${plan.outputDirectory}` : '생성 위치 · 원본 프로젝트의 build/project-composer 아래 새 폴더';
  renderInclusions(plan.inclusionNotes ?? []);
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
  if (!validateName(focus)) { state.planPending = false; $('plan-status').textContent = '프로젝트 이름을 확인해 주세요.'; return; }
  const version = state.version;
  state.planPending = true;
  $('preview').disabled = true;
  $('plan-actions').replaceChildren(); $('plan-actions').hidden = true;
  try {
    const { plan } = await api('/api/plan', { recipe: recipe() });
    if (version !== state.version) return;
    state.plan = plan; renderPlan();
  } catch (error) {
    if (version === state.version) {
      state.plan = null; clearPlanNotes(); $('generate').disabled = true;
      // 이름 오류는 상태 문장을 짧게 두고 문장 전체는 이름 칸에 단다(같은 문장이 두 번 읽히지 않게).
      $('plan-status').textContent = withNotice(error.action === 'focus-name' ? '프로젝트 이름을 확인해 주세요.' : error.message);
      renderFailureActions($('plan-actions'), error, { focus });
    }
  } finally {
    if (version === state.version) { $('preview').disabled = false; state.planPending = false; onPlanChange(); }
  }
}
function busy(value) {
  state.busy = value;
  $('configuration').disabled = value; $('preview').disabled = value;
  // 자동 포함 설명의 해제 버튼은 잠기는 구성 영역 밖에 있다. 생성 중에는 선택을 바꾸지 못하게 함께 잠근다.
  // 생성 중에는 계획을 다시 그리지 않으므로(preview 가 바로 돌아간다) 이미 그려진 버튼만 잠그면 된다.
  for (const button of $('auto-included').querySelectorAll('button')) button.disabled = value;
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
function downloadRecipe() {
  const value = state.job?.status === 'succeeded' && !state.plan ? state.job.recipe : recipe();
  const url = URL.createObjectURL(new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: 'application/json' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${value.project.name}.recipe.json`;
  document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function connect() {
  $('connection-error').hidden = true; $('loading').hidden = false;
  $('connection-actions').replaceChildren(); $('connection-actions').hidden = true;
  try {
    const session = await api('/api/session');
    applySession(session);
    state.selected = new Set(state.catalog.presets.find(item => item.id === state.preset)?.domains ?? state.selected);
    $('workspace').hidden = false; renderFeatures();
    if (session.job) { restoreRecipe(session.job.recipe); renderJob(session.job); if (session.job.status === 'running') await pollJob(); else await preview(false); }
    else await preview(false);
  } catch (error) {
    // 서버가 답한 오류(선언 불일치·낡은 메뉴 자료·도구 없음 등)는 그 문장과 행동을 보인다. 연결 자체가 안 될 때만 서버 실행을 안내한다.
    // 일반 실패 문장('입력은 유지됩니다')은 아직 입력 화면이 없는 첫 화면에 맞지 않아 따로 말한다.
    $('connection-message').textContent = !error.status ? '로컬 생성기에 연결하지 못했습니다. 생성기 서버가 실행 중인지 확인해 주세요.'
      : error.code === 'INTERNAL_ERROR' ? '기능 목록을 불러오지 못했습니다. 잠시 후 다시 연결해 주세요.' : error.message;
    if (error.status) renderFailureActions($('connection-actions'), error, { onReload: connect });
    $('connection-error').hidden = false;
  } finally { $('loading').hidden = true; }
}
$('composer-form').addEventListener('submit', event => { event.preventDefault(); preview(true); });
$('project-name').addEventListener('input', changed);
// 검색은 보이는 카드만 바꾼다. 선택과 계획은 그대로다. 한글 조합 중(ㄱ→겨→결)에는 거르지 않고 조합이 끝나면 거른다.
$('capability-search').addEventListener('input', event => { if (state.catalog && !event.isComposing) renderFeatures(); });
$('capability-search').addEventListener('compositionend', () => { if (state.catalog) renderFeatures(); });
// 검색칸의 Enter 는 구성 확인 폼을 제출하지 않는다.
$('capability-search').addEventListener('keydown', event => { if (event.key === 'Enter' && !event.isComposing) event.preventDefault(); });
$('preset').addEventListener('change', () => {
  state.preset = $('preset').value;
  if (state.preset !== 'custom') state.selected = new Set(state.catalog.presets.find(item => item.id === state.preset).domains);
  changed(); renderFeatures();
});
for (const input of document.querySelectorAll('input[name="layout"]')) input.addEventListener('change', changed);
// 작업 영역(진행·결과·실패와 그 행동). 실패의 다시 생성·다시 점검은 아래 확인 창을 연다(창은 그 뒤에 만들어진다).
const { renderJob, pollJob, generate, onPlanChange } = createJobPanel({ $, text, api, state, busy, preview, recipe, validateName, withdrawPlan, restoreRecipe,
  renderFailureActions, planRejectionCodes: PLAN_REJECTION_CODES, openConfirmation: () => confirmation.open() });
// 생성 버튼은 곧바로 생성하지 않고 최종 확인 창(환경 점검·소스 정밀 점검·구성 요약)을 연다.
const confirmation = createFinalConfirmation({ $, text, api, recipe, label, state, validateName, generate, renderFailureActions, reloadCatalog });
$('generate').addEventListener('click', () => confirmation.open());
$('download-recipe').addEventListener('click', downloadRecipe);
$('retry-status').addEventListener('click', pollJob);
$('reconnect').addEventListener('click', connect);
connect();
