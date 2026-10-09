// 생성 전 최종 확인(설계서 19장, E5): 이 컴퓨터의 생성 환경을 점검하고, 소스를 정밀 점검하고, 구성을 한 번 더 보인다.
// 차단 항목이 있거나 점검을 마치지 못하면 생성 시작을 잠그고 그 이유를 버튼 설명으로 단다.
const PREFLIGHT_STATUS_LABELS = Object.freeze({ pass: '통과', warn: '확인 필요', block: '차단' });
const PREFLIGHT_STATUS_CLASSES = Object.freeze({ pass: 'text-muted', warn: 'text-ink', block: 'text-danger' });
const DEEP_FILES_SHOWN = 5;
// 코드가 붙은 정밀 점검 실패는 다시 점검해도 같다. 생성 시작을 잠근 이유에 실제로 할 일을 적는다.
const DEEP_FAILURE_REASONS = Object.freeze({
  'reload-source': '지금 원본으로는 이 구성을 생성할 수 없습니다. 새 원본으로 다시 불러온 뒤 확인하세요.',
  'copy-command': '메뉴 미리보기 자료가 낡아 생성할 수 없습니다. 안내한 명령으로 갱신한 뒤 다시 점검하세요.',
  'show-violations': '기능 선언이 원본 코드와 맞지 않아 생성할 수 없습니다. 개발자 정보의 위반을 고친 뒤 다시 점검하세요.',
});

/** 화면 모듈(app.js)의 도구를 받아 최종 확인 창을 연결하고 `open` 을 돌려준다. */
export function createFinalConfirmation({ $, text, api, recipe, label, state, validateName, generate, renderFailureActions, reloadCatalog }) {
  let checkVersion = 0;
  // 원본이 바뀌었으면(SOURCE_CHANGED) 창을 닫고 입력을 둔 채 기능 목록을 새 원본으로 다시 받는다.
  const reloadFromDialog = options => { $('confirm-dialog').close(); reloadCatalog(options); };
  function confirmRow(term, value) {
    const row = text('div', '');
    row.append(text('dt', term, 'text-xs font-semibold text-muted'), text('dd', value, 'break-words'));
    return row;
  }
  function renderConfirmSummary(plan) {
    const direct = (plan.selectedDomains ?? []).map(label);
    const automatic = (plan.autoIncluded ?? []).map(item => `${label(item.domain)}(자동)`);
    const degraded = plan.degradationNotes ?? [];
    const requirements = plan.requirements ?? [];
    const unassigned = plan.unassignedPermissions ?? [];
    $('confirm-summary').replaceChildren(
      confirmRow('업무 기능', `직접 ${direct.length} · 자동 ${automatic.length}${direct.length + automatic.length ? ` — ${[...direct, ...automatic].join(', ')}` : ' — 공통 기반만'}`),
      confirmRow('테이블 · 권한 · 메뉴', `${plan.tables?.length ?? 0} · ${plan.permissionCodes?.length ?? 0} · ${plan.menus?.length ?? 0}`),
      confirmRow('기능 저하', degraded.length ? degraded.map(group => group.heading).join(' / ') : '없음'),
      confirmRow('외부 설정', requirements.length ? requirements.join(', ') : '없음'),
      confirmRow('생성 뒤 할 일', unassigned.length ? `권한 ${unassigned.length}개는 자동 배정되지 않습니다: ${unassigned.map(row => row.name).join(', ')}` : '없음'),
      confirmRow('검증', '계획 단계 검사(필수 외래 키와 기능 선언)는 통과했습니다. 생성할 때 DB 구성, 소스 구성, 의존성 설치, 전체 기술 검증을 차례로 거칩니다. 의존성 설치와 전체 검증에는 시간이 걸릴 수 있습니다.'),
    );
  }
  // 생성 환경을 점검하고 { reason, failed } 를 돌려준다(reason 이 없으면 통과). 앞선 점검의 늦은 답은 화면을 바꾸지 않는다.
  // 상태 문장은 환경 점검만 말한다. 소스 정밀 점검이 남아 있으므로 '생성할 수 있다' 고 말하지 않는다.
  async function runPreflight(stale) {
    $('preflight-list').replaceChildren();
    $('preflight-status').textContent = '이 컴퓨터의 생성 환경을 점검하고 있습니다…';
    try {
      const { preflight } = await api('/api/preflight', { sourceCommit: state.catalog.sourceCommit });
      if (stale()) return null;
      $('preflight-list').replaceChildren(...preflight.checks.map(check => {
        const item = text('li', '', 'flex gap-2');
        item.append(text('span', PREFLIGHT_STATUS_LABELS[check.status], `shrink-0 font-semibold ${PREFLIGHT_STATUS_CLASSES[check.status]}`),
          text('span', check.detail ? `${check.label} · ${check.detail}` : check.label, 'min-w-0 break-words'));
        return item;
      }));
      const sourceChanged = preflight.checks.some(check => check.code === 'SOURCE_CHANGED');
      if (sourceChanged) renderFailureActions($('confirm-actions'), { action: 'reload-source' }, { onReload: reloadFromDialog });
      const count = status => preflight.checks.filter(check => check.status === status).length;
      $('preflight-status').textContent = preflight.blocked ? `차단 ${count('block')}건 · 확인 필요 ${count('warn')}건`
        : count('warn') ? `확인 필요 ${count('warn')}건이 있습니다. 경고는 생성을 막지 않습니다.` : '생성 환경 점검을 모두 통과했습니다.';
      return { reason: !preflight.blocked ? null : sourceChanged ? '원본이 바뀌어 생성할 수 없습니다. 새 원본으로 다시 불러온 뒤 확인하세요.'
        : '차단 항목을 해결한 뒤 다시 점검하세요.', failed: false };
    } catch (error) {
      if (stale()) return null;
      $('preflight-status').textContent = error.message;
      return { reason: '점검을 마치지 못해 생성할 수 없습니다. 다시 점검하세요.', failed: true };
    }
  }
  // 소스 정밀 점검(설계서 10장 plan/deep). 생성기가 걷을 파일과 검증 게이트를 같은 판정으로 미리 센다.
  function deepBlockerItem(blocker) {
    const item = text('li', '', 'flex gap-2');
    const body = text('span', '', 'min-w-0 break-words');
    body.append(text('span', blocker.label));
    const files = blocker.files ?? [];
    const total = blocker.fileCount ?? files.length;
    if (files.length) {
      const list = text('span', `: ${files.slice(0, DEEP_FILES_SHOWN).join(', ')}${total > DEEP_FILES_SHOWN ? ` 외 ${total - DEEP_FILES_SHOWN}개` : ''}`, 'font-mono text-xs');
      body.append(list);
    } else if (blocker.message) body.append(text('span', `: ${blocker.message}`, 'text-xs'));
    item.append(text('span', '차단', 'shrink-0 font-semibold text-danger'), body);
    return item;
  }
  async function runDeep(stale) {
    $('deep-status').textContent = '선택하지 않은 기능의 소스를 미리 걷어 보고 있습니다…';
    try {
      const { deep } = await api('/api/plan/deep', { recipe: recipe() });
      if (stale()) return null;
      $('deep-list').replaceChildren(...deep.blockers.map(deepBlockerItem));
      if (deep.blockers.length) {
        $('deep-status').textContent = `차단 ${deep.blockers.length}건 · ${deep.summary}`;
        return '소스 정밀 점검의 차단 항목을 해결한 뒤 다시 점검하세요.';
      }
      $('deep-status').textContent = `${deep.summary}. 지워지는 검증 게이트는 승인 목록과 같고, 선택한 기능의 소스와 화면 진입점은 남습니다.`;
      return null;
    } catch (error) {
      if (stale()) return null;
      $('deep-status').textContent = error.message;
      // 코드가 붙은 오류(원본 변경·낡은 메뉴 자료·선언 불일치)는 그 행동을 함께 보인다.
      renderFailureActions($('confirm-actions'), error, { onReload: reloadFromDialog });
      return DEEP_FAILURE_REASONS[error.action] ?? '정밀 점검을 마치지 못해 생성할 수 없습니다. 다시 점검하세요.';
    }
  }
  // 생성 환경 점검 뒤 소스 정밀 점검을 이어서 한다. 정밀 점검은 생성기 서버의 계산을 수 초 붙잡으므로
  // 환경 점검과 겹쳐 돌리지 않고, 환경이 이미 생성을 막거나 점검을 마치지 못하면 건너뛴다. 생성 시작은 둘 다 통과해야 열린다.
  async function runChecks() {
    const version = ++checkVersion;
    const stale = () => version !== checkVersion;
    // '다시 점검'은 잠그지 않는다. 포커스를 가진 버튼이 잠기면 모달 안 포커스가 사라진다. 진행 중 누름은 무시한다.
    $('confirm-start').disabled = true; $('preflight-retry').setAttribute('aria-disabled', 'true');
    $('confirm-blocked').hidden = true; $('confirm-blocked').textContent = '';
    $('confirm-actions').replaceChildren(); $('confirm-actions').hidden = true;
    $('deep-list').replaceChildren(); $('deep-status').textContent = '생성 환경 점검을 마치면 이어서 점검합니다.';
    try {
      const environment = await runPreflight(stale);
      if (stale()) return;
      let reason = environment.reason;
      if (reason) {
        $('deep-status').textContent = environment.failed ? '생성 환경 점검을 마치지 못해 소스 정밀 점검을 하지 않았습니다.'
          : '생성 환경의 차단 항목을 해결한 뒤 다시 점검하면 이어서 점검합니다.';
      } else reason = await runDeep(stale);
      if (stale()) return;
      if (reason) { $('confirm-blocked').textContent = reason; $('confirm-blocked').hidden = false; }
      else $('confirm-start').disabled = false;
    } finally {
      if (!stale()) $('preflight-retry').removeAttribute('aria-disabled');
    }
  }
  $('preflight-retry').addEventListener('click', () => { if ($('preflight-retry').getAttribute('aria-disabled') !== 'true') runChecks(); });
  // 창이 닫히면(돌아가기·Esc·생성 시작) 진행 중인 점검을 버린다. 그러지 않으면 닫힌 창을 위해 정밀 점검이 서버를 붙잡는다.
  // 버튼으로 닫으면 그 자리에서 바로 버린다. close 이벤트는 다음 화면 갱신 때 오므로, 그사이(Esc 직후 Enter) 창을 다시 열면
  // 새 점검을 버리게 된다. 그래서 close 이벤트는 창이 닫혀 있을 때만 버린다(다시 열면 runChecks 가 이전 점검을 이미 버렸다).
  // 모달은 닫힐 때 포커스를 생성 버튼으로 되돌린다.
  const dialog = $('confirm-dialog');
  const abandon = () => { checkVersion += 1; };
  $('confirm-cancel').addEventListener('click', () => { abandon(); dialog.close(); });
  dialog.addEventListener('close', () => { if (!dialog.open) abandon(); });
  // 생성 시작은 두 점검이 통과하거나 경고만 남았을 때만 열린다(runChecks).
  $('confirm-start').addEventListener('click', () => { abandon(); dialog.close(); generate(); });
  return {
    open() {
      if (state.busy || !state.plan || state.plan.blockers?.length || !validateName(true)) return;
      renderConfirmSummary(state.plan);
      $('confirm-dialog').showModal();
      runChecks();
    },
  };
}
