/* The public Atlas is generated as one portable document; all catalog text is untrusted data. */
(() => {
  'use strict';
  const panelIds = ['start', 'map', 'domains', 'flows', 'rules', 'data', 'change', 'verification', 'operations', 'evidence'];
  const aliases = {
    welcome: 'start', onboarding: 'start', constitution: 'rules', skills: 'rules',
    sop: 'verification', harnesses: 'verification', workflow: 'change', simulator: 'change',
    ralph: 'change', db: 'data', migration: 'data', gaps: 'evidence',
  };
  const labels = {
    modules: '구성 모듈', domains: '도메인 소스', profiles: '재사용 프로필', packs: '기능 pack',
    routes: '화면 역량', operations: 'API operation', constitutions: '헌법 조항',
    gates: '검증 게이트', runners: '실행 runner', executionProfiles: '검증 실행 프로필',
    requiredChecks: '필수 CI 검사', workflows: '워크플로', documents: '문서',
    decisions: '결정', gaps: '미해결 위험', memory: '공용 메모리',
  };
  const themeKey = 'egov-atlas-theme';
  const entries = [];
  let data;
  let currentPanel = 'start';
  let searchLimit = 40;
  let printState = [];

  function statusLabel(status) {
    const names = {
      'source-defined': '소스 정의', 'source-inventory': '소스 목록',
      'declared-profile': '프로필 선언', 'declared-pack': 'pack 선언',
      'documented-operation': 'API 문서 정의', 'normative-source': '헌법 원문',
      'registered-gate': '게이트 등록', 'registered-runner': 'runner 등록',
      'registered-execution-profile': '실행 프로필 등록', 'required-manifest': '필수 검사 명세',
      'static-declaration': '정적 선언 · 운영 미확인', 'source-document': '참조 문서',
      unverified: '미확인', UNVERIFIED: '미확인', partial: '일부 확인',
      unavailable: '사용 불가', unwired: '소비 경로 미연결', 'superseded-surface': '대체된 API 표면',
      'bff-route-handler': 'BFF 경로', accepted: '승인 기록', superseded: '대체됨',
    };
    return names[status] || (String(status).length > 55 ? '원문 상태 확인' : status);
  }

  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = String(text);
    if (className) node.className = className;
    return node;
  }

  function sourceUrl(source) {
    if (typeof source !== 'string' || !source) return null;
    if (/^https:\/\//i.test(source)) return source;
    if (/^(?:[a-z]+:|\/|\\)/i.test(source) || source.split(/[\\/]/).includes('..')) return null;
    const [file, anchor] = source.split('#');
    return 'https://github.com/lkindo/egov-enterprise/blob/main/'
      + file.split('/').map(encodeURIComponent).join('/') + (anchor ? '#' + encodeURIComponent(anchor) : '');
  }

  function sourceLink(label, source) {
    const url = sourceUrl(source);
    if (!url) return element('span', label + ' · 원본 경로 확인 필요');
    const a = element('a', label, 'source-link');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    return a;
  }

  function domId(kind, id) {
    return 'atlas-' + kind + '-' + encodeURIComponent(id);
  }

  function renderCatalogs() {
    const sourceDigests = new Map(data.sources.map(source => [source.path, source.digest]));
    for (const [kind, records] of Object.entries(data.catalogs)) {
      const slot = document.querySelector('[data-catalog="' + kind + '"]');
      if (!slot) throw new Error('Missing catalog slot: ' + kind);
      const topic = slot.closest('.atlas-panel')?.id.replace('content-', '');
      if (!panelIds.includes(topic)) throw new Error('Missing catalog topic: ' + kind);
      const controls = element('div', undefined, 'catalog-controls');
      const count = element('p', records.length + '개 항목 · 소스 인벤토리이며 운영 완료 수치가 아닙니다.', 'meta');
      const label = element('label', '목록 내 검색 ');
      const filter = element('input');
      filter.type = 'search';
      filter.placeholder = '이름·ID·원본·상태';
      filter.setAttribute('aria-label', (labels[kind] || kind) + ' 목록 내 검색');
      label.append(filter);
      controls.append(count, label);
      const grid = element('div', undefined, 'catalog-grid');
      const cards = [];
      for (const record of records) {
        const card = element('details', undefined, 'catalog-card');
        card.id = domId(kind, record.id);
        card.dataset.recordId = record.id;
        card.dataset.catalogKind = kind;
        card.dataset.recordStatus = record.status || 'unverified';
        const summary = element('summary');
        summary.append(element('strong', record.title || record.id));
        summary.append(element('span', statusLabel(record.status || 'unverified'), 'badge'));
        const content = element('div', undefined, 'catalog-detail');
        content.append(element('p', record.id, 'meta'), element('p', record.summary || '세부 의미는 연결된 원본에서 확인합니다.'));
        if (record.status) content.append(element('p', '상태 원문: ' + record.status, 'meta'));
        if (record.details?.length) {
          const dl = element('dl');
          for (const detail of record.details) {
            dl.append(element('dt', detail.label));
            const value = typeof detail.value === 'object' ? JSON.stringify(detail.value, null, 2) : String(detail.value ?? '');
            dl.append(element('dd', value));
          }
          content.append(dl);
        }
        const links = element('div', undefined, 'catalog-links');
        links.append(sourceLink('원본 · ' + record.source, record.source));
        for (const link of record.links || []) links.append(sourceLink(link.label, link.path));
        content.append(links);
        const fingerprint = sourceDigests.get(record.source?.split('#')[0]);
        if (fingerprint) content.append(element('p', '확인한 소스 SHA-256 ' + fingerprint, 'source-digest meta'));
        card.append(summary, content);
        grid.append(card);
        const searchText = [record.id, record.title, record.summary, record.status, record.source,
          ...(record.details || []).map(detail => detail.label + ' ' + String(detail.value)),
          ...(record.links || []).map(link => link.label + ' ' + link.path),
        ].join(' ').toLocaleLowerCase();
        const entry = { title: record.title || record.id, kind, topic, target: card.id, summary: record.summary,
          status: record.status, source: record.source, searchText };
        entries.push(entry);
        cards.push({ card, searchText });
      }
      filter.addEventListener('input', () => {
        const query = filter.value.trim().toLocaleLowerCase();
        let visible = 0;
        for (const entry of cards) {
          entry.card.hidden = !entry.searchText.includes(query);
          if (!entry.card.hidden) visible++;
        }
        count.textContent = visible + ' / ' + records.length + '개 항목 · 소스 정의와 실제 운영 상태를 구분하세요.';
      });
      slot.replaceChildren(controls, grid);
      slot.dataset.renderedCount = String(records.length);
    }
  }

  function showPanel(panel, target, focus = false) {
    const targetPanel = target && document.getElementById(target)?.closest('.atlas-panel')?.id.replace('content-', '');
    currentPanel = targetPanel || (panelIds.includes(panel) ? panel : 'start');
    for (const id of panelIds) {
      const section = document.getElementById('content-' + id);
      if (!section) throw new Error('Missing topic: ' + id);
      section.hidden = id !== currentPanel;
    }
    for (const link of document.querySelectorAll('a[data-panel]')) {
      if (link.dataset.panel === currentPanel) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
    document.body.dataset.activePanel = currentPanel;
    const node = target ? document.getElementById(target) : null;
    if (node) {
      const slot = node.closest('[data-catalog]');
      const filter = slot?.querySelector('input[type="search"]');
      if (filter) {
        filter.value = '';
        filter.dispatchEvent(new Event('input'));
      }
      let ancestor = node;
      while (ancestor && ancestor !== document.body) {
        if (ancestor.tagName === 'DETAILS') ancestor.open = true;
        ancestor = ancestor.parentElement;
      }
      if (focus) {
        const focusTarget = node.querySelector('summary') || node;
        if (!focusTarget.matches('a,button,input,select,textarea,summary,[tabindex]')) focusTarget.setAttribute('tabindex', '-1');
        focusTarget.focus();
      }
      node.scrollIntoView?.({ block: 'center', behavior: 'auto' });
    } else if (focus) {
      const heading = document.getElementById('heading-' + currentPanel);
      heading?.setAttribute('tabindex', '-1');
      heading?.focus();
    }
  }

  function followHash(focus = false, requestedHash = location.hash) {
    let hash;
    try { hash = decodeURIComponent(requestedHash.slice(1)); } catch { hash = ''; }
    // Narrative links and the skip link are native anchors, not topic names.
    const anchor = document.getElementById(hash) || document.getElementById(requestedHash.slice(1));
    if (anchor) {
      const owner = anchor.closest('.atlas-panel');
      showPanel(owner ? owner.id.replace('content-', '') : currentPanel, anchor.id, focus);
      return;
    }
    const [rawPanel, target] = hash.split('/');
    const name = (rawPanel || 'start').replace(/^(?:content|tab)-/, '');
    const panel = aliases[name] || name;
    const legacyTarget = name === 'migration' ? 'migration-flow' : name === 'db' ? 'field-change-flow' : undefined;
    // Record IDs contain encoded path separators. Preserve the encoded target as stored in the DOM.
    const rawTarget = requestedHash.slice(1).split('/').slice(1).join('/');
    showPanel(panel, rawTarget || target || legacyTarget, focus);
  }

  function renderSearch() {
    const input = document.getElementById('atlas-search');
    const list = document.getElementById('search-results');
    const status = document.getElementById('search-status');
    if (!input || !list || !status) return;
    const query = input.value.trim().toLocaleLowerCase();
    list.replaceChildren();
    if (!query) { status.textContent = '도메인·규칙·명령·문서 이름으로 찾으세요.'; return; }
    const terms = query.split(/\s+/);
    const matches = entries.filter(entry => terms.every(term => entry.searchText.includes(term)));
    status.textContent = matches.length + '개 결과 · ' + Math.min(searchLimit, matches.length) + '개 표시';
    for (const entry of matches.slice(0, searchLimit)) {
      const item = element('li');
      const a = element('a', entry.title);
      a.href = '#' + entry.topic + '/' + entry.target;
      item.append(a, element('span', labels[entry.kind] || '설명', 'badge'));
      item.append(element('span', statusLabel(entry.status || 'source-defined'), 'badge'));
      const topicLabel = document.querySelector('nav a[data-panel="' + entry.topic + '"]')?.textContent;
      item.append(element('p', '주제 · ' + (topicLabel || entry.topic), 'meta'));
      if (entry.summary) item.append(element('p', entry.summary.slice(0, 200), 'meta'));
      if (entry.source) item.append(sourceLink('원본 · ' + entry.source, entry.source));
      list.append(item);
    }
    if (matches.length > searchLimit) {
      const item = element('li');
      const more = element('button', '결과 40개 더 보기');
      more.type = 'button';
      more.addEventListener('click', () => { searchLimit += 40; renderSearch(); });
      item.append(more); list.append(item);
    }
  }

  const advice = {
    docs: ['npm run atlas:check', 'npm run verify:docs', '문서·메모리·링크·Atlas 계약. Atlas 입력을 수정하면 먼저 atlas:build로 생성합니다.'],
    api: ['npm run verify:be', 'npm run verify:fe', 'API/DTO 변경은 OpenAPI·생성 TS/Zod와 양쪽 영향 검증이 필요합니다. 실제 화면 흐름은 별도 E2E로 확인합니다.'],
    ui: ['npm run verify:fe', 'npm run verify:e2e', '프론트 타입·lint·생성 계약·build·coverage와 실행 중인 격리 서비스의 브라우저 과업을 확인합니다.'],
    db: ['npm run verify:full', 'npm run verify:e2e', '먼저 live metadata와 표준, 기존 데이터 영향을 확인합니다. full의 PostgreSQL 검증은 Docker가 필요하며 운영 DB 적용을 증명하지 않습니다.'],
    gate: ['npm run verify:docs', 'npm run verify:full', '변경한 게이트의 직접 실행과 의도적 위반 red, runner·CI 실행 연결을 확인합니다. full은 원격 ruleset을 확인하지 않습니다.'],
  };

  function renderAdvice() {
    const kind = document.getElementById('change-kind')?.value || 'docs';
    const slot = document.getElementById('verification-advice');
    if (!slot) return;
    slot.replaceChildren();
    const chosen = advice[kind] || advice.docs;
    for (const command of chosen.slice(0, -1)) slot.append(element('pre', command));
    slot.append(element('p', chosen.at(-1)));
    slot.append(element('p', '교육용 선택표입니다. 실제 검증을 실행하거나 승인·통과 상태를 만들지 않습니다.', 'meta'));
  }

  function initFailureSimulator() {
    const slot = document.getElementById('failure-simulator');
    if (!slot) throw new Error('Missing failure simulator');
    slot.replaceChildren(element('h3', '상황을 골라 다음 판단 연습하기'),
      element('p', '가상의 사례에서 확인할 근거와 다음 행동을 고릅니다. 실제 명령·승인·검사 결과는 생성하지 않습니다.', 'meta'));
    const controls = element('div', undefined, 'verification-picker');
    const scenarios = [
      ['ready', '범위 안의 변경 · 검증 준비'], ['red', '검사 실패 · 같은 원인'],
      ['unknown', '운영 성공 근거 미확인'], ['approval', '승인 밖의 운영 대상 변경'],
    ];
    const scenario = element('select');
    scenario.id = 'failure-case';
    const scenarioLabel = element('label', '학습 상황');
    scenarioLabel.htmlFor = scenario.id;
    for (const [value, title] of scenarios) {
      const option = element('option', title); option.value = value; scenario.append(option);
    }
    const attempts = element('select');
    attempts.id = 'failure-count';
    const attemptsLabel = element('label', '같은 원인 실패 횟수');
    attemptsLabel.htmlFor = attempts.id;
    for (const value of [1, 2, 3]) {
      const option = element('option', value + '회'); option.value = String(value); attempts.append(option);
    }
    const result = element('div');
    result.id = 'failure-advice';
    result.setAttribute('role', 'status'); result.setAttribute('aria-live', 'polite');
    scenario.setAttribute('aria-controls', result.id); attempts.setAttribute('aria-controls', result.id);
    controls.append(scenarioLabel, scenario, attemptsLabel, attempts);
    slot.append(controls, result);
    function render() {
      attempts.disabled = scenario.value !== 'red';
      const stop = scenario.value === 'red' && Number(attempts.value) >= 3;
      const paths = {
        ready: ['진행 전 확인', '현재 요청의 범위·git diff·소비자와 원본을 확인합니다.', '최소 변경 → 영향 검사 → 결과·한계 기록 순서로 진행합니다. 이미 포함된 변경 권한은 다시 승인받지 않습니다.'],
        red: stop
          ? ['재시도 종료 · 보고', '같은 원인의 실패 3회, 사용한 가설·테스트·로그와 수정 이력을 모읍니다.', '추가 직접 재시도를 멈추고 현재 증거, 영향, 다음 선택지를 사용자에게 보고합니다.']
          : ['증거 확인 → 최소 수정 → 재검증', '실패 메시지와 대상 파일·DOM/trace·백엔드 로그 또는 실제 DB metadata를 해당 문제에 맞게 대조합니다.', '원인 가설을 검증하고 원인에 맞는 최소 수정을 합니다. 테스트를 약화하거나 baseline·예외를 늘려 신호를 숨기지 않습니다.'],
        unknown: ['미확인 유지 · 증거 확보', '대상 환경·확인 시각·artifact가 있는지 찾습니다. 로컬 성공이나 과거 기록으로 현재 운영 성공을 판정하지 않습니다.', '실제 과업 검증이 가능한 조건과 남은 불확실성을 기록하고 관련 GAP·운영 런북으로 연결합니다.'],
        approval: ['승인 경계에서 대기', '현재 요청이 정확한 운영 대상과 영향을 승인했는지 확인합니다. 포괄 승인만으로 새 DB/운영 대상을 변경하지 않습니다.', '가능한 읽기 조사·가역적 준비를 마친 뒤 검토 가능한 변경안과 대상·영향을 제시합니다. 필요한 명시 승인 전에는 해당 변경을 실행하지 않습니다.'],
      };
      const [stage, evidence, action] = paths[scenario.value] || paths.ready;
      result.replaceChildren(element('h4', stage));
      result.dataset.branch = stop ? 'stop' : scenario.value;
      const steps = element('ol');
      steps.append(element('li', '현재 단계: ' + stage), element('li', '확인 근거: ' + evidence), element('li', '다음 행동: ' + action));
      result.append(steps, sourceLink('공통 규칙 · 안전·실패 경계', 'AGENTS.md'),
        element('span', ' · '), sourceLink('작업 등급·실행 단계 정본', 'docs/03-guides/orchestration-protocol.md'));
    }
    scenario.addEventListener('change', render); attempts.addEventListener('change', render); render();
  }

  function initTheme() {
    let saved;
    try { saved = localStorage.getItem(themeKey); } catch { saved = null; }
    document.documentElement.dataset.theme = saved === 'dark' ? 'dark' : 'light';
    const button = document.getElementById('theme-toggle');
    const update = () => {
      if (!button) return;
      const dark = document.documentElement.dataset.theme === 'dark';
      button.textContent = dark ? '밝은 화면' : '어두운 화면';
      button.setAttribute('aria-pressed', String(dark));
    };
    button?.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem(themeKey, next); } catch { /* Theme still works without storage. */ }
      update();
    });
    update();
  }

  function preparePrint() {
    if (printState.length) return;
    printState = [...document.querySelectorAll('details')].map(node => ({ node, open: node.open, hidden: node.hidden }));
    for (const { node } of printState) {
      if (document.body.dataset.printScope === 'all' || node.closest('#content-' + currentPanel)) {
        node.open = true;
        node.hidden = false;
      }
    }
  }
  function finishPrint() {
    for (const { node, open, hidden } of printState) { node.open = open; node.hidden = hidden; }
    printState = [];
  }

  function initialize() {
    try {
      data = JSON.parse(document.getElementById('atlas-catalog-data').textContent);
      if (data.schemaVersion !== 1 || !data.catalogs || !data.sources) throw new Error('Invalid Atlas source catalog');
      renderCatalogs();
      initFailureSimulator();
      for (const node of document.querySelectorAll('[data-fact]')) {
        if (!Object.hasOwn(data.facts, node.dataset.fact)) throw new Error('Unknown fact: ' + node.dataset.fact);
        node.textContent = String(data.facts[node.dataset.fact]);
      }
      for (const panel of document.querySelectorAll('.atlas-panel')) {
        let headingIndex = 0;
        for (const heading of panel.querySelectorAll('h1,h2,h3,h4,figcaption')) {
          if (heading.closest('[data-catalog]')) continue;
          if (!heading.id) heading.id = 'narrative-' + panel.id.replace('content-', '') + '-' + (++headingIndex);
        }
        // Index narrative independently of large generated catalogs.
        const clone = panel.cloneNode(true);
        for (const catalog of clone.querySelectorAll('[data-catalog]')) catalog.remove();
        for (const heading of clone.querySelectorAll('h1,h2,h3,h4,figcaption')) {
          const target = document.getElementById(heading.id);
          if (!target) continue;
          const context = heading.parentElement;
          const source = context.querySelector('a[href^="https://"]')?.getAttribute('href');
          entries.push({ title: heading.textContent, kind: 'narrative', topic: panel.id.replace('content-', ''),
            target: heading.id, summary: context.textContent.trim().slice(0, 200), source,
            status: 'source-defined', searchText: context.textContent.toLocaleLowerCase() });
        }
      }
      const input = document.getElementById('atlas-search');
      input?.addEventListener('input', () => { searchLimit = 40; renderSearch(); });
      input?.addEventListener('keydown', event => {
        if (event.key === 'Escape') { input.value = ''; renderSearch(); }
      });
      document.getElementById('search-results')?.addEventListener('click', event => {
        const targetHash = event.target.closest('a')?.getAttribute('href');
        if (targetHash?.startsWith('#')) setTimeout(() => followHash(true, targetHash), 0);
      });
      document.querySelector('nav')?.addEventListener('keydown', event => {
        const links = [...document.querySelectorAll('nav a[data-panel]')];
        const index = links.indexOf(event.target);
        if (index < 0 || !['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? links.length - 1
          : (index + (['ArrowDown', 'ArrowRight'].includes(event.key) ? 1 : -1) + links.length) % links.length;
        links[next].focus();
      });
      window.addEventListener('hashchange', () => followHash());
      document.getElementById('change-kind')?.addEventListener('change', renderAdvice);
      const scope = document.getElementById('print-scope');
      document.body.dataset.printScope = scope?.value || 'all';
      scope?.addEventListener('change', () => { document.body.dataset.printScope = scope.value; });
      document.getElementById('print-button')?.addEventListener('click', () => window.print());
      window.addEventListener('beforeprint', preparePrint);
      window.addEventListener('afterprint', finishPrint);
      initTheme(); renderAdvice(); renderSearch(); followHash();
      const evidence = document.getElementById('source-fingerprint');
      if (evidence) evidence.textContent = '소스 묶음 SHA-256: ' + data.sourceDigest;
      document.body.dataset.atlasReady = 'true';
      document.dispatchEvent(new CustomEvent('atlas:ready'));
    } catch (error) {
      document.body.dataset.atlasReady = 'error';
      const message = element('p', '목록을 표시하지 못했습니다. 아래 본문과 문서 원본을 확인하고 생성 검사를 실행해 주세요.', 'atlas-error');
      message.setAttribute('role', 'alert');
      document.querySelector('main')?.prepend(message);
      console.error('Atlas initialization failed', error);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
