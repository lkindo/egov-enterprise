const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const text = value => typeof value === 'string' ? value : value?.message ?? value?.detail ?? (value?.path && value?.kind ? `확인할 위치: ${value.path} · 차단 유형: ${value.kind}` : JSON.stringify(value));
const list = value => String(value ?? '').split(/[\n,]/).map(item => item.trim()).filter(Boolean);
const lines = value => String(value ?? '').split('\n').map(item => item.trim()).filter(Boolean);
const clone = value => structuredClone(value);
const id = prefix => `${prefix}-${crypto.randomUUID()}`;
const pages = [ ['overview', '현', '진행 현황'], ['sources', '문', '산출물 수집'], ['requirements', '요', '요구사항 검토'], ['baseline', '기', '분석 기준선'], ['work', '작', '에픽·스토리'], ['handoff', '개', '개발 인계'], ['audit', '검', '검수·감리'] ];
const labels = { proposed: '제안', included: '포함', excluded: '제외', deferred: '보류', question: '질문', merged: '통합', undecided: '미결정', fit: '기존 기능 활용', config: '환경 구성', 'gap-dev': '추가 개발', hybrid: '혼합', pending: '검수 대기', accepted: '인수 기록', conditional: '조건부', rejected: '반려', epic: '에픽', story: '스토리', configuration: '구성', verification: '검증', enabler: '기반 작업' };
let state, token, page = 'overview', busy = false, dialogForm, dialogOriginal = '', dialogSave, returnFocus;
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
  const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store', ...options, headers: { ...(token ? { 'x-workspace-token': token } : {}), ...options.headers } });
  let result;
  try { result = await response.json(); } catch { throw new Error('서버 응답을 읽지 못했습니다. 연결 상태를 확인하고 다시 시도하세요.'); }
  if (!response.ok) { const error = new Error(result.message ?? `요청을 처리하지 못했습니다 (${result.code ?? response.status}).`); error.errors = result.errors; error.code = result.code; error.status = response.status; throw error; }
  return result;
}
async function act(action, payload) {
  if (busy) return false;
  if (state?.readOnly) { showError(new Error('읽기 전용 검증본입니다. 입력과 원본 파일을 보존하고 실행기를 다시 연 뒤 변경 내용을 비교하세요.')); return false; }
  busy = true; document.body.setAttribute('aria-busy', 'true');
  const submit = dialogForm?.querySelector('[type="submit"]'); if (submit) submit.disabled = true;
  try {
    state = await request('/api/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision: state.revision, action, payload }) });
    render(); return true;
  } catch (error) {
    showError(error); return false;
  } finally { busy = false; document.body.removeAttribute('aria-busy'); if (submit) submit.disabled = false; }
}
function showError(error) {
  const target = dialogForm?.querySelector('.form-errors') ?? $('#page-errors');
  if (target) { target.replaceChildren(); const message = document.createElement('p'); message.textContent = error.message; target.append(message); for (const item of error.errors ?? []) { const row = document.createElement('p'); row.textContent = text(item); target.append(row); } target.hidden = false; target.focus(); }
  else toast(error.message);
}
function formValue(form) { return JSON.stringify([...new FormData(form).entries()]); }
function dirty() { return dialogForm && formValue(dialogForm) !== dialogOriginal; }
function closeDialog(force = false) {
  if (busy) return false;
  if (!force && dirty() && !confirm('저장하지 않은 입력이 있습니다. 입력을 버리고 닫을까요?')) return false;
  $('#dialog').close(); dialogForm = undefined; dialogSave = undefined;
  const focusTarget = returnFocus?.isConnected ? returnFocus : [...document.querySelectorAll('[data-action]')].find(element => element.dataset.action === returnFocus?.dataset.action && element.dataset.key === returnFocus?.dataset.key);
  if (focusTarget) focusTarget.focus(); else $('#main').focus();
  return true;
}
function openForm(title, content, save, help = '') {
  if (dialogForm && !closeDialog()) return;
  returnFocus = document.activeElement;
  $('#dialog-content').innerHTML = `<form id="editor"><div class="dialog-head"><h2 id="dialog-title">${esc(title)}</h2><button type="button" class="icon-button" data-action="cancel" aria-label="창 닫기">×</button></div><div class="dialog-body">${help ? `<p>${esc(help)}</p>` : ''}<div class="form-errors field-error" tabindex="-1" role="alert" hidden></div>${content}</div><div class="dialog-footer"><button type="button" class="button secondary" data-action="cancel">취소</button><button type="submit" class="button">저장</button></div></form>`;
  dialogForm = $('#editor'); dialogOriginal = formValue(dialogForm); dialogSave = save;
  dialogForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!dirty()) { closeDialog(true); toast('변경한 내용이 없습니다.'); return; }
    const data = new FormData(dialogForm); const successful = await dialogSave(data, dialogForm);
    if (successful) { closeDialog(true); toast('작업공간에 저장했습니다.'); }
  });
  $('#dialog').showModal();
  const first = dialogForm.querySelector('input:not([readonly]),select,textarea'); first?.focus();
}
function render() {
  if (!state) return;
  $('#project-name').textContent = backlog().project.name ?? backlog().project.title ?? '프로젝트';
  $('#crumb').textContent = pages.find(item => item[0] === page)?.[2] ?? '';
  $('#navigation').innerHTML = pages.map(([key, icon, label]) => `<a class="nav-link ${page === key ? 'active' : ''}" ${page === key ? 'aria-current="page"' : ''} href="#${key}" data-page="${key}"><span class="nav-icon" aria-hidden="true">${icon}</span><span>${label}</span></a>`).join('');
  $('#main').innerHTML = `${state.readOnly ? '<div class="callout"><div><strong>읽기 전용 상태입니다.</strong><p>다른 작성자 또는 복구가 필요한 파일이 있어 저장을 중단했습니다. 실행기 진단을 확인하세요.</p></div></div>' : ''}<div id="page-errors" class="field-error" tabindex="-1" role="alert" hidden></div>${({ overview: overview, sources: sources, requirements: requirements, baseline: baseline, work: work, handoff: handoff, audit: audit })[page]()}`;
}
function navigate(destination) { if (!pages.some(item => item[0] === destination)) return; if (dialogForm && !closeDialog()) return; page = destination; render(); $('#main').focus(); }
function overview() {
  const counts = [ ['근거 자료', backlog().sources.length, '원문 조항과 위치를 함께 기록'], ['요구사항', backlog().businessRequirements.length, '범위·해결 방향을 각각 판정'], ['개발 작업', backlog().workItems.filter(item => item.workItemType !== 'epic').length, '에픽에서 실행 가능한 작업으로'], ['인수조건', backlog().acceptanceCriteria.length, '허용과 거부 동작의 검증 기준'] ];
  return heading('프로젝트 진행 현황', '고객 산출물에서 개발 인계와 검수 근거까지, 같은 요구사항을 따라갑니다.', button('프로젝트 정보', 'project', '', true)) + `<div class="stats">${counts.map(([label, count, caption]) => `<div class="panel stat"><div class="stat-label">${label}</div><div class="stat-value">${count}<small>건</small></div><div class="stat-caption">${caption}</div></div>`).join('')}</div>` +
    `<div class="callout"><span class="callout-icon">!</span><div><strong>${state.contextChanged ? '저장소 기준이 바뀌었습니다.' : state.baselineCurrent ? '분석 기준선이 현재 요구사항과 일치합니다.' : '분석 내용을 검토하고 기준선을 확정하세요.'}</strong><p>${state.contextChanged ? '변경 영향을 확인한 후 기준 정보를 갱신하세요.' : '자료 수집 → 요구사항 검토 → 기준선 → 작업 상세화 → 개발 인계 → 검수·감리'}</p></div>${button('기준선 확인', 'navigate', 'baseline', true)}</div>` +
    panel('다음 작업', `<div class="task-row"><span class="task-number">1</span><div class="task-copy"><strong>고객 자료와 원문 조항 수집</strong><p>TXT·Markdown의 비식별 본문 또는 직접 입력을 사용하세요.</p></div>${button('자료 열기', 'navigate', 'sources', true)}</div><div class="task-row"><span class="task-number">2</span><div class="task-copy"><strong>요구사항의 범위와 질문 해결</strong><p>기존 기능 추천은 참고 근거이며 자동 확정이 아닙니다.</p></div>${button('검토하기', 'navigate', 'requirements', true)}</div><div class="task-row"><span class="task-number">3</span><div class="task-copy"><strong>개발 준비 상태 확인</strong><p>현재 ${state.readiness?.errors?.length ?? 0}건의 확인 항목이 있습니다.</p></div>${button('인계 확인', 'navigate', 'handoff', true)}</div>`) + `<div class="section-title"><h2>상태를 읽는 방법</h2></div><div class="grid-2">${panel('계획과 기술 근거', '<p>범위·해결 방향은 사람의 계획입니다. 원장에서 찾았다는 관측과 기술 검토 수준은 개발 완료를 뜻하지 않습니다.</p>')}${panel('기관 검수와 감리', '<p>실제 시험 근거와 검수 기록을 입력합니다. 이 도구의 기록은 기관의 공식 결재나 전자서명을 대신하지 않습니다.</p>')}</div>`;
}
function sources() {
  const rows = backlog().sources.map(source => `<article class="panel mb-20"><div class="panel-head"><div><h2>${esc(source.title)}</h2><small>${esc(source.id)} · ${esc(source.sourceType)} · ${esc(source.classification ?? '미분류')}</small></div>${button('자료 편집', 'source', source.id, true)}</div><div class="panel-body"><p class="wide-text">${esc(source.summary)}</p><p class="source-footer">${esc(source.reference)} · ${esc(source.locator)}${source.fileSha256 ? ` · SHA-256 ${esc(source.fileSha256)}` : ''}</p>${(source.clauses ?? []).map(clause => `<div class="clause"><small>${esc(clause.id)} · ${esc(clause.locator)}</small><p class="wide-text">${esc(clause.text)}</p><div class="status-detail">${badge(clause.disposition)}<span>${esc((clause.requirementIds ?? []).join(', '))}</span><span>${esc(clause.rationale)}</span></div></div>`).join('')}</div></article>`).join('');
  return heading('산출물 수집', '자료의 위치·해시·원문 조항과 처리 결정을 연결합니다.', button('자료 추가', 'source')) + `<div class="inline-note mb-20">원본 파일을 임의로 해석하지 않습니다. 개인정보를 제거한 TXT·Markdown을 불러오거나 직접 입력하세요. HWP·PDF·이미지는 비식별 발췌문을 입력합니다.</div>${rows || empty('등록한 자료가 없습니다. 고객이 제공한 비식별 자료를 추가하세요.')}`;
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
function artifactRows() { return (metadata().exports ?? []).map(item => `<div class="check-row"><div class="check-copy"><strong>${esc(item.filename ?? item.kind)}</strong> ${item.stale ? badge('이전 입력의 자료 · 다시 생성 필요', 'amber') : badge('현재 입력의 자료', 'green')}<p>${esc(item.kind)} · ${esc(item.createdAt ?? item.at)}</p><small class="wide-text">입력 버전 ${esc(item.inputRevision ?? '')} · SHA-256 ${esc(item.sha256 ?? '')}</small></div>${button('내려받기', 'download', item.id, true)}</div>`).join(''); }
function handoff() {
  const controlledSources = backlog().sources.filter(source => ['confidential', 'restricted'].includes(source.classification)).length;
  const transferHint = `${controlledSources ? `기밀·제한 자료 ${controlledSources}건이 있습니다. ` : ''}기밀·제한 자료를 외부 AI에 전달할 때는 기관이 승인한 공급자와 자료 범위를 먼저 확인하세요. 이 도구는 외부 AI로 전송하지 않습니다.`;
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
    const url = URL.createObjectURL(new Blob([result.content], { type: result.type ?? 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = result.filename ?? 'requirements-artifact.txt'; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) { showError(error); }
}
document.addEventListener('click', async event => {
  const navigation = event.target.closest('[data-page]');
  if (navigation) { event.preventDefault(); navigate(navigation.dataset.page); return; }
  const target = event.target.closest('[data-action]'); if (!target) return;
  const { action, key } = target.dataset;
  if (action === 'cancel') { closeDialog(); return; }
  if (busy) return;
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
  openForm('작업공간 사용 안내', '<ol class="help-list"><li>프로젝트 정보와 비식별 자료를 등록합니다.</li><li>원문 조항을 요구사항에 연결하고 범위·질문·검증 기준을 정리합니다.</li><li>검토한 요구사항을 분석 기준선으로 확정합니다.</li><li>에픽·하위 작업·D-1~D-5·Green/Red 인수조건과 추적 링크를 작성합니다.</li><li>개발 준비 확인 후 작업 패키지를 생성합니다.</li><li>개발 담당자의 실제 시험 결과와 기관 검수 근거·감리 조치를 기록합니다.</li></ol><p>저장 시 작업공간의 revision을 대조합니다. 충돌하면 작성 중 입력을 보존하고 최신 상태를 다시 읽으세요. 삭제는 지원하지 않으며 제외·보류 사유를 기록합니다.</p>', async () => true);
  dialogForm.querySelector('[type="submit"]').hidden = true; dialogForm.querySelector('[data-action="cancel"]').textContent = '닫기';
});
$('#refresh').addEventListener('click', async () => { if (dialogForm && !closeDialog()) return; try { state = await request('/api/state'); render(); toast('최신 상태를 읽었습니다.'); } catch (error) { showError(error); } });
async function connect() {
  try {
    const launch = new URLSearchParams(location.hash.slice(1)).get('launch');
    const session = await request('/api/session', { headers: launch ? { 'x-requirements-launch': launch } : {} });
    token = session.token;
    history.replaceState(null, '', location.pathname);
    state = await request('/api/state'); render();
  } catch (error) {
    const advice = {
      REQUIREMENTS_EXTERNAL_CHANGE: ['외부 파일 변경을 확인해야 합니다.', '작업공간 파일과 작성 중 입력을 보존하세요. 이 실행기를 종료하고 외부 변경 내용을 대조한 뒤 같은 작업공간으로 다시 시작하세요.'],
      REQUIREMENTS_LOCK_LOST: ['작업공간 잠금이 변경되었습니다.', '이 실행기를 종료하고 같은 작업공간을 사용하는 실행기를 확인하세요. 사용 중인 잠금 파일을 임의로 지우지 마세요.'],
      REQUIREMENTS_RECOVERY_REQUIRED: ['중단된 저장을 복구해야 합니다.', '작업공간 파일과 거래 기록을 보존하고 실행기를 종료한 뒤 같은 경로로 다시 시작하세요. 복구 충돌이 남으면 실행기 진단과 파일 변경 내용을 확인하세요.'],
      LAUNCH_REQUIRED: ['작업공간 연결 주소를 확인하세요.', '실행기 터미널에 표시된 주소를 #launch= 부분까지 다시 열어주세요.'],
      SESSION_REQUIRED: ['작업공간 연결이 만료되었습니다.', '실행기 터미널에 표시된 주소를 #launch= 부분까지 다시 열어주세요.'],
    };
    const [title, description] = advice[error.code] ?? (error.status === 403 ? ['작업공간 연결 권한을 확인하세요.', '같은 컴퓨터의 실행기 터미널에 표시된 전체 주소로 다시 연결하세요.'] : ['작업공간에 연결하지 못했습니다.', '실행기가 동작 중인지 확인하세요. 파일을 보존하고 실행기 진단의 오류 코드를 확인한 뒤 다시 시도하세요.']);
    $('#main').innerHTML = heading(title, description) + `<div class="panel panel-body field-error" role="alert">${esc(error.message)}${error.code ? `<p>오류 코드: ${esc(error.code)}</p>` : ''}</div>`;
  }
}
await connect();
