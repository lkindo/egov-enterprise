const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const text = value => typeof value === 'string' ? value : value?.message ?? value?.detail ?? (value?.path && value?.kind ? `확인할 위치: ${value.path} · 차단 유형: ${value.kind}` : JSON.stringify(value));
const list = value => String(value ?? '').split(/[\n,]/).map(item => item.trim()).filter(Boolean);
const lines = value => String(value ?? '').split('\n').map(item => item.trim()).filter(Boolean);
const clone = value => structuredClone(value);
const ordered = value => Array.isArray(value) ? value.map(ordered) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, ordered(value[key])])) : value;
const sameData = (a, b) => JSON.stringify(ordered(a)) === JSON.stringify(ordered(b));
const consentScope = () => ({ backlog: clone(backlog()), context: state.context?.snapshotDigest });
function consentChanged() { throw new Error('동의한 자료 범위가 변경되었습니다. 변경된 자료를 확인한 뒤 실행 화면을 다시 열어 주세요.'); }
function assertConsentScope(scope) { if (scope.context !== state.context?.snapshotDigest || !sameData(scope.backlog, backlog())) consentChanged(); }
async function acceptConsentSource(scope, job) {
  if (sameData(scope.backlog, backlog())) { assertConsentScope(scope); return; }
  const accepted = clone(backlog());
  const source = backlog().sources.find(source => source.id === job.sourceId), before = scope.backlog.sources.find(source => source.id === job.sourceId);
  const rest = pack => { const { contextBindings, ...value } = pack; return { ...value, sources: value.sources.filter(source => source.id !== job.sourceId) }; };
  if (!source || scope.context !== state.context?.snapshotDigest || !sameData(rest(scope.backlog), rest(backlog()))) consentChanged();
  const fixed = value => { const { summary, clauses, ...fields } = value; return fields; };
  if (before && !sameData(fixed(before), fixed(source))) consentChanged();
  if (!job.sourceStateDigest) consentChanged();
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(ordered(source))));
  const digest = [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  if (digest !== job.sourceStateDigest || !sameData(accepted, backlog())) consentChanged();
  scope.backlog = accepted;
}
const id = prefix => `${prefix}-${crypto.randomUUID()}`;
const pages = [ ['overview', '현', '진행 현황'], ['sources', '문', '산출물 수집'], ['requirements', '요', '요구사항 검토'], ['baseline', '기', '분석 기준선'], ['work', '작', '에픽·스토리'], ['handoff', '개', '개발 인계'], ['audit', '검', '검수·감리'] ];
const labels = { proposed: '제안', included: '포함', excluded: '제외', deferred: '보류', question: '질문', merged: '통합', undecided: '미결정', fit: '기존 기능 활용', config: '환경 구성', 'gap-dev': '추가 개발', hybrid: '혼합', pending: '검수 대기', accepted: '인수 기록', conditional: '조건부', rejected: '반려', epic: '에픽', story: '스토리', configuration: '구성', verification: '검증', enabler: '기반 작업', rfp: '제안요청서', interview: '회의록·인터뷰', 'as-is-artifact': '현행 업무 자료', regulation: '법령·지침', 'policy-memo': '정책·결정 메모', other: '기타', public: '공개', internal: '내부', confidential: '기밀', restricted: '제한', functional: '기능', 'non-functional': '비기능', data: '데이터', interface: '연계', constraint: '제약' };
let state, token, workspaceId, readingView, renderedVersion, page = 'overview', busy = false, dialogForm, dialogRevision, dialogOriginal = '', dialogSave, returnFocus, aiPollTimer, importBatch, aiPollErrorReported = false;
const backlog = () => state.backlog;
const metadata = () => state.metadata ?? {};
const badge = (value, color = '') => `<span class="badge ${color}">${esc(labels[value] ?? value)}</span>`;
const button = (label, action, key = '', secondary = false) => `<button type="button" class="button ${secondary ? 'secondary' : ''}" data-action="${action}" data-key="${esc(key)}">${esc(label)}</button>`;
const empty = message => `<div class="empty">${esc(message)}</div>`;
const panel = (title, content, actions = '') => `<section class="panel"><div class="panel-head"><h2>${esc(title)}</h2><div class="row-actions">${actions}</div></div><div class="panel-body">${content}</div></section>`;
const heading = (title, description, actions = '') => `<div class="page-heading"><div><p class="eyebrow">PROJECT REQUIREMENTS</p><h1>${esc(title)}</h1><p>${esc(description)}</p></div><div class="row-actions">${actions}</div></div>`;
const field = (label, name, value = '', { textarea = false, type = 'text', required = false, hint = '', readonly = false, listId = '' } = {}) => `<label class="field"><span>${esc(label)}</span>${textarea ? `<textarea aria-label="${esc(label)}" name="${name}" ${required ? 'required' : ''}>${esc(value)}</textarea>` : `<input aria-label="${esc(label)}" name="${name}" type="${type}" value="${esc(value)}" ${listId ? `list="${esc(listId)}"` : ''} ${required ? 'required' : ''} ${readonly ? 'readonly' : ''}>`}${hint ? `<small>${esc(hint)}</small>` : ''}</label>`;
const select = (label, name, choices, value = '', multiple = false) => {
  const values = multiple ? value ?? [] : [value];
  return `<label class="field"><span>${esc(label)}</span><select aria-label="${esc(label)}" name="${name}" ${multiple ? 'multiple size="4"' : ''}>${choices.map(choice => { const [key, title] = Array.isArray(choice) ? choice : [choice, labels[choice] ?? choice]; return `<option value="${esc(key)}" ${values.includes(key) ? 'selected' : ''}>${esc(title)}</option>`; }).join('')}</select>${multiple ? '<small>여러 항목은 Ctrl 또는 ⌘ 키를 누르고 선택합니다.</small>' : ''}</label>`;
};
const mapChoices = entities => entities.map(item => [item.id, item.title]);
const problemList = (problems, destination = 'requirements') => problems?.length ? `<ul class="problem-list">${problems.map(problem => `<li><button type="button" class="text-button wide-text" data-action="problem" data-key="${destination}">${esc(text(problem))}</button></li>`).join('')}</ul>` : '<p class="status-text">확인이 필요한 항목이 없습니다.</p>';
function toast(message) { const container = $('#toast'); container.replaceChildren(document.createTextNode(message)); const close = document.createElement('button'); close.type = 'button'; close.setAttribute('aria-label', '알림 닫기'); close.textContent = '×'; close.addEventListener('click', () => container.replaceChildren()); container.append(close); }
async function request(url, options = {}) {
  const { progressOnly = false, ...fetchOptions } = options;
  let response;
  try { response = await fetch(url, { credentials: 'same-origin', cache: 'no-store', ...fetchOptions, headers: { ...(token ? { 'x-workspace-token': token } : {}), ...fetchOptions.headers } }); }
  catch { throw Object.assign(new Error('실행기와 연결이 끊겼습니다. 실행기를 다시 시작한 뒤 전체 주소로 다시 연결해 주세요.'), { code: 'CONNECTION_LOST' }); }
  let result;
  try { result = await response.json(); } catch { throw new Error('서버 응답을 읽지 못했습니다. 연결 상태를 확인하고 다시 시도하세요.'); }
  if (!response.ok) { const error = new Error(result.message ?? `요청을 처리하지 못했습니다 (${result.code ?? response.status}).`); error.errors = result.errors; error.code = result.code; error.status = response.status; throw error; }
  if (!progressOnly && result.backlog && result.imports) captureReadingView(result);
  return result;
}
async function act(action, payload) {
  if (busy) return false;
  if (state?.readOnly) { showError(new Error('읽기 전용 검증본입니다. 입력과 원본 파일을 보존하고 실행기를 다시 연 뒤 변경 내용을 비교하세요.')); return false; }
  busy = true; document.body.setAttribute('aria-busy', 'true');
  const submit = dialogForm?.querySelector('[type="submit"]'); if (submit) submit.disabled = true;
  try {
    state = await request('/api/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision: dialogForm && !action.startsWith('ai.') ? dialogRevision : state.revision, action, payload }) });
    render(); return true;
  } catch (error) {
    showError(error); return false;
  } finally { busy = false; document.body.removeAttribute('aria-busy'); if (submit) submit.disabled = false; }
}
function showError(error) {
  const target = dialogForm?.querySelector('.form-errors') ?? $('#page-errors');
  if (target) { target.replaceChildren(); const message = document.createElement('p'); message.textContent = error.message; target.append(message); for (const item of error.errors ?? []) { const row = document.createElement('p'); row.textContent = text(item); target.append(row); } if (['SESSION_REQUIRED', 'LAUNCH_REQUIRED', 'CONNECTION_LOST'].includes(error.code)) target.insertAdjacentHTML('beforeend', button('실행기 주소로 다시 연결', 'reconnect', '', true)); target.hidden = false; target.focus(); }
  else toast(error.message);
}
function formValue(form) { return JSON.stringify([...new FormData(form).entries()]); }
function dirty() { return dialogForm && formValue(dialogForm) !== dialogOriginal; }
function closeDialog(force = false) {
  if (busy) return false;
  if (!force && dirty() && !confirm('저장하지 않은 입력이 있습니다. 입력을 버리고 닫을까요?')) return false;
  $('#dialog').close(); dialogForm = undefined; dialogRevision = undefined; dialogSave = undefined;
  if (state && renderedVersion !== renderVersion()) render();
  aiPollErrorReported = false;
  scheduleAiPoll(0);
  const focusTarget = returnFocus?.isConnected ? returnFocus : [...document.querySelectorAll('[data-action]')].find(element => element.dataset.action === returnFocus?.dataset.action && element.dataset.key === returnFocus?.dataset.key);
  if (focusTarget && !focusTarget.disabled) focusTarget.focus(); else $('#main').focus();
  return true;
}
function openForm(title, content, save, help = '', successMessage = '작업공간에 저장했습니다.') {
  if (dialogForm && !closeDialog()) return;
  returnFocus = document.activeElement;
  $('#dialog-content').innerHTML = `<form id="editor"><div class="dialog-head"><h2 id="dialog-title">${esc(title)}</h2><button type="button" class="icon-button" data-action="cancel" aria-label="창 닫기">×</button></div><div class="dialog-body">${help ? `<p>${esc(help)}</p>` : ''}<div class="form-errors field-error" tabindex="-1" role="alert" hidden></div>${content}</div><div class="dialog-footer"><button type="button" class="button secondary" data-action="cancel">취소</button><button type="submit" class="button">저장</button></div></form>`;
  dialogForm = $('#editor'); dialogRevision = state?.revision; dialogOriginal = formValue(dialogForm); dialogSave = save;
  dialogForm.querySelector('#import-progress,#full-progress')?.insertAdjacentHTML('afterend', `<p id="server-reading-status" data-reading-status role="status" aria-live="polite">${esc(readingView?.message ?? readingStatusText(state))}</p>`);
  dialogForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!dirty()) { closeDialog(true); toast('변경한 내용이 없습니다.'); return; }
    const data = new FormData(dialogForm); const successful = await dialogSave(data, dialogForm);
    if (successful) { closeDialog(true); toast(successMessage); }
  });
  $('#dialog').showModal();
  const first = dialogForm.querySelector('input:not([readonly]),select,textarea'); first?.focus();
}
const sensitivityNames = { 'resident-registration-number': '주민·외국인등록번호', 'mobile-phone': '휴대전화번호', 'email-address': '이메일 주소', 'secret-or-credential': '비밀번호·키·토큰', 'private-ip-literal': '내부 IP 주소' };
const sensitivityStage = stage => ({ input: '등록 자료', workspace: '현재 작업공간', export: '내보내기' })[stage] ?? aiStageName(stage);
function sensitivityDetails(warnings, title = '민감정보 감지 위치') {
  return warnings?.length ? `<details><summary>${esc(title)}</summary><ul class="help-list">${warnings.map(warning => `<li><strong>${esc(sensitivityNames[warning.kind] ?? warning.kind)}</strong> · ${esc(sensitivityStage(warning.stage))} · ${esc(warning.count)}회 감지<p class="wide-text">${warning.paths.map(esc).join(' · ')}</p></li>`).join('')}</ul></details>` : '';
}
function sensitivityNotice() {
  const warnings = state.sensitivityWarnings ?? [];
  if (!warnings.length) return '';
  const noticeJobs = (state.imports?.jobs ?? []).filter(job => job.originalRef || ['ready', 'extracting'].includes(job.status));
  const jobs = [...new Set([...new Map(noticeJobs.filter(job => job.status === 'ready').map(job => [job.sourceId ?? job.requestId, job])).values(), ...new Map(noticeJobs.map(job => [job.sourceId ?? job.requestId, job])).values()])].filter(job => job.sensitivityWarnings?.length);
  const files = jobs.map(job => { const index = backlog().sources.findIndex(source => source.id === job.sourceId); return `<li><strong>${index >= 0 ? `등록 자료 ${index + 1}` : '보관 원본'}</strong>${sensitivityDetails(job.sensitivityWarnings)}${index >= 0 ? button(`등록 자료 ${index + 1} 확인`, 'privacy-source', String(index), true) : button('보관 원본 확인', 'download', job.requestId, true)}</li>`; }).join('');
  return `<aside class="panel panel-body mb-20" role="note" aria-label="민감정보 감지 안내"><h2>민감정보 패턴 감지 안내</h2><p>패턴 감지는 분석을 중단하지 않습니다. 원문과 분석 결과는 이 비공개 작업공간에 보관합니다. 아래에는 실제 값 없이 감지 종류·단계·위치를 표시합니다. 공유할 자료는 별도로 확인해 주세요.</p><p>건수는 항목 단위 패턴 감지 횟수입니다. 같은 내용이 여러 검사·단계에서 반복 집계될 수 있으며 사람 수나 고유 정보 수를 뜻하지 않습니다. 위치는 최대 20개씩 표시합니다.</p>${sensitivityDetails(warnings, '전체 감지 내역')}${files ? `<details><summary>자료별 감지 내역</summary><ul class="help-list">${files}</ul></details>` : ''}</aside>`;
}
function renderVersion() { return JSON.stringify([page, state?.revision, state?.readOnly, state?.contextChanged, state?.ai?.active, state?.ai?.available, state?.ai?.current?.status, state?.imports?.active, readingView]); }
function render() {
  if (!state) return;
  $('#project-name').textContent = backlog().project.name ?? backlog().project.title ?? '프로젝트';
  $('#crumb').textContent = pages.find(item => item[0] === page)?.[2] ?? '';
  $('#navigation').innerHTML = pages.map(([key, icon, label]) => `<a class="nav-link ${page === key ? 'active' : ''}" ${page === key ? 'aria-current="page"' : ''} href="#${key}" data-page="${key}"><span class="nav-icon" aria-hidden="true">${icon}</span><span>${label}</span></a>`).join('');
  $('#main').innerHTML = `${state.readOnly ? '<div class="callout"><div><strong>읽기 전용 상태입니다.</strong><p>다른 작성자 또는 복구가 필요한 파일이 있어 저장을 중단했습니다. 실행기 진단을 확인하세요.</p></div></div>' : ''}<div id="page-errors" class="field-error" tabindex="-1" role="alert" hidden></div>${({ overview: overview, sources: sources, requirements: requirements, baseline: baseline, work: work, handoff: handoff, audit: audit })[page]()}`;
  const pageHeading = $('#main .page-heading') ?? $('#page-errors');
  if (['overview', 'sources', 'requirements', 'work'].includes(page)) pageHeading.insertAdjacentHTML('afterend', aiPanel());
  pageHeading.insertAdjacentHTML('afterend', sensitivityNotice());
  if (['overview', 'sources'].includes(page)) { pageHeading.insertAdjacentHTML('afterend', importPanel()); pageHeading.insertAdjacentHTML('afterend', readingPanel()); }
  renderedVersion = renderVersion(); aiPollErrorReported = false;
  scheduleAiPoll();
}
function aiPanel() {
  const ai = state.ai; if (!ai) return '';
  const job = ai.current, proposal = ai.proposal;
  const names = { running: 'AI가 자료를 처리하고 있습니다', ready: '생성한 초안을 확인해 주세요', 'needs-decisions': '의사결정이 필요합니다', stale: '입력이 바뀌어 재분석이 필요합니다', failed: 'AI 실행을 완료하지 못했습니다', unavailable: '보관된 AI 결과를 읽을 수 없습니다', cancelled: 'AI 실행을 취소했습니다', interrupted: '중단된 실행입니다. 다시 시작할 수 있습니다', applied: '확인한 생성 결과를 반영했습니다' };
  const blocked = ai.active || state.imports?.active || state.readOnly;
  const fileButton = `<button type="button" class="button" data-action="artifact-import-ai" ${blocked || !ai.available ? 'disabled' : ''}>AI로 산출물 등록</button><button type="button" class="button secondary" data-action="artifact-import" ${blocked ? 'disabled' : ''}>로컬 자료 등록(보완용)</button>`;
  let actions = '';
  if (ai.active) actions = button('AI 실행 취소', 'ai-cancel', '', true);
  else {
    actions = `<button type="button" class="button" data-action="ai-full" ${!ai.available || !backlog().sources.length || state.imports?.active || state.readOnly ? 'disabled' : ''}>AI 전체 분석</button><button type="button" class="button secondary" data-action="ai-start" data-key="analysis" ${!ai.available || !backlog().sources.length || state.imports?.active || state.readOnly ? 'disabled' : ''}>AI 요구사항 생성</button>`;
    if (['ready', 'needs-decisions'].includes(job?.status) && proposal?.issues.length) actions += button('답변하고 계속', 'ai-answer', '', true);
    if (job?.status === 'ready') actions += button(job.fullPipeline ? '전체 초안 확인·반영' : job.phase === 'analysis' ? '요구사항 확정하고 에픽 생성' : '에픽·스토리 반영', 'ai-confirm');
    if (state.baselineCurrent && job?.status !== 'ready') actions += button('AI 에픽·스토리 생성', 'ai-start', 'decomposition', true);
  }
  const issues = proposal?.issues?.length ? `<section><h3>AI가 확인을 요청한 사항</h3><ul class="help-list">${proposal.issues.map(issue => `<li><strong>${esc(issue.question)}</strong> ${badge(issue.severity === 'blocking' ? '결정 필요' : '참고', 'amber')}<p>${esc(issue.options.join(' / '))}</p></li>`).join('')}</ul></section>` : '';
  const citations = values => `<details><summary>원문 근거 ${values.length}건</summary>${values.map(cite => `<p class="wide-text"><strong>${esc(backlog().sources.find(source => source.id === cite.sourceId)?.title ?? cite.sourceId)} · ${esc(cite.clauseId)}</strong><br>“${esc(cite.quote)}”</p>`).join('')}</details>`;
  const preview = (proposal?.requirements ? `<details ${job?.status === 'ready' ? 'open' : ''}><summary>AI 요구사항 초안 ${proposal.requirements.length}건</summary>${proposal.requirements.map(req => `<article class="panel panel-body mt-16"><h3>${esc(req.title)}</h3><p class="ai-analysis-copy">${esc(req.description)}</p><small>${esc(req.id)} · ${esc(labels[req.proposedScope] ?? req.proposedScope)} · ${esc(labels[req.solutionDisposition])}</small>${citations(req.citations)}</article>`).join('')}</details>` : '') + (proposal?.workItems ? aiPlanPreview(proposal) : '');
  const history = ai.history?.length ? `<details class="mt-16"><summary>AI 실행 기록 ${ai.history.length}건</summary><ul class="help-list">${ai.history.map(item => `<li>${esc(item.phase === 'analysis' ? '요구사항 분석' : '에픽·스토리 생성')} · ${esc(names[item.status] ?? item.status)}${item.resultRef ? ` ${button('생성 기록 다운로드', 'download', item.id, true)}` : ''}</li>`).join('')}</ul></details>` : '';
  const errorMessage = job?.errorCode === 'AI_ATTACHMENT_INVALID' ? '시각 자료의 형식·페이지 수·원본 무결성 또는 합계 20MiB/100개 한도를 확인하세요. 추출 본문만 선택하여 다시 분석할 수도 있습니다.' : 'CLI 로그인·사용 한도·자료 크기를 확인한 뒤 다시 실행하세요.';
  return `<section class="panel mb-20" aria-label="AI 요구사항 진행"><div class="panel-head"><div><h2>${job ? esc(names[job.status] ?? job.status) : 'AI가 원본에서 개발 계획까지 정리합니다'}</h2><p class="muted">원본 판독 → 문서 통합 → 요구사항·품질 검토 → 에픽·인수조건·개발 계획 → 최종 확인</p></div></div><div class="panel-body"><p>${esc(ai.model)} · 문서 분석 ${esc(ai.effort)}${ai.readingEffort ? ` · 원본 판독 ${esc(ai.readingEffort)}` : ''} · 이 PC의 Claude CLI</p>${job?.effort && job.effort !== ai.effort ? `<p class="muted">표시 중인 이전 실행: ${esc(job.effort)} · 새 분석부터 ${esc(ai.effort)}를 적용합니다.</p>` : ''}${aiStageProgress(job)}${job?.batches ? `<p role="status">자료 ${job.batches.completed}/${job.batches.total}묶음 분석 완료${job.status === 'running' ? ' · 전체 검증 후 결과를 제안합니다.' : ''}</p>` : ''}${!ai.available ? '<p class="field-error">Claude CLI를 설치하고 로그인한 뒤 실행기를 다시 시작하세요.</p>' : ''}${!backlog().sources.length ? '<p>AI로 산출물을 등록하면 판독과 전체 분석이 이어집니다.</p>' : ''}${job?.errorCode ? `<p role="alert">실행 오류: ${esc(job.errorCode)}. 원본 자료는 유지했습니다. ${esc(errorMessage)}</p>` : ''}${job?.status === 'stale' ? '<p role="alert">아래 결과는 변경 전 자료를 바탕으로 합니다. 현재 요구사항에 적용할 수 없습니다.</p>' : ''}${job?.attempts === 2 ? '<p role="status">구조 오류에 대한 자동 보정을 한 번 요청했습니다.</p>' : ''}<div class="row-actions mt-16">${fileButton}${actions}${button('단계별 AI 지시문 보기', 'ai-prompts', '', true)}</div>${job?.status === 'applied' ? '' : issues + aiBusinessPreview(proposal) + aiChangePreview(proposal) + aiBatchAudit(proposal) + preview}${job?.promptRefs?.length ? `<details class="mt-16"><summary>이번 실행에 사용한 지시문 ${job.promptRefs.length}종</summary>${job.promptRefs.map(item => `<p>${esc(aiStageName(item.stage))} ${button('실제 지시문 보기', 'ai-run-prompt', item.ref.id, true)}</p>`).join('')}</details>` : ''}${history}</div></section>`;
}
const aiStages = [['reading', '원본 판독'], ['synthesis', '문서 통합'], ['analysis', '요구사항 작성'], ['review-requirements', '요구사항 품질 검토'], ['decomposition', '에픽·스토리 생성'], ['review-plan', '개발 계획 품질 검토']];
const aiStageName = key => aiStages.find(([stage]) => stage === key)?.[1] ?? key;
function aiStageProgress(job) {
  if (!job?.fullPipeline) return '';
  const current = aiStages.findIndex(([key]) => key === job.stage);
  return `<ol class="ai-stage-list">${aiStages.map(([key, label], index) => `<li${job.status === 'running' && key === job.stage ? ' aria-current="step"' : ''}>${index + 1}. ${esc(label)}${job.status === 'ready' || job.status === 'applied' || index < current ? ' · 완료' : key === job.stage ? ` · ${job.stageProgress?.completed ?? 0}/${job.stageProgress?.total ?? 1}` : ''}</li>`).join('')}</ol><p role="status">분석 실행의 모델 호출 ${job.modelCalls ?? 0}회${job.reusedStages?.length ? ` · 완료 단계 ${job.reusedStages.length}개 재사용` : ''}. 원본 판독 진행은 파일 등록 이력에서 별도로 확인합니다.</p>`;
}
function aiPlanPreview(proposal) {
  return `<details open><summary>AI 에픽·스토리 ${proposal.workItems.length}건 · 인수조건 ${proposal.acceptanceCriteria.length}건</summary>${proposal.workItems.map(item => `<article class="panel panel-body mt-16"><h3>${esc(item.title)}</h3><p>${esc(labels[item.workItemType])} · ${esc(item.id)}</p><p class="ai-analysis-copy">${esc(item.description ?? item.iWant ?? '')}</p>${proposal.acceptanceCriteria.filter(ac => ac.workItemId === item.id).map(ac => `<p class="wide-text"><strong>${esc(ac.polarity === 'allow' ? '허용' : '거부')}</strong> ${esc(ac.given)} → ${esc(ac.when)} → ${esc(ac.then)}</p>`).join('')}</article>`).join('')}</details>${proposal.taskPreview ? `<details class="mt-16"><summary>개발 작업계획 미리보기</summary><pre class="data-preview">${esc(proposal.taskPreview)}</pre></details>` : ''}`;
}
function aiBusinessPreview(proposal) {
  const model = proposal?.businessModel; if (!model) return '';
  return `<details class="mt-16"><summary>통합 업무 흐름</summary><p class="ai-analysis-copy">${esc(model.summary)}</p><h3>업무 역할</h3><ul class="help-list">${model.actors.map(actor => `<li><strong>${esc(actor.name)}</strong> · ${esc(actor.responsibility)}</li>`).join('')}</ul>${model.processes.map(process => `<article class="panel panel-body mt-16"><h3>${esc(process.name)}</h3><p>시작: ${esc(process.trigger)}</p><ol>${process.steps.map(step => `<li>${esc(step)}</li>`).join('')}</ol>${process.exceptions.length ? `<p>예외: ${esc(process.exceptions.join(' / '))}</p>` : ''}${process.rules.length ? `<p>업무 규칙: ${esc(process.rules.join(' / '))}</p>` : ''}<p>입출력: ${esc(process.data.join(' / '))}</p></article>`).join('')}${model.terms.length ? `<h3>업무 용어</h3><ul>${model.terms.map(term => `<li>${esc(term.term)}: ${esc(term.meaning)}</li>`).join('')}</ul>` : ''}<h3>문서별 해석</h3>${(proposal.documents ?? []).map(doc => `<details><summary>${esc(doc.title)}</summary><p class="ai-analysis-copy">${esc(doc.summary)}</p><p>AI 판별: ${esc((doc.documentTypes ?? []).map(type => labels[type] ?? type).join(' / '))}</p><p>구조: ${esc(doc.sections.join(' / '))}</p><p>전체 ${doc.clauseCount}조항 · 대표 근거 ${doc.anchors.length}개. 요구사항 작성에는 전체 조항을 사용합니다.</p></details>`).join('')}</details>`;
}
function aiPromptForm() {
  openForm('단계별 AI 작업 지시', '<p>현재 자료의 유형에 맞춘 지시입니다. 실행할 때 출력 계약과 묶음 정보가 추가되며, 실제 사용한 지시문은 각 실행 기록에서 확인할 수 있습니다.</p>' + (state.prompts ?? []).map(item => `<details><summary>${esc(aiStageName(item.stage))}</summary><p>버전 ${esc(item.version)} · SHA-256 ${esc(item.sha256)}</p><pre class="data-preview">${esc(item.instructions)}</pre></details>`).join(''), () => true);
  dialogForm.querySelector('[type="submit"]').textContent = '닫고 돌아가기';
}
async function aiStoredPromptForm(key) {
  try {
    const file = await request(`/api/artifacts/${encodeURIComponent(key)}`), value = JSON.parse(file.content);
    openForm('실행에 사용한 AI 지시문', `<p>${esc(aiStageName(value.stage))} · 버전 ${esc(value.version)}</p><pre class="data-preview">${esc(value.instructions)}</pre><details><summary>출력 형식 계약</summary><pre class="data-preview">${esc(JSON.stringify(value.schema, null, 2))}</pre></details>`, () => true);
    dialogForm.querySelector('[type="submit"]').textContent = '닫고 돌아가기';
  } catch (error) { showError(error); }
}
function aiBatchAudit(proposal) {
  const entries = proposal?.batchAudit ?? []; if (!entries.length) return '';
  return `<details class="mt-16"><summary>묶음 간 갱신 기록 ${entries.length}건</summary><ul class="help-list">${entries.map(entry => `<li><strong>${entry.batch}번째 묶음</strong>${entry.requirementIds.length ? `<p class="wide-text">갱신한 요구사항: ${esc(entry.requirementIds.join(', '))}</p>` : ''}${entry.coverageChanges.map(change => `<details><summary>${esc(change.sourceId)}/${esc(change.clauseId)} · 원문 연결 변경</summary><p class="wide-text">변경 전: ${esc(labels[change.beforeDisposition] ?? change.beforeDisposition)} · ${esc(change.beforeRationale)}</p><p class="wide-text">변경 후: ${esc(labels[change.afterDisposition] ?? change.afterDisposition)} · ${esc(change.afterRationale)}</p></details>`).join('')}</li>`).join('')}</ul></details>`;
}
function aiChangePreview(proposal) {
  const changes = proposal?.changes ?? []; if (!changes.length) return '';
  const names = { added: '추가', changed: '변경', removed: '제외', requirement: '요구사항', workItem: '작업', acceptanceCriterion: '인수조건', traceLink: '추적 연결', title: '제목', description: '정의', requirementType: '요구사항 유형', moduleCandidates: '기존 기능 후보', scopeDisposition: '업무 범위', solutionDisposition: '해결 방향', nfrCriteria: '측정 기준', rationale: '사유', sourceIds: '근거 자료', openQuestions: '열린 질문', parentEpicId: '상위 에픽', requirementIds: '연결 요구사항', decisionCards: '설계 결정', dependsOn: '선행 작업', workItemId: '연결 작업', acId: '연결 인수조건', targetKind: '대상 종류', targetId: '대상', linkIntent: '연결 의도', given: '사전 조건', when: '수행', then: '기대 결과', polarity: '허용·거부', verificationMethod: '검증 방법', priority: '우선순위', batch: '배치', archetype: '화면 유형', asA: '사용 역할', iWant: '필요한 행동', soThat: '업무 가치', notes: '연결 근거', id: '식별자', workItemType: '작업 유형' };
  const format = value => value === null ? '없음' : typeof value === 'string' ? labels[value] ?? value : JSON.stringify(value);
  return `<details class="mt-16"><summary>현재 내용과 비교 · 추가 ${changes.filter(item => item.action === 'added').length} · 변경 ${changes.filter(item => item.action === 'changed').length} · 제외 ${changes.filter(item => item.action === 'removed').length}</summary><ul class="help-list">${changes.map(change => `<li><strong>${esc(names[change.action])} · ${esc(names[change.entity])} ${esc(change.title)} (${esc(change.id)})</strong>${change.hasJudgment ? `<p>기존 기관 판정: ${esc(labels[change.judgment])}</p>` : ''}${change.reason ? `<p>제외 사유: ${esc(change.reason)}</p>` : ''}<details><summary>변경 전·후 ${change.fields.length}개 항목</summary>${change.fields.map(field => `<p class="wide-text"><strong>${esc(names[field.name] ?? field.name)}</strong><br>변경 전: ${esc(format(field.before))}<br>변경 후: ${esc(format(field.after))}</p>`).join('')}</details></li>`).join('')}</ul></details>`;
}
function aiConsent(label, required = true, name = 'ai-consent', checked = false) { return `<label class="checkbox-field"><input type="checkbox" name="${name}" ${required ? 'required' : ''} ${checked ? 'checked' : ''}><span>${esc(label)}</span></label>`; }
function visualModeChoice() { return select('AI 분석 자료', 'visualMode', [['all', '본문 + 이미지·PDF 시각 자료'], ['text', '추출 본문만']], state.ai.current?.includeVisuals === false ? 'text' : 'all'); }
function unfinishedImports() {
  return [...new Map((state.imports?.jobs ?? []).filter(job => ['failed', 'cancelled', 'interrupted'].includes(job.status) && !backlog().sources.some(source => source.fileSha256 && source.fileSha256 === job.sha256)).map(job => [job.sha256 ?? job.requestId, job])).values()];
}
function readingStatusText(snapshot) {
  const jobs = snapshot.imports?.jobs ?? [], sources = snapshot.backlog.sources;
  const originals = sources.filter(source => jobs.some(job => job.status === 'ready' && job.sourceId === source.id && job.originalRef));
  const completed = originals.filter(source => jobs.some(job => job.status === 'ready' && job.sourceId === source.id && job.method === 'ai-document' && job.readingRef)).length;
  const active = jobs.findLast(job => job.status === 'extracting'), latest = active ?? jobs.findLast(job => job.readWithAI || job.method === 'ai-document');
  const matching = latest?.sourceId ? originals.filter(source => source.id === latest.sourceId) : originals.filter(source => source.fileSha256 === latest?.sha256);
  const position = matching.length === 1 ? originals.findIndex(source => source.id === matching[0].id) + 1 : 0;
  const current = position ? `${position}/${originals.length}번째 자료` : '새 자료';
  const progress = active?.readingProgress;
  const detail = active ? ` · ${current} ${active.readWithAI ? 'AI 판독' : '등록'} 중${progress ? ` · ${progress.completed}/${progress.total}구간` : ''}` : ['failed', 'cancelled', 'interrupted', 'stale'].includes(latest?.status) ? ` · ${current} 판독 중단${latest.errorCode ? ` (${latest.errorCode})` : ''}` : snapshot.ai?.active ? ' · AI 요구사항·개발 계획 분석 중' : '';
  return `실제 저장 진행: 등록된 원본 ${originals.length}건 · AI 판독 완료 기록 ${completed}/${originals.length}건${detail}`;
}
function updateReadingStatus(snapshot) {
  captureReadingView(snapshot);
  const message = readingView.message;
  document.querySelectorAll('[data-reading-status]').forEach(element => { if (element.textContent !== message) element.textContent = message; });
  const previous = dialogForm?.querySelector('#import-progress,#full-progress');
  if (previous?.textContent && !busy && !importBatch && !previous.textContent.startsWith('이 창의 마지막 요청: ')) previous.textContent = `이 창의 마지막 요청: ${previous.textContent}`;
}
function captureReadingView(snapshot) {
  const jobs = snapshot.imports?.jobs ?? [];
  readingView = { message: readingStatusText(snapshot), hasOriginals: snapshot.backlog.sources.some(source => jobs.some(job => job.status === 'ready' && job.sourceId === source.id && job.originalRef)), importsActive: Boolean(snapshot.imports?.active), aiActive: Boolean(snapshot.ai?.active), readOnly: Boolean(snapshot.readOnly) };
}
function readingPanel() {
  const jobs = state.imports?.jobs ?? [];
  const originals = backlog().sources.filter(source => jobs.some(job => job.status === 'ready' && job.sourceId === source.id && job.originalRef));
  const unfinished = unfinishedImports();
  if (!originals.length && !unfinished.length && !readingView?.hasOriginals) return '';
  const active = jobs.findLast(job => job.status === 'extracting');
  const blocked = (readingView ? readingView.importsActive || readingView.aiActive || readingView.readOnly : state.imports?.active || state.ai?.active || state.readOnly) || !state.ai?.available;
  return `<section class="panel mb-20" role="region" aria-label="AI 판독 진행"><div class="panel-head"><h2>${active ? 'AI 원본 판독 진행 중' : 'AI 원본 판독과 이어서 진행'}</h2></div><div class="panel-body"><p data-reading-status role="status">${esc(readingView?.message ?? readingStatusText(state))}</p><p>${active ? '판독이 진행 중입니다. 이 화면은 진행 상태를 자동으로 갱신합니다. 다른 창에서 시작한 판독이 끝날 때까지 중복 실행할 수 없습니다.' : '이어서 진행하면 등록된 원본의 완료 판독을 원본·지시문과 대조해 재사용하고 남은 판독과 요구사항·개발 계획 분석을 이어갑니다.'}</p>${unfinished.length ? `<p role="alert">등록을 완료하지 못한 파일 ${unfinished.length}건이 있습니다. 남은 파일 추가에서 원래 선택한 파일 목록을 다시 선택하고 자료 유형·보안 분류를 확인하세요.</p>` : ''}<p>여러 파일을 순서대로 보내는 실행 창은 유지하세요. 닫힌 창에서 아직 전송하지 않은 파일 목록은 보관되지 않습니다. 등록되지 않은 파일은 아래 이어서 진행에 포함되지 않으므로 남은 파일 추가를 사용하세요. 동일한 자료 유형·보안 분류의 완료 파일은 중복 검증 후 재사용합니다.</p><div class="row-actions"><button type="button" class="button" data-action="ai-full" ${blocked || !originals.length && !readingView?.hasOriginals ? 'disabled' : ''}>AI 판독 이어서 진행</button><button type="button" class="button secondary" data-action="artifact-import-ai" ${blocked ? 'disabled' : ''}>남은 파일 추가</button></div></div></section>`;
}
function importPanel() {
  const jobs = state.imports?.jobs ?? []; if (!jobs.length) return '';
  const messages = { AI_DOCUMENT_SENSITIVE_OUTPUT: '이전 버전에서 민감정보 감지로 중단된 기록입니다. 다시 판독하면 분석을 진행하고 별도 안내합니다.', FILE_SENSITIVE_INPUT: '이전 버전에서 민감정보 감지로 중단된 기록입니다. 다시 등록하면 분석을 진행하고 별도 안내합니다.', AI_DOCUMENT_OUTPUT_INVALID: 'AI 판독의 내용·위치·근거를 검증하지 못했습니다. 원본을 대조하고 다시 판독하세요.' };
  const labels = { extracting: '문서 판독 중', ready: '등록 완료', failed: '등록 실패', cancelled: '등록 취소', interrupted: '중단됨 · 다시 등록', stale: '프로젝트 변경 · 다시 등록' };
  return panel('등록한 산출물 파일', `<ul class="help-list">${jobs.slice(-10).map(job => `<li><strong>${esc(job.filename)}</strong> · ${esc(labels[job.status])}${job.duplicateOf ? ' · 이미 등록된 자료 재사용' : ''}${job.method === 'ai-document' ? ' · AI 판독·구조 정리' : job.method === 'local-ocr' ? ' · 로컬 OCR 판독' : ''}${job.readingProgress && job.status === 'extracting' ? `<p role="status">${job.readingProgress.stage === 'preparing' ? '판독용 자료 준비' : 'AI 판독'} ${job.readingProgress.completed}/${job.readingProgress.total}구간</p>` : ''}${job.needsReview ? '<p>판독이 불확실한 부분을 원본과 대조해 주세요.</p>' : ''}${sensitivityDetails(job.sensitivityWarnings)}${job.errorCode ? `<p role="alert">${esc(messages[job.errorCode] ?? `${job.errorCode} · 파일 내용을 확인한 후 다시 등록하세요.`)}</p>` : ''}${job.sourceId ? button('원본 다운로드', 'download', job.sourceId, true) : job.originalRef ? button('보관 원본 다운로드', 'download', job.requestId, true) : ''}${job.readingRef ? button('AI 판독 기록', 'ai-reading', job.readingRef.id, true) : ''}${job.previousSourceRef ? button('변경 전 판독문', 'download', job.previousSourceRef.id, true) : ''}${job.status === 'extracting' ? button('파일 처리 취소', 'import-cancel', job.requestId, true) : ''}</li>`).join('')}</ul>`);
}
async function aiReadingForm(key) {
  try {
    const file = await request(`/api/artifacts/${encodeURIComponent(key)}`), reading = JSON.parse(file.content);
    openForm('AI 원본 판독 기록', `<p class="ai-analysis-copy">${esc(reading.summary)}</p><p>AI 문서 유형: ${esc(reading.documentTypes.map(type => labels[type] ?? type).join(' / '))} · 지시문 ${esc(reading.promptVersion)}</p><p>원본에서 얻은 텍스트와 AI가 이미지에서 전사한 내용은 구분합니다. AI 전사가 원본과 독립적으로 일치 검증됐다는 뜻은 아닙니다.</p><ul class="help-list">${reading.provenance.map(item => `<li>${esc(item.locator)} · ${esc(item.kind === 'native-text' ? '원본 텍스트 보존' : ({ 'ai-visual-interpretation': 'AI 시각 해석 · 원문 전사 아님', 'ai-mixed': 'AI 전사·시각 해석 혼합 · 블록별 확인', blank: '빈 입력 단위', unreadable: '판독 불가', 'visual-context': '원본 시각 참고 · 네이티브 본문과 별도 대조' }[item.kind] ?? 'AI 시각 전사'))}</li>`).join('')}</ul>${reading.warningCodes?.length ? `<h3>변환·판독 참고 사항</h3><ul>${reading.warningCodes.map(code => `<li>${esc(code)}</li>`).join('')}</ul>` : ''}${reading.referenceChecks?.length ? `<h3>PDF 텍스트 보조정보 대조</h3><p>일부 핵심값을 점검한 결과이며 모든 글자·업무 의미의 일치를 보장하지 않습니다.</p><ul>${reading.referenceChecks.map(check => `<li>${esc(check.inputId)} · ${check.status === 'mismatch' ? '불일치·누락 확인 필요' : '점검한 핵심값 일치'} · SHA-256 ${esc(check.sha256)}</li>`).join('')}</ul>` : ''}${reading.unreadable.length ? `<h3>판독 확인 필요</h3><ul>${reading.unreadable.map(item => `<li>${esc(item.inputId)} · ${esc(item.reason)}</li>`).join('')}</ul>` : ''}${reading.blocks.map(block => `<details><summary>${esc(block.heading)} · ${esc(block.inputId)}${block.certainty === 'uncertain' ? ' · 확인 필요' : ''}</summary>${block.text ? `<pre class="data-preview">${esc(block.text)}</pre>` : `<p>${block.kind === 'figure' ? '아래 내용은 AI 시각 해석이며 원문 전사가 아닙니다.' : block.kind === 'blank' ? '빈 입력 단위입니다.' : '네이티브 원문은 자료의 근거 본문에 보존했습니다.'}</p>`}<p>${esc(block.note)}</p></details>`).join('')}<h3>판독에 사용한 지시문</h3>${reading.prompts.map(prompt => `<details><summary>버전 ${esc(prompt.version)} · SHA-256 ${esc(prompt.sha256)}</summary><pre class="data-preview">${esc(prompt.instructions)}</pre></details>`).join('')}`, () => true);
    dialogForm.querySelector('[type="submit"]').textContent = '닫고 돌아가기';
  } catch (error) { showError(error); }
}
function fileBase64(file) {
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onerror = () => reject(new Error('선택한 파일을 읽지 못했습니다.')); reader.onload = () => resolve(String(reader.result).slice(String(reader.result).indexOf(',') + 1)); reader.readAsDataURL(file); });
}
async function cancelImport(requestId, batch = importBatch) {
  if (!requestId) return;
  if (batch?.cancelling) return batch.cancelling;
  const operation = (async () => {
    state = await request('/api/state');
    if (state.imports.jobs.find(job => job.requestId === requestId)?.status !== 'extracting') return;
    state = await request('/api/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision: state.revision, action: 'source.ingest.cancel', payload: { requestId } }) });
  })();
  if (batch) batch.cancelling = operation;
  try { await operation; } finally { if (batch) batch.cancelling = undefined; }
}
function artifactImportForm(withAI = false) {
  const requests = new Map();
  const scope = consentScope();
  const accept = withAI ? '' : ' accept=".hwp,.hwpx,.pdf,.docx,.xlsx,.xls,.pptx,.txt,.md,.html,.htm,.png,.jpg,.jpeg,.webp,.tif,.tiff"';
  const explanation = withAI ? '파일 형식에 맞춰 읽을 수 있는 본문과 페이지 이미지를 준비하고 AI가 본문·표·지원되는 이미지와 불확실성을 정리합니다. Office의 벡터 도형·차트·복잡한 배치는 PDF 사본을 함께 등록해 주세요. 형식을 읽지 못하면 사유를 표시합니다. 파일당 20MiB, 판독 본문 512KiB이며 암호 문서는 보호 해제 사본이 필요합니다.' : 'HWP/HWPX, PDF, DOCX, XLS/XLSX, PPTX, 텍스트·Markdown·HTML, 이미지. 로컬 추출·OCR만 사용하는 보완 경로입니다. 파일당 20MiB, 추출 본문 512KiB.';
  const consent = withAI ? '선택한 파일과 아래 기존 등록 자료 전체의 원문 본문·판독용 페이지 이미지·프로젝트 문맥을 CLI 모델 서비스에 보내 원본 판독부터 문서 통합·요구사항·에픽·개발 작업계획까지 AI로 처리하는 데 동의합니다. 여러 차례 호출하며 기존 CLI 요금이 적용됩니다.' : '등록 후 기존 자료와 선택한 파일의 추출 본문·이미지 시각 사본·PDF 원본을 CLI 모델 서비스로 보내 AI 요구사항 생성을 이어갑니다. 대용량 자료는 여러 묶음으로 나누어 호출하며 기존 CLI 요금이 적용됩니다.';
  const existingScope = withAI ? '<p>선택할 파일과 함께 아래 기존 자료 전체도 AI 재판독·통합 분석 대상으로 전송합니다. 로컬 보완 경로로만 등록했던 원본도 포함됩니다.</p><ul class="help-list">' + scope.backlog.sources.map(source => `<li>${esc(source.title)} · ${esc(labels[source.classification] ?? source.classification)}</li>`).join('') + '</ul>' : '';
  openForm(withAI ? 'AI 산출물 판독·전체 분석' : '산출물 파일 등록', existingScope + `<label class="field"><span>등록할 산출물 파일</span><input type="file" id="artifact-files" name="files" multiple required${accept}><small>${esc(explanation)}</small></label>` + select('자료 유형 참고 정보', 'sourceType', ['rfp', 'interview', 'as-is-artifact', 'regulation', 'policy-memo', 'other'], withAI ? 'other' : 'interview') + (withAI ? '<p>유형을 모르면 기타로 두세요. AI가 실제 내용에서 문서의 역할과 혼합 구성을 판별합니다.</p>' : '') + select('자료 분류', 'classification', ['public', 'internal', 'confidential', 'restricted'], 'internal') + (withAI ? '' : visualModeChoice()) + aiConsent('원문에 민감정보가 포함될 수 있으며, 이 비공개 작업공간에서 분석·보관하고 감지 내용은 별도 안내하는 방식임을 확인했습니다.', true, 'sensitivityAcknowledged') + aiConsent(consent, withAI) + '<p>기관의 자료 반출 허용 여부를 확인하세요. CLI를 사용해도 모델 서비스로 전송됩니다. 최종 검토 전에는 생성한 요구사항과 계획을 확정하지 않습니다.</p><p id="import-progress" role="status" aria-live="polite"></p><button type="button" class="button secondary" data-action="import-stop" hidden>등록 중단</button>', async (data, form) => {
    const files = [...form.querySelector('#artifact-files').files]; if (!files.length) return false;
    if (!data.has('sensitivityAcknowledged') || withAI && !data.has('ai-consent')) { showError(new Error('원문 분석 방식 확인과 모델 서비스 전송 동의가 필요합니다.')); return false; }
    if (data.has('ai-consent') && (!backlog().project.code || !backlog().project.name)) { showError(new Error('AI 분석 전에 프로젝트 정보를 등록해 주세요.')); return false; }
    busy = true;
    const batch = { cancelled: false, current: null }; importBatch = batch;
    const submit = form.querySelector('[type="submit"]'), stop = form.querySelector('[data-action="import-stop"]'); submit.disabled = true; stop.hidden = false;
    try {
      for (const [index, file] of files.entries()) {
        if (batch.cancelled) break;
        if (file.size > 20 * 1024 ** 2) throw new Error(`${file.name}: 파일당 20MiB까지 등록할 수 있습니다.`);
        form.querySelector('#import-progress').textContent = `${index + 1}/${files.length} · ${file.name} 판독 중`;
        state = await request('/api/state');
        if (data.has('ai-consent')) assertConsentScope(scope);
        if (batch.cancelled) break;
        let requestId = requests.get(file), previous = state.imports.jobs.find(job => job.requestId === requestId);
        if (previous?.status === 'ready') continue;
        if (!requestId || previous && ['failed', 'cancelled', 'interrupted', 'stale'].includes(previous.status)) { requestId = crypto.randomUUID(); requests.set(file, requestId); }
        batch.current = requestId;
        const base64 = await fileBase64(file);
        if (batch.cancelled) break;
        state = await request('/api/ingest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision: state.revision, action: 'source.ingest', payload: { requestId, filename: file.name, base64, classification: data.get('classification'), sourceType: data.get('sourceType'), sensitivityAcknowledged: data.has('sensitivityAcknowledged'), ...(withAI ? { readWithAI: true, consent: data.has('ai-consent'), model: state.ai.model } : {}) } }) });
        if (batch.cancelled) await cancelImport(requestId, batch);
        while (state.imports.jobs.find(job => job.requestId === requestId)?.status === 'extracting') { const progress = state.imports.jobs.find(job => job.requestId === requestId).readingProgress; if (progress) form.querySelector('#import-progress').textContent = `${index + 1}/${files.length} · ${file.name} · AI 판독 ${progress.completed}/${progress.total}구간`; await new Promise(resolve => setTimeout(resolve, 1000)); state = await request('/api/state'); }
        const job = state.imports.jobs.find(job => job.requestId === requestId);
        if (job?.status !== 'ready' && !batch.cancelled) throw new Error(`${file.name}: ${job?.errorCode ?? '문서 판독을 완료하지 못했습니다.'}`);
        if (job?.status === 'ready' && data.has('ai-consent')) await acceptConsentSource(scope, job);
      }
      if (!batch.cancelled && withAI && data.has('ai-consent')) await ensureOriginalReadings(data, form, batch, '#import-progress', scope);
      if (!batch.cancelled && data.has('ai-consent')) assertConsentScope(scope);
      if (!batch.cancelled && data.has('ai-consent')) state = await request('/api/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision: state.revision, action: 'ai.start', payload: { phase: 'analysis', inputDigest: state.ai.inputDigests.analysis, model: state.ai.model, consent: true, includeVisuals: withAI || data.get('visualMode') !== 'text', ...(withAI ? { fullPipeline: true } : {}) } }) });
      if (batch.cancelled) form.querySelector('#import-progress').textContent = '등록을 중단했습니다. 이미 등록 완료된 파일은 작업공간에 유지됩니다.';
      render(); return !batch.cancelled;
    } catch (error) { showError(error); return false; }
    finally { busy = false; document.body.removeAttribute('aria-busy'); submit.disabled = false; stop.hidden = true; if (importBatch === batch) importBatch = undefined; scheduleAiPoll(); }
  });
  dialogForm.querySelector('[type="submit"]').textContent = '등록하고 계속';
}
async function ensureOriginalReadings(data, form, batch, progressSelector, scope) {
  state = await request('/api/state');
  assertConsentScope(scope);
  if (state.imports?.active || state.ai?.active) throw new Error('다른 창에서 AI 판독 또는 분석이 진행 중입니다. 현재 처리가 끝난 뒤 이어서 진행하세요.');
  const originals = backlog().sources.filter(source => metadata().imports?.some(job => job.status === 'ready' && job.sourceId === source.id && job.originalRef));
  for (const [index, source] of originals.entries()) {
    if (batch.cancelled) break;
    state = await request('/api/state'); const requestId = crypto.randomUUID(); batch.current = requestId;
    assertConsentScope(scope);
    form.querySelector(progressSelector).textContent = `${index + 1}/${originals.length} · ${source.title} 원본 확인·AI 판독`;
    state = await request('/api/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision: state.revision, action: 'source.reingest', payload: { sourceId: source.id, requestId, consent: data.has('ai-consent'), sensitivityAcknowledged: data.has('sensitivityAcknowledged'), model: state.ai.model } }) });
    if (batch.cancelled) await cancelImport(requestId, batch);
    while (state.imports.jobs.find(job => job.requestId === requestId)?.status === 'extracting') { const progress = state.imports.jobs.find(job => job.requestId === requestId).readingProgress; if (progress) form.querySelector(progressSelector).textContent = `${index + 1}/${originals.length} · ${source.title} · AI 판독 ${progress.completed}/${progress.total}구간`; await new Promise(resolve => setTimeout(resolve, 1000)); state = await request('/api/state'); }
    const job = state.imports.jobs.find(job => job.requestId === requestId) ?? (state.imports.reused?.requestId === requestId ? state.imports.jobs.find(job => job.requestId === state.imports.reused.jobId) : null);
    if (job?.status !== 'ready' && !batch.cancelled) throw new Error(`${source.title}: ${job?.errorCode ?? '원본 판독을 완료하지 못했습니다.'}`);
    if (job?.status === 'ready') await acceptConsentSource(scope, job);
  }
}
function aiFullForm() {
  const scope = consentScope();
  const originals = backlog().sources.filter(source => metadata().imports?.some(job => job.status === 'ready' && job.sourceId === source.id && job.originalRef));
  openForm('원본에서 개발 작업계획까지 AI 처리', `<p>원본 파일 ${originals.length}건은 먼저 AI로 판독합니다. 직접 등록한 본문은 그 내용으로 분석합니다. 문서 통합 → 요구사항·품질 검토 → 에픽·스토리·인수조건·개발 계획을 자동으로 이어갑니다.</p><p>같은 원본과 지시문으로 검증한 판독은 재사용합니다. 새 판독에서는 사람의 보정·처분·근거 연결을 보존합니다. 변경 기록이 없는 구형 자료는 이전 근거를 유지하고 새 AI 근거를 별도로 더하며, 전체 판독문이 같으면 중복 추가하지 않습니다. 변경 없는 미검토 AI 초안만 이전 사본 보관 후 갱신합니다. 중요한 질문이 나오면 답변을 기다리고 최종 확인 전에는 요구사항·기준선·계획을 확정하지 않습니다.</p><p>현재 요구사항 분석은 약 ${state.ai.analysisPlan?.batches ?? '?'}묶음이며 통합·검토·계획 호출이 추가됩니다. 원본 판독은 문서당 최대 128구간, 이후 분석 실행은 최대 256회 호출로 제한합니다. 자료량과 결과에 따라 실제 호출 수가 달라지며 기존 CLI 요금이 적용됩니다.</p><ul class="help-list">${backlog().sources.map(source => `<li>${esc(source.title)} · ${esc(labels[source.classification] ?? source.classification)}</li>`).join('')}</ul>${aiConsent('완료된 분석 단계도 입력·지시문이 일치하면 재사용합니다.', false, 'reuse', true)}${aiConsent('등록된 원본에 민감정보가 포함될 수 있으며, 분석을 완료하고 감지 종류·위치를 별도로 안내하는 방식임을 확인했습니다.', true, 'sensitivityAcknowledged')}${aiConsent('위 자료의 본문과 판독용 페이지 이미지를 CLI 모델 서비스에 보내 전체 AI 처리를 진행하는 데 동의합니다.')}<p id="full-progress" role="status" aria-live="polite"></p><button type="button" class="button secondary" data-action="import-stop" hidden>처리 중단</button>`, async (data, form) => {
    if (!data.has('ai-consent') || !data.has('sensitivityAcknowledged')) { showError(new Error('원문 분석 방식 확인과 모델 서비스 전송 동의가 필요합니다.')); return false; }
    busy = true; document.body.setAttribute('aria-busy', 'true');
    const batch = { cancelled: false, current: null }; importBatch = batch;
    const submit = form.querySelector('[type="submit"]'), stop = form.querySelector('[data-action="import-stop"]'); submit.disabled = true; stop.hidden = false;
    try {
      await ensureOriginalReadings(data, form, batch, '#full-progress', scope);
      if (!batch.cancelled) {
        state = await request('/api/state');
        assertConsentScope(scope);
        state = await request('/api/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision: state.revision, action: 'ai.start', payload: { phase: 'analysis', fullPipeline: true, reuseCheckpoints: data.has('reuse'), inputDigest: state.ai.inputDigests.analysis, model: state.ai.model, consent: data.has('ai-consent') && data.has('sensitivityAcknowledged'), includeVisuals: true } }) });
      }
      render(); return !batch.cancelled;
    } catch (error) { showError(error); return false; }
    finally { busy = false; document.body.removeAttribute('aria-busy'); submit.disabled = false; stop.hidden = true; if (importBatch === batch) importBatch = undefined; scheduleAiPoll(); }
  });
  dialogForm.querySelector('[type="submit"]').textContent = '동의하고 전체 AI 처리 시작';
}
function aiStartForm(phase) {
  const scope = consentScope(), inputDigest = state.ai.inputDigests[phase];
  openForm('AI 분석 실행 확인', `<p>선택 모델: <strong>${esc(state.ai.model)} · ${esc(state.ai.effort)}</strong></p><p>이 PC의 CLI를 통해 모델 서비스로 아래에서 선택한 자료 범위와 프로젝트 문맥을 보냅니다. 기존 CLI의 로그인·과금 설정이 적용됩니다. 구조 오류는 한 번 자동 보정하며 추가 호출이 발생할 수 있습니다. 대용량 자료는 자동으로 나누어 순서대로 분석하므로 여러 번의 CLI 호출과 요금이 발생할 수 있습니다. 실패·취소 후 재실행은 첫 묶음부터 다시 시작합니다. 시각 자료는 이미지 사본과 PDF 원본입니다. Office 문서의 비문자 도표는 별도 이미지나 PDF로 등록해 주세요.</p>${phase === 'analysis' && state.ai.analysisPlan?.batches > 1 ? `<p role="status">현재 자료는 ${state.ai.analysisPlan.batches}묶음으로 나누어 분석합니다. 중간 결과를 합쳐 검증한 뒤 제안하며, 취소하면 다음 묶음을 전송하지 않습니다.</p>` : ''}${phase === 'analysis' && state.ai.analysisPlan?.errorCode ? `<p class="field-error" role="alert">자료의 처리 한도와 기존 요구사항의 원문 연결·분석 범위를 먼저 검토해 주세요. (${esc(state.ai.analysisPlan.errorCode)})</p>` : ''}<ul class="help-list">${backlog().sources.map(source => `<li>${esc(source.title)} · ${esc(source.classification)} · ${(source.clauses ?? []).length}개 조항</li>`).join('')}</ul>${visualModeChoice()}${aiConsent('원문에 민감정보가 포함될 수 있으며, 분석을 완료하고 감지 내용은 별도로 안내하는 비공개 처리 방식임을 확인했습니다.', true, 'sensitivityAcknowledged')}${aiConsent('등록된 원문 자료를 선택한 CLI의 모델 서비스로 보내 분석하는 데 동의합니다.')}`, async data => { state = await request('/api/state'); assertConsentScope(scope); return act('ai.start', { phase, inputDigest, consent: data.has('ai-consent') && data.has('sensitivityAcknowledged'), model: state.ai.model, includeVisuals: data.get('visualMode') !== 'text' }); });
  dialogForm.querySelector('[type="submit"]').textContent = '동의하고 AI 분석 시작';
}
function aiAnswerForm() {
  const job = state.ai.current, issues = state.ai.proposal.issues;
  const scopeChoice = job.phase === 'decomposition' ? select('답변이 확정 요구사항을 바꾸나요?', 'answerScope', [['requirements', '요구사항 변경 또는 불확실 · 재분석 후 다시 확정'], ['planning', '작업 계획만 보완 · 확정 요구사항은 유지']], 'requirements') : '';
  openForm('AI 질문에 답변', scopeChoice + issues.map(issue => field(issue.question, `answer-${issue.id}`, '', { textarea: true, required: issue.severity === 'blocking', hint: issue.options.join(' / ') })).join('') + '<p>답변은 사용자 결정 근거로 보관되고 등록된 자료와 함께 모델 서비스로 전달됩니다. 업무 범위·권한·측정 기준이 바뀌면 요구사항을 다시 분석하고 확정합니다. 요구사항 재분석은 전체 등록 자료를 첫 묶음부터 다시 처리하므로 추가 CLI 호출과 요금이 발생합니다.</p>', data => act('ai.answer', { jobId: job.id, answers: issues.filter(issue => String(data.get(`answer-${issue.id}`) ?? '').trim()).map(issue => ({ issueId: issue.id, answer: data.get(`answer-${issue.id}`).trim() })), ...(job.phase === 'decomposition' ? { scope: data.get('answerScope') } : {}), continueWithAI: true }));
  dialogForm.querySelector('[type="submit"]').textContent = '답변을 반영하고 AI 계속 실행';
}
function aiConfirmForm() {
  const job = state.ai.current, analysis = job.phase === 'analysis', proposal = state.ai.proposal;
  const full = proposal.fullPipeline === true;
  const label = full ? '문서 해석·요구사항·원문 근거·에픽·인수조건·개발 작업계획을 검토했습니다.' : analysis ? 'AI가 생성한 요구사항과 원문 근거를 검토했습니다.' : '생성된 작업과 인수조건의 변경 내용을 검토했습니다.';
  const scopeChanges = (proposal.changes ?? []).filter(change => change.requiresScopeReview), retirements = proposal.retirements ?? [];
  const acknowledgments = scopeChanges.map(change => aiConsent(`${change.id}: 기존 업무 범위 변경 (${labels[change.fields.find(field => field.name === 'scopeDisposition').before]} → ${labels[change.fields.find(field => field.name === 'scopeDisposition').after]})에 동의합니다.`, true, `scope-${change.id}`)).join('') + retirements.map(item => {
    const change = proposal.changes.find(change => change.entity === item.entity && change.id === item.id);
    return aiConsent(`${item.id}을 현재 계획에서 제외합니다. 사유: ${item.reason}${change?.hasJudgment ? ` · 기존 기관 판정: ${labels[change.judgment]}` : ''}. 변경 전 계획과 판정 근거는 실행 기록에 보관됩니다.`, true, `retire-${item.entity}:${item.id}`);
  }).join('');
  const details = full ? `검토한 요구사항 ${proposal.requirements.length}건과 작업 ${proposal.workItems.length}건·인수조건 ${proposal.acceptanceCriteria.length}건을 함께 반영하고 분석 기준선과 개발 작업 패키지를 만듭니다. 기관 인수·실제 시험 완료를 의미하지 않습니다.` : analysis ? `요구사항 ${proposal.requirements.length}건을 검토한 기준선으로 확정합니다. 다음 단계 자동 생성을 선택하면 모델 서비스에 전달해 에픽·스토리·인수조건 생성을 이어갑니다. 대규모 에픽 생성은 아직 한 요청으로 처리하며 시간·용량 한도에 걸려도 확정 기준선은 유지됩니다. 선택을 해제하면 요구사항만 확정하고 직접 보완할 수 있습니다.` : `현재 작업 ${backlog().workItems.length}건과 인수조건 ${backlog().acceptanceCriteria.length}건을 제안한 작업 ${proposal.workItems.length}건과 인수조건 ${proposal.acceptanceCriteria.length}건으로 갱신합니다. 변경 전 입력과 생성 결과는 작업공간의 실행 기록에 보관합니다.`;
  openForm(full ? '전체 AI 초안 최종 확인' : analysis ? '요구사항 확정 및 다음 단계' : '생성한 작업 검토', `<p>${esc(details)}</p>${aiChangePreview(proposal)}${acknowledgments}${aiConsent(label)}${analysis && !full ? aiConsent('다음 단계에서 AI 에픽·스토리를 자동 생성합니다.', false, 'continue-ai', true) : ''}`, data => data.has('ai-consent') && act('ai.confirm', { jobId: job.id, confirmedScopeChanges: scopeChanges.filter(change => data.has(`scope-${change.id}`)).map(change => change.id), confirmedRetirements: retirements.filter(item => data.has(`retire-${item.entity}:${item.id}`)).map(item => `${item.entity}:${item.id}`), ...(analysis && !full ? { continueWithAI: data.has('continue-ai') } : {}) }));
  dialogForm.querySelector('[type="submit"]').textContent = full ? '검토한 전체 결과 반영' : analysis ? '확정하고 에픽·스토리 생성' : '검토한 작업 반영';
  if (analysis && !full) dialogForm.querySelector('[name="continue-ai"]').addEventListener('change', event => { dialogForm.querySelector('[type="submit"]').textContent = event.target.checked ? '확정하고 에픽·스토리 생성' : '요구사항만 확정'; });
}
function scheduleAiPoll(delay) {
  clearTimeout(aiPollTimer);
  if (!state) return;
  aiPollTimer = setTimeout(async () => {
    const requestToken = token;
    try {
      const revision = state.revision;
      const next = await request('/api/state', { progressOnly: true });
      if (token !== requestToken) { scheduleAiPoll(); return; }
      aiPollErrorReported = false;
      if (state.revision !== revision) { updateReadingStatus(state); scheduleAiPoll(); return; }
      updateReadingStatus(next);
      if (dialogForm || busy) { scheduleAiPoll(); return; }
      if (next.revision !== state.revision || next.ai?.active !== state.ai?.active || next.imports?.active !== state.imports?.active) {
        const focused = document.activeElement, action = focused?.dataset.action, key = focused?.dataset.key;
        state = next; render();
        if (action) [...document.querySelectorAll('[data-action]')].find(element => element.dataset.action === action && element.dataset.key === key)?.focus();
      } else { state = next; scheduleAiPoll(); }
    } catch (error) { if (token !== requestToken) { scheduleAiPoll(); return; } const code = error.code ?? 'UNKNOWN'; const progress = $('#server-reading-status'); if (progress) progress.textContent = error.message; if (aiPollErrorReported !== code && !dialogForm?.querySelector('[name="launcherAddress"]')) showError(error); aiPollErrorReported = code; aiPollTimer = setTimeout(scheduleAiPoll, 3000); }
  }, delay ?? (state.ai?.active || state.imports?.active ? 1500 : 5000));
}
function navigate(destination) { if (!pages.some(item => item[0] === destination)) return; if (dialogForm && !closeDialog()) return; page = destination; render(); $('#main').focus(); }
function overview() {
  const fullReady = state.ai?.proposal?.fullPipeline && state.ai?.current?.status === 'ready';
  const counts = [ ['근거 자료', backlog().sources.length, '원문 조항과 위치를 함께 기록'], ['요구사항', backlog().businessRequirements.length, '범위·해결 방향을 각각 판정'], ['개발 작업', backlog().workItems.filter(item => item.workItemType !== 'epic').length, '에픽에서 실행 가능한 작업으로'], ['인수조건', backlog().acceptanceCriteria.length, '허용과 거부 동작의 검증 기준'] ];
  return heading('프로젝트 진행 현황', '고객 산출물에서 개발 인계와 검수 근거까지, 같은 요구사항을 따라갑니다.', button('프로젝트 정보', 'project', '', true)) + `<div class="stats">${counts.map(([label, count, caption]) => `<div class="panel stat"><div class="stat-label">${label}</div><div class="stat-value">${count}<small>건</small></div><div class="stat-caption">${caption}</div></div>`).join('')}</div>` +
    `<div class="callout"><span class="callout-icon">!</span><div><strong>${state.contextChanged ? '저장소 기준이 바뀌었습니다.' : fullReady ? '문서 해석과 요구사항·개발 계획을 함께 확인하세요.' : state.baselineCurrent ? '분석 기준선이 현재 요구사항과 일치합니다.' : '자료를 등록하고 AI 전체 분석을 시작하세요.'}</strong><p>${state.contextChanged ? '변경 영향을 확인한 후 기준 정보를 갱신하세요.' : 'AI 원본 판독 → 문서 통합 → 요구사항 → 에픽·스토리·개발 계획 → 최종 확인 → 개발 인계'}</p></div>${fullReady ? '' : button('기준선 확인', 'navigate', 'baseline', true)}</div>` +
    panel('다음 작업', `<div class="task-row"><span class="task-number">1</span><div class="task-copy"><strong>고객 자료와 원문 조항 수집</strong><p>산출물 파일을 등록하면 본문·원문 위치를 추출하고 AI가 요구사항을 생성합니다.</p></div>${button('자료 열기', 'navigate', 'sources', true)}</div><div class="task-row"><span class="task-number">2</span><div class="task-copy"><strong>요구사항의 범위와 질문 해결</strong><p>AI가 찾은 충돌·누락·정책 질문에 답하고 원문 근거와 요구사항을 확인하세요.</p></div>${button('검토하기', 'navigate', 'requirements', true)}</div><div class="task-row"><span class="task-number">3</span><div class="task-copy"><strong>개발 준비 상태 확인</strong><p>현재 ${state.readiness?.errors?.length ?? 0}건의 확인 항목이 있습니다.</p></div>${button('인계 확인', 'navigate', 'handoff', true)}</div>`) + `<div class="section-title"><h2>상태를 읽는 방법</h2></div><div class="grid-2">${panel('계획과 기술 근거', '<p>범위·해결 방향은 사람의 계획입니다. 원장에서 찾았다는 관측과 기술 검토 수준은 개발 완료를 뜻하지 않습니다.</p>')}${panel('기관 검수와 감리', '<p>실제 시험 근거와 검수 기록을 입력합니다. 이 도구의 기록은 기관의 공식 결재나 전자서명을 대신하지 않습니다.</p>')}</div>`;
}
function sources() {
  const rows = backlog().sources.map(source => {
    const reading = metadata().imports?.findLast(job => job.sourceId === source.id && job.status === 'ready' && job.readingRef);
    return `<article class="panel mb-20"><div class="panel-head"><div><h2>${esc(source.title)}</h2><small>${esc(labels[source.sourceType] ?? source.sourceType)} · ${esc(labels[source.classification] ?? source.classification ?? '미분류')}</small></div><div class="row-actions">${reading ? button('AI 판독 기록', 'ai-reading', reading.readingRef.id, true) : ''}${button('자료 편집', 'source', source.id, true)}</div></div><div class="panel-body"><p class="ai-analysis-copy">${esc(source.summary)}</p>${reading?.detectedTypes ? `<p>AI가 확인한 문서 유형: ${esc(reading.detectedTypes.map(type => labels[type] ?? type).join(' / '))}</p>` : ''}${reading?.keptExistingClauses ? '<p>기존 근거의 보정·처분·사유는 보존했습니다. 이전 판독의 변경 이력이 없으면 새 AI 근거를 별도 조항으로 추가하며, 판독 기록과 함께 대조할 수 있습니다.</p>' : ''}<details><summary>근거 본문과 처리 상태 ${(source.clauses ?? []).length}개 조항</summary><p class="source-footer">${esc(source.id)} · ${esc(source.locator)}${source.fileSha256 ? ` · SHA-256 ${esc(source.fileSha256)}` : ''}</p>${(source.clauses ?? []).map(clause => `<div class="clause"><small>${esc(clause.id)} · ${esc(clause.locator)}</small><p class="ai-analysis-copy">${esc(clause.text)}</p><div class="status-detail">${badge(clause.disposition)}<span>${esc((clause.requirementIds ?? []).join(', '))}</span><span>${esc(clause.rationale)}</span></div></div>`).join('')}</details></div></article>`;
  }).join('');
  return heading('산출물 수집', 'AI가 원본을 판독하고 문서의 구조·핵심 내용·불확실성을 정리합니다.', button('자료 직접 추가', 'source', '', true)) + `<div class="inline-note mb-20">AI로 산출물 등록에서 문서·사진·스캔·표·장표를 올리면 문서 유형을 판별하고 전체 분석으로 이어갑니다. 근거 본문은 보존하며 판독이 불확실한 곳은 원본과 대조할 수 있습니다.</div>${rows || empty('등록한 자료가 없습니다. 고객이 제공한 비식별 자료를 추가하세요.')}`;
}
function recommendationCards() {
  const groups = [['modules', '모듈'], ['capabilities', '업무 역량'], ['screens', '화면'], ['interfaces', 'API'], ['tables', 'DB 표']];
  return (state.matches?.results ?? []).map(result => {
    const rows = groups.flatMap(([kind, label]) => (result.candidates?.[kind] ?? []).map(candidate => {
      const targetId = candidate.id ?? candidate.route;
      const observed = state.context?.[kind]?.find(item => (item.id ?? item.route) === targetId) ?? candidate;
      const title = candidate.label ?? observed.label ?? targetId;
      return `<tr><th scope="row">${label}</th><td><strong>${esc(title)}</strong>${title !== targetId ? `<small class="wide-text">${esc(targetId)}</small>` : ''}${candidate.permission ? `<small>권한: ${esc(candidate.permission)}</small>` : ''}</td><td>${esc(candidate.status ?? observed.status ?? '원장에 등록됨')}</td><td>${esc(candidate.evidenceLevel ?? observed.evidenceLevel ?? '검토 증거 미기록')}</td></tr>`;
    }));
    return `<article class="candidate-card"><h3>${esc(result.title)} <small>${esc(result.requirementId)}</small></h3><p class="progress-note">현재 방향: ${esc(labels[result.currentDisposition] ?? result.currentDisposition)} · 추천 방향: ${esc(labels[result.suggestedDisposition] ?? result.suggestedDisposition)}</p>${rows.length ? `<div class="table-wrap"><table><caption class="sr-only">${esc(result.title)}의 기존 기능 추천과 원장 근거</caption><thead><tr><th scope="col">종류</th><th scope="col">후보 대상</th><th scope="col">원장 관측</th><th scope="col">증거 수준</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>` : '<p class="muted">일치하는 후보가 없습니다. 신규 개발 필요 여부는 사람이 확인하세요.</p>'}</article>`;
  }).join('') || empty('요구사항을 등록하면 관련 모듈·화면·API·DB 표 후보를 확인할 수 있습니다.');
}
function requirements() {
  const rows = backlog().businessRequirements.map(requirement => `<tr><td><button type="button" class="text-button wide-text" data-action="requirement" data-key="${esc(requirement.id)}">${esc(requirement.title)}</button><small>${esc(requirement.id)}</small></td><td>${badge(requirement.scopeDisposition)}<small>${esc(labels[requirement.solutionDisposition])}</small></td><td>${requirement.openQuestions?.length ?? 0}건</td><td>${state.reviewedRequirementsCurrent?.[requirement.id] ? badge('현재 내용 검토됨', 'green') : badge('검토 필요', 'amber')}</td></tr>`).join('');
  return heading('요구사항 검토', '원문을 작은 요구사항으로 정리하고 포함·보류·제외와 해결 방향을 결정합니다.', button('요구사항 추가', 'requirement')) + panel('요구사항 목록', rows ? `<div class="table-wrap"><table><caption class="sr-only">요구사항과 범위·질문·검토 상태</caption><thead><tr><th scope="col">요구사항</th><th scope="col">계획·범위</th><th scope="col">남은 질문</th><th scope="col">분석 검토</th></tr></thead><tbody>${rows}</tbody></table></div>` : empty('자료를 등록한 뒤 요구사항을 추가하세요.')) + `<div class="section-title"><h2>원장 추천 근거</h2></div>${panel('기존 기능 후보', `<p class="muted">검색어 일치 기반 추천입니다. 적합성은 원문과 실제 동작을 확인해 결정하세요.</p><p class="progress-note">원장에 등록된 후보와 기술 검토 수준을 함께 표시합니다. 추천이나 원장 존재는 구현 완료를 뜻하지 않습니다.</p>${recommendationCards()}`)}`;
}
function baseline() {
  const readiness = state.analysisReadiness ?? state.readiness ?? { errors: [] };
  return heading('분석 기준선', '원문 처리와 요구사항 검토가 완료된 시점을 고정합니다.') + `<div class="grid-2">${panel('확정 전 확인', problemList(readiness.errors) + (readiness.warnings?.length ? `<details><summary>참고 사항</summary>${problemList(readiness.warnings)}</details>` : ''))}<section class="panel baseline-card"><h2>분석 기준선 확정</h2><p>현재 자료·요구사항·검토 기록과 저장소 기준을 함께 묶습니다. 이후 에픽·스토리를 상세화할 수 있습니다.</p><p>${state.baselineCurrent ? badge('현재 분석과 일치', 'green') : badge('새 기준선 필요', 'amber')}</p><button type="button" class="button" data-action="baseline" ${!readiness.valid || state.contextChanged ? 'disabled' : ''}>분석 기준선 확정</button><div class="divider"></div><h3>저장소 기준</h3><p class="wide-text">${esc(state.context?.sourceCommit ?? state.context?.commit ?? state.context?.snapshotDigest ?? '현재 원장 스냅숏')}</p>${state.contextChanged ? '<p class="danger-text">변경된 원장과 추적 링크를 검토하고 갱신하세요.</p>' : ''}<details><summary>저장소 기준 변경 내용</summary><pre class="data-preview">${esc(JSON.stringify(state.contextDiff ?? {}, null, 2))}</pre></details>${button('기준 정보 갱신', 'context', '', true)}</section></div><div class="section-title"><h2>확정 이력</h2></div>${panel('분석 기준선 기록', metadata().baselines?.length ? metadata().baselines.map(item => `<div class="timeline-row"><strong>${esc(item.label ?? item.id)}</strong><small>${esc(item.createdAt ?? item.at)}</small><p class="wide-text">${esc(item.analysisHash ?? item.digest ?? item.hash ?? '')}</p>${item.backlogRef?.id ? button('기준선 백로그 내려받기', 'download', item.backlogRef.id, true) : ''}</div>`).join('') : empty('확정한 기준선이 없습니다.'))}`;
}
function work() {
  const groups = [ ['epic', '에픽'], ['story', '스토리'], ['other', '구성·검증·기반 작업'] ];
  const board = `<div class="board">${groups.map(([kind, title]) => `<section class="board-column"><h2 class="column-heading">${title}</h2>${backlog().workItems.filter(item => kind === 'other' ? !['epic', 'story'].includes(item.workItemType) : item.workItemType === kind).map(item => `<button type="button" class="story-card" data-action="work" data-key="${esc(item.id)}"><small>${esc(item.id)} · ${esc(item.batch)}</small><h3>${esc(item.title)}</h3><p>${esc(item.description ?? item.iWant)}</p><footer>${badge(item.priority ?? 'MUST')}<span>${esc((item.requirementIds ?? []).join(', '))}</span></footer></button>`).join('') || empty('등록한 작업이 없습니다.')}</section>`).join('')}</div>`;
  const ac = backlog().acceptanceCriteria.map(item => `<div class="criteria">${badge(item.polarity === 'allow' ? 'Green 허용' : 'Red 거부', item.polarity === 'allow' ? 'green' : 'amber')}<p class="wide-text"><strong>${esc(item.id)} · ${esc(item.workItemId)}</strong><br>${esc(item.given)} / ${esc(item.when)} / ${esc(item.then)}<br><small>${esc(item.verificationMethod)} · ${esc(labels[item.acceptanceDisposition ?? 'pending'])}</small></p>${button('편집', 'ac', item.id, true)}</div>`).join('');
  const traces = backlog().traceLinks.map(item => `<div class="check-row"><div class="check-copy"><strong class="wide-text">${esc(item.targetKind)} · ${esc(item.targetId)}</strong><p>${esc(item.requirementId)} → ${esc(item.workItemId)} → ${esc(item.acId)} · ${esc(item.linkIntent)}</p></div>${button('편집', 'trace', item.id, true)}</div>`).join('');
  return heading('에픽·스토리', '요구사항을 작업·의사결정 카드·허용/거부 인수조건으로 상세화합니다.', button('작업 추가', 'work')) + board + `<div class="section-title"><h2>허용·거부 인수조건</h2>${button('인수조건 추가', 'ac', '', true)}</div>${panel('인수조건', ac || empty('작업을 만든 뒤 Green·Red 인수조건을 각각 등록하세요.'))}<div class="section-title"><h2>근거 추적</h2>${button('추적 링크 추가', 'trace', '', true)}</div>${panel('화면·역량·API·표·게이트·이관 매핑', traces || empty('개발 대상과 근거의 추적 링크를 연결하세요.'))}`;
}
function artifactRows() { return (metadata().exports ?? []).map(item => `<div class="check-row"><div class="check-copy"><strong>${esc(item.filename ?? item.kind)}</strong> ${item.stale ? badge('이전 입력의 자료 · 다시 생성 필요', 'amber') : badge('현재 입력의 자료', 'green')}<p>${esc(item.kind)} · ${esc(item.createdAt ?? item.at)}</p><small class="wide-text">입력 버전 ${esc(item.inputRevision ?? '')} · SHA-256 ${esc(item.sha256 ?? '')}</small></div>${item.sensitivityWarnings?.length ? `<div>${badge('민감정보 감지 · 공유 전 확인', 'amber')}${sensitivityDetails(item.sensitivityWarnings)}</div>` : ''}${button('내려받기', 'download', item.id, true)}</div>`).join(''); }
function handoff() {
  const controlledSources = backlog().sources.filter(source => ['confidential', 'restricted'].includes(source.classification)).length;
  const transferHint = `${controlledSources ? `기밀·제한 자료 ${controlledSources}건이 있습니다. ` : ''}기밀·제한 자료를 외부 AI에 전달할 때는 기관이 승인한 공급자와 자료 범위를 먼저 확인하세요. 이 화면의 패키지 생성은 로컬에서 수행합니다. AI 초안 생성 시에는 동의한 자료를 CLI 모델 서비스로 전송합니다.`;
  return heading('개발 인계', '확정한 요구사항을 개발 작업 패키지와 검토용 교환 자료로 내보냅니다.') + `<div class="callout"><span class="callout-icon">!</span><div><strong>${state.readiness?.valid && state.baselineCurrent && !state.contextChanged ? '개발 인계 준비가 됐습니다.' : '인계 전 확인할 항목이 있습니다.'}</strong><p>이 화면은 개발을 자동 실행하지 않습니다. 작업 패키지를 에이전트 또는 개발 담당자에게 전달하세요.</p><p>${esc(transferHint)}</p></div></div><div class="grid-2">${panel('개발 준비 확인', problemList(state.readiness?.errors, 'work') + (!state.baselineCurrent ? '<p class="danger-text">현재 분석의 기준선 확정이 필요합니다.</p>' : '') + (state.contextChanged ? '<p class="danger-text">변경된 저장소 기준을 확인하세요.</p>' : ''))}${panel('인계 자료', `<div class="row-actions"><button type="button" class="button" data-action="export" data-key="task" ${!state.readiness?.valid || !state.baselineCurrent || state.contextChanged ? 'disabled' : ''}>개발 작업 패키지 생성</button>${button('검토 CSV 생성', 'export', 'sheets', true)}${button('검수표 생성', 'export', 'uat', true)}</div><div class="divider"></div>${button('검토 CSV 반영', 'sheets-import', '', true)}<p class="progress-note">요구사항과 스토리·인수조건 CSV를 함께 검증한 뒤 적용합니다. 누락 행은 삭제로 처리하지 않습니다.</p><div class="divider"></div>${button('프로젝트 구성 대조', 'composition', '', true)}<pre class="data-preview">${esc(state.composition ? JSON.stringify(state.composition, null, 2) : '선택한 기능 구성과 요구사항의 후보 모듈을 대조합니다.')}</pre>`)}</div><div class="section-title"><h2>생성한 파일</h2></div>${panel('산출물 이력', artifactRows() || empty('생성한 파일이 없습니다.'))}`;
}
function audit() {
  const history = (metadata().uatRecords ?? []).map(record => `<div class="timeline-row"><strong>${esc(record.acId)} · ${esc(labels[record.disposition] ?? record.disposition)}</strong><small>${esc(record.date)} · ${esc(record.signer)} · 빌드 ${esc(record.buildRef)}</small><p class="wide-text">${esc(record.evidence)}</p><small class="wide-text">검수 당시 인수조건 해시 ${esc(record.acHash)} · 기록 시각 ${esc(record.recordedAt)}</small></div>`).join('');
  const archivedHistory = (metadata().uatHistoryRefs ?? []).map(ref => `<div class="check-row"><div class="check-copy"><strong>이전 검수 기록 묶음</strong><small class="wide-text">SHA-256 ${esc(ref.sha256)} · ${esc(ref.bytes)} bytes</small></div>${button('이전 검수 기록 내려받기', 'download', ref.id, true)}</div>`).join('');
  const rows = backlog().acceptanceCriteria.map(item => `<tr><td><strong>${esc(item.id)}</strong><small class="wide-text">${esc(item.then)}</small></td><td>${badge(item.acceptanceDisposition ?? 'pending', item.acceptanceDisposition === 'accepted' ? 'green' : '')}</td><td>${esc(item.uatEvidence ?? '근거 미등록')}</td><td>${button('검수 기록', 'uat', item.id, true)}</td></tr>`).join('');
  const findings = (metadata().auditFindings ?? []).map(item => `<div class="check-row"><div class="check-copy"><strong>${esc(item.title)}</strong><p>${esc(item.severity)} · ${esc(item.disposition)} · ${esc(item.evidence)}</p></div>${button('편집', 'finding', item.id, true)}</div>`).join('');
  return heading('검수·감리', '실제 시험과 기관 검수 근거, 감리 지적과 조치 내용을 기록합니다.', button('감리 보고서 생성', 'export', 'audit')) + `<div class="inline-note mb-20">검수 기록은 실제 근거의 문서번호 또는 파일 해시와 대상 빌드를 적습니다. 시험을 대신 실행하거나 공식 결재·전자서명을 생성하지 않습니다.</div>${panel('인수조건별 검수', rows ? `<div class="table-wrap"><table><caption class="sr-only">인수조건별 기관 검수 기록</caption><thead><tr><th scope="col">인수조건</th><th scope="col">기관 인수</th><th scope="col">검수 근거</th><th scope="col">기록</th></tr></thead><tbody>${rows}</tbody></table></div>` : empty('인수조건을 등록하면 검수 기록을 입력할 수 있습니다.'), button('검수 CSV 반영', 'uat-import', '', true))}<div class="section-title"><h2>보존된 검수 기록</h2></div>${panel('현재 판정과 과거 기록', '<p class="progress-note">요구사항 변경으로 현재 판정이 검수 대기로 바뀌어도 이전 빌드의 검수 기록은 보존합니다. 과거 기록은 현재 빌드의 인수를 뜻하지 않습니다.</p>' + `<p class="progress-note">최근 기록 ${(metadata().uatRecords ?? []).length}건 · 이전 기록 묶음 ${(metadata().uatHistoryRefs ?? []).length}개</p>` + (history || empty('최근 검수 기록이 없습니다.')) + archivedHistory)}<div class="section-title"><h2>감리 지적·조치</h2>${button('지적 등록', 'finding', '', true)}</div>${panel('감리 기록', findings || empty('등록한 감리 지적이 없습니다. 이는 감리 완료를 의미하지 않습니다.'))}<div class="section-title"><h2>반출 자료</h2></div>${panel('생성한 파일', artifactRows() || empty('아직 생성한 파일이 없습니다.'))}`;
}
function projectForm() {
  const project = backlog().project;
  openForm('프로젝트 정보', field('프로젝트 코드', 'code', project.code, { required: true }) + field('프로젝트 이름', 'name', project.name, { required: true }) + field('기관명', 'institution', project.institution) + field('시작 구성', 'baselineProfile', project.baselineProfile), data => act('project.save', Object.fromEntries(data)), '코드와 이름은 비식별 업무명으로 입력하세요.');
}
function nextClauseIndex(container) { return Math.max(-1, ...[...container.querySelectorAll('[data-clause]')].map(row => Number(row.dataset.clause))) + 1; }
function clauseFields(clause, index, { persisted = false } = {}) {
  const prefix = `clause-${index}-`;
  return `<fieldset class="clause-editor" data-clause="${index}" data-persisted="${persisted}" data-placeholder="${!clause.text && !clause.locator && !clause.requirementIds?.length}"><legend>원문 조항 ${index + 1}</legend>${field('조항 ID', `${prefix}id`, clause.id, { required: true })}${field('조항 위치', `${prefix}locator`, clause.locator, { required: true })}${field('조항 본문', `${prefix}text`, clause.text, { textarea: true, required: true })}${select('조항 처리', `${prefix}disposition`, ['question', 'included', 'merged', 'deferred', 'excluded'], clause.disposition ?? 'question')}${select('연결 요구사항', `${prefix}requirementIds`, mapChoices(backlog().businessRequirements), clause.requirementIds ?? [], true)}${field('처리 사유·확인할 질문', `${prefix}rationale`, clause.rationale, { textarea: true })}${persisted ? '' : button('작성 중 빈 조항 제거', 'clause-remove', '', true)}</fieldset>`;
}
function sourceForm(key) {
  const source = clone(backlog().sources.find(item => item.id === key) ?? { id: id('SRC'), sourceType: 'interview', classification: 'internal', title: '', clauses: [{ id: id('CLS'), disposition: 'question', rationale: '요구사항 연결과 범위 판정 필요', text: '' }] });
  openForm(key ? '자료 편집' : '자료 추가', field('자료 ID', 'id', source.id, { readonly: true }) + field('자료 제목', 'title', source.title, { required: true }) + `<div class="fields-row">${select('자료 유형', 'sourceType', ['rfp', 'interview', 'as-is-artifact', 'regulation', 'policy-memo', 'other'], source.sourceType)}${select('자료 분류', 'classification', ['public', 'internal', 'confidential', 'restricted'], source.classification ?? 'internal')}</div>` + field('문서 참조번호', 'reference', source.reference) + field('자료 위치', 'locator', source.locator) + field('원본 파일 SHA-256', 'fileSha256', source.fileSha256, { hint: '원본 파일의 해시를 별도로 확인한 경우에 입력합니다.' }) + field('요약', 'summary', source.summary, { textarea: true }) + `<label class="field"><span>비식별 TXT·Markdown 가져오기</span><input type="file" id="source-file" accept=".txt,.md,text/plain,text/markdown"><small>최대 512KB. 본문을 확인한 뒤 저장합니다. 원본 파일은 전송하지 않습니다.</small></label><div id="clauses">${(source.clauses ?? []).map((clause, index) => clauseFields(clause, index, { persisted: Boolean(key) })).join('')}</div>${button('원문 조항 추가', 'clause-add', '', true)}`,
    (data, form) => {
      const result = { ...source, title: data.get('title').trim(), sourceType: data.get('sourceType'), classification: data.get('classification'), reference: data.get('reference').trim(), locator: data.get('locator').trim(), summary: data.get('summary').trim() };
      const hash = data.get('fileSha256').trim(); if (hash) result.fileSha256 = hash; else delete result.fileSha256;
      result.clauses = [...form.querySelectorAll('[data-clause]')].map(row => { const prefix = `clause-${row.dataset.clause}-`; return { id: data.get(`${prefix}id`).trim(), locator: data.get(`${prefix}locator`).trim(), text: data.get(`${prefix}text`).trim(), disposition: data.get(`${prefix}disposition`), requirementIds: data.getAll(`${prefix}requirementIds`), rationale: data.get(`${prefix}rationale`).trim() }; });
      return act('source.save', result);
    }, '조항은 처음에 질문으로 보관한 뒤 요구사항을 추가하고 연결하세요. 조항을 포함·통합할 때는 연결 요구사항이 필요합니다.');
  const markEditedClause = event => { const row = event.target.closest('[data-clause]'); if (row) row.dataset.touched = 'true'; };
  dialogForm.addEventListener('input', markEditedClause);
  dialogForm.addEventListener('change', markEditedClause);
  $('#source-file').addEventListener('change', async event => {
    const file = event.target.files[0]; if (!file) return;
    if (!/\.(txt|md)$/i.test(file.name) || file.size > 512 * 1024) { showError(new Error('512KB 이하 TXT·Markdown 파일을 선택하세요.')); event.target.value = ''; return; }
    const activeForm = dialogForm;
    try {
    const bytes = await file.arrayBuffer();
    const content = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(value => value.toString(16).padStart(2, '0')).join('');
    if (content.includes('\u0000')) { showError(new Error('텍스트 파일을 읽지 못했습니다. 비식별 발췌문을 직접 입력하세요.')); return; }
    const entries = content.split(/\r?\n/).map((value, index) => ({ value: value.trim(), line: index + 1 })).filter(entry => entry.value);
    if (!entries.length) { showError(new Error('파일에 가져올 조항이 없습니다. 본문이 있는 텍스트 파일을 선택하세요.')); return; }
    if (entries.length > 300) { showError(new Error('한 번에 300개 조항까지 가져올 수 있습니다. 자료를 나누어 입력하세요.')); return; }
    if (dialogForm !== activeForm) return;
    activeForm.elements.namedItem('fileSha256').value = hash;
    activeForm.querySelector('.form-errors').hidden = true;
    const container = $('#clauses');
    for (const row of container.querySelectorAll('[data-clause]')) {
      if (row.dataset.persisted !== 'true' && row.dataset.placeholder === 'true' && row.dataset.touched !== 'true') row.remove();
    }
    for (const { value, line } of entries) { const next = nextClauseIndex(container); container.insertAdjacentHTML('beforeend', clauseFields({ id: id('CLS'), locator: `L${line}`, text: value, disposition: 'question', rationale: '요구사항 연결과 범위 판정 필요' }, next)); }
    toast('줄 단위로 조항을 가져왔습니다. 비식별 처리와 조항 경계를 확인하고 저장하세요.');
    } catch { if (dialogForm === activeForm) showError(new Error('UTF-8 텍스트를 읽지 못했습니다. 인코딩을 확인하거나 발췌문을 직접 입력하세요.')); }
  });
}
function requirementForm(key) {
  const clauseChoices = backlog().sources.flatMap(source => (source.clauses ?? []).map(clause => [`${source.id}/${clause.id}`, `${source.title} · ${clause.locator || clause.id}`]));
  const linkedClauses = backlog().sources.flatMap(source => (source.clauses ?? []).filter(clause => (clause.requirementIds ?? []).includes(key)).map(clause => `${source.id}/${clause.id}`));
  const requirement = clone(backlog().businessRequirements.find(item => item.id === key) ?? { id: id('REQ'), sourceIds: [], requirementType: 'functional', solutionDisposition: 'undecided', scopeDisposition: 'proposed', moduleCandidates: [], openQuestions: [], acceptanceDisposition: 'pending' });
  openForm(key ? '요구사항 편집' : '요구사항 추가', field('요구사항 ID', 'id', requirement.id, { readonly: true }) + field('요구사항 제목', 'title', requirement.title, { required: true }) + field('상세 설명', 'description', requirement.description, { textarea: true }) + select('근거 자료', 'sourceIds', mapChoices(backlog().sources), requirement.sourceIds, true) + select('원문 조항', 'clauseIds', clauseChoices, linkedClauses, true) + '<div id="requirement-origin" class="inline-note mb-20"></div>' + `<div class="fields-row">${select('요구사항 유형', 'requirementType', ['functional', 'non-functional', 'data', 'interface', 'constraint'], requirement.requirementType)}${select('사업 범위', 'scopeDisposition', ['proposed', 'included', 'deferred', 'excluded'], requirement.scopeDisposition)}</div>` + select('해결 방향', 'solutionDisposition', ['undecided', 'fit', 'config', 'gap-dev', 'hybrid'], requirement.solutionDisposition) + field('후보 모듈', 'moduleCandidates', requirement.moduleCandidates?.join(', '), { hint: '모듈 ID를 쉼표로 구분합니다. 추천은 아래 원장 근거와 대조하세요.' }) + field('판정 사유', 'rationale', requirement.rationale, { textarea: true }) + field('해결되지 않은 질문', 'openQuestions', requirement.openQuestions?.join('\n'), { textarea: true, hint: '한 줄에 한 질문. 답을 반영한 뒤 해당 질문을 제거하세요.' }) + `<fieldset class="clause-editor"><legend>정량적 검증 기준</legend>${field('측정 지표', 'metric', requirement.nfrCriteria?.metric)}${field('목표값·조건', 'threshold', requirement.nfrCriteria?.threshold)}${select('검증 방법', 'verificationMethod', ['', 'unit-test', 'integration-test', 'e2e', 'harness-gate', 'load-test', 'manual-uat', 'config-check'], requirement.nfrCriteria?.verificationMethod ?? '')}</fieldset><label class="checkbox-field"><input name="reviewed" type="checkbox" ${state.reviewedRequirementsCurrent?.[requirement.id] ? 'checked' : ''}> 이 내용의 근거·범위·질문을 확인했습니다.</label>`, data => {
      const result = { ...requirement, title: data.get('title').trim(), description: data.get('description').trim(), sourceIds: data.getAll('sourceIds'), requirementType: data.get('requirementType'), scopeDisposition: data.get('scopeDisposition'), solutionDisposition: data.get('solutionDisposition'), moduleCandidates: list(data.get('moduleCandidates')), rationale: data.get('rationale').trim(), openQuestions: lines(data.get('openQuestions')) };
      if (data.get('metric') || data.get('threshold') || data.get('verificationMethod')) result.nfrCriteria = { metric: data.get('metric').trim(), threshold: data.get('threshold').trim(), verificationMethod: data.get('verificationMethod') }; else delete result.nfrCriteria;
      return act('requirement.save', { requirement: result, reviewed: data.has('reviewed'), clauseIds: data.getAll('clauseIds') });
    }, '우선 제안 상태로 저장하고 자료의 원문 조항에 연결하세요. 포함한 요구사항은 조항 근거와 해결 방향이 필요합니다. 검토 확인은 기관 인수와 다릅니다.');
  const reviewed = dialogForm.elements.namedItem('reviewed');
  const meaning = () => JSON.stringify([...new FormData(dialogForm).entries()].filter(([name]) => name !== 'reviewed').map(([name, value]) => [name, String(value).trim()]));
  let confirmedMeaning = reviewed.checked ? meaning() : null;
  reviewed.addEventListener('change', () => { if (reviewed.checked) confirmedMeaning = meaning(); });
  const requireFreshReview = event => { if (event.target.name !== 'reviewed' && confirmedMeaning !== null && meaning() !== confirmedMeaning) reviewed.checked = false; };
  dialogForm.addEventListener('input', requireFreshReview);
  dialogForm.addEventListener('change', requireFreshReview);
  const sourceSelect = dialogForm.elements.namedItem('sourceIds');
  const clauseSelect = dialogForm.elements.namedItem('clauseIds');
  sourceSelect.required = true; clauseSelect.required = true;
  const preview = () => {
    const selected = [...clauseSelect.selectedOptions].map(option => option.value);
    $('#requirement-origin').innerHTML = backlog().sources.flatMap(source => (source.clauses ?? []).filter(clause => selected.includes(`${source.id}/${clause.id}`)).map(clause => `<div class="mb-20"><strong>${esc(source.title)} · ${esc(clause.locator)}</strong><p class="wide-text">${esc(clause.text)}</p><small>${esc(clause.id)} · ${esc(labels[clause.disposition] ?? clause.disposition)}</small></div>`)).join('') || '조항을 선택하면 원문과 위치를 여기에서 확인할 수 있습니다.';
  };
  clauseSelect.addEventListener('change', preview); preview();
}
function workForm(key) {
  const item = clone(backlog().workItems.find(value => value.id === key) ?? { id: id('WORK'), workItemType: 'story', requirementIds: [], parentEpicId: null, priority: 'MUST', batch: '', dependsOn: [], decisionCards: [] });
  openForm(key ? '작업 편집' : '작업 추가', field('작업 ID', 'id', item.id, { readonly: true }) + select('작업 유형', 'workItemType', ['epic', 'story', 'configuration', 'verification', 'enabler'], item.workItemType) + field('작업 제목', 'title', item.title, { required: true }) + field('작업 설명', 'description', item.description, { textarea: true }) + select('상위 에픽', 'parentEpicId', [['', '선택하세요'], ...mapChoices(backlog().workItems.filter(value => value.workItemType === 'epic' && value.id !== item.id))], item.parentEpicId ?? '') + select('연결 요구사항', 'requirementIds', mapChoices(backlog().businessRequirements), item.requirementIds, true) + `<div class="fields-row">${select('우선순위', 'priority', ['MUST', 'SHOULD', 'COULD', 'WONT'], item.priority)}${field('작업 묶음', 'batch', item.batch)}</div>` + select('선행 작업', 'dependsOn', mapChoices(backlog().workItems.filter(value => value.id !== item.id)), item.dependsOn ?? [], true) + field('사용자 역할', 'asA', item.asA) + field('원하는 행동', 'iWant', item.iWant) + field('얻는 가치', 'soThat', item.soThat) + select('화면 유형', 'archetype', ['', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7'], item.archetype ?? '') + field('의사결정 카드 D-1 ~ D-5', 'decisionCards', item.decisionCards?.join('\n'), { textarea: true, hint: '각 줄을 D-1: 화면, D-2: 인가, D-3: 식별자·DB, D-4: 입력·잠금, D-5: 오류·부정 시험 형식으로 기록하세요.' }), data => {
      const result = { ...item, workItemType: data.get('workItemType'), title: data.get('title').trim(), description: data.get('description').trim(), requirementIds: data.getAll('requirementIds'), parentEpicId: data.get('workItemType') === 'epic' ? null : data.get('parentEpicId'), priority: data.get('priority'), batch: data.get('batch').trim(), dependsOn: data.getAll('dependsOn'), decisionCards: lines(data.get('decisionCards')) };
      for (const name of ['asA', 'iWant', 'soThat', 'archetype']) { if (data.get(name)) result[name] = data.get(name).trim(); else delete result[name]; }
      return act('work.save', result);
    }, '에픽을 먼저 등록한 뒤 하위 작업을 연결하세요. 작업 저장과 개발 완료는 별개의 상태입니다.');
}
function acForm(key) {
  const item = clone(backlog().acceptanceCriteria.find(value => value.id === key) ?? { id: id('AC'), workItemId: '', requirementIds: [], polarity: 'allow', given: '', when: '', then: '', verificationMethod: 'manual-uat', acceptanceDisposition: 'pending' });
  openForm(key ? '인수조건 편집' : '인수조건 추가', field('인수조건 ID', 'id', item.id, { readonly: true }) + select('대상 작업', 'workItemId', [['', '선택하세요'], ...mapChoices(backlog().workItems.filter(value => value.workItemType !== 'epic'))], item.workItemId) + select('연결 요구사항', 'requirementIds', mapChoices(backlog().businessRequirements), item.requirementIds, true) + select('허용·거부', 'polarity', [['allow', 'Green · 허용 동작'], ['forbid', 'Red · 거부 동작']], item.polarity) + field('사전 조건 (Given)', 'given', item.given, { textarea: true, required: true }) + field('행동 (When)', 'when', item.when, { textarea: true, required: true }) + field('기대 결과 (Then)', 'then', item.then, { textarea: true, required: true }) + select('검증 방법', 'verificationMethod', ['unit-test', 'integration-test', 'e2e', 'harness-gate', 'load-test', 'manual-uat', 'config-check'], item.verificationMethod), data => {
      const result = { ...item, workItemId: data.get('workItemId'), requirementIds: data.getAll('requirementIds'), polarity: data.get('polarity'), given: data.get('given').trim(), when: data.get('when').trim(), then: data.get('then').trim(), verificationMethod: data.get('verificationMethod') };
      return act('ac.save', result);
    }, '허용 동작과 거부 동작을 각각 등록하세요. 인수조건이 바뀌면 기존 검수 근거를 다시 확인해야 합니다.');
}
function traceForm(key) {
  const item = clone(backlog().traceLinks.find(value => value.id === key) ?? { id: id('TRACE'), requirementId: '', targetKind: 'screen', targetId: '', linkIntent: 'candidate' });
  const catalogKeys = { screen: 'screens', capability: 'capabilities', interface: 'interfaces', table: 'tables', gate: 'gates', 'migration-mapping': 'migrationMappings' };
  openForm(key ? '추적 링크 편집' : '추적 링크 추가', field('링크 ID', 'id', item.id, { readonly: true }) + select('요구사항', 'requirementId', [['', '선택하세요'], ...mapChoices(backlog().businessRequirements)], item.requirementId) + select('작업', 'workItemId', [['', '미지정'], ...mapChoices(backlog().workItems)], item.workItemId ?? '') + select('인수조건', 'acId', [['', '미지정'], ...backlog().acceptanceCriteria.map(value => [value.id, value.id])], item.acId ?? '') + select('대상 종류', 'targetKind', ['capability', 'screen', 'interface', 'table', 'gate', 'migration-mapping'], item.targetKind) + field('대상 식별자', 'targetId', item.targetId, { required: true, listId: 'trace-target-options', hint: '원장 후보를 선택하거나 개발 예정 식별자를 직접 입력하세요. 화면 경로, route#capability, METHOD /api/경로, tb_표명, 게이트 ID 또는 migration:표명을 사용합니다.' }) + select('연결 의도', 'linkIntent', [['candidate', '후보'], ['planned', '개발 예정'], ['existing', '기존 근거 확인']], item.linkIntent) + field('연결 근거', 'notes', item.notes, { textarea: true }) + '<div id="trace-catalog"></div>', data => {
      const result = { ...item, requirementId: data.get('requirementId'), targetKind: data.get('targetKind'), targetId: data.get('targetId').trim(), linkIntent: data.get('linkIntent'), notes: data.get('notes').trim() };
      for (const name of ['workItemId', 'acId']) { if (data.get(name)) result[name] = data.get(name); else delete result[name]; }
      return act('trace.save', result);
    });
  const refreshCatalog = () => {
    const kind = dialogForm.elements.namedItem('targetKind').value;
    const targets = state.context?.[catalogKeys[kind]] ?? [];
    const rows = targets.slice(0, 80).map(target => `<tr><td class="wide-text">${esc(target.id ?? target.route)}</td><td>${esc(target.label ?? '')}</td><td>${esc(target.status ?? '원장에 등록됨')}<small>${esc(target.evidenceLevel ?? '')}</small></td></tr>`).join('');
    $('#trace-catalog').innerHTML = `<datalist id="trace-target-options">${targets.map(target => `<option value="${esc(target.id ?? target.route)}" label="${esc(target.label ?? target.status ?? target.id ?? target.route)}"></option>`).join('')}</datalist><details><summary>선택한 종류의 원장 후보 ${targets.length}건</summary>${rows ? `<div class="table-wrap"><table><caption class="sr-only">추적 대상 후보 원장</caption><thead><tr><th scope="col">식별자</th><th scope="col">표시명</th><th scope="col">관측·증거</th></tr></thead><tbody>${rows}</tbody></table></div>${targets.length > 80 ? '<p class="progress-note">상위 80건을 표시합니다. 대상 식별자 칸에서 전체 후보를 검색할 수 있습니다.</p>' : ''}` : '<p class="muted">등록된 후보가 없습니다. 개발 예정 식별자는 직접 입력할 수 있습니다.</p>'}</details>`;
  };
  dialogForm.elements.namedItem('targetKind').addEventListener('change', refreshCatalog); refreshCatalog();
}
function uatForm(key) {
  const item = backlog().acceptanceCriteria.find(value => value.id === key); if (!item) return;
  openForm('실제 검수 기록', `<p class="wide-text"><strong>${esc(item.id)}</strong> · ${esc(item.then)}</p>` + select('기관 인수 판정', 'disposition', [['accepted', '인수 기록'], ['conditional', '조건부'], ['rejected', '반려']], 'accepted') + field('검수자 역할·비식별 식별자', 'signer', '', { required: true, hint: '개인 이름·메일 대신 역할 또는 기관에서 부여한 비식별 식별자를 사용하세요.' }) + field('검수일', 'date', '', { type: 'date', required: true }) + field('대상 빌드·커밋', 'buildRef', '', { required: true }) + field('검수 근거', 'evidence', '', { textarea: true, required: true, hint: '시험 결과·기관 확인 문서의 참조번호 또는 SHA-256을 기록하세요.' }), data => act('uat.record', { acId: item.id, ...Object.fromEntries(data) }), '해당 빌드에서 실제로 확인한 결과만 기록하세요. 도구에 남긴 검수자 표시는 전자서명이 아닙니다.');
}
function findingForm(key) {
  const item = clone((metadata().auditFindings ?? []).find(value => value.id === key) ?? { title: '', severity: 'blocking', disposition: 'open', evidence: '' });
  openForm(key ? '감리 지적 편집' : '감리 지적 등록', field('지적 제목', 'title', item.title, { required: true }) + select('중요도', 'severity', [['blocking', '완료 차단'], ['observation', '관찰 사항']], item.severity) + select('조치 상태', 'disposition', [['open', '미해결'], ['resolved', '조치 확인']], item.disposition) + field('근거·조치 내용', 'evidence', item.evidence, { textarea: true, required: item.disposition === 'resolved', hint: '미해결 지적은 근거를 나중에 보완할 수 있습니다. 조치 확인에는 실제 재검증 근거가 필요합니다.' }), data => act('audit.save', { ...item, ...Object.fromEntries(data) }), '조치 확인으로 바꿀 때는 실제 변경과 재검증 근거를 함께 기록하세요.');
  const disposition = dialogForm.elements.namedItem('disposition');
  disposition.addEventListener('change', () => { dialogForm.elements.namedItem('evidence').required = disposition.value === 'resolved'; });
}
function csvForm(uatOnly = false) {
  openForm(uatOnly ? '검수 CSV 반영' : '검토 CSV 반영', uatOnly ? field('검수 대상 빌드·커밋', 'buildRef', '', { required: true }) + field('검수 CSV 본문', 'csv', '', { textarea: true, required: true }) : field('요구사항 CSV 본문', 'requirements', '', { textarea: true, required: true }) + field('스토리·인수조건 CSV 본문', 'workItems', '', { textarea: true, required: true }), data => act(uatOnly ? 'uat.import' : 'sheets.import', Object.fromEntries(data)), uatOnly ? '최신 검수표를 사용하고 현재 판정과 대조하세요. 예전 CSV는 이후 판정을 덮어쓸 수 있습니다. 변경 없는 행은 이전 검수를 유지합니다. 변경한 행의 빌드가 이전 값 그대로이면 위에 입력한 새 빌드를 적용합니다. 행에 이전과 다른 빌드를 직접 적으면 그 행의 빌드를 사용합니다. 실제 검수한 빌드와 근거를 확인하세요.' : '내보낸 CSV의 헤더를 유지하고 내용을 붙여 넣으세요. 전체 내용을 검증한 뒤 한 번에 반영하며 실패하면 입력과 기존 데이터를 보존합니다.');
}
async function download(key) {
  try {
    const result = await request(`/api/artifacts/${encodeURIComponent(key)}`);
    if (result.sensitivityWarnings?.length) toast('민감정보 패턴이 감지된 비공개 산출물입니다. 공유·저장소 반영 전 내용을 확인해 주세요.');
    const content = result.base64 ? Uint8Array.from(atob(result.base64), character => character.charCodeAt(0)) : result.content;
    const url = URL.createObjectURL(new Blob([content], { type: result.type ?? 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = result.filename ?? 'requirements-artifact.txt'; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) { showError(error); }
}
document.addEventListener('click', async event => {
  const navigation = event.target.closest('[data-page]');
  if (navigation) { event.preventDefault(); navigate(navigation.dataset.page); return; }
  const target = event.target.closest('[data-action]'); if (!target) return;
  const { action, key } = target.dataset;
  if (action === 'cancel') { closeDialog(); return; }
  if (action === 'import-stop' || action === 'import-cancel') {
    if (importBatch) importBatch.cancelled = true;
    const requestId = action === 'import-cancel' ? key : importBatch?.current;
    if (requestId) try { await cancelImport(requestId); if (!importBatch) render(); } catch (error) { showError(error); }
    return;
  }
  if (busy) return;
  if (action === 'reconnect') { reconnectForm(); return; }
  if (action === 'reconnect-submit') {
    const form = dialogForm, submit = form.querySelector('[type="submit"]'); busy = true; submit.disabled = true; target.disabled = true;
    try { const input = form.querySelector('[name="launcherAddress"]'); if (!input.reportValidity()) return; await reconnectAddress(input.value); }
    catch (error) { const message = form.querySelector('.connection-error'); message.textContent = error.message; message.hidden = false; }
    finally { busy = false; submit.disabled = false; target.disabled = false; }
    return;
  }
  if (action === 'artifact-import') { artifactImportForm(false); return; }
  if (action === 'artifact-import-ai') { artifactImportForm(true); return; }
  if (action === 'ai-full') { try { state = await request('/api/state'); aiFullForm(); } catch (error) { showError(error); } return; }
  if (action === 'ai-prompts') { aiPromptForm(); return; }
  if (action === 'ai-run-prompt') { await aiStoredPromptForm(key); return; }
  if (action === 'privacy-source') { const source = backlog().sources[Number(key)]; if (source) sourceForm(source.id); return; }
  if (action === 'ai-reading') { await aiReadingForm(key); return; }
  if (action === 'ai-start') { aiStartForm(key); return; }
  if (action === 'ai-answer') { aiAnswerForm(); return; }
  if (action === 'ai-confirm') { aiConfirmForm(); return; }
  if (action === 'ai-cancel') { await act('ai.cancel', { jobId: state.ai.current.id }); return; }
  const forms = { project: projectForm, source: sourceForm, requirement: requirementForm, work: workForm, ac: acForm, trace: traceForm, uat: uatForm, finding: findingForm };
  if (forms[action]) { forms[action](key); return; }
  if (action === 'navigate' || action === 'problem') { navigate(key); return; }
  if (action === 'clause-remove') {
    const row = target.closest('[data-clause]'), prefix = `clause-${row.dataset.clause}-`;
    if (row.dataset.persisted === 'true' || dialogForm.elements.namedItem(`${prefix}text`).value.trim() || dialogForm.elements.namedItem(`${prefix}locator`).value.trim() || dialogForm.elements.namedItem(`${prefix}requirementIds`).selectedOptions.length) { showError(new Error('저장하지 않은 빈 조항만 제거할 수 있습니다. 입력한 원문과 기존 조항은 보존합니다.')); return; }
    if (confirm('저장하지 않은 빈 조항을 제거할까요?')) { row.remove(); dialogForm.querySelector('[data-action="clause-add"]').focus(); }
    return;
  }
  if (action === 'clause-add') { const container = $('#clauses'); container.insertAdjacentHTML('beforeend', clauseFields({ id: id('CLS'), disposition: 'question', rationale: '요구사항 연결과 범위 판정 필요' }, nextClauseIndex(container))); container.lastElementChild.querySelector('input').focus(); return; }
  if (action === 'baseline') { openForm('분석 기준선 확정', field('기준선 이름', 'label', '', { required: true }), data => act('baseline.create', { label: data.get('label').trim() }), '현재 분석 내용을 검토한 뒤 기준선 이름을 입력하세요.'); return; }
  if (action === 'context') { if (confirm('원장 변경 영향을 확인했나요? 기준 정보를 갱신하면 분석 기준선과 검수 근거를 다시 확인해야 합니다.')) { if (await act('context.refresh', {})) toast('저장소 기준을 갱신했습니다.'); } return; }
  if (action === 'export') { if (await act('export.create', { kind: key })) toast('파일을 생성했습니다. 산출물 이력에서 내려받으세요.'); return; }
  if (action === 'download') { await download(key); return; }
  if (action === 'sheets-import') { csvForm(); return; }
  if (action === 'uat-import') { csvForm(true); return; }
  if (action === 'composition') openForm('프로젝트 구성 대조', field('선택한 기능 ID', 'selection', '', { required: true, hint: '쉼표로 구분합니다. core는 항상 포함하세요.' }), data => act('composition.check', { selection: list(data.get('selection')) }));
});
$('#dialog').addEventListener('cancel', event => { event.preventDefault(); closeDialog(); });
window.addEventListener('beforeunload', event => { if (dirty()) { event.preventDefault(); event.returnValue = ''; } });
$('#theme').addEventListener('click', () => { const dark = document.documentElement.classList.toggle('dark'); $('#theme').setAttribute('aria-label', dark ? '라이트 모드로 전환' : '다크 모드로 전환'); });
$('#help').addEventListener('click', () => {
  openForm('작업공간 사용 안내', '<ol class="help-list"><li>프로젝트 정보와 원문 자료를 등록합니다.</li><li>모델 서비스 전송 범위를 확인하고 동의하면 AI가 요구사항·원문 근거·질문을 생성합니다.</li><li>중요한 질문에 답하면 AI가 요구사항·에픽·하위 작업·D-1~D-5·Green/Red 인수조건과 추적 링크를 이어서 생성합니다.</li><li>문서 해석과 요구사항·개발 작업계획을 함께 검토하고 최종 확인하면 분석 기준선과 작업 패키지를 저장합니다.</li><li>개발 준비 확인 후 작업 패키지를 생성합니다.</li><li>개발 담당자의 실제 시험 결과와 기관 검수 근거·감리 조치를 기록합니다.</li></ol><p>저장 시 작업공간의 revision을 대조합니다. 충돌하면 작성 중 입력을 보존하고 최신 상태를 다시 읽으세요. 삭제는 지원하지 않으며 제외·보류 사유를 기록합니다.</p>', async () => true);
  dialogForm.querySelector('[type="submit"]').hidden = true; dialogForm.querySelector('[data-action="cancel"]').textContent = '닫기';
});
$('#refresh').addEventListener('click', async () => { if (dialogForm && !closeDialog()) return; try { state = await request('/api/state'); render(); toast('최신 상태를 읽었습니다.'); } catch (error) { showError(error); } });
const reconnectFields = (inline = false) => `<label class="field"><span>실행기 전체 주소</span><input aria-label="실행기 전체 주소" name="launcherAddress" ${inline ? 'form="launcher-credentials"' : ''} type="password" autocomplete="off" spellcheck="false" required><small>현재 실행기 터미널의 #launch= 부분을 포함한 주소를 붙여 넣으세요.</small></label>`;
async function reconnectAddress(value) {
  let url;
  try { url = new URL(String(value ?? '').trim()); } catch { /* Report a safe, value-free validation message below. */ }
  if (!url || url.origin !== location.origin || !['/', '/index.html'].includes(url.pathname) || url.search || url.username || url.password || !/^#launch=[A-Za-z0-9_-]{43}$/.test(url.hash)) throw new Error('현재 실행기의 전체 주소를 #launch= 부분까지 입력해 주세요.');
  return connect(url.hash.slice('#launch='.length), { preserveForm: Boolean(dialogForm) });
}
function reconnectForm() {
  if (dialogForm) {
    const errors = dialogForm.querySelector('.form-errors');
    const existing = dialogForm.querySelector('[name="launcherAddress"]'); if (existing) { existing.focus(); return; }
    errors.insertAdjacentHTML('beforeend', `<div class="reconnect-inline">${reconnectFields(true)}<p class="connection-error" role="alert" hidden></p><button type="button" class="button secondary" data-action="reconnect-submit">다시 연결</button></div>`);
    for (const type of ['input', 'change']) errors.querySelector('.reconnect-inline').addEventListener(type, event => event.stopPropagation());
    errors.hidden = false; errors.querySelector('[name="launcherAddress"]').focus(); return;
  }
  openForm('실행기 주소로 다시 연결', reconnectFields(), async data => {
    try { return await reconnectAddress(data.get('launcherAddress')); } catch (error) { showError(error); return false; }
  }, '', '연결을 복구했습니다.');
  dialogForm.querySelector('[type="submit"]').textContent = '다시 연결';
}
async function connect(launchValue, { preserveForm = false } = {}) {
  const launch = launchValue ?? new URLSearchParams(location.hash.slice(1)).get('launch');
  if (new URLSearchParams(location.hash.slice(1)).has('launch')) history.replaceState(null, '', location.pathname);
  try {
    const session = await request('/api/session', { headers: launch ? { 'x-requirements-launch': launch } : {} });
    if (workspaceId && session.workspaceId !== workspaceId) throw Object.assign(new Error('다른 작업공간의 실행기입니다. 현재 입력을 보존하고 해당 작업공간은 새 창에서 열어 주세요.'), { code: 'WORKSPACE_CHANGED' });
    token = session.token;
    workspaceId = session.workspaceId;
    state = await request('/api/state');
    aiPollErrorReported = false;
    if (preserveForm && dialogForm) { const errors = dialogForm.querySelector('.form-errors'); errors.replaceChildren(document.createTextNode('연결을 복구했습니다. 현재 입력을 확인하고 다시 실행하세요.')); errors.hidden = false; }
    dialogForm?.querySelectorAll('[name="launcherAddress"]').forEach(input => { input.value = ''; });
    history.replaceState(null, '', location.pathname);
    render(); return true;
  } catch (error) {
    if (preserveForm) throw error;
    const advice = {
      REQUIREMENTS_EXTERNAL_CHANGE: ['외부 파일 변경을 확인해야 합니다.', '작업공간 파일과 작성 중 입력을 보존하세요. 이 실행기를 종료하고 외부 변경 내용을 대조한 뒤 같은 작업공간으로 다시 시작하세요.'],
      REQUIREMENTS_LOCK_LOST: ['작업공간 잠금이 변경되었습니다.', '이 실행기를 종료하고 같은 작업공간을 사용하는 실행기를 확인하세요. 사용 중인 잠금 파일을 임의로 지우지 마세요.'],
      REQUIREMENTS_RECOVERY_REQUIRED: ['중단된 저장을 복구해야 합니다.', '작업공간 파일과 거래 기록을 보존하고 실행기를 종료한 뒤 같은 경로로 다시 시작하세요. 복구 충돌이 남으면 실행기 진단과 파일 변경 내용을 확인하세요.'],
      LAUNCH_REQUIRED: ['작업공간 연결 주소를 확인하세요.', '실행기 터미널에 표시된 주소를 #launch= 부분까지 다시 열어주세요.'],
      SESSION_REQUIRED: ['작업공간 연결이 만료되었습니다.', '실행기 터미널에 표시된 주소를 #launch= 부분까지 다시 열어주세요.'],
      WORKSPACE_CHANGED: ['다른 작업공간의 실행기입니다.', '작성 중인 입력을 보존하세요. 해당 작업공간은 새 창에서 전체 실행기 주소로 열어 주세요.'],
      CONNECTION_LOST: ['실행기와 연결이 끊겼습니다.', '실행기를 다시 시작한 뒤 터미널의 전체 주소로 다시 연결하세요.'],
    };
    const [title, description] = advice[error.code] ?? (error.status === 403 ? ['작업공간 연결 권한을 확인하세요.', '같은 컴퓨터의 실행기 터미널에 표시된 전체 주소로 다시 연결하세요.'] : ['작업공간에 연결하지 못했습니다.', '실행기가 동작 중인지 확인하세요. 파일을 보존하고 실행기 진단의 오류 코드를 확인한 뒤 다시 시도하세요.']);
    const disconnected = ['LAUNCH_REQUIRED', 'SESSION_REQUIRED', 'CONNECTION_LOST'].includes(error.code);
    $('#main').innerHTML = heading(title, description) + `<div class="panel panel-body field-error" role="alert">${esc(error.message)}${error.code ? `<p>오류 코드: ${esc(error.code)}</p>` : ''}</div>${disconnected ? `<form id="reconnect" class="panel panel-body">${reconnectFields()}<p class="field-error connection-error" role="alert" hidden></p><button type="submit" class="button">다시 연결</button></form>` : ''}`;
    $('#reconnect')?.addEventListener('submit', async event => {
      event.preventDefault(); const form = event.currentTarget, submit = form.querySelector('[type="submit"]'); submit.disabled = true;
      try { await reconnectAddress(new FormData(form).get('launcherAddress')); } catch (error) { const target = form.querySelector('.connection-error'); target.textContent = error.message; target.hidden = false; }
      finally { submit.disabled = false; }
    });
    return false;
  }
}
window.addEventListener('hashchange', async () => {
  const launch = new URLSearchParams(location.hash.slice(1)).get('launch'); if (!launch) return;
  history.replaceState(null, '', location.pathname);
  if (busy) { toast('실행 중인 작업이 있습니다. 연결이 만료되었다면 작업이 멈춘 뒤 주소로 다시 연결하세요.'); return; }
  try { await connect(launch, { preserveForm: Boolean(dialogForm) }); } catch (error) { showError(error); }
});
await connect();
