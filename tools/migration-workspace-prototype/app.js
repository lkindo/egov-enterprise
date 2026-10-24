/* Synthetic, memory-only UX prototype. No network, source-file reads or CLI execution. */
(() => {
  'use strict';
  const stages = [
    ['collect', '원천 자료 준비'], ['analyze', '구조·품질 분석'], ['terms', '용어 검토'],
    ['mapping', '변환 설계'], ['rehearse', '리허설·최종 전환'], ['report', '대사·보관'],
  ];
  const rows = [
    { id: 'USER_NM', table: 'TB_MEMBER', label: '회원 이름', grade: 'SYNONYM', ambiguous: true, candidates: ['사용자명', '신청자명'],
      evidence: [['DB 코멘트', '회원 이름', 'TB_MEMBER.USER_NM · 원천 메타 예시'], ['화면·소스 사용처', '회원관리 > 사용자명 / 검색 조건과 상세 화면에 사용', 'member/MemberForm.jsp:42 · MemberMapper.xml:18 (합성 경로)'], ['업무 해석', '신청 기록이 아닌 회원 기본정보입니다. 신청자명과 구분해 확인하세요.', '소스 근거 2종 · 전체 프로파일 예시']], target: '사용자 기본정보', note: '회원 기본정보와 화면의 사용자명 의미가 일치합니다.' },
    { id: 'REG_ID', table: 'TB_DOCUMENT', label: '등록 ID', grade: 'INFERRED', ambiguous: true, candidates: ['작성자아이디', '등록자아이디'],
      evidence: [['DB 코멘트', '등록 ID', '컬럼명만으로 행위 주체를 구분하기 어렵습니다.'], ['화면·소스 사용처', '문서 목록의 작성자 표시와 로그인 사용자 키를 연결', 'document/DocumentMapper.xml:77 · DocumentList.jsp:29 (합성 경로)'], ['관계 근거', '회원 식별키 참조. 문서 작성과 대리 등록의 차이는 업무 담당자가 확인합니다.', '주체 불명확 · 자동 확정하지 않음']], target: '문서 작성 정보', note: '' },
    { id: 'REG_DT', table: 'TB_DOCUMENT', label: '등록일', grade: 'EXACT', candidates: ['등록일시', '접수일시'],
      evidence: [['DB 코멘트', '문서 등록일시', '문자형 14자리 일시 · 원천 메타 예시'], ['소스 사용처', '문서 생성 시 설정, 접수 시각은 별도 필드로 관리', 'document/DocumentService.java:91 (합성 경로)'], ['값 프로파일', '예시 12,480건 중 잘못된 일자 2건. 변환·격리 정책 검토가 필요합니다.', '값은 표시하지 않고 집계만 표시']], target: '문서 생성 정보', note: '생성 시각과 접수 시각을 구분했습니다.' },
    { id: 'USE_YN', table: 'TB_MEMBER', label: '사용 여부', grade: 'EXACT', candidates: ['사용여부'],
      evidence: [['DB 코멘트', '사용 여부', '원천 코드 1 / 0'], ['소스 사용처', '1이면 활성, 0이면 비활성으로 분기', 'member/MemberService.java:65 (합성 경로)'], ['값 프로파일', '두 코드가 전체 값에 존재합니다. 표준 Y / N 변환을 별도로 검토하세요.', '허용값 대조 · 합성 예시']], target: '사용자 상태', note: '화면의 활성 상태와 원천 코드 의미를 확인했습니다.' },
    { id: 'ORG_CD', table: 'TB_MEMBER', label: '소속 코드', grade: 'SYNONYM', candidates: ['조직코드', '기관코드'],
      evidence: [['DB 코멘트', '소속 부서 코드', '원천 조직 코드 참조'], ['소스 사용처', '기관 내부 부서 트리를 선택하는 화면에 사용', 'organization/OrganizationSelect.jsp:31 (합성 경로)'], ['관계 근거', '기관 식별코드와 부서코드의 체계가 다릅니다. 조직 코드 대응표를 검토합니다.', '부모 조직 먼저 적재 · FK 대사 필요']], target: '사용자 소속', note: '기관 내부 부서의 코드로 확인했습니다.' },
    { id: 'ETC1', table: 'TB_DOCUMENT', label: '비고 1', grade: 'UNKNOWN', candidates: [],
      evidence: [['DB 코멘트', '의미를 설명하는 코멘트가 없습니다.', '범용 예비 컬럼'], ['소스 사용처', '정적 분석으로 사용처를 찾지 못했습니다.', '사용처 없음은 미사용의 증거가 아닙니다.'], ['검토 방법', '업무 담당자 확인 후 표준 등록 요청 또는 기한을 정한 외부 보관으로 분류합니다.', '표준 업무 테이블에 임의 기타 필드를 추가하지 않음']], target: '업무 의미 미확정', note: '' },
  ];
  const $ = selector => document.querySelector(selector);
  const escape = value => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const initial = () => ({ mode: 'db', connected: true, scanned: true, collected: true, selected: 'USER_NM', filter: 'all', search: '',
    choices: {}, notes: {}, reviewed: {}, dispositions: {}, retention: '2027-10-24', rules: {}, checks: {}, dryRun: false, execution: 'idle', chunk: 0, acceptance: {}, archived: false, revision: 1, history: [] });
  let state = initial();
  let stage = stages.some(([key]) => key === location.hash.slice(1)) ? location.hash.slice(1) : 'terms';
  let toastTimer;
  let dialogAction;
  function notify(message) { clearTimeout(toastTimer); $('#notice').textContent = message; $('#notice').hidden = false; toastTimer = setTimeout(() => { $('#notice').hidden = true; }, 6500); }
  function ask(title, description, accept, action) { $('#dialog-title').textContent = title; $('#dialog-description').textContent = description; $('#dialog-accept').textContent = accept; dialogAction = action; $('#confirm-dialog').showModal(); }
  const count = () => Object.keys(state.reviewed).length;
  const registered = () => Object.values(state.dispositions).includes('register');
  const allRules = () => ['code', 'date', 'organization'].every(key => state.rules[key]);
  const blocked = () => [
    ...(!state.collected ? ['원천 자료 수집 예시를 완료하세요.'] : []),
    ...(state.mode === 'ddl' ? ['스키마만으로는 값 적합성을 확인할 수 없습니다. DB 전체 프로파일 예시로 전환하세요.'] : []),
    ...(!state.scanned ? ['소스 근거 예시를 추가하세요. 이 시나리오의 추정 용어는 업무 의미 확인이 필요합니다.'] : []),
    ...(count() < rows.length ? [`용어 ${rows.length - count()}건의 검토가 남았습니다.`] : []),
    ...(registered() ? ['표준 등록 요청이 남아 있습니다. 등록 후 메타 재조회·검토가 필요합니다.'] : []),
    ...(!allRules() ? ['변환 설계에서 코드·일자·조직 대응 정책을 검토하세요.'] : []),
  ];
  function invalidate(message, preserveRules = false) {
    state.dryRun = false; state.checks = {}; state.execution = 'idle'; state.chunk = 0; state.acceptance = {};
    if (!preserveRules) state.rules = {};
    state.revision++; state.history.unshift(message);
  }
  function goto(next) { stage = next; history.replaceState(null, '', `#${next}`); render(); $('#main').focus(); }
  const title = (eyebrow, heading, description, extra = '') => `<div class="page-title"><div><span class="eyebrow">${eyebrow}</span><h1>${heading}</h1><p>${description}</p></div>${extra}</div>`;
  const badge = (text, tone = 'neutral') => `<span class="pill ${tone}">${text}</span>`;
  const nextButton = (key, label) => `<button class="button primary" data-goto="${key}">${label} <span aria-hidden="true">→</span></button>`;
  const locked = () => state.archived || state.execution !== 'idle';
  const disabled = condition => condition ? 'disabled' : '';
  function focusSelector(element) {
    if (!element || element === document.body) return null;
    if (element.id) return `#${CSS.escape(element.id)}`;
    if (element.name) return `[name="${CSS.escape(element.name)}"][value="${CSS.escape(element.value)}"]`;
    for (const key of ['goto', 'row', 'filter', 'rule', 'check', 'acceptance', 'action']) {
      if (element.dataset[key]) return `[data-${key}="${CSS.escape(element.dataset[key])}"]`;
    }
    return null;
  }
  function render() {
    const focus = focusSelector(document.activeElement);
    $('#steps').innerHTML = stages.map(([key, label], i) => `<button class="step" data-goto="${key}" ${stage === key ? 'aria-current="step"' : ''}><span class="step-num">${String(i + 1).padStart(2, '0')}</span>${label}</button>`).join('');
    $('#lifecycle').textContent = state.archived ? '읽기 전용 보관 · 예시' : state.execution === 'done' ? '인수 대기 · 예시' : state.execution === 'running' ? '모의 전환 진행 중' : ['paused', 'failed'].includes(state.execution) ? '중단 지점 보존 · 예시' : '검토 중 · 합성 시나리오';
    $('#main').innerHTML = ({ collect: collectPage, analyze: analyzePage, terms: termsPage, mapping: mappingPage, rehearse: rehearsePage, report: reportPage })[stage]();
    if (focus) $(focus)?.focus({ preventScroll: true });
  }
  function collectPage() {
    return title('01 / COLLECT', '어디에서 데이터를 가져올까요?', '실제 연결이 어려운 초기 단계에는 스키마부터 검토하고, 적재 전에는 실제 데이터로 다시 검증합니다.') + `
      <div class="grid-cards mb-5">
        <label class="choice-card"><input type="radio" name="source-mode" value="db" ${state.mode === 'db' ? 'checked' : ''} ${disabled(locked())}><span><strong class="block text-base">읽기 전용 DB 연결</strong><span class="subtext">구조·관계·값 프로파일을 함께 수집</span>${badge('기존 CLI 활용', 'good')}</span></label>
        <label class="choice-card"><input type="radio" name="source-mode" value="ddl" ${state.mode === 'ddl' ? 'checked' : ''} ${disabled(locked())}><span><strong class="block text-base">스키마 파일 가져오기</strong><span class="subtext">DDL·스키마 명세로 먼저 의미 검토</span>${badge('신규 importer 설계', 'info')}</span></label>
      </div>
      <div class="grid-cards">
        <section class="panel"><div class="panel-head"><h2>원천 ${state.mode === 'db' ? '연결' : '스키마'} 설정</h2>${badge(state.connected ? '예시 준비됨' : '준비 필요', state.connected ? 'good' : 'warn')}</div><div class="panel-body space-y-4">
        ${state.mode === 'db' ? `<label class="field">DB 유형<select class="input" disabled><option>PostgreSQL · 합성 예시</option></select></label><label class="field">연결 프로필<input class="input" value="legacy-readonly · 예시 프로필" readonly></label><p class="text-xs text-muted">실제 구현에서는 운영자가 등록한 비밀 참조를 선택합니다. 이 예시는 접속정보를 받지 않습니다. 다른 DBMS의 운영 적재 자격은 별도 검증 대상입니다.</p><div class="flex flex-wrap gap-2"><button class="button" data-action="connect" ${disabled(locked())}>연결 성공 예시</button><button class="button" data-action="connect-error" ${disabled(locked())}>권한 부족 예시</button></div>` : `<div class="callout"><strong>legacy_schema.sql</strong><p class="mt-2 text-muted">DDL 해석 예시: 테이블·컬럼·PK/FK·코멘트. 입력 SQL은 실행하지 않는 설계입니다.</p></div><button class="button" data-action="schema" ${disabled(locked())}>스키마 파일 예시 선택</button><p class="text-xs text-muted">이 버튼은 실제 파일을 읽지 않습니다. Excel은 형식 템플릿과 importer를 별도로 구현해야 합니다.</p>`}
        <div id="connection-feedback" class="callout ${state.connected ? 'good' : 'warn'}">${state.connected ? '합성 연결/스키마 자료가 준비되어 있습니다.' : '메타데이터 조회 권한 부족 예시입니다. 원천 관리자에게 읽기 범위를 확인하거나 스키마 경로를 선택하세요.'}</div></div></section>
        <section class="panel"><div class="panel-head"><h2>레거시 소스 근거</h2>${badge(state.scanned ? '근거 예시 준비됨' : '소스 미제공', state.scanned ? 'good' : 'warn')}</div><div class="panel-body space-y-4"><div class="callout"><strong>legacy-portal / source snapshot</strong><p class="mt-2 text-muted">Java · MyBatis/iBATIS XML · JSP/HTML · SQL<br>읽기 전용 디렉터리 · 설정의 비밀값 제외</p></div><p>화면 라벨, SQL 사용처, 코드 분기를 컬럼과 연결해 업무 의미의 근거로 보여줍니다.</p><div class="flex flex-wrap gap-2"><button class="button" data-action="source" ${disabled(locked())}>소스 분석 예시 추가</button><button class="button quiet" data-action="no-source" ${disabled(locked())}>소스 없는 경우 보기</button></div><p class="text-xs text-muted">동적 SQL·미지원 스택은 부분 분석으로 남깁니다. 사용처가 없다는 이유로 자동 제외하지 않습니다.</p></div></section>
      </div><div class="mt-5 flex flex-wrap items-center justify-between gap-3"><p class="text-xs text-muted">입력 변경은 기존 검토와 리허설 결과를 무효화합니다.</p><button class="button primary" data-action="analyze" ${disabled(!state.connected || locked())}>자료 분석 시뮬레이션 →</button></div>`;
  }
  function analyzePage() {
    return title('02 / DISCOVER', '구조와 데이터의 빈틈을 먼저 확인하세요.', '범위가 불명확한 항목을 0건으로 처리하지 않고, 미수집·부분 분석·미측정으로 구분합니다.', nextButton('terms', '용어 검토하기')) + `
    <div class="stats"><div class="stat">범위에 포함된 테이블<strong>3 <small class="inline">개</small></strong><small>합성 업무 1개 · 검토 컬럼 6개</small></div><div class="stat">값 프로파일<strong>${state.mode === 'db' ? '12,480' : '미측정'}</strong><small>${state.mode === 'db' ? '전체 프로파일을 가정한 예시' : '스키마 파일에는 행 값이 없음'}</small></div><div class="stat">의미 충돌<strong>2</strong><small>이름 유사 · 업무 역할 다름</small></div><div class="stat">소스 분석 범위<strong>${state.scanned ? '부분' : '없음'}</strong><small>동적 SQL은 별도 확인 필요</small></div></div>
    ${!state.collected ? '<div class="callout warn mb-5">입력 변경 후 자료 분석 시뮬레이션을 다시 실행하세요.</div>' : ''}
    ${state.mode === 'ddl' ? '<div class="callout warn mb-5"><strong>스키마 검토 모드</strong><p>NULL 비율·중복키·값 길이·유효 일자는 미측정입니다. 의미 검토 초안은 작성할 수 있지만, 리허설과 적재 준비 완료로 승격하지 않습니다.</p></div>' : ''}
    <div class="grid-cards"><section class="panel"><div class="panel-head"><h2>이관 범위 · 관계</h2>${badge('합성 예시', 'info')}</div><div class="panel-body"><div class="flow"><div class="flow-box">조직<br><code>TB_ORGANIZATION</code></div><span aria-hidden="true">→</span><div class="flow-box">회원<br><code>TB_MEMBER</code></div><span aria-hidden="true">→</span><div class="flow-box">문서<br><code>TB_DOCUMENT</code></div></div><p class="mt-4 text-muted">부모 조직 → 사용자 → 문서 순서로 적재합니다. 순환 참조·분할·조인은 별도 설계 항목으로 검토합니다.</p><div class="mt-4 flex flex-wrap gap-2">${badge('구조 확인 예시', 'good')}${badge('첨부 파일 별도 이관', 'warn')}${badge('프로시저 자동 이관 제외')}</div></div></section>
    <section class="panel"><div class="panel-head"><h2>우선 확인할 항목</h2></div><div class="panel-body"><div class="check-row">${badge('의미', 'warn')}<div><strong>REG_ID의 실제 주체</strong><p class="text-muted">작성자와 등록자를 소스·업무 담당자 확인으로 구분합니다.</p></div></div><div class="check-row">${badge(state.mode === 'ddl' ? '미측정' : '품질', 'warn')}<div><strong>등록일시 변환</strong><p class="text-muted">${state.mode === 'db' ? '잘못된 일자 2건에 대한 중단·교정·격리 정책이 필요합니다.' : '일자 유효성은 실데이터 전체 프로파일 후 확인합니다.'}</p></div></div><div class="check-row">${badge('미확정', 'bad')}<div><strong>ETC1의 보존 여부</strong><p class="text-muted">임의 기타 컬럼을 만들지 않고 보관 또는 표준 등록으로 분류합니다.</p></div></div></div></section></div>`;
  }
  function visibleRows() { return rows.filter(row => (state.filter !== 'pending' || !state.reviewed[row.id]) && (state.filter !== 'conflict' || row.ambiguous || !row.candidates.length) && `${row.id} ${row.table} ${row.label}`.toLowerCase().includes(state.search.toLowerCase())); }
  function tableRows() { return visibleRows().map(row => `<tr class="${state.selected === row.id ? 'selected' : ''}"><td><button class="row-button" data-row="${row.id}" aria-label="${row.id} 검토">${row.id}<span class="subtext">${row.label}</span></button></td><td>${escape(row.candidates[state.choices[row.id] || 0] || '분류 필요')}<span class="subtext">${row.grade}</span></td><td>${badge(state.reviewed[row.id] ? '검토 완료' : row.ambiguous ? '의미 확인' : row.candidates.length ? '검토 대기' : '미확정', state.reviewed[row.id] ? 'good' : 'warn')}</td></tr>`).join('') || '<tr><td colspan="3" class="text-center text-muted">조건에 맞는 컬럼이 없습니다. 검색어나 필터를 바꿔 주세요.</td></tr>'; }
  function evidenceCards(row) {
    return row.evidence.map(([type, originalContent, originalPath], index) => {
      let content = originalContent, path = originalPath;
      if (!state.scanned && index === 1) { content = '소스 미제공 · 업무 담당자 확인이 필요합니다.'; path = '사용처 미수집'; }
      if (state.mode === 'ddl' && index === 2) { content = '스키마만 있어 실제 값·전체 프로파일·참조 데이터는 미측정입니다.'; path = '실데이터 검증 후 근거 보완 필요'; }
      return `<div class="evidence"><span class="text-xs font-semibold text-accent">${String(index+1).padStart(2,'0')} · ${type}</span><p>${content}</p><small>${path}</small></div>`;
    }).join('');
  }
  function unresolvedFields(row) {
    const registration = state.dispositions[row.id] === 'register';
    return `<label class="field mb-3">처리 방향<select class="input" id="disposition" ${disabled(locked())}><option value="archive" ${!registration ? 'selected' : ''}>기한을 정해 외부 보관</option><option value="register" ${registration ? 'selected' : ''}>표준 용어 등록 요청 · 실행 보류</option></select></label>${registration ? '<div class="callout warn">표준 담당자 확인과 실제 등록·메타 재조회 전까지 실행을 보류합니다.</div>' : `<label class="field mb-3">예시 보존 기한<input class="input" type="date" id="retention" value="${state.retention}" ${disabled(locked())}></label>`}`;
  }
  function termsPage() {
    const row = rows.find(item => item.id === state.selected);
    const choice = state.choices[row.id] || 0;
    const note = state.notes[row.id] ?? row.note;
    return title('03 / REVIEW TERMS', '같은 이름보다, 같은 의미를 찾으세요.', 'DB 코멘트와 소스의 실제 사용처를 함께 보고, 프로젝트 표준 후보를 사람이 선택합니다.', nextButton('mapping', '변환 설계 보기')) + `
    <div class="stats"><div class="stat">검토할 컬럼<strong>6</strong><small>이름만으로 자동 확정하지 않음</small></div><div class="stat">검토 완료<strong class="text-accent"><span id="review-count">${count()}</span> <span class="text-base text-muted">/ 6</span></strong><small>의미 결정 초안 · 실제 원장 확정 아님</small></div><div class="stat">의미 확인 필요<strong>2</strong><small>업무 담당자의 판단이 필요한 후보</small></div><div class="stat">미확정 용어<strong>1</strong><small>표준 등록 요청 또는 외부 보관</small></div></div>
    ${state.archived ? '<div class="callout good mb-5">읽기 전용으로 보관한 예시입니다. 다시 체험하려면 예시 초기화를 선택하세요.</div>' : ''}
    <div class="workspace"><section class="panel"><div class="panel-head"><h2>컬럼 검토함</h2><span class="text-xs text-muted">후보·근거는 모두 합성 예시</span></div><div class="toolbar"><button class="filter" data-filter="all" aria-pressed="${state.filter === 'all'}">전체 6</button><button class="filter" data-filter="pending" aria-pressed="${state.filter === 'pending'}">미검토 ${6-count()}</button><button class="filter" data-filter="conflict" aria-pressed="${state.filter === 'conflict'}">의미 확인 3</button><label class="w-full"><span class="sr-only">컬럼 검색</span><input class="input mt-1" id="column-search" placeholder="컬럼명·테이블·설명 검색" value="${escape(state.search)}"></label></div><div class="table-wrap"><table><caption class="sr-only">레거시 컬럼과 표준 용어 후보</caption><thead><tr><th scope="col">레거시 컬럼</th><th scope="col">표준 후보</th><th scope="col">검토 상태</th></tr></thead><tbody id="column-rows">${tableRows()}</tbody></table></div><div class="border-t border-line p-4 text-xs text-muted">EXACT 일치 · SYNONYM 동의어 · INFERRED 추정 · UNKNOWN 미확정<br>등급은 판단 근거이며 자동 승인 점수가 아닙니다.</div></section>
    <section class="panel" aria-labelledby="detail-title"><div class="panel-head"><div><span class="text-xs text-muted">${row.table} / 컬럼 상세</span><h2 id="detail-title">${row.id} <span class="ml-2 text-sm font-normal text-muted">${row.label}</span></h2></div>${badge(row.grade, row.ambiguous ? 'warn' : 'info')}</div><div class="panel-body"><h3 class="mb-3">이 용어를 제안하는 근거</h3>${evidenceCards(row)}<div class="callout text-xs"><strong>대상 업무: ${row.target}</strong><p class="mt-1 text-muted">표준 용어·도메인·타입·길이와 실제 대상 컬럼은 live 사전·대상 계약을 조회한 뒤 대조합니다.</p></div><h3 class="mt-5 mb-3">${row.candidates.length ? '표준 후보 선택' : '미확정 컬럼 처리'}</h3>
    ${row.candidates.length ? row.candidates.map((candidate, i) => `<label class="candidate"><input type="radio" name="candidate" value="${i}" ${i === choice ? 'checked' : ''} ${disabled(locked())}><span><strong>${candidate}</strong><span class="subtext">${i === 0 ? '근거 기반 추천 예시' : '다른 업무 의미로 해석할 때'} · 현행 표준 사전 대조 전</span></span></label>`).join('') : unresolvedFields(row)}
    <label class="field mt-4">검토 근거 <span class="sr-only">필수</span><textarea class="input" id="review-note" rows="2" placeholder="선택한 업무 의미 또는 보관 사유를 적어 주세요." ${disabled(locked())}>${escape(note)}</textarea></label><p class="mt-2 text-xs text-muted">원시 값·개인정보를 입력하지 마세요. 이 예시의 검토자는 ‘업무 담당자(예시)’입니다.</p></div>
    <div class="review-actions"><button class="button primary" data-action="save-review" ${disabled(locked())}>의미 검토 저장</button><button class="button quiet" data-action="next-row">다음 컬럼 →</button><span class="text-xs text-muted">저장 후 자동으로 다음 미검토 컬럼</span></div></section></div>`;
  }
  function mappingPage() {
    return title('04 / TRANSFORM', '의미가 정해졌다면, 변환을 검토하세요.', '이름 변경뿐 아니라 코드 값·일자·키 관계·예외 처리까지 함께 설계합니다.', nextButton('rehearse', '리허설 준비')) + `
    <div class="callout mb-5">검토 초안 ${count()}/6건 · 버전 ${state.revision} · <strong>실제 CONFIRMED 승격은 live 표준·대상 스키마·전수 적합성 검증 후 가능합니다.</strong></div>
    ${state.mode === 'ddl' ? '<div class="callout warn mb-5">스키마 검토 모드: 아래 변환은 가상의 설계 예시입니다. 실제 값이 없어 위반 건수·코드 분포가 미측정이며 변환 검토를 확정할 수 없습니다.</div>' : ''}
    <div class="grid-cards"><section class="panel"><div class="panel-head"><h2>변환 규칙 검토</h2>${badge('정책 선택 예시', 'info')}</div><div class="panel-body">
      <div class="flow mb-4"><div class="flow-box">USE_YN<br><strong>1 / 0</strong></div><span aria-hidden="true">→</span><div class="flow-box">사용여부<br><strong>Y / N</strong></div></div>
      ${[['code', '코드 변환 확인', '1 → Y, 0 → N. 그 외 값은 조용히 기본값으로 바꾸지 않고 중단합니다.'], ['date', state.mode === 'ddl' ? '일자 오류 · 건수 미측정' : '일자 오류 2건의 격리 승인 예시', state.mode === 'ddl' ? '전체 값 프로파일 후 위반 유형·건수·처리 방법을 검토합니다.' : '잘못된 일자만 최대 2건 격리. 상한 초과·다른 오류는 중단하며 원천 12,480 = 적재 12,478 + 격리 2로 대사합니다.'], ['organization', '조직 키 대응과 적재 순서 확인', '조직 → 사용자 → 문서. 구키/신키 대응은 기존 keymap에 보존하고 FK·코드 의미를 대사합니다.']].map(([key, label, desc]) => `<label class="check-row"><input type="checkbox" data-rule="${key}" ${state.rules[key] ? 'checked' : ''} ${disabled(locked() || state.mode === 'ddl')}><span><strong>${label}</strong><span class="subtext">${desc}</span></span></label>`).join('')}</div></section>
    <section class="panel"><div class="panel-head"><h2>변경 영향과 누락 방지</h2></div><div class="panel-body space-y-4"><div class="callout warn"><strong>입력 또는 매핑이 바뀌면 재검토</strong><p class="mt-2">소스·대상·원장·매핑·실행 계약이 바뀌면 이전 계획과 승인은 재사용할 수 없습니다. 이 화면도 변경 시 리허설 상태를 초기화합니다.</p></div><details><summary class="font-semibold">분할·조인 및 비데이터 항목</summary><ul class="mt-3 list-disc space-y-2 pl-5 text-muted"><li>1:N 분할과 제한된 lookup 조인은 별도 매핑 편집 화면으로 확장</li><li>메뉴·권한·첨부 파일·비밀번호·프로시저는 별도 인수 항목</li><li>새 테이블 DDL은 DB 거버넌스와 Flyway 절차로 처리</li></ul></details><details><summary class="font-semibold">검토 변경 이력 · 예시</summary><ul class="mt-3 space-y-2 text-xs text-muted">${state.history.length ? state.history.slice(0,8).map(item => `<li>${escape(item)}</li>`).join('') : '<li>아직 변경한 항목이 없습니다.</li>'}</ul></details><button class="button" data-action="drift" ${disabled(locked())}>원천 변경 감지 예시</button><p class="text-xs text-muted">원천 변경을 감지하면 의미 검토와 리허설을 다시 요구하는 상태를 체험합니다.</p></div></section></div>`;
  }
  function rehearsePage() {
    const blockers = blocked();
    const allChecks = ['snapshot','freeze','identity','review'].every(key => state.checks[key]);
    return title('05 / REHEARSE & CUTOVER', '여러 번 연습하고, 한 번 전환하세요.', 'DRY_RUN 통과와 실제 적재, 최종 업무 인수는 서로 다른 완료 조건입니다.') + `
    <div class="grid-cards"><section class="panel"><div class="panel-head"><h2>01. 리허설</h2>${badge(state.dryRun ? '모의 DRY_RUN PASS' : '준비 확인', state.dryRun ? 'good' : 'warn')}</div><div class="panel-body space-y-4">${blockers.length ? `<div class="callout warn"><strong>먼저 해결할 항목 ${blockers.length}개</strong><ul class="mt-2 list-disc space-y-2 pl-5">${blockers.map(item => `<li>${item}</li>`).join('')}</ul></div>` : '<div class="callout good">이 시뮬레이션의 검토 조건이 충족되었습니다. 실제 실행 자격이나 운영 승인 증거는 아닙니다.</div>'}<button class="button primary" data-action="dry-run" ${disabled(blockers.length > 0 || locked())}>리허설 시뮬레이션</button><p class="text-xs text-muted">실제 구현: mapping-generate → plan → validate → load dry-run. 기술 PASS 후에도 기관의 실행 승인과 대상 확인이 필요합니다.</p></div></section>
    <section class="panel"><div class="panel-head"><h2>02. 최종 전환 준비</h2>${badge(state.execution === 'idle' ? '검토 중' : state.execution === 'done' ? '모의 적재 완료' : state.execution === 'paused' ? '중단 지점 보존' : '모의 진행 중', state.execution === 'done' ? 'good' : 'neutral')}</div><div class="panel-body">
    ${[['snapshot', '백업·복구 리허설 확인', '앞서 커밋한 청크는 남습니다. 전체 복구는 별도 백업 복원 절차입니다.'], ['freeze', '원천 쓰기 동결과 전환 시간 확인', '수집 이후 바뀐 데이터를 누락하지 않도록 최종 snapshot과 중단 시간을 합의합니다.'], ['identity', '원천·대상·실행 계획 재확인', 'fingerprint와 digest, 승인 유효기간을 최종 실행 직전 대조합니다.'], ['review', '업무 담당자와 실행 승인 확인', '예시 승인입니다. 실제 권한·분리 검토는 실행기에서 검증해야 합니다.']].map(([key, label, desc]) => `<label class="check-row"><input type="checkbox" data-check="${key}" ${state.checks[key] ? 'checked' : ''} ${disabled(!state.dryRun || locked())}><span><strong>${label}</strong><span class="subtext">${desc}</span></span></label>`).join('')}
    <button class="button primary mt-4" data-action="cutover" ${disabled(!state.dryRun || !allChecks || blockers.length || locked())}>최종 전환 모의 실행</button></div></section></div>
    ${state.execution !== 'idle' ? progressPanel() : ''}`;
  }
  function progressPanel() {
    const status = state.execution === 'done' ? 'PASS · 업무 인수 대기' : state.execution === 'failed' ? '청크 실패 예시' : state.execution === 'paused' ? '일시 중단' : '모의 실행 중';
    const explanation = state.execution === 'failed' ? '일시적 연결 오류를 가정했습니다. 실패 청크는 롤백하고 이전 커밋은 보존합니다. 원인 해결·실행 계약 재확인 후 체크포인트부터 재개합니다.' : '체크포인트 이후부터 재개합니다. 버튼을 누를 때마다 합성 청크 1개가 진행됩니다.';
    const controls = state.execution === 'running' ? '<button class="button primary" data-action="chunk">다음 청크 모의 처리</button><button class="button" data-action="pause">일시 중단 예시</button><button class="button" data-action="fail">청크 실패 예시</button>' : ['paused', 'failed'].includes(state.execution) ? `<button class="button primary" data-action="resume">${state.execution === 'failed' ? '원인 해결 후 재개 예시' : '체크포인트부터 재개'}</button>` : nextButton('report', '대사·인수 결과 보기');
    return `<section class="panel mt-5"><div class="panel-head"><h2>청크 진행 · 합성 실행</h2>${badge(status, state.execution === 'done' ? 'good' : 'info')}</div><div class="panel-body"><p class="mb-3"><strong>${Math.min(state.chunk * 4160, 12478).toLocaleString('ko-KR')}</strong> / 12,478건 · 격리 예정 2건</p><progress class="h-3 w-full accent-accent" max="3" value="${state.chunk}" aria-label="모의 청크 진행률"></progress><p class="mt-3 text-muted">${explanation}</p><div class="mt-4 flex flex-wrap gap-2">${controls}</div></div></section>`;
  }
  function reportPage() {
    const done = state.execution === 'done';
    const accepted = ['business','nondata','revoke','retain'].every(key => state.acceptance[key]);
    return title('06 / RECONCILE & ARCHIVE', '데이터가 옮겨져도, 확인은 남습니다.', '행수와 키 관계를 대사하고 업무 담당자가 인수한 뒤, 작업공간을 읽기 전용으로 보관합니다.') + `
    ${!done ? '<div class="callout warn mb-5">아직 최종 전환 모의 실행을 완료하지 않았습니다. 아래는 결과 항목의 미리보기이며 통과 증거가 아닙니다.</div>' : ''}
    <div class="stats"><div class="stat">원천 행수<strong>${done ? '12,480' : '—'}</strong><small>일관된 snapshot 기준</small></div><div class="stat">적재 행수<strong>${done ? '12,478' : '—'}</strong><small>청크 commit 합계 예시</small></div><div class="stat">승인 예외 격리<strong>${done ? '2' : '—'}</strong><small>잘못된 일자 · 조용히 버리지 않음</small></div><div class="stat">업무 인수<strong>${state.archived ? '보관 완료' : '확인 대기'}</strong><small>적재 PASS와 분리</small></div></div>
    <div class="grid-cards"><section class="panel"><div class="panel-head"><h2>대사 결과</h2>${badge(done ? '합성 결과' : '미실행', done ? 'info' : 'neutral')}</div><div class="panel-body"><div class="check-row">${badge(done ? '일치' : '대기', done ? 'good' : 'neutral')}<span>원천 = 적재 + 격리<br><strong>${done ? '12,480 = 12,478 + 2' : '실행 후 계산'}</strong></span></div><div class="check-row">${badge(done ? '일치' : '대기', done ? 'good' : 'neutral')}<span>고아 FK·중복키·필수값·집계·코드 분포<br><span class="text-muted">합성 시나리오에서 확인할 기술 대사 항목</span></span></div><div class="check-row">${badge('별도 확인', 'warn')}<span>첨부 파일·권한·메뉴·레거시 비밀번호<br><span class="text-muted">데이터 적재만으로 자동 이관되지 않습니다.</span></span></div><button class="button mt-4" data-action="export">검토·결과 예시 JSON 다운로드</button><p class="mt-3 text-xs text-muted">다운로드는 simulationOnly=true인 검토 예시입니다. 실제 CLI에 입력할 수 있는 원장이나 실행 승인서가 아닙니다.</p></div></section>
    <section class="panel"><div class="panel-head"><h2>작업 종료 체크리스트</h2>${state.archived ? badge('읽기 전용 보관', 'good') : badge('인수 후 종료')}</div><div class="panel-body">${[['business', '업무 담당자 인수 확인', '코드 의미와 핵심 업무 조회·처리 결과를 확인합니다.'], ['nondata', '비데이터 항목 처리 확인', '첨부 실물·접근 권한·메뉴 등 별도 이관의 증거를 연결합니다.'], ['revoke', '연결 계정·일시 권한 회수 계획', '실행기를 종료하고 잔여 접근을 정리합니다.'], ['retain', '원장·증거·키 대응 보존 확인', '보존 기한 전 keymap 자동 삭제 금지. 덤프와 격리 자료는 통제된 저장소에서 보관합니다.']].map(([key, label, desc]) => `<label class="check-row"><input type="checkbox" data-acceptance="${key}" ${state.acceptance[key] ? 'checked' : ''} ${disabled(!done || state.archived)}><span><strong>${label}</strong><span class="subtext">${desc}</span></span></label>`).join('')}<button class="button primary mt-4" data-action="archive" ${disabled(!done || !accepted || state.archived)}>읽기 전용 보관으로 종료</button></div></section></div>`;
  }
  function saveReview() {
    if (locked()) return;
    const row = rows.find(item => item.id === state.selected);
    const note = $('#review-note').value.trim();
    if (!note) { notify('검토 근거를 입력하세요. 의미 확인과 보관 사유가 필요합니다.'); $('#review-note').focus(); return; }
    if (!row.candidates.length) {
      if ($('#disposition').value === 'archive' && (!state.retention || state.retention <= '2026-10-24')) { notify('예시 기준일(2026-10-24) 이후의 보존 기한을 선택하세요.'); $('#retention').focus(); return; }
      state.dispositions[row.id] = $('#disposition').value;
    }
    state.notes[row.id] = note; state.reviewed[row.id] = true;
    invalidate(`${row.id} 의미 검토 저장 · 업무 담당자(예시)`);
    const next = rows.find(item => !state.reviewed[item.id]);
    if (next) state.selected = next.id;
    render(); notify(`${row.id} 검토 초안을 저장했습니다. ${count()}/6건 완료.`);
    if (next) $('#detail-title').setAttribute('tabindex','-1'), $('#detail-title').focus();
  }
  function changeMode(mode) {
    const apply = () => { state = { ...initial(), mode, connected: false, collected: false, scanned: state.scanned }; render(); notify('입력 경로가 바뀌어 기존 검토를 초기화했습니다.'); };
    if (count() || state.dryRun) { render(); ask('입력 경로를 바꿀까요?', '이 예시의 기존 검토와 리허설 결과가 초기화됩니다.', '경로 변경', apply); } else apply();
  }
  function exportExample() {
    const example = { kind: 'migration-workspace-ux-example', simulationOnly: true, executableLedger: false, schemaVersion: 1, exampleDate: '2026-10-24',
      sourceMode: state.mode, revision: state.revision, reviews: rows.map(row => ({ syntheticSource: `${row.table}.${row.id}`, candidate: row.candidates[state.choices[row.id] || 0] || null, reviewed: Boolean(state.reviewed[row.id]), disposition: state.dispositions[row.id] || null, note: state.notes[row.id] || '', retentionUntil: state.dispositions[row.id] === 'archive' ? state.retention : null })),
      rehearsal: state.dryRun, execution: state.execution, reconciliation: state.execution === 'done' ? { source: 12480, loaded: 12478, quarantined: 2 } : null, archived: state.archived };
    const url = URL.createObjectURL(new Blob([JSON.stringify(example, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'migration-review-simulation.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify('합성 검토 예시를 다운로드했습니다. 실제 실행 원장이 아닙니다.');
  }
  document.addEventListener('click', event => {
    const target = event.target.closest('button, a.brand'); if (!target || target.disabled) return;
    if (target.dataset.goto) return goto(target.dataset.goto);
    if (target.matches('a.brand')) { event.preventDefault(); return goto('terms'); }
    if (target.dataset.row) { state.selected = target.dataset.row; render(); return; }
    if (target.dataset.filter) { state.filter = target.dataset.filter; render(); return; }
    const actions = {
      reset: () => ask('예시를 초기화할까요?', '이 브라우저 화면에서 선택한 검토·리허설 상태가 초기화됩니다. 다운로드한 파일은 그대로 남습니다.', '초기화', () => { state = initial(); goto('terms'); notify('처음의 합성 시나리오로 돌아왔습니다.'); }),
      'cancel-dialog': () => $('#confirm-dialog').close(), export: exportExample,
      connect: () => { if (locked()) return; state.connected = true; state.collected = false; invalidate('연결 프로필 예시 재확인'); render(); },
      'connect-error': () => { if (locked()) return; state.connected = false; state.collected = false; invalidate('연결 권한 부족 예시'); render(); },
      schema: () => { if (locked()) return; state.connected = true; render(); notify('합성 스키마를 선택했습니다. 실제 파일을 읽지 않았습니다.'); },
      source: () => { if (locked()) return; state.scanned = true; state.reviewed = {}; invalidate('소스 근거 예시 추가'); render(); },
      'no-source': () => { if (locked()) return; state.scanned = false; state.reviewed = {}; invalidate('소스 미제공 상태로 변경'); render(); },
      analyze: () => { if (locked() || !state.connected) return; state.collected = true; goto('analyze'); notify('합성 자료 분석 결과를 표시했습니다.'); },
      'save-review': saveReview,
      'next-row': () => { state.selected = rows[(rows.findIndex(row => row.id === state.selected) + 1) % rows.length].id; render(); },
      drift: () => { if (locked()) return; ask('원천 변경 상황을 체험할까요?', '스키마나 소스가 변경된 상황을 가정합니다. 검토 초안과 리허설을 다시 요구합니다.', '변경 상황 적용', () => { state.reviewed = {}; invalidate('원천 fingerprint 변경 감지 예시'); render(); notify('변경 감지: 재검토가 필요합니다.'); }); },
      'dry-run': () => { if (blocked().length || locked()) return; state.dryRun = true; render(); notify('모의 DRY_RUN PASS. 실제 데이터 적재나 운영 승인이 아닙니다.'); },
      cutover: () => { if (blocked().length || !state.dryRun || locked() || !['snapshot','freeze','identity','review'].every(key => state.checks[key])) return;
        ask('최종 전환을 모의 실행할까요?', '합성 데이터 12,480건 중 12,478건 적재, 승인 예외 2건 격리를 가정합니다. 실제 DB 작업은 발생하지 않습니다.', '모의 실행 시작', () => { state.execution = 'running'; render(); }); },
      chunk: () => { if (state.execution !== 'running') return; state.chunk++; if (state.chunk === 3) state.execution = 'done'; render(); notify(state.execution === 'done' ? '모의 적재 완료. 대사·업무 인수를 확인하세요.' : '합성 청크를 처리하고 체크포인트를 기록했습니다.'); },
      pause: () => { if (state.execution !== 'running') return; state.execution = 'paused'; render(); },
      fail: () => { if (state.execution !== 'running') return; state.execution = 'failed'; render(); },
      resume: () => { if (!['paused', 'failed'].includes(state.execution)) return; state.execution = 'running'; render(); },
      archive: () => { if (state.execution !== 'done' || !['business','nondata','revoke','retain'].every(key => state.acceptance[key]) || state.archived) return;
        ask('작업공간을 읽기 전용으로 보관할까요?', '예시의 검토·실행 버튼이 잠깁니다. 원장·keymap·DB·파일은 삭제하지 않습니다.', '읽기 전용 보관', () => { state.archived = true; render(); notify('모의 인수가 끝나 읽기 전용으로 전환했습니다.'); }); },
    };
    actions[target.dataset.action]?.();
  });
  $('#dialog-accept').addEventListener('click', () => { $('#confirm-dialog').close(); dialogAction?.(); });
  document.addEventListener('input', event => {
    const input = event.target;
    if (input.id === 'column-search') { state.search = input.value; $('#column-rows').innerHTML = tableRows(); }
    if (input.id === 'review-note') { if (locked()) return; state.notes[state.selected] = input.value; if (state.reviewed[state.selected]) { delete state.reviewed[state.selected]; invalidate('검토 근거 수정'); $('#review-count').textContent = count(); $('[data-filter="pending"]').textContent = `미검토 ${6-count()}`; $('#column-rows').innerHTML = tableRows(); } }
  });
  document.addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'source-mode' && !locked()) return changeMode(input.value);
    if (input.name === 'candidate' && !locked()) { state.choices[state.selected] = Number(input.value); state.notes[state.selected] = ''; delete state.reviewed[state.selected]; invalidate(`${state.selected} 표준 후보 변경`); render(); }
    if (input.id === 'disposition' && !locked()) { state.dispositions[state.selected] = input.value; delete state.reviewed[state.selected]; invalidate('미확정 컬럼 처리 변경'); render(); }
    if (input.id === 'retention' && !locked()) { state.retention = input.value; delete state.reviewed[state.selected]; invalidate('보존 기한 변경'); render(); }
    if (input.dataset.rule && !locked() && state.mode !== 'ddl') { state.rules[input.dataset.rule] = input.checked; invalidate('변환 규칙 검토 변경', true); render(); }
    if (input.dataset.check && state.dryRun && !locked()) { state.checks[input.dataset.check] = input.checked; render(); }
    if (input.dataset.acceptance && state.execution === 'done' && !state.archived) { state.acceptance[input.dataset.acceptance] = input.checked; render(); }
  });
  window.addEventListener('hashchange', () => { const key = location.hash.slice(1); if (stages.some(([name]) => name === key)) { stage = key; render(); } });
  render();
})();
