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
  const dbProfiles = {
    postgres: { name: 'PostgreSQL', port: '5432', driver: 'org.postgresql.Driver', database: 'legacy', schema: 'public', tls: 'verify-full', support: '번들 드라이버 · EXPERIMENTAL' },
    oracle: { name: 'Oracle', port: '1521', driver: 'oracle.jdbc.OracleDriver', database: 'LEGACYPDB', schema: 'LEGACY_OWNER', tls: 'TCPS + 서버 인증서 검증', support: '외부 JDBC JAR 필요 · UNVERIFIED' },
    sqlserver: { name: 'SQL Server', port: '1433', driver: 'com.microsoft.sqlserver.jdbc.SQLServerDriver', database: 'legacy', schema: 'dbo', tls: 'encrypt=true / trustServerCertificate=false', support: '외부 JDBC JAR 필요 · UNVERIFIED' },
    mysql: { name: 'MySQL', port: '3306', driver: 'com.mysql.cj.jdbc.Driver', database: 'legacy', schema: 'legacy', tls: 'VERIFY_IDENTITY', support: '외부 JDBC JAR 필요 · UNVERIFIED' },
    mariadb: { name: 'MariaDB', port: '3306', driver: 'org.mariadb.jdbc.Driver', database: 'legacy', schema: 'legacy', tls: 'verify-full', support: '외부 JDBC JAR 필요 · UNVERIFIED' },
  };
  const defaultDb = vendor => ({ vendor, method: vendor === 'oracle' ? 'service' : 'port', route: 'direct', auth: 'password', tls: 'verify', failure: 'none' });
  const initialAi = () => ({ provider: 'codex', route: 'oauth', status: 'disconnected', open: false, helpStage: null, helpIndex: 0, previewKey: null, consentKey: null, result: null, undo: null, scenario: 'success', error: '', requests: 0, budget: 5, drafts: [] });
  const initialGuided = () => ({ phase: 'intro', status: 'idle', step: 0, generation: 0, approved: false, profileReady: false, detail: '', scenario: 'normal', permissionResolved: false, answer: '', applying: false, messages: [] });
  const initial = () => ({ mode: 'db', intakeTab: 'connection', db: defaultDb('postgres'), diagnosis: 'pass',
    ai: initialAi(),
    guided: initialGuided(), lastManual: 'collect',
    sourceKind: 'folder', sourcePhase: 'done', archiveCase: 'normal', sourceRoot: 'all', sourceEncoding: 'auto',
    connected: true, scanned: true, collected: true, selected: 'USER_NM', filter: 'all', search: '',
    choices: {}, notes: {}, reviewed: {}, dispositions: {}, retention: '2027-10-24', rules: {}, checks: {}, dryRun: false, execution: 'idle', chunk: 0, acceptance: {}, archived: false, revision: 1, history: [] });
  let state = initial();
  // 주소의 # 값은 알려진 화면 이름 상수로만 바꿔 쓴다 — 주소 문자열 자체를 화면 상태로 들고 다니지 않는다.
  const stageFromHash = () => {
    const key = location.hash.slice(1);
    return ['start', 'assistant', 'guided', ...stages.map(([name]) => name)].find(name => name === key);
  };
  let stage = stageFromHash() ?? 'start';
  if (stages.some(([key]) => key === stage)) state.lastManual = stage;
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
    if ((state.guided.approved || state.guided.phase === 'review') && !state.guided.applying) { state.guided.approved = false; state.guided.status = 'stale'; state.guided.phase = 'plan'; state.guided.step = 0; state.guided.answer = ''; state.guided.generation++; }
  }
  function setNavigation(open) {
    $('#assistant').classList.toggle('is-open', open);
    $('#navigation-toggle').setAttribute('aria-expanded', String(open));
  }
  function goto(next) {
    if (stage === 'guided' && next !== 'guided' && state.guided.status === 'running') { state.guided.status = 'paused'; state.guided.generation++; }
    if (stages.some(([key]) => key === next)) state.lastManual = next;
    setNavigation(false);
    stage = next; history.replaceState(null, '', `#${next}`); render(); $('#main').focus();
  }
  const title = (eyebrow, heading, description, extra = '') => `<div class="page-title"><div><span class="eyebrow">${eyebrow}</span><h1>${heading}</h1><div class="title-accent" aria-hidden="true"><span></span></div><p>${description}</p></div>${extra}</div>`;
  const badge = (text, tone = 'neutral') => `<span class="pill ${tone}">${text}</span>`;
  const nextButton = (key, label) => `<button class="button primary" data-goto="${key}">${label} <span aria-hidden="true">→</span></button>`;
  const locked = () => state.archived || state.execution !== 'idle';
  const disabled = condition => condition ? 'disabled' : '';
  function focusSelector(element) {
    if (!element || element === document.body) return null;
    if (element.id) return `#${CSS.escape(element.id)}`;
    if (element.name) return `[name="${CSS.escape(element.name)}"][value="${CSS.escape(element.value)}"]`;
    for (const key of ['goto', 'row', 'filter', 'rule', 'check', 'acceptance', 'action', 'intakeTab', 'aiHelp']) {
      if (element.dataset[key]) return `[data-${key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}="${CSS.escape(element.dataset[key])}"]`;
    }
    return null;
  }
  function render() {
    const focus = focusSelector(document.activeElement);
    $('#steps').innerHTML = stages.map(([key, label], i) => `<button class="step" data-goto="${key}" ${stage === key ? 'aria-current="step"' : ''}><span class="step-num">${String(i + 1).padStart(2, '0')}</span>${label}</button>`).join('');
    $('#lifecycle').textContent = state.archived ? '읽기 전용 보관 · 예시' : state.execution === 'done' ? '인수 대기 · 예시' : state.execution === 'running' ? '모의 전환 진행 중' : ['paused', 'failed'].includes(state.execution) ? '중단 지점 보존 · 예시' : '검토 중 · 합성 시나리오';
    $('#ai-nav').setAttribute('aria-current', stage === 'assistant' ? 'page' : 'false');
    $('#ai-nav-status').textContent = state.ai.status === 'ready' ? '예시 연결됨' : state.ai.status === 'expired' ? '재인증 필요' : '선택 연결';
    $('#main').innerHTML = stage === 'start' ? startPage() : modeSwitch() + (stage === 'guided' ? guidedPage() : stage === 'assistant' ? assistantPage() : aiQuickHelp() + aiPanel() + manualPage(stage));
    const conversation = $('.guided-conversation');
    if (conversation) conversation.scrollTop = conversation.scrollHeight;
    if (focus) ($(focus) || (stage === 'guided' ? $('#guided-question') : null))?.focus({ preventScroll: true });
  }
  function modeSwitch() {
    return `<nav class="mode-switch" aria-label="이관 진행 방식"><div><strong>진행 방식</strong><span>같은 입력·검토 상태를 이어 씁니다.</span></div><div class="flex flex-wrap gap-2"><button class="button" data-goto="${state.lastManual}" aria-pressed="${stage!=='guided'}">직접 설정</button><button class="button" data-goto="guided" aria-pressed="${stage==='guided'}">AI와 대화하며 진행</button></div></nav>`;
  }
  function startPage() {
    return title('INDEPENDENT MIGRATION WORKSPACE', '이관을 준비하는 방법을 선택하세요.', '필요한 기간에만 여는 독립 작업공간입니다. 직접 설정하거나 AI와 대화하는 흐름을 체험하고, 진행 중에도 방식을 바꿀 수 있습니다.') + `
      <div class="field-grid">
        <section class="entry-card"><div class="entry-heading"><span class="entry-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h9m4 0h3M4 17h3m4 0h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/></svg></span>${badge('단계별 입력')}</div><h2>직접 설정</h2><p>접속 조건과 소스 범위를 직접 정하고, 근거를 비교하며 표준 용어와 변환 정책을 선택합니다.</p><ul><li>DBMS별 연결 설정과 연결 오류 진단</li><li>폴더·ZIP 준비, 소스 사용처 확인</li><li>용어 검토 → 변환 설계 → 리허설 → 대사</li></ul><div class="entry-action"><button class="button" data-goto="collect">직접 설정으로 시작 <span aria-hidden="true">→</span></button><p class="mt-3 text-xs text-muted">기존 예시 입력과 검토 내용을 이어 씁니다.</p></div></section>
        <section class="entry-card ai-entry"><div class="entry-heading"><span class="entry-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3ZM20 2v4m-2-2h4"/></svg></span>${badge('필요한 정보만 질문','info')}</div><h2>AI와 대화하며 진행</h2><p>준비한 정보를 재사용하고, 부족한 연결 조건과 판단이 필요한 업무 의미에 답하며 진행합니다.</p><ul><li>질문에 답하며 연결 프로필 준비</li><li>확인한 범위의 읽기 작업을 모의 자동 진행</li><li>오류·모호한 의미에서 질문하고 검토 초안 전달</li></ul><div class="entry-action"><button class="button primary" data-goto="guided">AI 안내로 시작 <span aria-hidden="true">→</span></button><p class="mt-3 text-xs text-muted">계정 연결 없이 합성 대화 예시를 체험할 수 있습니다.</p></div></section>
      </div>
      <section class="panel mt-6"><div class="panel-head"><h2>최종 이관까지 한 작업공간에서</h2>${badge(state.archived?'보관 완료 · 예시':`용어 검토 ${count()}/6건`,state.archived?'good':'neutral')}</div><div class="panel-body"><div class="field-grid"><div><strong>준비·리허설은 반복하고, 최종 전환 후 보관합니다.</strong><p class="mt-2 text-muted">같은 입력·용어 초안·검토 결과를 두 진행 방식에서 공유합니다. 입력을 바꾸면 영향을 받는 검증과 실행 계획을 다시 확인합니다.</p></div><div><strong>이관 완료 후에는 결과를 남깁니다.</strong><p class="mt-2 text-muted">실제 구현은 인수 확인 후 실행기를 종료하고, 보고서와 원장을 보관하는 구성을 권장합니다. 업무 서비스에는 필요할 때 결과 조회 링크를 둡니다.</p></div></div><button class="button mt-4" data-goto="report">현재 대사·보관 상태 보기</button></div></section>
      <div class="callout mt-6"><strong>이 화면은 동작을 검토하기 위한 시뮬레이션입니다.</strong><p class="mt-2">접속정보·파일·AI 답변은 합성 예시입니다. 실제 자격증명을 입력하지 않으며, DB 연결·소스 분석·외부 AI 호출·적재는 실행하지 않습니다. 새로고침하면 화면의 진행 상태가 초기화됩니다.</p></div>`;
  }
  const guidedTasks = ['연결·인증서·읽기 권한 진단','선택 스키마의 구조 수집','준비한 소스의 근거 분석','용어 후보와 확인 질문 준비'];
  function guidedTargetLabel() { return state.db.vendor==='oracle'?'Service name / SID / TNS와 Owner':state.db.vendor==='sqlserver'?'Database와 Schema / Instance':'Database와 조사 범위'; }
  function guidedSay(role, text) { state.guided.messages.push({role,text}); }
  function guidedPage() {
    const g=state.guided, p=dbProfiles[state.db.vendor];
    const readySource=state.scanned || ['ready','done'].includes(state.sourcePhase);
    const phaseTitles={intro:'어디서부터 이어갈까요?',profile:'접속정보는 로컬 보안 입력으로 준비해 주세요.',detail:`${guidedTargetLabel()}만 확인하면 됩니다.`,plan:'이 범위 안에서 읽기 작업을 이어서 진행하겠습니다.',permission:'조회 권한 확인이 필요해 잠시 멈췄습니다.',source:'분석할 소스를 먼저 준비해 주세요.',meaning:'한 가지 업무 의미를 확인해 주세요.',review:'검토할 초안이 준비되었습니다.'};
    return title('GUIDED MIGRATION / SIMULATION', '필요한 것만 답하면, 다음 작업을 이어갑니다.', '목표: 레거시 DB와 소스 분석부터 표준화 검토 초안까지 준비. 질문·도구 실행은 모의 동작이며 실제 접속정보를 받거나 DB에 연결하지 않습니다.')+`
      <div class="guided-layout"><section class="panel"><div class="panel-head"><h2>AI와 이관 준비</h2>${badge(g.status==='running'?'모의 작업 진행 중':g.status==='paused'?'일시 중단':g.status==='stale'?'입력 변경 · 계획 재확인':'필요한 정보 확인',g.status==='running'?'good':'info')}</div><div class="panel-body space-y-4">
      <div class="guided-conversation" role="region" aria-label="진행 대화 기록" tabindex="0"><div class="guided-message"><strong>AI 도우미 · 대화 예시</strong><p>직접 설정한 ${p.name} 연결 조건과 ${state.sourceKind==='zip'?'ZIP':'폴더'} 준비 상태를 이어받았습니다. 비밀번호를 대화에 적을 필요는 없습니다. 확인한 읽기 작업은 계속 진행하고, 빠진 정보나 업무 판단이 필요한 때 질문하겠습니다.</p></div>
      ${g.messages.slice(-6).map(m=>`<div class="guided-message ${m.role==='user'?'user':''}"><strong>${m.role==='user'?'내 답변':'AI 도우미 · 모의 진행'}</strong><p>${escape(m.text)}</p></div>`).join('')}
      </div>
      <section id="guided-question" class="guided-question" tabindex="-1" aria-labelledby="guided-question-title"><span class="eyebrow">${g.status==='running'?'WORKING':'NEXT STEP'}</span><h3 id="guided-question-title">${g.status==='running'?'확인된 계획에 따라 로컬 도구를 실행하는 예시입니다.':g.phase==='connection'?'연결 진단에 실패해 멈췄습니다.':phaseTitles[g.phase]}</h3>
      ${g.phase==='intro'?`<p class="mt-2 text-muted">현재 입력: ${p.name} / ${state.connected?'연결 진단 예시 있음':'연결 재확인 필요'} / ${readySource?'소스 준비 예시 있음':'소스 준비 필요'}. 기존 검토 ${count()}/6건은 모드 전환만으로 바뀌지 않습니다.</p><div class="mt-4 flex flex-wrap gap-2"><button class="button primary" data-action="guided-reuse">현재 입력으로 이어가기</button><button class="button" data-action="guided-configure">질문에 답하며 연결 준비</button></div>`:''}
      ${g.phase==='profile'?`<div class="field-grid mt-4">${selectField('db-vendor','원천 DBMS',state.db.vendor,Object.entries(dbProfiles).map(([key,item])=>[key,item.name]))}${sampleField('로컬 프로필 · 합성 예시',`${p.name} / legacy-readonly`)}</div><div class="callout mt-4"><strong>보안 입력창에서만 다루는 항목</strong><p class="mt-2 text-xs">호스트·포트·DB 계정·비밀번호·인증서. 실제 구현은 로컬 실행기/OS 비밀 저장소가 보관하고, 대화 기록과 외부 모델에는 보내지 않습니다.</p><div class="field-grid mt-3">${sampleField('호스트 · 예시', 'legacy-db.example.internal')}${sampleField('포트 · 예시',p.port)}${sampleField('DB 계정 · 예시','legacy_reader')}${sampleField('비밀번호','실제 입력 미제공 · 예시 참조만 준비')}</div></div><button class="button primary mt-4" data-action="guided-profile">로컬 보안 입력 완료 예시</button><p class="mt-2 text-xs text-muted">세부 설정을 직접 바꾸려면 위의 ‘직접 설정’을 사용할 수 있습니다.</p>`:''}
      ${g.phase==='detail'?`<p class="mt-2">${p.name}의 ${guidedTargetLabel()}를 확인해야 잘못된 DB를 조사하지 않습니다. 현재 예시는 <strong>${escape(p.database)} / ${escape(p.schema)}</strong>입니다.</p><div class="mt-4">${selectField('guided-detail','조사 대상 확인',g.detail,[['','선택해 주세요'],['confirmed',`${p.database} / ${p.schema}가 맞습니다`],['unknown','아직 모릅니다 · 확인 방법 보기']])}</div>${g.detail==='unknown'?'<div class="callout mt-3">기존 연결 설정이나 DB 관리자의 접속 명세에서 대상 이름을 확인하세요. 추측해서 연결하지 않습니다. 값을 확인할 때까지 입력과 대화를 유지합니다.</div>':''}<button class="button primary mt-4" data-action="guided-detail" ${disabled(g.detail!=='confirmed')}>이 대상으로 진행</button>`:''}
      ${g.phase==='plan'?`<p class="mt-2">대상은 현재 ${p.name}의 예시 업무 테이블 3개와 선택한 소스 루트입니다. 연결 진단·구조 수집·소스 분석·초안 준비를 묶어 확인합니다. 범위가 같으면 단계마다 다시 묻지 않습니다.</p>${g.status==='stale'?'<div class="callout warn mt-3">직접 설정에서 입력이 바뀌어 이전 계획 확인을 해제했습니다. 변경된 범위를 확인한 뒤 다시 진행하세요.</div>':''}
      ${!['running','paused'].includes(g.status)?`<div class="mt-4">${selectField('guided-scenario','진행 상황 · 예시',g.scenario,[['normal','정상 진행 후 업무 의미 질문'],['permission','조회 권한 부족으로 중단']])}</div>${!g.profileReady?'<p class="mt-3 text-muted">접속 조건이 바뀌었습니다. 로컬 프로필을 다시 확인하세요.</p><button class="button mt-3" data-action="guided-configure">변경된 접속 프로필 확인</button>':''}<button class="button primary mt-4" data-action="guided-start" ${disabled(locked()||!g.profileReady)}>이 범위의 읽기 작업 진행 · 모의</button>`:''}
      ${g.status==='running'?'<button class="button mt-4" data-action="guided-pause">진행 일시 중단</button>':g.status==='paused'?'<button class="button primary mt-4" data-action="guided-resume">확인한 계획에서 이어가기</button>':''}`:''}
      ${g.phase==='permission'?'<p class="mt-2">예시 테이블의 SELECT/메타데이터 조회 권한이 부족합니다. 권한을 자동으로 높이거나 다른 계정으로 재시도하지 않습니다.</p><div class="mt-4 flex flex-wrap gap-2"><button class="button primary" data-action="guided-permission">관리자 확인·조치 완료 예시</button><button class="button" data-action="guided-manual">직접 설정에서 확인</button></div>':''}
      ${g.phase==='connection'?diagnosisPanel()+'<button class="button primary mt-4" data-action="guided-manual">직접 설정에서 연결 조건 확인</button>':''}
      ${g.phase==='source'?'<p class="mt-2">선택·사전 점검·분석 루트 확인을 마친 소스가 필요합니다. 준비 화면에서 처리한 뒤 돌아오면 현재 설정을 이어받습니다.</p><button class="button primary mt-4" data-action="guided-source">소스 준비 화면으로 이동</button>':''}
      ${g.phase==='meaning'?`<p class="mt-2"><code>TB_DOCUMENT.REG_ID</code>: ${state.scanned?'이름만 보면 등록자이지만, 합성 화면·매퍼는 문서 작성자를 가리킵니다.':'선택한 소스 범위에서는 관련 사용처를 확보하지 못했습니다.'} 실제 업무에서는 누구인가요?</p><div class="mt-4">${selectField('guided-answer','업무 담당자의 답변',g.answer,[['','답변을 선택해 주세요'],['author','문서 내용을 작성한 사람'],['registrar','문서를 시스템에 등록한 사람'],['unknown','아직 모릅니다 · 미확정으로 남김']])}</div><p class="mt-3 text-xs text-muted">로컬 분석 근거를 조합한 모의 질문입니다. 소스 원문은 외부 모델에 전송하지 않습니다.</p><button class="button primary mt-4" data-action="guided-answer" ${disabled(!g.answer)}>답변하고 초안 준비</button>`:''}
      ${g.phase==='review'?`<div class="callout good mt-3"><strong>연결·구조·소스 분석의 모의 작업이 끝났습니다.</strong><p class="mt-2">REG_ID: ${g.answer==='author'?'작성자아이디 후보':g.answer==='registrar'?'등록자아이디 후보':'미확정 유지'}. 검토 완료 ${count()}/6건, 실제 적재 0건입니다.</p></div><p class="mt-3">준비한 내용은 직접 설정·검토 화면에서 확인할 수 있습니다. 용어 답변은 초안으로 반영하고, 변환 정책·리허설·최종 전환은 기존 검증 절차에서 확인합니다.</p><button class="button primary mt-4" data-action="guided-handoff" ${disabled(locked()||g.status==='handed-off')}>답변을 검토 초안에 반영하고 이동</button>`:''}
      </section><p class="text-xs text-muted">작업 중 직접 설정으로 전환하면 모의 진행을 멈추고 입력·대화·완료 지점을 보존합니다. 입력 변경은 계획을 다시 확인하도록 합니다.</p></div></section>
      <aside class="panel guided-plan"><div class="panel-head"><h2>실행 계획 · 로컬 모의 도구</h2></div><div class="panel-body"><ol>${guidedTasks.map((task,i)=>`<li class="guided-task"><span class="timeline-dot">${g.step>i?'✓':i+1}</span><div><strong>${task}</strong><small>${g.step>i?'모의 완료':g.step===i&&g.status==='running'?'진행 중':g.step===i&&['permission','source'].includes(g.phase)?'정보 확인 대기':'대기'}</small></div></li>`).join('')}</ol><div class="callout mt-4"><strong>이 계획에서 허용하는 일</strong><p class="mt-2 text-xs">현재 프로필·업무 테이블 3개·선택 소스 루트의 읽기 작업과 검토 초안 준비.</p><p class="mt-3 text-xs">DB 쓰기·DDL·권한 변경·임의 SQL/셸 실행·외부 전송 확대는 포함하지 않습니다. 작업 범위와 실행 자격은 로컬 실행기가 검증하는 설계입니다.</p></div><div class="callout mt-4"><strong>공유 작업공간</strong><p class="mt-2 text-xs">직접 설정과 같은 DBMS·접속 옵션·소스 준비·검토 상태를 사용합니다. 보안 프로필은 모의 참조이며 실제 자격증명은 없습니다.</p></div><button class="button quiet mt-4" data-goto="assistant">AI 계정·전송 설정 보기</button><p class="mt-3 text-xs text-muted">현재는 외부 모델 없이 로컬 상태 전이로 질문·실행을 재현합니다. 실제 에이전트 실행기와 도구 권한 검사는 별도 구현 대상입니다.</p></div></aside></div>`;
  }
  function runGuided() {
    const g=state.guided;
    if(!g.approved||locked()||g.status==='running')return;
    g.status='running';g.phase='plan';const generation=++g.generation;render();
    const advance=()=>{
      if(state.guided!==g||g.generation!==generation||g.status!=='running'||!g.approved)return;
      if(g.step===0&&state.db.failure!=='none'){state.connected=false;state.diagnosis=state.db.failure;g.status='waiting';g.phase='connection';guidedSay('assistant','공유한 연결 조건의 진단에 실패했습니다. 후속 작업을 멈추고 직접 설정에서 원인을 확인합니다.');render();notify('연결 진단에 실패했습니다. 연결 조건을 확인해 주세요.');return;}
      if(g.step===1&&g.scenario==='permission'&&!g.permissionResolved){g.status='waiting';g.phase='permission';guidedSay('assistant','연결 진단은 완료한 예시지만 조사 범위의 읽기 권한이 부족해 멈췄습니다. 필요한 조치만 확인해 주세요.');render();return;}
      if(g.step===2&&!(state.scanned||['ready','done'].includes(state.sourcePhase))){g.status='waiting';g.phase='source';guidedSay('assistant','준비된 소스가 없어 분석을 멈췄습니다. 파일 선택·점검을 완료한 뒤 이어갈 수 있습니다.');render();return;}
      if(g.step===0){state.connected=true;state.diagnosis='pass';}
      if(g.step===1)state.collected=true;
      if(g.step===2){state.scanned=state.sourceRoot==='all';state.sourcePhase='done';}
      guidedSay('assistant',`${guidedTasks[g.step]}: 모의 완료. 실제 DB·파일 작업은 발생하지 않았습니다.`);g.step++;
      if(g.step===4){g.status='waiting';g.phase='meaning';render();notify('업무 의미 확인이 필요합니다. REG_ID의 역할을 선택해 주세요.');return;}
      render();setTimeout(advance,650);
    };setTimeout(advance,650);
  }
  const aiProviders = {
    codex: { name: 'GPT / Codex', short: 'Codex', routes: [['oauth','공식 Codex · ChatGPT 로그인'],['api','OpenAI API · 비밀 참조']], detail: 'Codex app-server가 공식 로그인·토큰 보관·갱신을 담당하는 연동 제안입니다. 작업 화면은 인증 상태만 받습니다. API와 구독의 한도·과금·조직 정책은 별도로 확인합니다.', url: 'https://developers.openai.com/codex/app-server' },
    gemini: { name: 'Gemini', short: 'Gemini', routes: [['oauth','공식 Gemini CLI · Google 로그인'],['api','Gemini API / Vertex AI · 비밀 참조']], detail: '공식 Gemini CLI에 먼저 로그인하고, 기존 인증을 사용하는 headless 경로를 연결하는 제안입니다. 조직 계정의 Cloud project와 무인 실행 조건을 확인합니다.', url: 'https://geminicli.com/docs/get-started/authentication/' },
    claude: { name: 'Claude / Claude Code', short: 'Claude', routes: [['api','Claude API / 공식 클라우드'],['handoff','공식 Claude Code 직접 사용 안내']], detail: '제품 내장은 API를 기본으로 제안합니다. 본인 구독은 변경하지 않은 공식 Claude Code에서 직접 사용할 수 있으나 배포 조건을 확인해야 합니다. 자체 Claude.ai 로그인·구독 토큰 가져오기는 제공하지 않습니다.', url: 'https://code.claude.com/docs/en/legal-and-compliance' },
    none: { name: 'AI 없이 진행', short: '수동', routes: [['manual','기존 로컬 분석·수동 검토']], detail: '기존 DB·소스 분석과 검토 흐름을 그대로 사용합니다. AI 연결은 이관의 필수 조건이 아닙니다.', url: '' },
  };
  const aiTasks = {
    collect: ['준비 도우미','DB 연결·소스 준비 순서와 실패 시 확인할 항목 정리','접속 방식과 최소 읽기 권한을 확인한 뒤 연결 진단을 실행하세요. ZIP은 목록 점검과 분석 루트 확인을 마친 후 해제합니다.'],
    analyze: ['분석 도우미','부분 분석·미측정 항목의 검토 순서 제안','미측정과 부분 분석을 구분하고, 의미가 불명확한 컬럼부터 담당자에게 확인하세요. 표본 프로파일로 전체 적합성을 확정하지 않습니다.'],
    terms: ['용어 도우미','이름·코멘트로 후보를 제안하고 로컬 소스 근거와 비교','이름과 코멘트만으로는 업무 역할을 확정할 수 없습니다. 표준 후보를 로컬 사전·화면 사용처와 비교한 뒤 담당자가 결정하세요.'],
    mapping: ['변환 설계 도우미','변환 규칙·예외 처리의 검토 초안 작성','코드 대응, 날짜 해석, 참조 키 순서와 예외 격리 정책을 구분해 검토하세요. 제안된 변환식은 로컬 검증을 통과한 뒤 원장에 반영합니다.'],
    rehearse: ['리허설 도우미','실패 분류·재개 절차·전환 준비사항 설명','리허설 결과와 원장 버전을 확인하세요. 중단 시 실패 청크와 기존 커밋 범위를 구분하고, 실행 계약을 재확인한 뒤 담당자가 재개합니다.'],
    report: ['인수 도우미','대사 확인 목록·인수 보고서의 구성 제안','원천·적재·격리 건수와 참조 관계를 로컬에서 대사하세요. 업무 담당자 인수 후 실행 계정 회수와 원장 보존을 확인합니다. AI 설명만으로 완료 처리하지 않습니다.'],
  };
  function workflowHelpExamples() {
    const row = rows.find(item => item.id === state.selected);
    return {
      collect: [
        ['DB 연결 설정에서 무엇부터 확인할까요?', `${dbProfiles[state.db.vendor].name}를 선택한 예시입니다. ${state.db.vendor === 'oracle' ? 'Service name·SID·TNS 중 실제 리스너의 방식을 먼저 확인하고 Owner를 별도로 지정하세요.' : state.db.vendor === 'sqlserver' ? '고정 포트와 Named instance 중 한 방식을 선택하고 database와 schema를 구분하세요.' : '접속할 database와 조사 범위를 확인하세요.'} 이후 드라이버 → 네트워크 → TLS → 인증 → 가시성·조회 권한 순서로 진단합니다.`, '현재 DB 설정은 로컬 화면의 합성 상태입니다. 설정을 자동 변경하지 않습니다.'],
        ['소스 ZIP을 올린 다음에는 무엇을 하나요?', 'ZIP 선택 후 목록·해제 예상량·경로 이탈을 점검합니다. 실제 Java·매퍼·화면 파일이 있는 루트를 선택한 뒤 별도 로컬 작업공간에 해제하고 분석합니다. 빌드 산출물만 있으면 원본 소스를 다시 준비해야 합니다.', '소스 탭에서 정상 ZIP과 차단 시나리오를 비교할 수 있습니다.'],
      ],
      analyze: [
        ['분석 결과에서 무엇을 먼저 해결할까요?', state.mode === 'ddl' ? '현재는 스키마 입력 예시입니다. NULL·중복·일자 유효성은 미측정이므로 값 문제가 없다고 판정할 수 없습니다. 구조와 용어 초안을 검토한 뒤 실제 DB 프로파일을 확보하세요.' : '이 예시에서는 REG_ID의 업무 주체, ETC1의 보존 의미, 잘못된 일자 2건을 우선 확인합니다. 의미 문제와 값 품질 문제를 분리하고 담당자 확인 또는 변환·격리 정책으로 연결하세요.', '실제 결과를 AI가 분석한 것이 아닌 합성 시나리오 해설입니다.'],
        ['부분 분석이면 마이그레이션을 못 하나요?', '부분 분석 자체보다 빠진 범위가 무엇인지가 중요합니다. 동적 SQL·미지원 파일·미수집 소스 목록을 확인하고 관련 용어를 확인 필요로 남기세요. 자료가 부족한 항목을 자동 확정하지 않고 업무 담당자 근거로 보완합니다.', '누락 범위와 인수 조건은 로컬 분석·검증 화면에서 확인합니다.'],
      ],
      terms: [
        [`${row.id}는 어떤 표준 용어가 자연스러울까요?`, row.id === 'REG_ID' ? '이름만 보면 등록자아이디를 떠올릴 수 있지만, 이 예시의 로컬 화면·매퍼는 문서 작성자를 가리킵니다. 작성자아이디와 등록자아이디를 비교하고, 대리 등록이 있는지 담당자에게 확인한 뒤 선택하세요.' : row.candidates.length ? `${row.label}에는 '${row.candidates[0]}' 후보가 있습니다. ${state.scanned ? '로컬 소스 사용처와 업무 역할이 같은지 대조하세요.' : '현재 소스가 없어 이름·코멘트만으로 확정할 수 없습니다.'} 이름이 유사한 것과 실제 의미가 같은 것은 별도 판단입니다.` : 'ETC1은 의미를 판정할 근거가 부족합니다. 자동으로 비고 컬럼에 넣지 말고 담당자 확인 후 표준 등록 요청 또는 보존 기한이 있는 별도 보관으로 분류하세요.', '로컬 근거를 조합한 고정 도움 예시입니다. 소스 원문을 모델에 보낸 결과가 아닙니다.'],
        ['AI 추천을 선택하면 바로 확정되나요?', '추천은 초안입니다. 현재 선택과 제안의 차이·소스 근거를 확인해 적용하고, 담당자가 검토 사유를 보완해 저장해야 합니다. 초안 변경 시 기존 검토 완료와 리허설은 다시 확인하며 마지막 적용을 취소할 수 있습니다.', '아래 AI 제안 요청 패널에서 차이 비교와 초안 적용을 체험할 수 있습니다.'],
      ],
      mapping: [
        ['잘못된 날짜 2건은 어떻게 처리하나요?', '전체 프로파일을 가정한 이 예시에는 해석할 수 없는 날짜 2건이 있습니다. 원천 교정·작업 중단·승인된 격리 중 정책을 정하고, 정상 건의 날짜 형식과 시간대도 검증하세요. 임의로 오늘 날짜나 NULL로 바꾸지 않습니다.', 'DDL 입력만 있다면 오류 건수는 미측정입니다. 실제 값은 외부 AI에 전송하지 않습니다.'],
        ['조직 코드와 사용자 키는 어떤 순서로 옮기나요?', '예시 관계는 조직 → 사용자 → 문서입니다. 부모 조직을 먼저 적재하고 코드 대응표·이전 키와 새 키의 대응을 검토하세요. 순환 참조나 매칭되지 않는 키는 별도 설계와 대사가 필요합니다.', '변환 정책 체크는 담당자가 직접 확인합니다.'],
      ],
      rehearse: [
        ['실패한 청크는 처음부터 다시 실행하나요?', '전체를 곧바로 재실행하지 않습니다. 실패 청크의 롤백과 이전 커밋 범위를 확인하고, 원인 해결 후 원천·대상·원장·실행 계약이 같은지 대조한 뒤 체크포인트에서 재개합니다. 전체 복구가 필요하면 별도 백업 복원 절차를 사용합니다.', `현재 모의 실행 상태: ${state.execution} / 처리한 청크 ${state.chunk}개. AI는 재개 버튼을 누르지 않습니다.`],
        ['리허설이 통과하면 바로 전환해도 되나요?', '리허설 PASS 후에도 백업·복구, 원천 쓰기 동결, 대상과 계획, 업무 담당자·실행 승인을 확인해야 합니다. 입력이나 매핑이 바뀌었으면 이전 리허설을 재사용하지 말고 다시 검증하세요.', '기존 최종 전환 확인 항목과 실행 경계는 유지됩니다.'],
      ],
      report: [
        ['원천 건수와 적재 건수가 다른데 성공인가요?', '이 예시는 12,480건 = 적재 12,478건 + 격리 2건입니다. 합계가 맞는 것 외에도 누락·중복·참조 무결성과 격리 승인 근거를 확인해야 합니다. 실제 실행 전에는 이 숫자를 이관 성과로 사용할 수 없습니다.', '대사 결과는 로컬 검증기가 산출하고 담당자가 인수합니다.'],
        ['이관이 끝난 뒤 무엇을 남겨야 하나요?', '검토 원장·변환 규칙·실행 기록·대사·승인 예외와 키 대응을 보존 기한에 맞춰 남기세요. 첨부 파일·메뉴·권한도 인수하고, 임시 계정과 실행 권한을 회수한 뒤 작업공간을 읽기 전용으로 보관합니다.', '보존 기한 전 keymap을 자동 삭제하지 않습니다.'],
      ],
    }[stage];
  }
  function aiQuickHelp() {
    const examples=workflowHelpExamples(), active=state.ai.helpStage===stage, example=examples[state.ai.helpIndex];
    return `<section class="ai-work-help mb-3" aria-labelledby="ai-work-help-title"><div class="flex flex-wrap items-center justify-between gap-3"><div><span class="eyebrow">AI HELP / IN THIS STEP</span><h2 id="ai-work-help-title">${aiTasks[stage][0]} · 지금 도움받기</h2></div><button class="button" data-action="ai-open">내 작업에 AI 제안 요청</button></div><p class="mt-2 text-xs text-muted">질문을 누르면 과정 중 도움 예시를 바로 볼 수 있습니다. 연결 없이 보는 고정 답변이며 실제 모델 호출은 없습니다.</p><div class="ai-help-questions">${examples.map(([question],i)=>`<button class="button" data-ai-help="${i}" aria-pressed="${active&&state.ai.helpIndex===i}">${escape(question)}</button>`).join('')}</div>${active?`<div class="ai-help-answer" role="status"><strong>${escape(example[0])}</strong><p class="mt-2">${escape(example[1])}</p><p class="mt-3 text-xs text-muted">${escape(example[2])}</p></div>`:''}</section>`;
  }
  const aiKey = () => JSON.stringify([stage,state.revision,state.selected,state.notes[state.selected] ?? '',state.choices[state.selected] ?? 0,state.scanned,state.execution,state.chunk,state.ai.provider,state.ai.route]);
  const aiCurrent = () => state.ai.result && state.ai.result.key === aiKey();
  const canUndoAi = () => state.ai.undo && stage === 'terms' && state.selected === state.ai.undo.rowId && state.revision === state.ai.undo.revision && state.notes[state.selected] === state.ai.undo.appliedNote && !locked();
  const aiAllowed = () => state.ai.status === 'ready' && state.ai.provider !== 'none' && state.ai.route !== 'handoff' && !state.archived;
  const aiPayload = () => ({ metadata: (stage === 'terms' ? rows.filter(row=>row.id===state.selected) : rows).map(row=>({ tableName:row.table,columnName:row.id,comment:row.label })) });
  function clearAiContext() { state.ai.previewKey = null; state.ai.consentKey = null; state.ai.result = null; state.ai.error = ''; }
  function assistantPage() {
    const ai = state.ai, p = aiProviders[ai.provider];
    const authLabel = ai.route === 'api' ? 'API 비밀 참조 확인 예시' : '공식 로그인 과정 예시';
    return title('AI ASSIST / OPTIONAL', '준비부터 인수까지, AI와 함께 검토하세요.', '단계마다 필요한 제안과 근거를 연결합니다. AI는 초안을 만들고, 로컬 도구가 검증하며, 담당자가 확정합니다.', nextButton('collect','원천 준비로 이동')) + `
      <div class="ai-overview"><div><span class="eyebrow">LOCAL WORKSPACE + AI ASSIST</span><h2>한 번 연결하고, 여섯 단계에서 도움받기</h2><p class="mt-2 text-muted">로컬 실행기 → 전송 범위 검사 → 공식 CLI / API → 제안 검증 → 검토 초안</p><p class="mt-2 text-xs text-muted">로컬 CLI를 사용해도 클라우드 모델에 보낸 자료는 외부에서 처리됩니다. 연결·정책 확인·자료 전송은 각각 구분합니다.</p></div>${badge('새 설계 · 실제 연동 없음','info')}</div>
      <section class="panel mt-5"><div class="panel-head"><h2>01. AI 연결 방식</h2>${badge(ai.status==='ready'?'예시 연결됨':ai.status==='pending'?'인증 대기 예시':ai.status==='expired'?'재인증 필요':'연결 전',ai.status==='ready'?'good':'neutral')}</div><div class="panel-body space-y-4"><div class="provider-grid">${Object.entries(aiProviders).map(([key,provider])=>`<label class="choice-card"><input type="radio" name="ai-provider" value="${key}" ${ai.provider===key?'checked':''} ${disabled(state.archived)}><span><strong>${provider.name}</strong><span class="subtext">${key==='codex'?'공식 app-server / API':key==='gemini'?'공식 CLI / API':key==='claude'?'API / 공식 CLI 직접 사용':'네트워크 없이 기존 흐름 유지'}</span></span></label>`).join('')}</div>
      <div class="field-grid">${selectField('ai-route','연결 경로',ai.route,p.routes)}${sampleField('모델 · 계정 정책',ai.provider==='none'?'사용하지 않음':'연결 후 사용 가능한 모델·조직 정책 조회 예정','이 시뮬레이터는 실제 모델명·잔여 한도·비용을 측정하지 않음')}</div>
      <div class="callout"><p>${p.detail}</p>${p.url?`<a class="source-link" href="${p.url}" target="_blank" rel="noreferrer noopener">공식 연동 문서 ↗</a>`:''}</div>
      ${ai.route==='handoff'?'<div class="callout warn"><strong>공식 Claude Code 직접 사용 경로</strong><p class="mt-2">사용자가 공식 프로그램에서 직접 로그인합니다. 이 화면은 토큰을 읽거나 대신 호출하지 않습니다. 허용된 메타데이터만 확인해 전달하고, 돌아온 결과도 수동 검토합니다. 내장 CLI 자동 연동은 배포 조건·도구 격리 검증 후 별도로 추가합니다.</p></div>':ai.provider==='none'?'<div class="callout good">AI 없이도 모든 이관 단계를 진행할 수 있습니다.</div>':`<div class="flex flex-wrap gap-2"><button class="button primary" data-action="ai-connect" ${disabled(state.archived||ai.status==='pending')}>${authLabel}</button><button class="button" data-action="ai-disconnect" ${disabled(state.archived||ai.status==='disconnected')}>연결 해제 예시</button></div>
      ${ai.status==='pending'?`<div class="callout" role="status"><strong>${ai.route==='api'?'로컬 실행기의 비밀 참조 확인 대기':'공식 도구의 인증 완료 응답 대기'} · 모의 상태</strong><p class="mt-2">${ai.route==='api'?'실제 키는 로컬 비밀 저장소에서 참조하고 화면에 표시하지 않는 설계입니다.':'공식 인증 화면에서 동의를 마친 후 로컬 실행기가 상태를 확인하는 설계입니다.'} 지금은 로그인 창을 열거나 계정에 접근하지 않습니다.</p><div class="mt-3 flex flex-wrap gap-2"><button class="button" data-action="ai-auth-complete">${ai.route==='api'?'참조 확인 완료 예시':'인증 완료 예시'}</button><button class="button quiet" data-action="ai-disconnect">취소</button></div></div>`:''}
      ${ai.status==='ready'?'<div class="callout good" role="status">예시 연결 완료. 자료를 보내기 전 각 단계에서 전송 내용을 확인해야 합니다. 연결만으로 자료를 보내지 않습니다.</div>':''}`}
      </div></section>
      <section class="panel mt-5"><div class="panel-head"><h2>02. 자료와 실행 범위</h2>${badge('현재 프로젝트 전송 규칙 유지','info')}</div><div class="panel-body"><div class="grid-cards"><div><h3>AI에 보낼 수 있는 후보</h3><p class="mt-2">허용된 테이블·컬럼 이름과 코멘트만 전송 전 미리보기로 확인합니다. 코멘트에 개인정보 패턴이 있으면 제외합니다.</p><p class="mt-3 text-xs text-muted">실제 사용은 대상 서비스·범위·유효기간이 있는 기관 승인과 계정의 보존·학습·과금 정책 확인이 필요합니다. 데모 체크는 실제 승인이 아닙니다.</p></div><div><h3>로컬에서 함께 확인할 자료</h3><p class="mt-2">소스 원문·ZIP·DB 값·값 빈도·프로파일·접속정보는 전송하지 않습니다. 소스 근거와 대사 결과는 로컬 화면에서 제안과 비교합니다.</p><p class="mt-3 text-xs text-muted">AI는 업무 확정·표준 등록·DDL/DML·최종 전환·재개·보관 처리를 자동 실행하지 않습니다.</p></div></div><div class="field-grid mt-5">${selectField('ai-budget','작업당 요청 한도 · 모의 값',String(ai.budget),[['3','3회'],['5','5회'],['10','10회']],'실제 과금 한도가 아닙니다. 반복 요청을 제한하는 UX 예시')}${sampleField('요청 횟수 · 모의 값',`${ai.requests} / ${ai.budget}`,'토큰 사용량·비용은 실제 연동 후 측정 가능')}</div></div></section>
      <section class="mt-6"><h2>03. 단계별 도움</h2><div class="ai-task-grid mt-4">${stages.map(([key,label],i)=>`<button class="ai-task" data-goto="${key}"><span class="eyebrow">0${i+1} / ${label}</span><strong>${aiTasks[key][0]}</strong><span>${aiTasks[key][1]}</span></button>`).join('')}</div></section>
      <section class="panel mt-5"><div class="panel-head"><h2>보관한 AI 검토 초안</h2>${badge(`${ai.drafts.length}건 · 메모리 예시`)}</div><div class="panel-body">${ai.drafts.length?ai.drafts.map(d=>`<div class="evidence"><strong>${escape(d.title)}</strong><p>${escape(d.text)}</p><small>${escape(d.provider)} / 모델 미측정 / 생성 기준 v${d.revision} / ${d.revision===state.revision?'현재 입력 기준':'입력 변경 · 재검토 필요'} / 자동 확정 없음</small></div>`).join(''):'<p class="text-muted">각 단계에서 제안을 확인해 초안으로 보관할 수 있습니다. 확정 원장과 분리합니다.</p>'}</div></section>`;
  }
  function aiPanel() {
    const ai=state.ai, task=aiTasks[stage], result=ai.result;
    const fresh=aiCurrent(), preview=ai.previewKey===aiKey(), consent=ai.consentKey===aiKey();
    const row=rows.find(r=>r.id===state.selected);
    return `<details class="ai-panel mb-5" id="ai-panel" ${ai.open?'open':''}><summary><span class="ai-mark" aria-hidden="true">✦</span><span><strong>${task[0]}</strong><small>${task[1]}</small></span>${badge(ai.status==='ready'?aiProviders[ai.provider].short+' · 예시 연결':'연결 선택',ai.status==='ready'?'good':'neutral')}</summary><div class="ai-panel-body">
      <div class="flex flex-wrap items-center justify-between gap-3"><p class="text-xs text-muted">제안 → 로컬 근거 대조 → 초안 적용 → 담당자 확정</p><button class="button quiet" data-goto="assistant">AI 연결·정책 설정 ↗</button></div>
      ${!aiAllowed()?`<div class="callout ${ai.status==='expired'?'warn':''}">${ai.status==='expired'?'인증 만료 예시입니다. 연결 설정에서 재인증하세요. 기존 검토와 이관 진행은 유지됩니다.':ai.provider==='none'?'AI 없이 진행 중입니다. 기존 단계별 기능을 사용할 수 있습니다.':ai.route==='handoff'?'공식 Claude Code 직접 사용을 선택했습니다. 이 화면에서 자동 호출하지 않습니다.':state.archived?'보관된 작업공간입니다. AI 요청과 초안 적용도 잠깁니다.':'AI 연결 예시를 먼저 완료하세요. 연결하지 않아도 수동 검토는 가능합니다.'}</div>`:''}
      <div class="ai-request-bar"><button class="button" data-action="ai-preview" ${disabled(!aiAllowed())}>보낼 자료 미리보기</button><label class="field">응답 시나리오<select id="ai-scenario" class="input" ${disabled(state.archived)}>${[['success','정상 제안'],['expired','인증 만료'],['quota','공급자 한도 초과'],['invalid','표준에 없는 후보'],['injection','자료 속 실행 지시 발견'],['privacy','코멘트 전송 검사 차단']].map(([v,t])=>`<option value="${v}" ${ai.scenario===v?'selected':''}>${t}</option>`).join('')}</select></label><span class="text-xs text-muted">모의 요청 ${ai.requests}/${ai.budget}</span></div>
      ${preview?`<div class="ai-payload"><strong>전송 후보 · 합성 메타데이터만</strong><pre id="ai-payload">${escape(JSON.stringify(aiPayload(),null,2))}</pre><p class="text-xs text-muted">수신 경로: ${aiProviders[ai.provider].name} / ${escape(aiProviders[ai.provider].routes.find(([key])=>key===ai.route)?.[1]||'')}<br>원본 ZIP·소스·DB 값·프로파일·접속 비밀·검토 메모는 제외합니다. 일반 단계 가이드는 이 자료와 로컬 검증 화면을 나눠 보여주는 예시입니다.</p><label class="check-row"><input type="checkbox" id="ai-consent" ${consent?'checked':''} ${disabled(!aiAllowed())}><span>현재 서비스·범위에 대한 전송 승인이 유효하다고 가정하고 내용 확인 <span class="subtext">시뮬레이션 체크입니다. 실제 전송 승인을 만들지 않습니다.</span></span></label></div>`:''}
      <div class="flex flex-wrap gap-2"><button class="button primary" data-action="ai-request" ${disabled(!aiAllowed()||!preview||!consent||ai.requests>=ai.budget)}>이 단계 도움받기 · 모의 요청</button>${ai.requests>=ai.budget?'<span class="pill warn">모의 작업 한도 도달 · 수동 검토 가능</span>':''}</div>
      ${ai.error?`<div class="callout warn" role="status">${escape(ai.error)}</div>`:''}
      ${result?`<article class="ai-answer"><div class="flex flex-wrap justify-between gap-2"><h3>${escape(result.title)}</h3>${badge(!fresh?'입력 변경 · 재생성 필요':!result.valid?'검증 차단':'검토 초안',!fresh||!result.valid?'warn':'info')}</div><p class="mt-3">${escape(result.text)}</p><p class="mt-3 text-xs text-muted">${escape(result.provider)} · 모델 응답을 가정한 고정 예시 · 생성 기준 v${result.revision} · 실제 신뢰도 미측정</p>
      ${result.stage==='terms'?`<div class="ai-diff"><div><span class="eyebrow">BEFORE / 생성 당시 선택</span><strong>${escape(result.beforeCandidate)}</strong><p>${escape(result.beforeNote||'근거 미입력')}</p></div><div><span class="eyebrow">PROPOSAL / 기존 메모 보존 + AI 초안</span><strong>${escape(result.candidate||'미확정 유지')}</strong><p>${escape(result.note)}</p></div></div><div class="callout mt-3"><strong>로컬 근거 대조 · AI에 보내지 않은 정보</strong><p class="mt-2">${escape(!fresh?'입력 또는 선택 컬럼이 바뀌어 근거 대조를 중지했습니다. 현재 항목으로 다시 요청하세요.':state.scanned?row.evidence[1][1]:'소스 미제공 · 업무 담당자 확인 필요')}</p><p class="mt-2 text-xs">제안 후보가 사전에 존재해도 업무 의미가 맞는지는 별도 검토입니다. 표준 사전·소스 근거는 합성 예시입니다.</p></div>`:''}
      <div class="mt-4 flex flex-wrap gap-2"><button class="button" data-action="ai-apply" ${disabled(!fresh||!result.valid||result.applied||state.archived||(stage==='terms'&&locked()))}>${result.applied?'초안 보관됨':stage==='terms'?'차이 확인 후 검토 초안에 적용':'검토 계획 초안에 보관'}</button><button class="button quiet" data-action="ai-dismiss">제안 닫기</button></div><p class="mt-2 text-xs text-muted">검토 완료·변환 정책 승인·실제 실행 상태는 자동 변경하지 않습니다.</p></article>`:''}
      ${ai.undo&&stage==='terms'?`<div class="flex flex-wrap items-center gap-3"><button class="button quiet" data-action="ai-undo" ${disabled(!canUndoAi())}>마지막 용어 초안 적용 취소</button><span class="text-xs text-muted">${canUndoAi()?'기존 후보·메모로 복원하며 검토 완료·리허설은 다시 확인합니다.':'후속 입력이 바뀌어 자동 복원을 잠갔습니다. 기존 메모는 변경 제안에 보존됩니다.'}</span></div>`:''}
    </div></details>`;
  }
  function requestAiExample() {
    const ai=state.ai;
    if(!aiAllowed()||ai.previewKey!==aiKey()||ai.consentKey!==aiKey()||ai.requests>=ai.budget)return;
    ai.result=null;ai.error='';
    if(ai.scenario==='privacy'){ai.error='전송 전 검사 차단 예시: 코멘트에 허용하지 않는 정보가 있습니다. 해당 항목을 제외하고 다시 검토하세요. 요청하지 않은 것으로 처리합니다.';render();return;}
    if(ai.scenario==='injection'){ai.error='근거 자료의 실행 지시를 차단한 예시입니다. 소스·코멘트는 분석 대상이며 도구 실행 명령이 아닙니다. AI에 DB·셸 실행 권한을 부여하지 않습니다.';render();return;}
    ai.requests++;
    if(ai.scenario==='expired'){ai.status='expired';ai.consentKey=null;ai.error='인증 만료 · 공식 경로에서 재인증한 후 다시 요청하세요. 이관은 자동 재시작하지 않습니다.';render();return;}
    if(ai.scenario==='quota'){ai.error='공급자 한도 초과 예시입니다. 자동 재시도나 다른 공급자로의 자동 전송은 하지 않습니다. 한도 회복 후 직접 다시 요청하거나 수동 검토를 계속하세요.';render();return;}
    const row=rows.find(r=>r.id===state.selected), candidate=ai.scenario==='invalid'?'가상통합식별명':row.candidates[row.id==='REG_ID'?1:0]||null;
    const note=candidate?`AI 초안: 이름·코멘트 기준 '${candidate}' 후보입니다. 소스 사용처·업무 역할과의 일치는 담당자 확인이 필요합니다.`:'AI 초안: 이름·코멘트만으로 의미를 판정할 수 없습니다. 업무 담당자 확인 후 표준 등록 요청 또는 보관을 검토합니다.';
    const beforeNote=state.notes[row.id]??row.note;
    ai.result={key:aiKey(),stage,revision:state.revision,provider:aiProviders[ai.provider].name,title:aiTasks[stage][0]+'의 제안',text:ai.scenario==='invalid'?'등록되지 않은 표준 후보를 생성한 상황입니다. 로컬 사전 검사에서 차단되어 적용할 수 없습니다.':aiTasks[stage][2],candidate,note:stage==='terms'&&beforeNote?`${beforeNote}\n\n${note}`:note,valid:ai.scenario!=='invalid'&&(stage!=='terms'||!candidate||row.candidates.includes(candidate)),beforeChoice:state.choices[row.id]||0,beforeCandidate:row.candidates[state.choices[row.id]||0]||'미확정',beforeNote,applied:false};
    render();
  }
  function applyAiExample() {
    const result=state.ai.result;
    if(!aiCurrent()||!result.valid||result.applied||state.archived||(stage==='terms'&&locked()))return;
    if(stage==='terms'){
      const row=rows.find(r=>r.id===state.selected), index=row.candidates.indexOf(result.candidate);
      if(result.candidate&&index<0)return;
      if(index>=0)state.choices[row.id]=index;
      state.notes[row.id]=result.note;delete state.reviewed[row.id];invalidate('AI 제안 초안 적용 · 담당자 재검토 필요');
    }
    const draft={title:aiTasks[stage][0]+(stage==='terms'?` · ${state.selected}`:''),text:stage==='terms'?result.note:result.text,provider:result.provider,revision:state.revision};
    state.ai.drafts.unshift(draft);
    if(stage==='terms')state.ai.undo={rowId:state.selected,beforeNote:result.beforeNote,beforeChoice:result.beforeChoice,revision:state.revision,appliedNote:result.note,draft};
    result.applied=true;result.key=aiKey();state.ai.consentKey=null;state.ai.previewKey=null;
    render();notify('AI 제안을 검토 초안에 반영했습니다. 담당자 확정과 실행은 별도입니다.');
  }
  function selectField(id, label, value, options, help = '') {
    return `<label class="field">${label}<select id="${id}" class="input" ${disabled(locked())}>${options.map(([key, text]) => `<option value="${key}" ${value === key ? 'selected' : ''}>${text}</option>`).join('')}</select>${help ? `<span class="subtext">${help}</span>` : ''}</label>`;
  }
  function sampleField(label, value, help = '') {
    return `<label class="field">${label}<input class="input" value="${escape(value)}" readonly>${help ? `<span class="subtext">${help}</span>` : ''}</label>`;
  }
  function jdbcPreview() {
    const d = state.db, p = dbProfiles[d.vendor], host = d.route === 'tunnel' ? '127.0.0.1' : 'legacy-db.example.internal';
    if (d.vendor === 'oracle') return d.method === 'tns' ? 'jdbc:oracle:thin:@LEGACY_TNS_ALIAS' : d.method === 'sid' ? `jdbc:oracle:thin:@${host}:1521:LEGACY_SID` : `jdbc:oracle:thin:@//${host}:1521/LEGACYPDB`;
    if (d.vendor === 'sqlserver') return `jdbc:sqlserver://${host}${d.method === 'instance' ? ';instanceName=LEGACY_INSTANCE' : ':1433'};databaseName=legacy`;
    return `jdbc:${d.vendor === 'postgres' ? 'postgresql' : d.vendor}://${host}:${p.port}/legacy`;
  }
  function connectionForm() {
    const d = state.db, p = dbProfiles[d.vendor];
    const method = d.vendor === 'oracle' ? selectField('db-method', '접속 식별 방식', d.method, [['service','Service name'],['sid','SID · 기존 방식'],['tns','TNS alias · 로컬 설정 참조']]) : d.vendor === 'sqlserver' ? selectField('db-method', '서버 지정 방식', d.method, [['port','호스트 + 고정 포트'],['instance','호스트 + Named instance']]) : '';
    const address = d.vendor === 'oracle' && d.method === 'tns' ? sampleField('TNS alias', 'LEGACY_TNS_ALIAS', 'tnsnames.ora와 TNS_ADMIN 경로는 로컬 실행기에서 확인') : sampleField('호스트 · 합성 예시', d.route === 'tunnel' ? '127.0.0.1' : 'legacy-db.example.internal') + (d.vendor === 'sqlserver' && d.method === 'instance' ? sampleField('Named instance', 'LEGACY_INSTANCE', 'SQL Browser/네트워크 정책을 확인. 고정 포트 방식과 분리') : sampleField('포트 · 예시 기본값', p.port, d.route === 'tunnel' ? '실제 설정 시 이미 열린 로컬 터널의 포트로 변경' : '실제 서버의 리스너 포트 확인 필요'));
    const database = d.vendor === 'oracle' ? (d.method === 'tns' ? '' : sampleField(d.method === 'sid' ? 'SID' : 'Service name', d.method === 'sid' ? 'LEGACY_SID' : p.database, 'SID와 Service name은 서로 대체하지 않음')) : sampleField(d.vendor === 'mysql' || d.vendor === 'mariadb' ? 'Database / catalog' : 'Database', p.database);
    return `<div class="field-grid">
      ${selectField('db-vendor','원천 DBMS',d.vendor,Object.entries(dbProfiles).map(([key,item])=>[key,item.name]))}
      ${selectField('db-route','접속 경로',d.route,[['direct','직접 연결 / 사내 VPN'],['tunnel','이미 준비된 로컬 터널']],'실행기가 DB에 접근합니다. 이 화면에서 VPN·SSH 터널을 생성하지 않습니다.')}
      ${method}${address}${database}
      ${sampleField(d.vendor === 'oracle' ? '조사할 Owner' : d.vendor === 'mysql' || d.vendor === 'mariadb' ? '조사할 테이블 범위' : '조사할 Schema', d.vendor === 'mysql' || d.vendor === 'mariadb' ? 'TB_MEMBER, TB_DOCUMENT, TB_ORGANIZATION' : p.schema, d.vendor === 'postgres' ? 'database에 연결한 뒤 별도로 선택하는 조사 범위' : '접속 성공 이후 가시성과 조회 권한을 별도로 확인')}
    </div>
    <details class="advanced" open><summary>인증 · TLS · 로컬 드라이버</summary><div class="field-grid mt-4">
      ${selectField('db-auth','인증 방식',d.auth,[['password','DB 계정 + 비밀 참조'],...(d.vendor === 'sqlserver' ? [['integrated','통합 인증 · 준비 조건 보기']] : []),...(d.vendor === 'oracle' ? [['wallet','Wallet · 준비 조건 보기']] : [])])}
      ${sampleField(d.auth === 'integrated' ? '실행 사용자' : '조회 계정 · 합성 예시', d.auth === 'integrated' ? '로컬 실행기의 사용자 컨텍스트' : 'legacy_reader', '조사 범위의 최소 읽기 권한을 가진 별도 계정')}
      ${sampleField(d.auth === 'password' ? '비밀 참조 · 값은 입력하지 않음' : '실행 환경 준비', d.auth === 'password' ? 'ENV: LEGACY_DB_PASSWORD (예시)' : d.auth === 'wallet' ? '로컬 wallet + JDBC 보조 라이브러리' : '실행 사용자·Kerberos / 네이티브 라이브러리', '실제 비밀번호·키·wallet 파일을 이 시뮬레이터에 넣지 마세요.')}
      ${selectField('db-tls','전송 보안 정책',d.tls,[['verify',p.tls],['custom','기존 보안 설정 · 별도 검토']],'DB별 속성으로 변환하는 제안입니다. 드라이버 기본값을 안전한 검증 완료로 간주하지 않습니다.')}
      ${sampleField('드라이버 준비 상태',p.support,'버전·JAR digest·서버 호환성을 확인. 자동 설치하지 않음')}
      ${sampleField('서버 / 드라이버 버전', '미측정 · 실제 연결 시 JDBC에서 수집', '제품·버전이 확인되어야 드라이버 호환성을 판정할 수 있음')}
    </div><p class="mt-3 text-xs text-muted"><code>${p.driver}</code><br>${d.vendor === 'postgres' ? 'CA 경로·서버 호스트명 검증, 필요한 경우 클라이언트 인증서를 별도 설정합니다.' : d.vendor === 'oracle' ? 'TCP/TCPS 선택과 trust store·wallet은 별도 설정입니다. TNS descriptor로도 지정할 수 있습니다.' : d.vendor === 'sqlserver' ? '서버 인증서를 신뢰 저장소로 검증합니다. 인증서 검증 건너뛰기를 기본 해결책으로 제안하지 않습니다.' : d.vendor === 'mysql' ? 'MySQL sslMode=VERIFY_IDENTITY 예시입니다. CA/인증서 설정은 서버 환경에 맞춰야 합니다.' : 'MariaDB 전용 JDBC URL·드라이버를 사용합니다. TLS 기본값은 드라이버 버전에 따라 달라지므로 명시적으로 설정합니다.'}</p>
    <div class="callout mt-4"><strong>접속 주소 미리보기 · 비밀값 제외</strong><code id="jdbc-preview" class="block mt-2">${jdbcPreview()}</code><p class="mt-2 text-xs text-muted">주소 형식 예시이며 복사 실행용 완성 URL이 아닙니다. 인증/TLS 속성은 별도 구성하고, 고급 JDBC 속성에도 비밀값을 출력하지 않는 설계입니다.</p></div>
    </details>
    <details class="advanced"><summary>로컬 인증서·JAR 참조 · 조사 범위 · 부하 제어</summary><div class="field-grid mt-4">${sampleField('CA / 신뢰 저장소', '로컬 파일 선택 예정 · 현재 미선택', '클라이언트 키·인증서는 별도 참조. 원문은 내보내지 않음')}${sampleField('외부 JDBC JAR', d.vendor === 'postgres' ? '번들 사용 · 별도 파일 불필요' : '승인된 로컬 JAR 선택 예정 · 현재 미선택', '실제 구현 시 regular JAR·digest·class 검증 후 사용')}${sampleField('프로파일 범위', '메타데이터 + 표본 1,000행 / 테이블', '표본으로 전체 값 적합성을 확정하지 않음')}${sampleField('실행 제한 · 설계 예시', '연결 10초 / 쿼리 30초 / 동시 조회 2개', '값은 원천 부하·실행기 환경에 따라 조정')}</div><p class="mt-3 text-xs text-muted">현재 이후 화면의 12,480건은 전체 프로파일을 가정한 고정 합성 결과입니다. 이 범위 입력 예시로 실제 집계가 바뀌지는 않습니다. 필드 값은 읽기 전용 예시이며 실제 파일을 선택하지 않습니다.</p></details>`;
  }
  function diagnosisPanel() {
    const steps = ['로컬 드라이버 준비','네트워크 · 리스너','TLS · 서버 인증서','인증','DB / 스키마 가시성','메타데이터 · SELECT 권한'];
    const failures = {driver:0,network:1,tls:2,auth:3,scope:4,permission:5};
    const help = {driver:'로컬 JDBC JAR·class·버전과 digest를 확인하세요. 자동 다운로드하지 않습니다.', network:'실행기에서 호스트·포트·VPN·터널 상태를 확인하세요.', tls:'CA·서버 이름·유효기간을 확인하세요. 검증을 끄지 않고 원인을 해결합니다.', auth:'실행기에서 비밀 참조와 계정 상태를 확인하세요. 값은 진단 로그에 남기지 않습니다.', scope:'database / service / owner / schema의 실제 이름과 가시성을 확인하세요.', permission:'지정한 범위의 SELECT와 메타데이터 권한을 확인하세요. JDBC readOnly 설정만으로 권한을 증명하지 않습니다.'};
    const failed = failures[state.diagnosis];
    return `<div class="diagnostics" id="connection-feedback" role="status"><strong>단계별 연결 진단 · 합성 결과</strong><ol class="diagnostic-list">${steps.map((label,index)=>`<li><span>${index+1}. ${label}</span>${badge(state.diagnosis === 'idle' ? '미실행' : failed === index ? '실패 예시' : failed !== undefined && index > failed ? '미확인' : '통과 예시', state.diagnosis === 'idle' || (failed !== undefined && index > failed) ? 'neutral' : failed === index ? 'bad' : 'good')}</li>`).join('')}</ol><p class="mt-3 text-xs">${help[state.diagnosis] || (state.diagnosis === 'pass' ? '선택 범위 3개 테이블 조회 가능 예시. 연결·조사 성공과 운영 적재 자격은 별개입니다.' : '설정이 바뀌었습니다. 연결 진단 예시를 다시 실행하세요.')}</p></div>`;
  }
  function sourcePanel() {
    const phase = state.sourcePhase, zip = state.sourceKind === 'zip';
    const progress = {empty:0,selected:1,blocked:1,checked:2,ready:3,done:4}[phase];
    const archiveProblem = {traversal:'경로 이탈 항목 ../outside.java 발견 → 전체 가져오기 차단',encrypted:'암호화 ZIP → 초기 버전 미지원. 암호를 받지 않고 재준비 안내',bomb:'해제 예상량 28 GB / 180,000개 → 작업공간 한도 초과'}[state.archiveCase];
    return `<section class="panel"><div class="panel-head"><div><span class="eyebrow">SOURCE EVIDENCE</span><h2>소스를 내 PC에서 준비합니다.</h2></div>${badge('폴더 분석: 기존 CLI / ZIP 전처리: 신규 제안','info')}</div><div class="panel-body space-y-5">
      <p>프로젝트 루트 폴더 또는 ZIP을 선택해 화면 라벨·매퍼·SQL의 사용처를 연결합니다. 제안 구조에서는 원본 소스를 업무 서버에 업로드하지 않습니다.</p>
      <div class="grid-cards">${[['folder','로컬 폴더 선택','이미 풀린 소스 폴더를 읽기 전용으로 분석'],['zip','압축파일 가져오기','ZIP 목록을 먼저 확인하고 별도 작업공간에 해제']].map(([value,label,description])=>`<label class="choice-card"><input type="radio" name="source-kind" value="${value}" ${state.sourceKind===value?'checked':''} ${disabled(locked())}><span><strong>${label}</strong><span class="subtext">${description}</span></span></label>`).join('')}</div>
      <ol class="intake-steps">${['선택','사전 점검',zip?'로컬 해제':'분석 범위 확정','근거 분석'].map((label,i)=>`<li class="${progress>i?'complete':''}"><span>${progress>i?'✓':i+1}</span>${label}</li>`).join('')}</ol>
      <div class="field-grid">${sampleField(zip?'선택할 ZIP · 합성 예시':'선택할 폴더 · 합성 예시',zip?'legacy-portal-source.zip · 18 MB':'D:/legacy/legacy-portal',zip?'ZIP만 지원하는 초기 설계. WAR/EAR·암호화·중첩 압축은 별도 지원 대상':'실제 폴더 선택은 로컬 실행기와 연결해야 합니다. 브라우저만으로 임의 경로를 읽지 않습니다.')}
      ${zip?selectField('archive-case','사전 점검 시나리오',state.archiveCase,[['normal','정상 ZIP'],['traversal','경로 이탈 항목 포함'],['encrypted','암호화 ZIP'],['bomb','해제량 한도 초과']]):'<div class="callout"><strong>원본은 그대로 유지</strong><p class="mt-2 text-xs text-muted">선택 디렉터리 밖으로 링크를 따라가지 않습니다. 소스·빌드 스크립트·의존성 설치를 실행하지 않습니다.</p></div>'}</div>
      <div class="flex flex-wrap gap-2"><button class="button" data-action="pick-source" ${disabled(locked())}>${zip?'예시 ZIP 선택':'예시 폴더 선택'}</button><button class="button" data-action="source-preflight" ${disabled(locked()||phase!=='selected')}>목록·사전 점검 예시</button><button class="button quiet" data-action="no-source" ${disabled(locked())}>소스 없는 경우 보기</button></div>
      ${phase==='empty'?'<div class="callout warn">소스를 선택하세요. 근거가 없으면 의미가 불명확한 용어는 확인 필요로 남깁니다.</div>':''}
      ${phase==='selected'?'<div class="callout">선택만 완료한 예시입니다. 아직 압축 해제·소스 분석을 하지 않았습니다.</div>':''}
      ${phase==='blocked'?`<div class="callout warn" role="status"><strong>가져오기 차단 · 모의 결과</strong><p class="mt-2">${archiveProblem}</p><p class="mt-2 text-xs">파일은 해제하지 않습니다. 정상 ZIP 시나리오로 바꾸고 다시 선택·점검해 보세요.</p></div>`:''}
      ${progress>=2?`<div class="source-preview"><div><h3>목록 미리보기 · 분석할 루트 선택</h3><pre class="source-tree">legacy-portal/
├─ member/src/       회원 · Java / Mapper
├─ document/src/     문서 · Java / Mapper
├─ webapp/           JSP / HTML
├─ target/           빌드 산출물 → 제외
└─ .env              비밀 설정 → 제외</pre><p class="text-xs text-muted">예시 1,280개 항목 · 해제 예상 64 MB / 여유 12 GB<br>경로·링크 점검 통과. 실제 해제 중에도 수량·용량·시간 제한을 적용하는 설계입니다.</p></div><div class="space-y-4">
      ${selectField('source-root','분석 루트 / 모듈',state.sourceRoot,[['all','전체 프로젝트 · member + document + webapp'],['member','member 모듈만'],['compiled','빌드 산출물만 있는 폴더']],'하위 모듈을 포함하고 선택 루트 밖의 파일은 분석하지 않음')}
      ${selectField('source-encoding','텍스트 인코딩',state.sourceEncoding,[['auto','자동 · UTF-8 → MS949'],['utf8','UTF-8만 · 신규 전처리 옵션 제안']],'해독 실패 파일은 완료 수에 포함하지 않음')}
      <p class="text-xs text-muted">기본 제외: .git / node_modules / target / build / 설정·키·인증서 / 링크. 현재 app-scan은 파일당 4 MiB 한도입니다.</p></div></div>
      <div class="flex flex-wrap gap-2"><button class="button primary" data-action="source-extract" ${disabled(locked()||phase!=='checked')}>${zip?'로컬 작업공간에 해제 예시':'분석 범위 확정 예시'}</button><button class="button" data-action="source" ${disabled(locked()||phase!=='ready')}>소스 근거 분석 예시</button></div>`:''}
      ${phase==='ready'||phase==='done'?`<div class="callout good"><strong>${zip?'별도 로컬 작업공간에 해제된 상황입니다.':'읽기 전용 분석 범위를 확정한 상황입니다.'}</strong><p class="mt-2 text-xs">${zip?'작업공간 예시: migration-workspaces/demo/source/ · 선택한 원본 ZIP은 유지':'원본 파일을 수정하지 않고 읽습니다.'} · 실제 파일 처리는 발생하지 않습니다.</p></div>`:''}
      ${phase==='done'?`<div class="source-result" role="status"><div><span class="eyebrow">SCAN RESULT / SYNTHETIC</span><h3>${state.sourceRoot==='compiled'?'분석 가능한 원본 소스 없음':state.sourceRoot==='member'?'member 모듈만 부분 분석':'전체 루트 · 부분 분석'}</h3><p class="mt-2">${state.sourceRoot==='compiled'?'빌드 산출물만 발견되었습니다. 원본 Java·매퍼·화면 파일을 다시 준비하세요.':state.sourceRoot==='member'?'회원 모듈의 사용처만 수집했습니다. 문서 영역의 근거가 없어 이 예시의 용어 확정에는 사용할 수 없습니다.':`1,280개 = 분석 ${state.sourceEncoding==='utf8'?'926':'954'} + 제외 296 + 미지원 16 + 해독 실패 ${state.sourceEncoding==='utf8'?'36':'8'} + 크기 초과 6`}</p></div>${badge(state.scanned?'일부 근거 확보':'근거 보완 필요',state.scanned?'good':'warn')}</div><p class="text-xs text-muted">동적 SQL·미지원 언어와 읽지 못한 파일은 별도 목록으로 남깁니다. 이 데모의 경로·줄 번호는 합성 예시이며, 실제 결과에는 snapshot digest·분석 루트·상대 경로·줄 번호를 연결합니다.</p>`:''}
      <details class="advanced"><summary>압축 해제 · 보관 정책 설계</summary><p class="mt-3 text-xs text-muted">선택 → 목록 검사 → 사용자가 해제 → 기존 app-scan 순서입니다. 경로 이탈·절대경로·Windows 특수 경로·심볼릭 링크를 차단하고, 중첩·암호화 ZIP은 초기 버전에서 제외합니다. 작업 종료 시 추출 소스와 임시 자료의 보존 기한·삭제 대상을 보여주고, 검토 원장과 원본은 별도로 관리합니다. 지금 CLI는 ZIP을 자동 해제하지 않습니다.</p></details>
    </div></section>`;
  }
  function manualPage(name) {
    switch (name) {
      case 'collect': return collectPage();
      case 'analyze': return analyzePage();
      case 'terms': return termsPage();
      case 'mapping': return mappingPage();
      case 'rehearse': return rehearsePage();
      case 'report': return reportPage();
      default: return '';
    }
  }
  function collectPage() {
    return title('01 / COLLECT', '원천 자료는 로컬에서, 검토는 한 화면에서.', 'DB별 연결 조건과 소스 준비 과정을 먼저 확인합니다. 모든 입력·진단·파일은 합성 예시이며 실제 연결이나 해제는 발생하지 않습니다.') + `
      <section class="local-architecture mb-5"><div><span class="eyebrow">RECOMMENDED / LOCAL FIRST</span><h2>내 PC의 전용 작업공간</h2><p class="mt-1 text-xs text-muted">브라우저 화면 → 로컬 실행기(JDBC · CLI · 압축 해제) → 원천 / 대상 DB</p></div>${badge('실행기 연동: 신규 설계','info')}
      <details><summary>실행 위치와 운영 방식 보기</summary><div class="grid-cards mt-4"><div><h3>기본: 담당자 PC / 전용 작업용 PC</h3><p class="mt-2 text-xs">소스와 비밀값은 로컬에 보관하고, DB는 원격이어도 됩니다. 브라우저가 JDBC를 실행하는 구조가 아닙니다. 실행기는 loopback에만 바인딩하고 세션 토큰·Origin 검증을 적용하는 설계입니다.</p></div><div><h3>예외: DB와 가까운 전용 실행 호스트</h3><p class="mt-2 text-xs">대용량·장시간·느린 VPN·PC 절전 위험이면 DB 네트워크의 임시 전용 호스트가 유리합니다. 온라인 업무 서버에 탑재하지 않고 같은 독립 실행 구조를 사용합니다. 다중 사용자 원격 제어는 별도 설계입니다.</p></div></div><p class="mt-4 text-xs text-muted">원천 DB → 실행기 → 대상 DB로 데이터가 이동합니다. 로컬 실행 자체가 더 빠르다고 보장하지 않습니다. 초기 이관 후 작업공간을 읽기 전용으로 보관하고 실행 권한·비밀 참조를 회수합니다.</p></details></section>
      <div class="intake-tabs" role="group" aria-label="원천 자료 종류"><button class="button" data-intake-tab="connection" aria-pressed="${state.intakeTab==='connection'}">1. DB · 스키마 ${badge(state.connected?'예시 준비됨':'재확인 필요',state.connected?'good':'warn')}</button><button class="button" data-intake-tab="source" aria-pressed="${state.intakeTab==='source'}">2. 레거시 소스 ${badge(state.scanned?'부분 근거 확보':'준비 필요',state.scanned?'good':'warn')}</button></div>
      ${state.intakeTab==='source'?sourcePanel():`<div class="grid-cards mb-5">
        <label class="choice-card"><input type="radio" name="source-mode" value="db" ${state.mode==='db'?'checked':''} ${disabled(locked())}><span><strong>읽기 전용 DB 연결</strong><span class="subtext">DBMS에 맞춘 접속·조사 범위 설정</span></span></label>
        <label class="choice-card"><input type="radio" name="source-mode" value="ddl" ${state.mode==='ddl'?'checked':''} ${disabled(locked())}><span><strong>스키마 파일 가져오기</strong><span class="subtext">연결이 어려우면 DDL로 의미 검토 시작</span></span></label>
      </div><section class="panel"><div class="panel-head"><h2>${state.mode==='db'?'DB 원천 연결 설정':'스키마 파일 해석'}</h2>${badge('상세 폼·진단 UI: 신규 제안','info')}</div><div class="panel-body space-y-5">
      ${state.mode==='db'?connectionForm()+`<div class="diagnostic-controls">${selectField('db-failure','연결 진단 시나리오',state.db.failure,[['none','전체 통과 예시'],['driver','드라이버 없음'],['network','네트워크 접근 실패'],['tls','서버 인증서 검증 실패'],['auth','인증 실패'],['scope','스키마 / Owner 미확인'],['permission','조회 권한 부족']])}<button class="button primary" data-action="connect" ${disabled(locked())}>연결 진단 예시 실행</button><button class="button quiet" data-action="connect-error" ${disabled(locked())}>권한 부족 예시</button></div>`+diagnosisPanel():`<div class="callout"><strong>legacy_schema.sql · 합성 예시</strong><p class="mt-2 text-muted">DDL을 실행하지 않고 테이블·컬럼·PK/FK·코멘트를 해석하는 신규 importer 설계입니다. DBMS별 문법·문자 인코딩·미해석 구문을 보고합니다.</p></div><button class="button" data-action="schema" ${disabled(locked())}>스키마 파일 예시 선택</button><div id="connection-feedback" class="callout ${state.connected?'good':'warn'}">${state.connected?'스키마 예시 선택 완료. 실제 값·중복·NULL·유효 일자는 미측정입니다.':'스키마 예시를 선택하세요. 실제 파일은 읽지 않습니다.'}</div>`}
      <div class="flex justify-end"><button class="button" data-intake-tab="source">레거시 소스 준비 →</button></div></div></section>`}
      <div class="mt-5 flex flex-wrap items-center justify-between gap-3"><p class="text-xs text-muted">연결·소스 범위 변경 시 기존 검토와 리허설을 다시 요구합니다.</p><button class="button primary" data-action="analyze" ${disabled(!state.connected||locked())}>자료 분석 시뮬레이션 →</button></div>`;
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
    return `<label class="field mb-3">처리 방향<select class="input" id="disposition" ${disabled(locked())}><option value="archive" ${!registration ? 'selected' : ''}>기한을 정해 외부 보관</option><option value="register" ${registration ? 'selected' : ''}>표준 용어 등록 요청 · 실행 보류</option></select></label>${registration ? '<div class="callout warn">표준 담당자 확인과 실제 등록·메타 재조회 전까지 실행을 보류합니다.</div>' : `<label class="field mb-3">예시 보존 기한<input class="input" type="date" id="retention" value="${escape(state.retention)}" ${disabled(locked())}></label>`}`;
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
    const apply = () => { state.mode = mode; state.guided.profileReady = false; state.guided.detail = ''; state.connected = false; state.diagnosis = 'idle'; state.collected = false; state.reviewed = {}; invalidate('DB / 스키마 입력 경로 변경'); render(); notify('입력 경로가 바뀌어 기존 검토를 초기화했습니다.'); };
    if (count() || state.dryRun) { render(); ask('입력 경로를 바꿀까요?', '이 예시의 기존 검토와 리허설 결과가 초기화됩니다.', '경로 변경', apply); } else apply();
  }
  function invalidateConnection() {
    state.guided.profileReady = false;
    state.guided.detail = '';
    state.connected = false; state.collected = false; state.diagnosis = 'idle'; state.reviewed = {};
    invalidate('DB 연결 조건 변경 · 진단 및 검토 재확인');
  }
  function invalidateSource(phase = 'empty') {
    state.sourcePhase = phase; state.scanned = false; state.collected = false; state.reviewed = {};
    invalidate('소스 입력·분석 범위 변경 · 후속 검토 재확인');
  }
  function exportExample() {
    const example = { kind: 'migration-workspace-ux-example', simulationOnly: true, executableLedger: false, schemaVersion: 1, exampleDate: '2026-10-24',
      sourceMode: state.mode, revision: state.revision, reviews: rows.map(row => ({ syntheticSource: `${row.table}.${row.id}`, candidate: row.candidates[state.choices[row.id] || 0] || null, reviewed: Boolean(state.reviewed[row.id]), disposition: state.dispositions[row.id] || null, note: state.notes[row.id] || '', retentionUntil: state.dispositions[row.id] === 'archive' ? state.retention : null })),
      aiAssist: { simulationOnly: true, provider: state.ai.provider, route: state.ai.route, mockRequests: state.ai.requests, drafts: state.ai.drafts },
      rehearsal: state.dryRun, execution: state.execution, reconciliation: state.execution === 'done' ? { source: 12480, loaded: 12478, quarantined: 2 } : null, archived: state.archived };
    const url = URL.createObjectURL(new Blob([JSON.stringify(example, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'migration-review-simulation.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify('합성 검토 예시를 다운로드했습니다. 실제 실행 원장이 아닙니다.');
  }
  document.addEventListener('click', event => {
    const target = event.target.closest('button, a.brand'); if (!target || target.disabled) return;
    if (target.dataset.goto) return goto(target.dataset.goto);
    if (target.dataset.aiHelp !== undefined) { state.ai.helpStage = stage; state.ai.helpIndex = Number(target.dataset.aiHelp); render(); return; }
    if (target.dataset.intakeTab) { state.intakeTab = target.dataset.intakeTab; render(); return; }
    if (target.matches('a.brand')) { event.preventDefault(); return goto('start'); }
    if (target.dataset.row) { state.selected = target.dataset.row; render(); return; }
    if (target.dataset.filter) { state.filter = target.dataset.filter; render(); return; }
    const actions = {
      'toggle-navigation': () => setNavigation($('#navigation-toggle').getAttribute('aria-expanded') !== 'true'),
      'guided-reuse': () => { const g = state.guided; if (locked()) return; if (state.mode === 'ddl') { guidedSay('assistant','현재 스키마 파일 경로입니다. DB 연결을 준비하려면 질문에 답하며 연결 준비를 선택하세요. 파일 검토는 직접 설정에서 계속할 수 있습니다.'); render(); return; } g.profileReady = state.connected; g.phase = state.connected ? 'plan' : 'profile'; guidedSay('user','현재 입력을 재사용하겠습니다.'); guidedSay('assistant',state.connected ? '기존 연결 조건과 소스 준비 상태를 재사용합니다. 계획 범위만 확인해 주세요.' : '연결 준비가 완료되지 않아 로컬 프로필부터 확인하겠습니다.'); render(); },
      'guided-configure': () => { if (locked()) return; const configure = () => { if (state.mode !== 'db') { state.mode = 'db'; invalidateConnection(); } state.guided.phase = 'profile'; guidedSay('user','필요한 정보를 질문하며 연결을 준비해 주세요.'); render(); }; if (state.mode === 'ddl') ask('DB 연결 경로로 바꿀까요?', '기존 스키마 검토와 리허설의 재확인이 필요합니다. 실제 DB 작업은 하지 않습니다.', 'DB 연결 준비', configure); else configure(); },
      'guided-profile': () => { if (locked()) return; state.guided.profileReady = true; state.guided.phase = 'detail'; guidedSay('user','로컬 보안 입력을 마친 예시입니다.'); guidedSay('assistant',`접속 비밀은 대화에 남기지 않습니다. ${guidedTargetLabel()}만 추가 확인하겠습니다.`); render(); },
      'guided-detail': () => { const g = state.guided; if (g.detail !== 'confirmed' || locked()) return; g.phase = 'plan'; guidedSay('user',`${dbProfiles[state.db.vendor].database} / ${dbProfiles[state.db.vendor].schema}가 맞습니다.`); render(); },
      'guided-start': () => { const g = state.guided; if (locked() || !g.profileReady || state.mode !== 'db') return; g.approved = true; g.step = 0; g.permissionResolved = false; state.connected = false; state.collected = false; guidedSay('user','현재 범위의 읽기 작업을 진행해 주세요. · 모의 확인'); runGuided(); },
      'guided-pause': () => { const g = state.guided; if (g.status !== 'running') return; g.status = 'paused'; g.generation++; render(); },
      'guided-resume': () => { if (state.guided.status === 'paused') runGuided(); },
      'guided-permission': () => { if (state.guided.phase !== 'permission' || locked()) return; state.guided.permissionResolved = true; guidedSay('user','DB 관리자에게 권한을 확인하고 조치한 예시입니다.'); runGuided(); },
      'guided-manual': () => { state.intakeTab = 'connection'; goto('collect'); },
      'guided-source': () => { state.intakeTab = 'source'; goto('collect'); },
      'guided-answer': () => { const g = state.guided; if (!g.answer || g.phase !== 'meaning' || locked()) return; g.phase = 'review'; g.status = 'review'; guidedSay('user',g.answer === 'author' ? '문서를 작성한 사람입니다.' : g.answer === 'registrar' ? '문서를 등록한 사람입니다.' : '미확정으로 남겨 주세요.'); render(); },
      'guided-handoff': () => { const g = state.guided; if (g.phase !== 'review' || g.status === 'handed-off' || locked()) return; ask('답변을 검토 초안에 반영할까요?', 'REG_ID의 기존 메모를 보존하고 답변을 덧붙입니다. 해당 용어의 검토 완료와 리허설 확인은 해제하며, 다른 용어의 검토는 유지합니다.', '초안 반영', () => { const row = rows.find(item => item.id === 'REG_ID'); const note = `AI 질문에 대한 답변 초안: ${g.answer === 'author' ? '문서를 작성한 사람 · 작성자아이디 후보' : g.answer === 'registrar' ? '시스템에 등록한 사람 · 등록자아이디 후보' : '업무 의미 미확정 · 추가 확인 필요'}`; if (g.answer !== 'unknown') state.choices.REG_ID = g.answer === 'author' ? 0 : 1; state.notes.REG_ID = [state.notes.REG_ID ?? row.note,note].filter(Boolean).join('\n\n'); delete state.reviewed.REG_ID; g.applying = true; invalidate('AI 질문 답변을 검토 초안에 반영'); g.applying = false; g.approved = false; g.status = 'handed-off'; state.selected = 'REG_ID'; goto('terms'); notify('직접 검토 화면으로 이어왔습니다. 업무 확정과 실제 실행은 별도입니다.'); }); },
      'ai-open': () => { state.ai.open = true; render(); $('#ai-panel summary').focus(); $('#ai-panel').scrollIntoView({ block: 'nearest' }); },
      'ai-connect': () => { if (state.archived || state.ai.provider === 'none' || state.ai.route === 'handoff') return; clearAiContext(); state.ai.status = 'pending'; render(); },
      'ai-auth-complete': () => { if (state.archived || state.ai.status !== 'pending') return; state.ai.status = 'ready'; state.ai.open = true; render(); notify('인증 완료 상태를 가정했습니다. 실제 계정 연결이나 전송은 없었습니다.'); },
      'ai-disconnect': () => { clearAiContext(); state.ai.status = 'disconnected'; render(); },
      'ai-preview': () => { if (!aiAllowed()) return; state.ai.previewKey = aiKey(); state.ai.consentKey = null; state.ai.error = ''; render(); },
      'ai-request': requestAiExample,
      'ai-apply': applyAiExample,
      'ai-undo': () => { if (!canUndoAi()) return; const undo = state.ai.undo; state.notes[undo.rowId] = undo.beforeNote; state.choices[undo.rowId] = undo.beforeChoice; delete state.reviewed[undo.rowId]; state.ai.drafts = state.ai.drafts.filter(draft => draft !== undo.draft); state.ai.undo = null; clearAiContext(); invalidate('AI 용어 초안 적용 취소 · 재검토 필요'); render(); notify('기존 후보와 메모로 복원했습니다. 검토 완료 상태는 자동 복원하지 않습니다.'); },
      'ai-dismiss': () => { state.ai.result = null; render(); },
      reset: () => ask('예시를 초기화할까요?', '이 브라우저 화면에서 선택한 검토·리허설 상태가 초기화됩니다. 다운로드한 파일은 그대로 남습니다.', '초기화', () => { state = initial(); goto('terms'); notify('처음의 합성 시나리오로 돌아왔습니다.'); }),
      'cancel-dialog': () => $('#confirm-dialog').close(), export: exportExample,
      connect: () => { if (locked()) return; invalidateConnection(); state.diagnosis = state.db.failure === 'none' ? 'pass' : state.db.failure; state.connected = state.diagnosis === 'pass'; render(); },
      'connect-error': () => { if (locked()) return; invalidateConnection(); state.db.failure = 'permission'; state.diagnosis = 'permission'; render(); },
      schema: () => { if (locked()) return; state.connected = true; render(); notify('합성 스키마를 선택했습니다. 실제 파일을 읽지 않았습니다.'); },
      'pick-source': () => { if (locked()) return; invalidateSource('selected'); render(); },
      'source-preflight': () => { if (locked() || state.sourcePhase !== 'selected') return; state.sourcePhase = state.sourceKind === 'zip' && state.archiveCase !== 'normal' ? 'blocked' : 'checked'; render(); },
      'source-extract': () => { if (locked() || state.sourcePhase !== 'checked') return; state.sourcePhase = 'ready'; render(); notify(state.sourceKind === 'zip' ? '로컬 압축 해제 결과를 가정했습니다. 실제 파일을 처리하지 않았습니다.' : '선택한 디렉터리의 분석 범위를 확정한 예시입니다.'); },
      source: () => { if (locked() || state.sourcePhase !== 'ready') return; state.sourcePhase = 'done'; state.scanned = state.sourceRoot === 'all'; state.reviewed = {}; invalidate('소스 근거 예시 분석'); render(); },
      'no-source': () => { if (locked()) return; invalidateSource(); render(); },
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
    if (input.id === 'review-note' && $('#ai-panel')) $('#ai-panel').outerHTML = aiPanel();
  });
  document.addEventListener('toggle', event => { if (event.target.id === 'ai-panel') state.ai.open = event.target.open; }, true);
  document.addEventListener('change', event => {
    const input = event.target;
    if (input.id === 'guided-detail' && !locked()) { state.guided.detail = input.value; render(); return; }
    if (input.id === 'guided-answer' && !locked()) { state.guided.answer = input.value; render(); return; }
    if (input.id === 'guided-scenario' && !locked()) { state.guided.scenario = input.value; render(); return; }
    if (input.name === 'ai-provider' && !state.archived) { state.ai.provider = input.value; state.ai.route = aiProviders[input.value].routes[0][0]; state.ai.status = 'disconnected'; clearAiContext(); render(); return; }
    if (input.id === 'ai-route' && !state.archived) { state.ai.route = input.value; state.ai.status = 'disconnected'; clearAiContext(); render(); return; }
    if (input.id === 'ai-budget' && !state.archived) { state.ai.budget = Number(input.value); render(); return; }
    if (input.id === 'ai-scenario' && !state.archived) { state.ai.scenario = input.value; clearAiContext(); render(); return; }
    if (input.id === 'ai-consent') { state.ai.consentKey = input.checked && aiAllowed() && state.ai.previewKey === aiKey() ? aiKey() : null; render(); return; }
    if (input.id.startsWith('db-') && !locked()) {
      const key = input.id.slice(3);
      if (key === 'vendor') { const vendor = Object.keys(dbProfiles).find(name => name === input.value); if (vendor) state.db = defaultDb(vendor); } else state.db[key] = input.value;
      invalidateConnection(); render(); return;
    }
    if (input.name === 'source-kind' && !locked()) { state.sourceKind = input.value; state.archiveCase = 'normal'; invalidateSource(); render(); return; }
    if (input.id === 'archive-case' && !locked()) { state.archiveCase = input.value; invalidateSource(); render(); return; }
    if (['source-root', 'source-encoding'].includes(input.id) && !locked()) { state[input.id === 'source-root' ? 'sourceRoot' : 'sourceEncoding'] = input.value; invalidateSource('checked'); render(); return; }
    if (input.name === 'source-mode' && !locked()) return changeMode(input.value);
    if (input.name === 'candidate' && !locked()) { state.choices[state.selected] = Number(input.value); state.notes[state.selected] = ''; delete state.reviewed[state.selected]; invalidate(`${state.selected} 표준 후보 변경`); render(); }
    if (input.id === 'disposition' && !locked()) { state.dispositions[state.selected] = input.value; delete state.reviewed[state.selected]; invalidate('미확정 컬럼 처리 변경'); render(); }
    if (input.id === 'retention' && !locked()) { state.retention = /^\d{4}-\d{2}-\d{2}$/.test(input.value) ? input.value : ''; delete state.reviewed[state.selected]; invalidate('보존 기한 변경'); render(); }
    if (input.dataset.rule && !locked() && state.mode !== 'ddl') { state.rules[input.dataset.rule] = input.checked; invalidate('변환 규칙 검토 변경', true); render(); }
    if (input.dataset.check && state.dryRun && !locked()) { state.checks[input.dataset.check] = input.checked; render(); }
    if (input.dataset.acceptance && state.execution === 'done' && !state.archived) { state.acceptance[input.dataset.acceptance] = input.checked; render(); }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !$('#confirm-dialog').open && matchMedia('(width < 64rem)').matches && $('#navigation-toggle').getAttribute('aria-expanded') === 'true') {
      setNavigation(false); $('#navigation-toggle').focus();
    }
  });
  window.addEventListener('hashchange', () => { const key = stageFromHash(); if (key && stage !== key) goto(key); });
  render();
})();
