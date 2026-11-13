// Requirements studio screen (ADR-0055). One view of the item store drives four
// stages. Every change goes through /api/action as a named studio action; the
// page keeps no state of its own beyond what is selected and filtered.
const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const PLACEHOLDER_PROJECT = '프로젝트 이름을 입력하십시오';
const SOURCE_TYPES = [['other', '기타 — AI가 문서 종류를 판단'], ['rfp', '제안요청서·과업지시서'], ['interview', '회의록·인터뷰'], ['as-is-artifact', '현행 시스템 자료'], ['regulation', '법령·규정'], ['policy-memo', '정책·방침 문서']];
const CLASSIFICATIONS = [['internal', '내부'], ['public', '공개'], ['confidential', '대외비'], ['restricted', '제한']];
const JOB_NAMES = { analyze: '문서 분석', enrich: '빈칸 보강', plan: '에픽·스토리 작성' };
const JOB_STATUS = { running: '진행 중', done: '완료', failed: '실패', cancelled: '취소함', interrupted: '중단됨' };
const SUMMARY_NAMES = { removed: '지운 스토리', added: '새 초안', enriched: '기존 초안 보강', proposed: '확정 건 변경 제안', conflict: '충돌', duplicate: '중복(근거만 연결)', stories: '스토리를 쓴 요구사항', questions: '질문', nothing: '찾지 못함', clauses: '분류한 조각', oversize: '너무 큰 조각' };
const ERROR_HINTS = { AI_CLI_UNAVAILABLE: 'Claude CLI를 찾지 못했습니다. 이 PC에 설치하고 로그인해 주세요.', AI_CLI_FAILED: 'CLI 실행이 끝나지 않았습니다. 로그인과 사용 한도를 확인해 주세요.', AI_TIMEOUT: 'AI 응답 시간이 초과되었습니다.', AI_MODEL_MISMATCH: '지정한 모델과 실제 실행 모델이 달랐습니다.', STUDIO_REPEATED_FAILURE: '쓸 수 없는 응답이 연달아 왔습니다. 잠시 뒤 다시 실행해 주세요.', STUDIO_CALL_CAPACITY: '한 번의 실행에서 쓸 수 있는 호출 수에 닿았습니다. 다시 실행하면 이어서 진행합니다.', STUDIO_CAPACITY: '작업공간 하나에 담을 수 있는 항목 수를 넘었습니다.' };

// Text documents are split into clauses on this PC; anything that has to be looked at (scans, images, office files) is read by the model.
const LOCAL_TEXT = /\.(?:txt|md|html?)$/i;
const IMPORT_ERRORS = { FILE_NO_TEXT: '읽을 수 있는 본문이 없습니다', FILE_ENCODING_INVALID: '글자 인코딩을 읽지 못했습니다(UTF-8로 저장해 주세요)', FILE_TEXT_TOO_LARGE: '본문이 한도를 넘습니다(파일을 나누어 주세요)', FILE_TIMEOUT: '읽는 시간이 초과되었습니다', FILE_EXTRACTION_FAILED: '문서를 읽지 못했습니다', FILE_TYPE_UNSUPPORTED: '지원하지 않는 형식입니다', FILE_ENCRYPTED: '암호가 걸린 문서입니다', AI_DOCUMENT_UNREADABLE: 'AI가 본문을 읽지 못했습니다', AI_DOCUMENT_OUTPUT_INVALID: 'AI 판독 결과를 검증하지 못했습니다', AI_CLI_FAILED: 'Claude CLI 실행이 끝나지 않았습니다', AI_CLI_UNAVAILABLE: 'Claude CLI를 찾지 못했습니다', AI_TIMEOUT: 'AI 응답 시간이 초과되었습니다', interrupted: '실행기가 멈춰 중단되었습니다', cancelled: '취소되었습니다' };
const ANALYZE_STAGES = ['조각 분류와 요구사항 후보 추출', '켜 둔 산출물의 항목 추출', '기존 요구사항·항목과 대조'];

let token, workspaceId, view, pollTimer, uploading = null, lastUpload = null, busy = false;
let tab = 'sources';
const selected = { requirement: null, type: null, item: null, story: null };
const filter = { status: 'all', category: '', query: '' };

async function request(url, options = {}) {
  let response;
  try { response = await fetch(url, { credentials: 'same-origin', cache: 'no-store', ...options, headers: { ...(token ? { 'x-workspace-token': token } : {}), ...options.headers } }); }
  catch { throw Object.assign(new Error('실행기와 연결이 끊겼습니다. 실행기를 다시 시작한 뒤 터미널의 전체 주소로 다시 열어 주세요.'), { code: 'CONNECTION_LOST' }); }
  let result;
  try { result = await response.json(); } catch { throw new Error('서버 응답을 읽지 못했습니다. 연결 상태를 확인해 주세요.'); }
  if (!response.ok) throw Object.assign(new Error(result.message ?? `요청을 처리하지 못했습니다 (${result.code ?? response.status}).`), { code: result.code, status: response.status });
  return result;
}
const post = (url, body) => request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
async function act(action, payload, message) {
  if (busy) return false;
  busy = true;
  try { view = await post('/api/action', { revision: view.revision, action, payload }); render(); if (message) toast(message); return true; }
  catch (error) { toast(error.message); return false; }
  finally { busy = false; schedule(); }
}
async function reload() { view = await request('/api/studio'); render(); schedule(); }
function schedule() {
  clearTimeout(pollTimer);
  const live = view && (view.active || uploading || view.imports.some(job => job.status === 'extracting'));
  pollTimer = setTimeout(async () => {
    if (busy || $('#dialog').open && !live) { schedule(); return; }
    try { const next = await request('/api/studio'); const changed = next.revision !== view.revision || next.active !== view.active; view = next; if (changed || live) render(); }
    catch { /* The next action reports a lost connection. */ }
    schedule();
  }, live ? 2000 : 15000);
}
function toast(message) { const element = $('#toast'); element.textContent = message; clearTimeout(toast.timer); toast.timer = setTimeout(() => { element.textContent = ''; }, 4500); }

/* ---------- lookups ---------- */
const types = () => view.catalog.types;
const typeOf = id => types().find(type => type.id === id);
const fieldsOf = kind => kind === 'requirement' ? view.catalog.requirementFields : typeOf(kind)?.fields ?? [];
const kindName = kind => kind === 'requirement' ? '요구사항' : typeOf(kind)?.name ?? kind;
const categoryName = code => view.catalog.categories.find(category => category.code === code)?.name ?? '분류 없음';
const itemOf = id => view.items.find(item => item.id === id);
const itemsOf = kind => view.items.filter(item => item.kind === kind && item.status !== 'retired');
const requirements = () => view.items.filter(item => item.kind === 'requirement');
const openIssues = id => view.issues.filter(issue => issue.open && issue.itemId === id);
const proposalsOf = id => view.proposals.filter(proposal => proposal.itemId === id);
const label = item => item.kind === 'requirement' ? item.number ?? '초안' : item.id;
const filled = value => Array.isArray(value) ? value.length > 0 : Boolean(value);
const needsAttention = item => item.status !== 'retired' && (item.flags.fresh || item.flags.enriched || proposalsOf(item.id).length || openIssues(item.id).length || item.sources.some(source => source.stale));
const typeScore = id => { const list = itemsOf(id); return list.length ? Math.round(list.reduce((sum, item) => sum + item.score, 0) / list.length) : 0; };
const pendingTotal = () => view.pending.classify + view.pending.merge + Object.values(view.pending.extract).reduce((sum, count) => sum + count, 0);
const lastJob = () => view.jobs.at(-1);

/* ---------- small pieces ---------- */
const badge = (text, tone = '') => `<span class="badge ${tone}">${esc(text)}</span>`;
const meter = score => `<span class="st-meter${score >= 100 ? ' st-full' : score < 60 ? ' st-low' : ''}" role="img" aria-label="완성도 ${score}%"><i data-w="${score}"></i></span><span class="st-num">${score}%</span>`;
function statusBadge(item) {
  if (item.status === 'retired') return badge('제외');
  if (item.status === 'confirmed') return badge(`확정${item.baseline ? ` · ${item.baseline}${item.changed ? ' 이후 변경' : ''}` : ''}`, 'green');
  return item.ready ? badge('초안 · 검토 가능', 'blue') : badge('초안 · 보완 중', 'amber');
}
function flagBadges(item) {
  const out = [];
  if (item.flags.fresh) out.push(badge('새로 추가됨', 'blue'));
  if (item.flags.enriched) out.push(badge('보강됨', 'blue'));
  if (proposalsOf(item.id).length) out.push(badge(`변경 제안 ${proposalsOf(item.id).length}`, 'amber'));
  if (openIssues(item.id).length) out.push(badge(`쟁점·질문 ${openIssues(item.id).length}`, 'red'));
  if (item.sources.some(source => source.stale)) out.push(badge('근거 문서가 바뀜', 'amber'));
  return out.join('');
}
function fieldValue(spec, value) {
  if (!filled(value)) return spec.required ? '<em class="st-missing">비어 있음</em>' : '<span class="muted">비어 있음</span>';
  if (spec.type === 'text') return esc(spec.key === 'category' ? `${categoryName(value)} (${value})` : value);
  if (spec.type === 'list') return `<ul class="st-list">${value.map(entry => `<li>${esc(entry)}</li>`).join('')}</ul>`;
  return `<div class="table-wrap"><table><thead><tr>${spec.columns.map(([, name]) => `<th>${esc(name)}</th>`).join('')}</tr></thead><tbody>${value.map(row => `<tr>${spec.columns.map(([key]) => `<td>${esc(row[key])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
const sourceLines = sources => sources.length ? sources.map(source => `<div class="st-source"><strong>${esc(source.title)}</strong> · ${esc(source.at)}${source.stale ? ` ${badge('바뀜', 'amber')}` : ''}${source.excerpt ? `<blockquote>${esc(source.excerpt)}${source.excerpt.length >= 240 ? '…' : ''}</blockquote>` : ''}</div>`).join('') : '<span class="muted">직접 작성</span>';
const itemButton = (item, action = 'go-item') => `<button type="button" class="st-chip" data-a="${action}" data-v="${esc(item.id)}">${esc(item.kind === 'requirement' ? `${label(item)} ${item.name}` : `${kindName(item.kind)} · ${item.name}`)}</button>`;

/* ---------- stage: documents ---------- */
const clock = seconds => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
const elapsedSince = since => clock(Math.max(0, (Date.now() - Date.parse(since)) / 1000));
// A running clock shows that work is going on even while one long step reports no new count. It is hidden from
// assistive technology, which would otherwise announce it every second.
const ticking = since => `<span class="st-num" data-since="${esc(since)}" aria-hidden="true">${elapsedSince(since)}</span>`;
const FILE_STATUS = { waiting: ['대기', 'outline'], reading: ['읽는 중', 'blue'], done: ['완료', 'green'], failed: ['실패', 'red'] };
const fileRows = files => `<ul class="st-files">${files.map(file => `<li><span class="st-name">${esc(file.name)}</span>${badge(FILE_STATUS[file.status][0], FILE_STATUS[file.status][1])}<span class="muted st-small">${esc(file.note)}</span></li>`).join('')}</ul>`;
/** What is being registered right now, file by file, and what the last registration ended with. */
function uploadPanel() {
  if (uploading) {
    const finished = uploading.files.filter(file => ['done', 'failed'].includes(file.status)).length, current = uploading.files[uploading.index];
    return `<section class="panel panel-body st-stack"><div class="st-spread"><h2>문서 등록 — ${finished} / ${uploading.files.length}건 끝남</h2>${badge('진행 중', 'blue')}</div>
      <div class="st-row">${meter(Math.round(finished / uploading.files.length * 100))}<span class="muted st-small">전체 경과 ${ticking(uploading.startedAt)}</span></div>
      <p><strong>지금 읽는 문서:</strong> ${esc(current.name)} — ${esc(current.note)} <span class="muted st-small">(이 문서 ${ticking(uploading.fileStartedAt)})</span></p>
      ${fileRows(uploading.files)}
      <p class="muted st-small">이 창을 닫거나 새로 고치면 남은 문서는 등록되지 않습니다. 다른 단계를 둘러보는 것은 괜찮습니다.</p></section>`;
  }
  if (!lastUpload) return '';
  const failed = lastUpload.files.filter(file => file.status === 'failed');
  return `<section class="panel panel-body st-stack"><div class="st-spread"><h2>문서 등록 결과</h2>${badge(failed.length ? `완료 ${lastUpload.files.length - failed.length}건 · 실패 ${failed.length}건` : `완료 ${lastUpload.files.length}건`, failed.length ? 'amber' : 'green')}</div>
    <p class="muted st-small">걸린 시간 ${clock(lastUpload.seconds)}${failed.length ? ' · 실패한 문서는 원인을 고친 뒤 다시 넣을 수 있습니다.' : ''}</p>${fileRows(lastUpload.files)}</section>`;
}
function jobPanel() {
  const job = lastJob();
  if (!job) return '';
  const running = job.status === 'running', percent = job.total ? Math.round(job.done / job.total * 100) : running ? 0 : 100;
  const summary = Object.entries(job.summary).filter(([, count]) => count).map(([key, count]) => `<div><b>${count}</b><span>${esc(SUMMARY_NAMES[key] ?? key)}</span></div>`).join('');
  const at = ANALYZE_STAGES.indexOf(job.stage);
  // Reading and comparing alternate: a few bundles are read, then their candidates are compared and become items.
  // A stage is finished when nothing is left for it, not when the run has moved past it once.
  const left = [view.pending.classify, Object.values(view.pending.extract).reduce((sum, count) => sum + count, 0), view.pending.merge];
  const leftText = [count => `남은 조각 ${count}개`, count => `남은 추출 ${count}건`, count => `남은 후보 ${count}건`];
  const finished = index => index < 2 && !left[0] && !left[index];
  const steps = job.kind === 'analyze' && running ? `<ol class="st-steps">${ANALYZE_STAGES.map((name, index) => `<li ${index === at ? 'aria-current="step"' : ''}>${index === at ? badge('진행 중', 'blue') : finished(index) ? badge('끝남', 'green') : badge('대기', 'outline')} ${esc(name)}${index === at ? ` <span class="muted">${job.done} / ${job.total}</span>` : left[index] ? ` <span class="muted">${leftText[index](left[index])}</span>` : ''}</li>`).join('')}</ol>` : '';
  const duration = job.completedAt ? clock(Math.max(0, (Date.parse(job.completedAt) - Date.parse(job.startedAt)) / 1000)) : null;
  return `<section class="panel panel-body st-stack">
    <div class="st-spread"><h2>${esc(JOB_NAMES[job.kind])} — ${esc(running ? job.stage : JOB_STATUS[job.status])}</h2><div class="row-actions">${running ? `<span class="muted st-small">경과 ${ticking(job.startedAt)}</span>` : duration ? `<span class="muted st-small">걸린 시간 ${duration}</span>` : ''}${badge(JOB_STATUS[job.status], running ? 'blue' : job.status === 'done' ? 'green' : 'amber')}${running ? `<button type="button" class="button small secondary" data-a="cancel" data-v="${esc(job.id)}">중지</button>` : ''}</div></div>
    ${running ? `<div class="st-row">${meter(percent)}<span class="muted">${job.done} / ${job.total}</span></div>${steps}<p class="muted st-small">묶음 몇 개를 읽을 때마다 바로 대조해 요구사항·항목으로 올리므로, 읽기와 대조를 오가며 진행하고 결과는 처음부터 차례로 쌓입니다. AI 호출 한 번에 수십 초가 걸립니다. 숫자가 잠시 멈춰 있어도 경과 시간이 흐르면 진행 중입니다. 창을 닫아도 분석은 계속되고, 다시 열면 이어서 보입니다.</p>` : ''}
    ${job.errorCode ? `<p class="field-error">${esc(ERROR_HINTS[job.errorCode] ?? `실행을 마치지 못했습니다 (${job.errorCode}).`)} 끝난 부분은 저장되어 있어, 다시 실행하면 남은 부분만 진행합니다.</p>` : ''}
    <div class="st-kv"><div><b>${job.calls}</b><span>AI 호출</span></div><div><b>${(job.maxRequestBytes / 1024).toFixed(1)}KB</b><span>호출당 최대 입력 (상한 ${Math.round(view.requestLimit / 1024)}KB)</span></div><div><b>${view.items.filter(item => item.status !== 'retired').length}</b><span>쌓인 요구사항·항목</span></div>${job.failures ? `<div><b>${job.failures}</b><span>쓰지 못한 응답·조각</span></div>` : ''}${summary}</div>
    <p class="muted st-small">호출마다 조각 묶음 하나와 비슷한 기존 항목 몇 건만 보냅니다. 쌓인 항목이 늘어도 한 번에 보내는 양은 상한을 넘지 않습니다.</p></section>`;
}
function viewSources() {
  const failedImports = view.imports.filter(job => ['failed', 'interrupted', 'stale'].includes(job.status) && !view.imports.some(other => other.filename === job.filename && other.status === 'ready'));
  const pending = pendingTotal(), enabledWaiting = Object.entries(view.pending.extract).filter(([, count]) => count);
  const rows = view.sources.map(source => `<tr><td><strong>${esc(source.title)}</strong><small>${esc(source.summary).slice(0, 160)}</small></td><td class="st-num">${source.clauses}</td><td class="st-num">${source.tagged < source.clauses ? `${source.tagged} / ${source.clauses}` : '완료'}${source.failed ? `<small>분류 실패 ${source.failed}</small>` : ''}</td><td class="st-num">${source.requirementClauses}</td>
    <td><div class="st-chips">${Object.entries(source.artifacts).map(([type, count]) => badge(`${typeOf(type)?.name ?? type} ${count}`, view.enabled.includes(type) ? 'blue' : 'outline')).join('') || '<span class="muted">없음</span>'}</div></td></tr>`).join('');
  return `${view.project?.name === PLACEHOLDER_PROJECT ? `<div class="callout"><span class="callout-icon">i</span><div><strong>프로젝트 정보를 먼저 입력해 주세요</strong><p>산출물 문서의 머리말에 사업 이름이 들어갑니다.</p></div><div class="row-actions"><button type="button" class="button small" data-a="project">프로젝트 정보 입력</button></div></div>` : ''}
  ${view.available ? '' : '<div class="callout"><span class="callout-icon">!</span><div><strong>Claude CLI를 찾지 못했습니다</strong><p>문서 판독과 분석에는 이 PC에 설치·로그인된 Claude CLI가 필요합니다. 직접 작성과 문서 내려받기는 그대로 쓸 수 있습니다.</p></div></div>'}
  ${uploadPanel()}${uploading ? '' : jobPanel()}
  <section class="panel"><div class="panel-head"><div><h2>등록한 문서</h2><small>문서는 언제든 더 넣을 수 있습니다. 넣은 문서만 새로 읽고, 앞서 만든 요구사항과 산출물에 이어 붙입니다.</small></div>
      <div class="row-actions">${pending ? `<button type="button" class="button secondary" data-a="run" ${view.active || uploading ? 'disabled' : ''}>AI 분석 진행 (대기 ${pending})</button>` : ''}<button type="button" class="button" data-a="upload" ${view.active || uploading ? 'disabled' : ''}>문서 추가</button></div></div>
    ${view.sources.length ? `<div class="table-wrap"><table><thead><tr><th>문서</th><th>조각</th><th>분류</th><th>요구사항 관련</th><th>산출물 종류별 관련 조각 (파란색은 작성 중인 산출물)</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<div class="empty">아직 문서가 없습니다. 제안요청서, 회의록, 화면 캡처, 메모 등 어떤 문서든 넣을 수 있습니다.</div>'}
    <div class="panel-body st-stack">${pending ? `<p class="st-small">분석 대기 — 분류할 조각 ${view.pending.classify}개${enabledWaiting.length ? ` · 산출물 항목 추출 ${enabledWaiting.map(([type, count]) => `${typeOf(type).name} ${count}`).join(', ')}` : ''}${view.pending.merge ? ` · 대조할 후보 ${view.pending.merge}건` : ''}</p>` : ''}
      ${failedImports.length ? `<div class="st-note st-warn"><strong>판독하지 못한 문서</strong><ul class="st-list">${failedImports.map(job => `<li>${esc(job.filename)} — ${esc(job.errorCode ?? job.status)}</li>`).join('')}</ul><span class="st-small">원본은 보존되어 있습니다. 읽을 수 있는 PDF·이미지 사본으로 다시 넣어 주세요.</span></div>` : ''}
      ${view.sensitivityWarnings.length ? `<p class="st-small muted">민감정보 패턴 안내 — 요구사항·산출물 내용에서 ${view.sensitivityWarnings.reduce((sum, warning) => sum + warning.count, 0)}곳이 감지되었습니다. 문서를 밖으로 보내기 전에 내용을 확인해 주세요. 감지 여부가 완전한 검사는 아닙니다.</p>` : ''}
      <p class="muted st-small">조각마다 요구사항 분류와 관련 산출물 종류를 표시해 둡니다. 꺼 둔 산출물의 표시도 남으므로, 나중에 켜면 문서를 다시 읽지 않고 초안을 만듭니다.</p></div></section>`;
}

/* ---------- stage: requirements ---------- */
function requirementList() {
  const query = filter.query.trim().toLowerCase();
  const list = requirements().filter(item => (filter.status === 'all' ? item.status !== 'retired' : filter.status === 'attention' ? needsAttention(item) : item.status === filter.status)
    && (!filter.category || item.fields.category === filter.category) && (!query || `${item.name} ${item.fields.definition} ${item.number ?? ''}`.toLowerCase().includes(query)));
  if (!list.length) return '<div class="empty">조건에 맞는 요구사항이 없습니다.</div>';
  return `<div class="st-items">${list.map(item => `<button type="button" class="st-item" data-a="select-requirement" data-v="${esc(item.id)}" aria-current="${selected.requirement === item.id}">
    <span class="st-name">${esc(item.name)}</span><span class="st-code">${esc(label(item))}</span>
    <span class="st-meta">${badge(item.fields.category || '분류 없음', 'outline')}${statusBadge(item)}${flagBadges(item)}<span class="st-row st-grow">${meter(item.score)}</span></span></button>`).join('')}</div>`;
}
function issueNotes(item) {
  return openIssues(item.id).map(issue => issue.kind === 'conflict'
    ? `<div class="st-note st-bad"><strong>문서 사이의 충돌</strong><span>${esc(issue.text)}</span>${issue.existing ? `<div><span class="st-small">지금 내용</span><blockquote>${esc(issue.existing)}</blockquote></div>` : ''}${issue.incoming ? `<div><span class="st-small">새 문서의 내용</span><blockquote>${esc(issue.incoming)}</blockquote></div>` : ''}
        ${!issue.incoming && issue.fields ? `<div><span class="st-small">새 문서에서 나온 내용</span><table class="st-spec">${fieldsOf(item.kind).filter(spec => spec.key !== 'category' && filled(issue.fields[spec.key])).map(spec => `<tr><th>${esc(spec.label)}</th><td>${fieldValue(spec, issue.fields[spec.key])}</td></tr>`).join('')}</table></div>` : ''}<div>${sourceLines(issue.sources)}</div>
        <div class="row-actions"><button type="button" class="button small secondary" data-a="issue-keep" data-v="${esc(issue.id)}">지금 내용 유지</button><button type="button" class="button small" data-a="issue-adopt" data-v="${esc(issue.id)}">새 문서의 내용으로 ${issue.existing ? '바꿈' : '추가'}</button></div></div>`
    : `<div class="st-note st-bad"><strong>결정이 필요한 질문</strong><span>${esc(issue.text)}</span><div class="row-actions"><button type="button" class="button small" data-a="issue-answer" data-v="${esc(issue.id)}">답변하기</button><button type="button" class="button small secondary" data-a="issue-dismiss" data-v="${esc(issue.id)}">답 없이 닫기</button></div></div>`).join('');
}
function proposalNotes(item) {
  return proposalsOf(item.id).map(proposal => { const rows = fieldsOf(item.kind).filter(spec => filled(proposal.fields[spec.key])); return `<div class="st-note st-warn"><strong>변경 제안</strong>
    <span class="st-small">${item.status === 'confirmed' ? '새 문서에서 나온 내용입니다. 확정된 기록이라 바로 더하지 않았습니다.' : '새 문서에서 나온 내용입니다. 비교할 때 내용 전체를 보지 못해 바로 더하지 않았습니다.'} ${rows.length ? '반영하면 아래 내용과 출처가 더해집니다.' : '내용은 그대로 두고 아래 출처만 더합니다.'}</span>
    ${rows.length ? `<table class="st-spec">${rows.map(spec => `<tr><th>${esc(spec.label)}</th><td>${fieldValue(spec, proposal.fields[spec.key])}</td></tr>`).join('')}</table>` : ''}<div>${sourceLines(proposal.sources)}</div>
    <div class="row-actions"><button type="button" class="button small" data-a="proposal-accept" data-v="${esc(proposal.id)}">반영</button><button type="button" class="button small secondary" data-a="proposal-reject" data-v="${esc(proposal.id)}">반영하지 않음</button></div></div>`; }).join('');
}
function itemActions(item) {
  const active = Boolean(view.active);
  return `<div class="row-actions">${item.status === 'draft' ? `<button type="button" class="button small" data-a="confirm" data-v="${esc(item.id)}" ${item.ready ? '' : 'disabled'}>확정</button>` : item.status === 'confirmed' ? `<button type="button" class="button small secondary" data-a="unconfirm" data-v="${esc(item.id)}">확정 취소</button>` : ''}
    ${item.status === 'draft' && item.missing.length ? `<button type="button" class="button small secondary" data-a="enrich" data-v="${esc(item.id)}" ${active ? 'disabled' : ''}>빈칸을 AI로 보강</button>` : ''}
    <button type="button" class="button small secondary" data-a="edit" data-v="${esc(item.id)}">수정</button>
    ${item.status === 'retired' ? `<button type="button" class="button small secondary" data-a="restore" data-v="${esc(item.id)}">되살리기</button>` : `<button type="button" class="button small ghost" data-a="retire" data-v="${esc(item.id)}">제외</button>`}</div>`;
}
function itemDetail(item, heading) {
  const related = item.related.map(itemOf).filter(Boolean), blocker = item.status === 'draft' && !item.ready
    ? openIssues(item.id).length ? '쟁점·질문을 먼저 정리해야 확정할 수 있습니다.' : item.missing.length ? `필수 칸(${item.missing.map(key => fieldsOf(item.kind).find(spec => spec.key === key)?.label).join(', ')})을 채워야 확정할 수 있습니다.` : '출처가 있어야 확정할 수 있습니다.' : '';
  return `<section class="panel panel-body st-stack"><div class="st-spread"><div class="st-row"><span class="st-code">${esc(label(item))}</span>${heading ? `<h2>${esc(item.name)}</h2>` : ''}${statusBadge(item)}${flagBadges(item)}</div>${itemActions(item)}</div>
    ${blocker ? `<p class="st-small st-missing">${esc(blocker)}</p>` : ''}${issueNotes(item)}${proposalNotes(item)}
    <div class="table-wrap"><table class="st-spec">
      ${item.kind === 'requirement' ? `<tr><th>요구사항 고유번호</th><td>${item.number ? `<span class="st-code">${esc(item.number)}</span>` : '<span class="muted">확정할 때 분류별 일련번호를 받습니다</span>'}</td></tr><tr><th>요구사항 명칭</th><td><strong>${esc(item.name)}</strong></td></tr>` : ''}
      ${fieldsOf(item.kind).map(spec => `<tr><th>${esc(spec.label)}${spec.required ? ' <span class="st-missing">*</span>' : ''}</th><td>${fieldValue(spec, item.fields[spec.key])}</td></tr>`).join('')}
      <tr><th>${item.kind === 'requirement' ? '요구사항 출처' : '출처'}</th><td>${sourceLines(item.sources)}</td></tr>
      <tr><th>${item.kind === 'requirement' ? '연결된 산출물·요구사항' : '관련 요구사항·항목'}</th><td><div class="st-chips">${related.map(other => itemButton(other, other.kind === 'requirement' ? 'go-requirement' : 'go-item')).join('') || '<span class="muted">없음</span>'}</div></td></tr>
      ${item.note ? `<tr><th>메모</th><td>${esc(item.note)}</td></tr>` : ''}</table></div>
    <p class="muted st-small">${item.status === 'confirmed' ? '확정된 내용은 AI가 직접 고치지 않습니다. 새 문서에서 나온 내용은 변경 제안으로 올라옵니다.' : '초안은 새 문서가 들어올 때마다 AI가 내용을 덧붙입니다. 지우거나 줄이지는 않습니다.'}</p></section>`;
}
function viewRequirements() {
  const all = requirements(), count = status => all.filter(item => item.status === status).length, ready = all.filter(item => item.status === 'draft' && item.ready).length, baseline = view.baselines.at(-1);
  const outside = all.filter(item => item.status === 'confirmed' && (!item.baseline || item.changed)).length;
  const chips = [['all', `전체 ${all.length - count('retired')}`], ['attention', `확인할 것 ${all.filter(needsAttention).length}`], ['draft', `초안 ${count('draft')}`], ['confirmed', `확정 ${count('confirmed')}`], ['retired', `제외 ${count('retired')}`]];
  if (!itemOf(selected.requirement)) selected.requirement = all.find(item => item.status !== 'retired')?.id ?? null;
  const current = itemOf(selected.requirement);
  return `<section class="panel"><div class="panel-head"><div><h2>요구사항</h2><small>${baseline ? `기준선 ${esc(baseline.id)} ‘${esc(baseline.name)}’ · 요구사항 ${baseline.counts.requirement ?? 0}건${outside ? ` · 그 뒤 바뀌거나 새로 확정된 것 ${outside}건` : ''}` : '아직 기준선이 없습니다. 확정한 요구사항을 묶어 기준선을 만듭니다.'}</small></div>
      <div class="row-actions"><button type="button" class="button small secondary" data-a="confirm-all" data-v="requirement" ${ready ? '' : 'disabled'}>검토 가능한 초안 ${ready}건 모두 확정</button><button type="button" class="button small secondary" data-a="baseline" ${count('confirmed') ? '' : 'disabled'}>기준선 만들기</button>
        <button type="button" class="button small secondary" data-a="new-item" data-v="requirement">요구사항 직접 추가</button><button type="button" class="button small secondary" data-a="document" data-v="requirements">요구사항정의서</button><button type="button" class="button small secondary" data-a="document" data-v="requirements-sheet">목록(CSV)</button><button type="button" class="button small secondary" data-a="document" data-v="rtm">요구사항추적표</button></div></div></section>
  <div class="st-split"><section class="panel panel-body st-stack">
      <div class="st-chips" role="group" aria-label="상태">${chips.map(([id, name]) => `<button type="button" class="st-chip" data-a="filter-status" data-v="${id}" aria-pressed="${filter.status === id}">${esc(name)}</button>`).join('')}</div>
      <div class="st-row"><select id="filter-category" aria-label="분류"><option value="">모든 분류</option>${view.catalog.categories.map(category => `<option value="${category.code}" ${filter.category === category.code ? 'selected' : ''}>${esc(category.name)}</option>`).join('')}</select>
        <input type="search" id="filter-query" class="search-input" placeholder="이름·내용 검색" aria-label="검색" value="${esc(filter.query)}"></div>
      <div id="requirement-list">${requirementList()}</div></section>
    <div class="st-stack">${current ? itemDetail(current, false) : '<section class="panel"><div class="empty">문서를 넣고 분석하면 요구사항 초안이 여기에 쌓입니다. 직접 추가할 수도 있습니다.</div></section>'}</div></div>`;
}

/* ---------- stage: deliverables ---------- */
function typeDetail(type) {
  const on = view.enabled.includes(type.id), waiting = view.pending.waiting[type.id] ?? 0;
  if (!on) return `<section class="panel panel-body st-stack"><h2>${esc(type.name)}</h2><p>이 산출물은 지금 작성하지 않습니다.</p>
    <div class="st-note${waiting ? ' st-accent' : ''}"><span>${waiting ? `등록한 문서에서 이 산출물과 관련된 조각 <strong>${waiting}개</strong>를 표시해 두었습니다. 켜고 분석을 진행하면 그 조각만으로 초안을 만듭니다.` : '등록한 문서에 이 산출물과 관련된 내용이 아직 없습니다. 켜 두고 직접 작성하거나, 관련 문서를 넣으면 초안이 생깁니다.'}</span>
      <div class="row-actions"><button type="button" class="button small" data-a="enable" data-v="${type.id}">이 산출물 작성하기</button></div></div></section>`;
  const list = itemsOf(type.id), warnings = view.checks[type.id] ?? [], pending = view.pending.extract[type.id] ?? 0, ready = list.filter(item => item.status === 'draft' && item.ready).length;
  const derived = view.documents.filter(document => view.catalog.derived.some(entry => entry.id === document.id && entry.from[0] === type.id));
  const current = itemOf(selected.item)?.kind === type.id ? itemOf(selected.item) : null;
  return `<section class="panel panel-body st-stack"><div class="st-spread"><div><h2>${esc(type.name)}</h2><small>${esc(type.phase)} 단계 · ${esc(type.noun)} ${list.length}건 · 확정 ${list.filter(item => item.status === 'confirmed').length}건</small></div>
      <div class="row-actions"><span class="st-row">${meter(typeScore(type.id))}</span><button type="button" class="button small secondary" data-a="document" data-v="${type.id}">문서 보기</button>${derived.map(document => `<button type="button" class="button small secondary" data-a="document" data-v="${document.id}">${esc(document.name)}</button>`).join('')}
        <button type="button" class="button small secondary" data-a="confirm-all" data-v="${type.id}" ${ready ? '' : 'disabled'}>검토 가능한 ${ready}건 확정</button><button type="button" class="button small secondary" data-a="new-item" data-v="${type.id}">${esc(type.noun)} 직접 추가</button></div></div>
    ${pending ? `<div class="st-note st-accent"><span>이 산출물과 관련된 조각 <strong>${pending}개</strong>에서 아직 항목을 만들지 않았습니다.</span><div class="row-actions"><button type="button" class="button small" data-a="run" ${view.active ? 'disabled' : ''}>AI 분석 진행</button></div></div>` : ''}
    ${warnings.length ? `<div class="st-note st-warn"><strong>산출물 사이 점검 ${warnings.length}건</strong><ul class="st-list">${warnings.map(warning => `<li>${esc(warning)}</li>`).join('')}</ul><span class="st-small">이 점검은 프로그램이 규칙으로 합니다. AI 호출이 없습니다.</span></div>` : list.length ? '<div class="st-note st-ok"><span>산출물 사이 점검에서 걸린 것이 없습니다.</span></div>' : ''}
    ${list.length ? `<div class="st-items">${list.map(item => `<button type="button" class="st-item" data-a="select-item" data-v="${esc(item.id)}" aria-current="${selected.item === item.id}"><span class="st-name${item.fields.parent ? ' st-child' : ''}">${esc(item.name)}</span>
        <span>${item.status === 'confirmed' ? badge('확정', 'green') : item.missing.length ? badge(`빈칸 ${item.missing.length}`, 'amber') : badge('검토 가능', 'blue')}</span><span class="st-meta">${flagBadges(item)}<span class="st-row st-grow">${meter(item.score)}</span></span></button>`).join('')}</div>` : '<div class="empty">아직 항목이 없습니다. 직접 추가하거나 관련 문서를 넣어 주세요.</div>'}</section>
  ${current ? itemDetail(current, true) : ''}`;
}
function viewArtifacts() {
  if (!typeOf(selected.type)) selected.type = view.enabled[0] ?? types()[0].id;
  const group = phase => types().filter(type => type.phase === phase).map(type => {
    const on = view.enabled.includes(type.id), waiting = view.pending.waiting[type.id] ?? 0;
    return `<div class="st-item st-static" aria-current="${selected.type === type.id}"><button type="button" class="text-button st-name" data-a="select-type" data-v="${type.id}">${esc(type.name)}</button>
      <label class="st-switch"><input type="checkbox" data-a="toggle" data-v="${type.id}" ${on ? 'checked' : ''} aria-label="${esc(type.name)} 작성"></label>
      <span class="st-meta">${on ? `<span class="muted st-small">${itemsOf(type.id).length}건</span><span class="st-row st-grow">${meter(typeScore(type.id))}</span>` : `<span class="muted st-small">${waiting ? `관련 조각 ${waiting}개 대기` : '관련 내용 없음'}</span>`}</span></div>`;
  }).join('');
  return `<section class="panel panel-body st-stack"><div><h2>산출물 문서</h2><small>지금 만들 수 있는 문서입니다. 누르면 현재 내용으로 문서를 보고 내려받습니다.</small></div>
      <div class="st-chips">${view.documents.map(document => `<button type="button" class="st-chip" data-a="document" data-v="${esc(document.id)}"><strong>${esc(document.name)}</strong> <span class="muted">${document.format === 'csv' ? 'CSV' : 'Markdown'}</span></button>`).join('')}</div></section>
  <div class="st-split st-narrow"><section class="panel panel-body st-stack"><div><h2>산출물 선택</h2><small>작성할 산출물만 켭니다. 꺼 둔 산출물은 건너뛰고, 나중에 켜도 됩니다.</small></div>
      <h3>분석 단계</h3><div class="st-items">${group('분석')}</div><h3>설계 단계</h3><div class="st-items">${group('설계')}</div>
      <p class="muted st-small">끄면 화면과 문서에서 빠질 뿐, 만든 항목은 보관되어 다시 켜면 돌아옵니다. 속성정의서·논리 ERD·CRUD 매트릭스는 엔터티와 프로세스에서 자동으로 만듭니다.</p></section>
    <div class="st-stack">${typeDetail(typeOf(selected.type))}</div></div>`;
}

/* ---------- stage: stories ---------- */
function viewPlan() {
  const confirmed = requirements().filter(item => item.status === 'confirmed'), drafts = requirements().filter(item => item.status === 'draft').length, targets = view.planTargets.length;
  const quality = confirmed.filter(item => view.catalog.quality.includes(item.fields.category)), outside = confirmed.filter(item => !view.catalog.quality.includes(item.fields.category) && !view.catalog.development.includes(item.fields.category));
  const changes = targets + view.planOrphans;
  const start = `<button type="button" class="button" data-a="plan" ${changes && !view.active ? '' : 'disabled'}>${view.plan?.stories.length ? `요구사항 변경 ${changes}건 반영` : '에픽·스토리 만들기'}</button>`;
  if (!view.plan?.stories.length) return `<section class="panel panel-body st-stack"><h2>에픽·스토리</h2><p>확정한 요구사항만으로 에픽과 스토리, 인수조건을 만듭니다. 초안 상태인 요구사항은 포함하지 않습니다.</p>
    <div class="st-kv"><div><b>${targets}</b><span>스토리로 만들 확정 요구사항</span></div><div><b>${quality.length}</b><span>품질 기준으로 붙는 요구사항</span></div><div><b>${drafts}</b><span>초안 (포함하지 않음)</span></div><div><b>${esc(view.baselines.at(-1)?.id ?? '없음')}</b><span>기준선</span></div></div>
    <div class="row-actions">${start}</div><p class="muted st-small">스토리를 만들 때는 요구사항 몇 건과 거기에 연결된 화면·엔터티·프로세스 항목만 AI에 보냅니다. 기능·인터페이스·데이터 요구사항이 스토리가 되고, 성능·보안·품질·제약은 모든 스토리에 붙는 품질 기준이 됩니다.</p></section>`;
  const stories = view.plan.stories;
  if (!stories.some(story => story.id === selected.story)) selected.story = stories[0].id;
  const story = stories.find(entry => entry.id === selected.story), requirement = itemOf(story.reqId);
  const epics = view.plan.epics.map(epic => { const list = stories.filter(entry => entry.epicId === epic.id); return list.length ? `<h3>${esc(epic.name)} <small>스토리 ${list.length}건</small></h3><div class="st-items">${list.map(entry => `<button type="button" class="st-item" data-a="select-story" data-v="${esc(entry.id)}" aria-current="${selected.story === entry.id}"><span class="st-name">${esc(entry.title)}</span><span class="st-code">${esc(entry.id)}</span>
      <span class="st-meta">${badge(itemOf(entry.reqId)?.number ?? entry.reqId, 'outline')}${entry.stale ? badge('요구사항이 바뀜', 'amber') : ''}<span class="muted st-small">인수조건 ${entry.green.length + entry.red.length}개</span></span></button>`).join('')}</div>` : ''; }).join('');
  return `<section class="panel"><div class="panel-head"><div><h2>에픽·스토리</h2><small>에픽 ${view.plan.epics.length}개 · 스토리 ${stories.length}건 · 초안 요구사항 ${drafts}건은 포함하지 않음</small></div>
      <div class="row-actions">${changes ? badge(`새로 확정되거나 바뀐 요구사항 ${targets}건${view.planOrphans ? ` · 제외·취소된 요구사항의 스토리 ${view.planOrphans}건` : ''}`, 'amber') : ''}${start}<button type="button" class="button small secondary" data-a="document" data-v="stories">에픽·스토리 문서</button></div></div></section>
  <div class="st-split"><section class="panel panel-body st-stack">${epics}
      <h3>모든 스토리에 적용하는 품질 기준</h3><div class="st-chips">${quality.map(item => itemButton(item, 'go-requirement')).join('') || '<span class="muted st-small">확정된 성능·보안·품질·제약 요구사항이 없습니다.</span>'}</div>
      ${outside.length ? `<h3>개발 범위 밖 (사업 관리·지원)</h3><div class="st-chips">${outside.map(item => itemButton(item, 'go-requirement')).join('')}</div>` : ''}</section>
    <section class="panel panel-body st-stack"><div class="st-spread"><div class="st-row"><span class="st-code">${esc(story.id)}</span><h2>${esc(story.title)}</h2></div><button type="button" class="button small" data-a="document" data-v="package-${esc(story.id)}">개발 패키지 보기</button></div>
      ${story.stale ? '<p class="st-small st-missing">이 스토리를 쓴 뒤 요구사항이 바뀌었거나 확정에서 빠졌습니다. 위의 반영 단추를 누르면 다시 쓰거나 지웁니다.</p>' : ''}
      <p>${badge('사용자')} ${esc(story.role)} ${badge('하려는 일')} ${esc(story.want)}</p>
      <div><h3>인수조건</h3><ul class="st-list">${story.green.map(line => `<li>${badge('통과', 'green')} ${esc(line)}</li>`).join('')}${story.red.map(line => `<li>${badge('차단', 'red')} ${esc(line)}</li>`).join('')}</ul></div>
      ${requirement ? `<div><h3>요구사항</h3><div class="st-chips">${itemButton(requirement, 'go-requirement')}</div></div><div><h3>함께 넘기는 산출물 항목</h3><div class="st-chips">${requirement.related.map(itemOf).filter(other => other && other.kind !== 'requirement').map(other => itemButton(other)).join('') || '<span class="muted st-small">없음</span>'}</div></div>` : ''}</section></div>`;
}

/* ---------- render ---------- */
function render() {
  if (!view) return;
  const all = requirements().filter(item => item.status !== 'retired'), on = view.enabled, average = on.length ? Math.round(on.reduce((sum, id) => sum + typeScore(id), 0) / on.length) : 0;
  const stages = [['sources', '1. 자료함', `문서 ${view.sources.length}건 · 조각 ${view.sources.reduce((sum, source) => sum + source.clauses, 0)}개`],
    ['requirements', '2. 요구사항', `확정 ${all.filter(item => item.status === 'confirmed').length} / ${all.length}건 · 쟁점 ${view.issues.filter(issue => issue.open).length}`],
    ['artifacts', '3. 분석·설계 산출물', `${on.length}종 작성 중 · 평균 ${average}%`], ['plan', '4. 에픽·스토리', view.plan?.stories.length ? `스토리 ${view.plan.stories.length}건` : '아직 만들지 않음']];
  const focus = document.activeElement?.id, caret = focus === 'filter-query' ? document.activeElement.selectionStart : null;
  $('#project-name').textContent = view.project?.name === PLACEHOLDER_PROJECT ? '프로젝트 이름 없음' : view.project?.name ?? '';
  $('#stages').innerHTML = stages.map(([id, name, sub]) => `<button type="button" class="st-stage" data-a="tab" data-v="${id}" aria-current="${tab === id}"><strong>${esc(name)}</strong><span>${esc(sub)}</span></button>`).join('');
  $('#main').innerHTML = tab === 'sources' ? viewSources() : tab === 'requirements' ? viewRequirements() : tab === 'artifacts' ? viewArtifacts() : viewPlan();
  // What is running is shown on every stage, not only where it was started.
  const job = lastJob()?.status === 'running' ? lastJob() : null, activity = $('#activity');
  activity.hidden = !uploading && !job;
  activity.innerHTML = uploading ? `<span class="dot"></span><span><strong>문서 등록 중</strong> · ${uploading.files.filter(file => ['done', 'failed'].includes(file.status)).length} / ${uploading.files.length}건 끝남 · ${esc(uploading.files[uploading.index].name)} · 경과 ${ticking(uploading.startedAt)}</span>${tab === 'sources' ? '' : '<button type="button" data-a="tab" data-v="sources">자료함에서 보기</button>'}`
    : job ? `<span class="dot"></span><span><strong>${esc(JOB_NAMES[job.kind])} 중</strong> · ${esc(job.stage)} ${job.done} / ${job.total} · 경과 ${ticking(job.startedAt)}</span>${tab === 'sources' ? '' : '<button type="button" data-a="tab" data-v="sources">자료함에서 보기</button>'}` : '';
  // Progress is announced from one lasting element and only when it changes, so a re-render does not repeat it.
  const spoken = uploading ? `문서 등록 ${uploading.files.filter(file => ['done', 'failed'].includes(file.status)).length} / ${uploading.files.length}건 끝남. ${uploading.files[uploading.index].name} ${uploading.files[uploading.index].note}`
    : job ? `${JOB_NAMES[job.kind]} ${job.stage} ${job.done} / ${job.total}` : lastJob() ? `${JOB_NAMES[lastJob().kind]} ${JOB_STATUS[lastJob().status]}` : '';
  if ($('#announce').textContent !== spoken) $('#announce').textContent = spoken;
  paint($('#main'));
  if (focus && ['filter-query', 'filter-category'].includes(focus)) { const element = document.getElementById(focus); element?.focus(); if (caret !== null) element?.setSelectionRange(caret, caret); }
}
// The page's CSP has no inline styles, so widths are set through the CSSOM after each render.
function paint(root) { for (const bar of root.querySelectorAll('[data-w]')) bar.style.width = `${Math.max(0, Math.min(100, Number(bar.dataset.w)))}%`; }

/* ---------- dialogs ---------- */
function openDialog(title, body, { submit = '저장', onSubmit, wide = false } = {}) {
  const dialog = $('#dialog');
  dialog.classList.toggle('st-wide', wide);
  $('#dialog-content').innerHTML = `<form id="dialog-form" novalidate><div class="dialog-head"><h2 id="dialog-title">${esc(title)}</h2></div><div class="dialog-body"><div class="form-errors" role="alert" hidden></div>${body}</div>
    <div class="dialog-footer"><button type="button" class="button secondary" data-a="close">닫기</button>${onSubmit ? `<button type="submit" class="button">${esc(submit)}</button>` : ''}</div></form>`;
  const form = $('#dialog-form');
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = form.querySelector('[type="submit"]'), errors = form.querySelector('.form-errors');
    button.disabled = true; errors.hidden = true;
    try { if (await onSubmit(new FormData(form), form) !== false) dialog.close(); }
    catch (error) { errors.textContent = error.message; errors.hidden = false; }
    finally { button.disabled = false; }
  });
  paint(form);
  if (!dialog.open) dialog.showModal();
}
// The label names the control; help text is attached as a description so it is not read as part of the name.
const field = (name, title, control, help = '') => `<div class="field"><label class="field-label" for="fd-${name}">${esc(title)}</label>${control.replace(`name="${name}"`, `name="${name}" id="fd-${name}"${help ? ` aria-describedby="fh-${name}"` : ''}`)}${help ? `<small id="fh-${name}">${esc(help)}</small>` : ''}</div>`;
const checkbox = (name, text, checked = false) => `<label class="checkbox-field"><input type="checkbox" name="${name}" ${checked ? 'checked' : ''}><span>${esc(text)}</span></label>`;
const consentFields = () => `${checkbox('sensitivityAcknowledged', '문서 원문에 민감정보가 있을 수 있음을 알고 있으며, 이 비공개 작업공간에서 분석·보관합니다.')}${checkbox('consent', `분석에 필요한 문서 내용을 이 PC의 Claude CLI(${view.model})를 통해 모델 서비스로 보내는 데 동의합니다. 기관 자료의 반출 허용 여부는 제가 확인했습니다.`)}`;
function consentOf(data) {
  if (!data.has('sensitivityAcknowledged') || !data.has('consent')) throw new Error('두 항목을 모두 확인해 주세요.');
  return { consent: true, model: view.model, sensitivityAcknowledged: true };
}
/** Post an action from a dialog; a failure is shown in the dialog and the input stays. */
async function submitAction(action, payload, message) {
  view = await post('/api/action', { revision: view.revision, action, payload });
  render(); schedule(); if (message) toast(message);
}
function runDialog(action, title, lines, payload = {}) {
  openDialog(title, `<ul class="st-list">${lines.map(line => `<li>${esc(line)}</li>`).join('')}</ul>${consentFields()}<p class="muted">Claude CLI 연결은 오프라인 AI가 아닙니다. 진행 중에도 화면을 닫을 수 있으며, 중지하면 끝난 부분은 남습니다.</p>`,
    { submit: '시작', onSubmit: async data => { await submitAction(action, { ...payload, ...consentOf(data) }); tab = action === 'studio.plan' ? 'plan' : action === 'studio.run' ? 'sources' : tab; render(); } });
}
function analyzeLines() {
  const lines = [];
  if (view.pending.classify) lines.push(`아직 분류하지 않은 조각 ${view.pending.classify}개를 묶음으로 나눠 분류하고 요구사항 후보를 뽑습니다.`);
  for (const [type, count] of Object.entries(view.pending.extract)) if (count) lines.push(`${typeOf(type).name}: 관련 조각 ${count}개에서 항목을 만듭니다.`);
  if (view.pending.merge) lines.push(`대조를 기다리는 후보 ${view.pending.merge}건을 기존 내용과 비교합니다.`);
  lines.push('이미 분석한 문서는 다시 읽지 않습니다. 확정된 내용은 바꾸지 않고 변경 제안으로 올립니다.');
  return lines;
}
// A table is edited one row per line with cells separated by a bar. A bar or backslash inside a cell is written with a
// backslash before it, so a row reads back exactly as it was shown.
const encodeCell = value => String(value ?? '').replace(/\\/g, '\\\\').replace(/\|/g, '\\|');
function decodeRow(line) {
  const cells = [''];
  for (let index = 0; index < line.length; index++) {
    if (line[index] === '\\' && index + 1 < line.length) cells[cells.length - 1] += line[++index];
    else if (line[index] === '|') cells.push('');
    else cells[cells.length - 1] += line[index];
  }
  return cells.map(cell => cell.trim());
}
function editDialog(item, kind) {
  const specs = fieldsOf(kind), values = item?.fields ?? {};
  const control = spec => {
    const value = values[spec.key];
    if (spec.type === 'text' && spec.options) return `<select name="f-${spec.key}" ${spec.key === 'category' && item?.number ? 'disabled' : ''}><option value="">선택</option>${spec.options.map(option => `<option value="${esc(option)}" ${value === option ? 'selected' : ''}>${esc(spec.key === 'category' ? `${categoryName(option)} (${option})` : option)}</option>`).join('')}</select>`;
    if (spec.type === 'text') return `<textarea name="f-${spec.key}" rows="2">${esc(value ?? '')}</textarea>`;
    if (spec.type === 'list') return `<textarea name="f-${spec.key}" rows="4">${esc((value ?? []).join('\n'))}</textarea>`;
    return `<textarea name="f-${spec.key}" rows="4">${esc((value ?? []).map(row => spec.columns.map(([key]) => encodeCell(row[key])).join(' | ')).join('\n'))}</textarea>`;
  };
  const help = spec => spec.type === 'list' ? '한 줄에 하나씩' : spec.type === 'rows' ? `한 줄에 한 행 — ${spec.columns.map(([, name]) => name).join(' | ')} (칸 안의 세로줄은 \\| 로 적습니다)` : spec.key === 'category' && item?.number ? '고유번호를 받은 뒤에는 분류를 바꿀 수 없습니다.' : '';
  const others = view.items.filter(other => other.status !== 'retired' && other.id !== item?.id);
  openDialog(item ? `${kindName(kind)} 수정` : `${kindName(kind)} 직접 추가`, `${field('name', kind === 'requirement' ? '요구사항 명칭' : `${typeOf(kind).noun} 이름`, `<input type="text" name="name" value="${esc(item?.name ?? '')}" required>`)}
    ${specs.map(spec => field(`f-${spec.key}`, `${spec.label}${spec.required ? ' *' : ''}`, control(spec), help(spec))).join('')}
    ${others.length ? field('links', '직접 연결할 요구사항·항목', `<select name="links" multiple size="6">${others.map(other => `<option value="${esc(other.id)}" ${(item?.links ?? []).includes(other.id) ? 'selected' : ''}>${esc(`[${kindName(other.kind)}] ${other.kind === 'requirement' ? `${label(other)} ` : ''}${other.name}`)}</option>`).join('')}</select>`, '같은 문서 조각에서 나온 항목은 자동으로 연결됩니다. 그 밖의 연결만 고릅니다. Ctrl을 누른 채 여러 개를 고를 수 있습니다.') : ''}`, { wide: true, onSubmit: async data => {
      const fields = {};
      for (const spec of specs) {
        const raw = String(data.get(`f-${spec.key}`) ?? (spec.key === 'category' ? values.category ?? '' : ''));
        const lines = raw.split('\n').map(line => line.trim()).filter(Boolean);
        fields[spec.key] = spec.type === 'text' ? raw.trim() : spec.type === 'list' ? lines : lines.map(line => { const cells = decodeRow(line); return Object.fromEntries(spec.columns.map(([key], index) => [key, cells[index] ?? ''])); });
      }
      const payload = { name: String(data.get('name') ?? ''), fields, links: data.getAll('links') };
      await submitAction('studio.item.save', item ? { ...payload, id: item.id, rev: item.rev } : { ...payload, kind }, '저장했습니다.');
      if (!item) { const created = view.items.at(-1); if (kind === 'requirement') selected.requirement = created.id; else selected.item = created.id; render(); }
    } });
}
async function documentDialog(id) {
  let file;
  try { file = await request(`/api/studio/documents/${encodeURIComponent(id)}`); } catch (error) { toast(error.message); return; }
  openDialog(file.filename, `<p class="muted">현재 저장된 내용으로 만든 문서입니다. 내려받은 파일에는 문서 원문이 들어 있을 수 있으니 밖으로 보내기 전에 확인해 주세요.</p><div class="row-actions"><button type="button" class="button small" data-a="download">내려받기</button><button type="button" class="button small secondary" data-a="copy">복사</button></div><pre class="data-preview st-document" id="document-text" tabindex="0" role="region" aria-label="문서 내용">${esc(file.content.replace(/^﻿/, ''))}</pre>`, { wide: true });
  $('#dialog').dataset.filename = file.filename; $('#dialog').dataset.type = file.type; documentDialog.content = file.content;
}
function uploadDialog() {
  openDialog('문서 추가', `${field('files', '문서 파일', '<input type="file" name="files" multiple required>', '여러 개를 한 번에 고를 수 있습니다. 형식과 종류는 가리지 않으며 파일 하나는 20MB까지입니다.')}
    <div class="fields-row">${field('sourceType', '문서 종류', `<select name="sourceType">${SOURCE_TYPES.map(([value, name]) => `<option value="${value}">${esc(name)}</option>`).join('')}</select>`)}${field('classification', '보안 분류', `<select name="classification">${CLASSIFICATIONS.map(([value, name]) => `<option value="${value}">${esc(name)}</option>`).join('')}</select>`)}</div>
    ${consentFields()}${checkbox('localText', '글자 문서(TXT·Markdown·HTML)는 AI 판독 없이 이 PC에서 바로 조각으로 나눕니다. 몇 초면 끝납니다. 스캔·이미지·PDF·HWP·Office 문서는 AI가 읽으며 문서마다 몇 분이 걸릴 수 있습니다.', true)}
    ${checkbox('analyze', '등록이 끝나면 이어서 분석해 요구사항과 산출물에 반영합니다.', true)}`, { submit: '등록 시작', onSubmit: async (data, form) => {
      const files = [...form.querySelector('[name="files"]').files];
      if (!files.length) throw new Error('문서를 골라 주세요.');
      const consent = consentOf(data);
      for (const file of files) if (file.size > 20 * 1024 ** 2) throw new Error(`${file.name}: 파일 하나는 20MB까지 등록할 수 있습니다.`);
      void upload(files, { sourceType: data.get('sourceType'), classification: data.get('classification'), analyze: data.has('analyze'), localText: data.has('localText'), consent });
    } });
}
const fileBase64 = file => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onerror = () => reject(new Error(`${file.name}: 파일을 읽지 못했습니다.`)); reader.onload = () => resolve(String(reader.result).slice(String(reader.result).indexOf(',') + 1)); reader.readAsDataURL(file); });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
/**
 * Registers files one at a time, then starts the analysis if asked. Every file
 * has its own line on screen from the start, so what is waiting, being read,
 * done or failed is visible throughout, with the reason for a failure.
 */
async function upload(files, options) {
  tab = 'sources'; lastUpload = null;
  uploading = { files: files.map(file => ({ name: file.name, status: 'waiting', note: '' })), index: 0, startedAt: new Date().toISOString(), fileStartedAt: new Date().toISOString() };
  try {
    for (const [index, file] of files.entries()) {
      const entry = uploading.files[index], local = options.localText && LOCAL_TEXT.test(file.name);
      uploading.index = index; uploading.fileStartedAt = new Date().toISOString();
      entry.status = 'reading'; entry.note = local ? '글자 문서를 조각으로 나누는 중' : 'AI가 문서를 읽는 중'; render();
      try {
        const requestId = crypto.randomUUID(), base64 = await fileBase64(file);
        view = await request('/api/studio');
        await post('/api/ingest', { revision: view.revision, action: 'source.ingest', payload: { requestId, filename: file.name, base64, classification: options.classification, sourceType: options.sourceType, sensitivityAcknowledged: true, ...(local ? {} : { readWithAI: true, consent: true, model: view.model }) } });
        for (;;) {
          view = await request('/api/studio');
          const job = view.imports.find(item => item.requestId === requestId);
          if (job?.status === 'ready') { entry.status = 'done'; entry.note = `조각 ${view.sources.find(source => source.id === job.sourceId)?.clauses ?? 0}개`; break; }
          if (job?.status !== 'extracting') { entry.status = 'failed'; entry.note = IMPORT_ERRORS[job?.errorCode] ?? IMPORT_ERRORS[job?.status] ?? job?.errorCode ?? '등록 상태를 확인하지 못했습니다'; break; }
          entry.note = local ? '글자 문서를 조각으로 나누는 중' : job.readingProgress?.stage === 'reading' ? `AI가 문서를 읽는 중 · ${job.readingProgress.completed} / ${job.readingProgress.total}구간` : 'AI가 읽을 준비를 하는 중'; render();
          await pause(1500);
        }
      } catch (error) { entry.status = 'failed'; entry.note = error.message; }
      render();
    }
  } finally { lastUpload = { files: uploading.files, seconds: (Date.now() - Date.parse(uploading.startedAt)) / 1000 }; uploading = null; }
  try { view = await request('/api/studio'); } catch { /* The page keeps the last view. */ }
  render();
  const failed = lastUpload.files.filter(file => file.status === 'failed').length;
  toast(failed ? `문서 ${lastUpload.files.length - failed}건을 등록했고 ${failed}건은 실패했습니다. 자료함에서 원인을 확인해 주세요.` : `문서 ${lastUpload.files.length}건을 등록했습니다.`);
  if (options.analyze && pendingTotal() && !view.active) await act('studio.run', options.consent, '분석을 시작했습니다.');
  schedule();
}
// Registration is driven by this page, so leaving it would drop the files that are still waiting.
window.addEventListener('beforeunload', event => { if (uploading) { event.preventDefault(); event.returnValue = ''; } });
setInterval(() => { for (const element of document.querySelectorAll('[data-since]')) element.textContent = elapsedSince(element.dataset.since); }, 1000);

/* ---------- events ---------- */
async function handle(action, value) {
  const item = itemOf(value);
  switch (action) {
    case 'tab': tab = value; render(); break;
    case 'upload': uploadDialog(); break;
    case 'run': runDialog('studio.run', 'AI 분석 진행', analyzeLines()); break;
    case 'plan': runDialog('studio.plan', '에픽·스토리 만들기', [`확정된 요구사항 ${view.planTargets.length}건을 몇 건씩 나눠 스토리와 인수조건을 씁니다.`, '요구사항마다 연결된 화면·엔터티·프로세스 항목을 함께 보냅니다.', '이미 쓴 스토리는 요구사항이 바뀐 것만 다시 씁니다.', ...(view.planOrphans ? [`제외했거나 확정을 취소한 요구사항의 스토리 ${view.planOrphans}건은 지웁니다.`] : [])]); break;
    case 'enrich': runDialog('studio.enrich', '빈칸을 AI로 보강', [`‘${item.name}’의 비어 있는 칸을 근거 조각과 관련 조각에서 찾아 채웁니다.`, '채워진 칸은 바꾸지 않습니다. 문서에 없으면 질문으로 남깁니다.'], { itemId: value }); break;
    case 'cancel': await act('studio.cancel', { jobId: value }, '중지했습니다. 끝난 부분은 남아 있습니다.'); break;
    case 'select-requirement': selected.requirement = value; render(); break;
    case 'go-requirement': selected.requirement = value; filter.status = 'all'; filter.category = ''; filter.query = ''; tab = 'requirements'; if ($('#dialog').open) $('#dialog').close(); render(); break;
    case 'go-item': if (item) { selected.type = item.kind; selected.item = value; tab = 'artifacts'; if ($('#dialog').open) $('#dialog').close(); render(); } break;
    case 'select-type': selected.type = value; selected.item = null; render(); break;
    case 'select-item': selected.item = value; render(); break;
    case 'select-story': selected.story = value; render(); break;
    case 'filter-status': filter.status = value; render(); break;
    case 'confirm': if (await act('studio.item.status', { id: value, status: 'confirmed' })) toast(itemOf(value)?.number ? `${itemOf(value).number} 번호로 확정했습니다.` : '확정했습니다.'); break;
    case 'unconfirm': await act('studio.item.status', { id: value, status: 'draft' }, '초안으로 되돌렸습니다. 받은 번호는 그대로 둡니다.'); break;
    case 'retire': await act('studio.item.status', { id: value, status: 'retired' }, '제외했습니다. 내용과 근거는 보존하며 되살릴 수 있습니다.'); break;
    case 'restore': await act('studio.item.status', { id: value, status: 'draft' }, '초안으로 되살렸습니다.'); break;
    case 'confirm-all': await act('studio.items.confirm', { kind: value }, '검토 가능한 초안을 확정했습니다.'); break;
    case 'edit': editDialog(item, item.kind); break;
    case 'new-item': editDialog(null, value); break;
    case 'proposal-accept': await act('studio.proposal', { id: value, accept: true }, '변경 제안을 반영했습니다.'); break;
    case 'proposal-reject': await act('studio.proposal', { id: value, accept: false }, '반영하지 않았습니다.'); break;
    case 'issue-keep': await act('studio.issue', { id: value, choice: 'keep' }, '지금 내용을 유지하기로 기록했습니다.'); break;
    case 'issue-adopt': await act('studio.issue', { id: value, choice: 'adopt' }, '새 문서의 내용을 반영했습니다.'); break;
    case 'issue-dismiss': await act('studio.issue', { id: value, choice: 'dismiss' }, '질문을 닫았습니다. 내용은 바뀌지 않았습니다.'); break;
    case 'issue-answer': { const issue = view.issues.find(entry => entry.id === value);
      openDialog('질문에 답변', `<p>${esc(issue.text)}</p>${field('note', '답변', '<textarea name="note" rows="3" required></textarea>', '답변은 이 항목의 내용에 한 줄로 더해집니다.')}`, { onSubmit: async data => submitAction('studio.issue', { id: value, note: String(data.get('note') ?? '') }, '답변을 기록했습니다.') }); break; }
    case 'baseline': { const confirmed = requirements().filter(entry => entry.status === 'confirmed').length, drafts = requirements().filter(entry => entry.status === 'draft').length;
      openDialog('기준선 만들기', `<p>지금 확정된 요구사항 <strong>${confirmed}건</strong>과 확정된 산출물 항목을 기준선으로 묶어 보관합니다. 초안 ${drafts}건은 들어가지 않고 계속 고도화할 수 있습니다.</p>${field('name', '기준선 이름', `<input type="text" name="name" value="${view.baselines.length ? '변경 반영' : '1차 요구사항 확정'}" required>`)}<p class="muted">기준선 뒤에도 문서를 넣을 수 있습니다. 기준선에 든 내용이 바뀌면 ‘이후 변경’으로 표시하고 다음 기준선에서 묶습니다.</p>`, { submit: '만들기', onSubmit: async data => submitAction('studio.baseline', { name: String(data.get('name') ?? '') }, '기준선을 만들었습니다.') }); break; }
    case 'enable': await act('studio.enable', { type: value, enabled: true }, (view.pending.waiting[value] ?? 0) ? '켰습니다. ‘AI 분석 진행’을 누르면 표시해 둔 조각으로 초안을 만듭니다.' : '켰습니다. 관련 문서를 넣거나 직접 작성해 주세요.'); selected.type = value; render(); break;
    case 'document': await documentDialog(value); break;
    case 'download': { const dialog = $('#dialog'), url = URL.createObjectURL(new Blob([documentDialog.content], { type: dialog.dataset.type })), link = document.createElement('a'); link.href = url; link.download = dialog.dataset.filename; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); break; }
    case 'copy': try { await navigator.clipboard.writeText(documentDialog.content.replace(/^﻿/, '')); toast('복사했습니다.'); } catch { const range = document.createRange(); range.selectNodeContents($('#document-text')); getSelection().removeAllRanges(); getSelection().addRange(range); toast('본문을 선택했습니다. 복사 단축키를 눌러 주세요.'); } break;
    case 'project': openDialog('프로젝트 정보', `${field('name', '사업 이름', `<input type="text" name="name" value="${esc(view.project?.name === PLACEHOLDER_PROJECT ? '' : view.project?.name ?? '')}" required>`)}${field('code', '사업 코드', `<input type="text" name="code" value="${esc(view.project?.code ?? '')}" required>`)}${field('institution', '발주기관', `<input type="text" name="institution" value="${esc(view.project?.institution ?? '')}">`)}`, { onSubmit: async data => {
      await post('/api/action', { revision: view.revision, action: 'project.save', payload: { code: String(data.get('code')).trim(), name: String(data.get('name')).trim(), institution: String(data.get('institution') ?? '').trim(), baselineProfile: view.project?.baselineProfile ?? '' } });
      await reload(); toast('프로젝트 정보를 저장했습니다.'); } }); break;
    case 'prompts': openDialog('AI 작업 지시', `<p class="muted">단계마다 AI에 보내는 지시문입니다. 지시 버전 ${esc(view.promptVersion)}. 문서 내용은 지시가 아니라 분석 대상으로만 전달합니다.</p>${view.prompts.map(prompt => `<details><summary>${esc(prompt.stage)}</summary><pre class="data-preview" tabindex="0" role="region" aria-label="${esc(prompt.stage)} 지시문">${esc(prompt.instructions)}</pre></details>`).join('')}`, { wide: true }); break;
    case 'close': $('#dialog').close(); break;
    default: break;
  }
}
document.addEventListener('click', event => {
  const element = event.target.closest('[data-a]');
  if (!element || element.disabled || element.matches('input[type="checkbox"]')) return;
  void handle(element.dataset.a, element.dataset.v);
});
document.addEventListener('change', async event => {
  const element = event.target;
  if (element.dataset?.a === 'toggle') {
    selected.type = element.dataset.v; selected.item = null;
    if (element.checked) await handle('enable', element.dataset.v);
    else await act('studio.enable', { type: element.dataset.v, enabled: false }, '껐습니다. 만든 항목은 보관하며 다시 켜면 돌아옵니다.');
  } else if (element.id === 'filter-category') { filter.category = element.value; $('#requirement-list').innerHTML = requirementList(); paint($('#requirement-list')); }
});
document.addEventListener('input', event => { if (event.target.id === 'filter-query') { filter.query = event.target.value; $('#requirement-list').innerHTML = requirementList(); paint($('#requirement-list')); } });
$('#theme').addEventListener('click', () => { const dark = document.documentElement.classList.toggle('dark'); $('#theme').setAttribute('aria-label', dark ? '라이트 모드로 전환' : '다크 모드로 전환'); });

async function connect() {
  const launch = new URLSearchParams(location.hash.slice(1)).get('launch');
  if (launch) history.replaceState(null, '', location.pathname);
  try {
    const session = await request('/api/session', { headers: launch ? { 'x-requirements-launch': launch } : {} });
    if (workspaceId && session.workspaceId !== workspaceId) throw new Error('다른 작업공간의 실행기입니다. 그 작업공간은 새 창에서 열어 주세요.');
    token = session.token; workspaceId = session.workspaceId;
    await reload();
  } catch (error) {
    $('#main').innerHTML = `<section class="panel panel-body st-stack" role="alert"><h2>작업공간에 연결하지 못했습니다</h2><p>${esc(error.message)}</p><p class="muted">실행기 터미널에 표시된 주소를 #launch= 부분까지 그대로 다시 열어 주세요.</p></section>`;
  }
}
window.addEventListener('hashchange', () => { if (new URLSearchParams(location.hash.slice(1)).has('launch')) void connect(); });
await connect();
