import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/*
 * 선택 연동(integrates, 설계서 9.1·B4). 'from' 기능은 'to' 기능 없이도 컴파일·기동·DB 생성이 되지만 동작 일부가
 * 조용히 빠진다. 계획은 그런 연동을 '기능 저하'로 알린다. 없으면 실패하는 관계는 requires 이고 여기 두지 않는다.
 *
 * 포함 규칙: from 기능의 동작이 줄어드는 것만 적는다. 빠진 기능 자신의 데이터·진입점만 사라지는 경우(공용 셸의
 * 메뉴·카드, 자기 행만 정리하는 리스너, 등록만 하는 기여자)는 적지 않는다. 화면 결합(shared-ui·ui-import)은
 * Phase 2 슬롯 전까지 requires 로 남고, 연동 종류도 event·port·fk-optional 셋뿐이다.
 *
 * 이벤트 연동의 근거는 손으로 적지 않는다. 카탈로그가 발행·수신 위치를 매번 계산하고(deriveEventTriples),
 * 계산된 연결은 INTEGRATES 또는 REGISTRATION_ONLY_EVENTS 중 정확히 한쪽에 있어야 한다.
 * Java 포트 연결도 계산한다(derivePortConnections, 11단계 C2). 계산된 (받는 기능 → 구현 기능, 포트)는 INTEGRATES(via port: 또는
 * ports) 또는 REGISTRATION_ONLY_PORTS 중 정확히 한쪽에 있어야 한다.
 * 포트·선택 FK 연동은 주석을 뺀 코드에서 정확히 한 번 나오는 문자열(anchor)로 근거를 단다.
 * 문장은 평서문으로 쓰고 내부 클래스·경로를 담지 않는다 — 계획 화면에 그대로 나간다.
 */
// 주소록의 수신자 피커 출처 기여(슬롯 단계 PR-4). 메일·문자 연동의 근거는 화면 쪽 사용 지점과 이 기여 파일이다.
const RECIPIENT_PICKER_CONTRIBUTION = 'frontend/src/extensions/addressbook/recipient-picker-sources.ts';

export const INTEGRATES = [
  { from: 'core', to: 'notification', via: 'event:NotificationRequestedEvent',
    reason: '알림 기능이 없으면 부서 업무의 담당자를 지정하거나 바꿔도 새 담당자에게 업무 배정 알림이 가지 않습니다.' },
  { from: 'board', to: 'notification', via: 'event:NotificationRequestedEvent',
    reason: '알림 기능이 없으면 다른 사람이 내 게시글에 댓글을 달아도 글쓴이에게 새 댓글 알림이 가지 않습니다.' },
  { from: 'informalsanction', to: 'notification', via: 'event:NotificationRequestedEvent',
    reason: '알림 기능이 없으면 결재 순서 도래, 회수, 반려, 보완 요청과 답변, 결재자 변경, 참조자 지정, 최종 결과가 앱 알림으로 전달되지 않습니다. 재알림·결재자 변경·참조자 지정 화면은 알린다고 안내하지만 실제로는 전달되지 않습니다.' },
  { from: 'memoreport', to: 'notification', via: 'event:NotificationRequestedEvent',
    reason: '알림 기능이 없으면 메모 보고가 도착하거나, 지시가 달리거나 바뀌거나, 지시가 달린 보고가 삭제되어도 당사자에게 알림이 가지 않습니다. 지시 변경 확인창은 알린다고 안내하지만 실제로는 전달되지 않습니다.' },
  { from: 'note', to: 'notification', via: 'event:NotificationRequestedEvent',
    reason: '알림 기능이 없으면 쪽지를 보내도 받는 사람에게 새 쪽지 알림이 가지 않고, 받는 사람은 쪽지함을 직접 열어야 압니다.' },
  { from: 'mail', to: 'notification', via: 'event:NotificationRequestedEvent',
    reason: '알림 기능이 없으면 메일 발송이 실패로 확정되어도 보낸 사람에게 실패 알림이 가지 않고, 메일 이력 화면을 직접 열어야 압니다.' },
  { from: 'sms', to: 'notification', via: 'event:NotificationRequestedEvent',
    reason: '알림 기능이 없으면 문자 발송 일부가 실패해도 보낸 사람에게 실패 알림이 가지 않고, 문자 화면에서 수신자 결과를 직접 확인해야 합니다.' },
  { from: 'community', to: 'notification', via: 'event:NotificationRequestedEvent',
    reason: '알림 기능이 없으면 커뮤니티 가입 신청이 들어와도 승인 권한자에게 알림이 가지 않고, 승인·반려 결과도 신청자에게 알림으로 전달되지 않습니다.' },
  { from: 'informalsanction', to: 'mail', via: 'event:MailRequestedEvent',
    reason: '메일 기능이 없으면 결재가 최종 승인되거나 반려되어도 신청자에게 결과 메일이 가지 않습니다.' },
  { from: 'informalsanction', to: 'sms', via: 'event:SmsRequestedEvent',
    reason: '문자 기능이 없으면 결재가 최종 승인되거나 반려되어도 신청자에게 결과 문자가 가지 않습니다.' },
  { from: 'mail', to: 'addressbook', via: 'port:RecipientAddressBookSource',
    reason: '주소록 기능이 없으면 메일 작성 화면의 받는 사람 고르기에서 주소록 탭이 사라지고 사용자·부서 검색과 직접 입력만 남습니다.',
    anchors: [{ path: 'frontend/src/app/admin/collaboration/mail-send/MailSendHubClient.tsx', anchor: "useRecipientAddressBook('mail')" },
      { path: RECIPIENT_PICKER_CONTRIBUTION, anchor: "defineContributions('recipient-picker-sources'" }] },
  { from: 'sms', to: 'addressbook', via: 'port:RecipientAddressBookSource',
    reason: '주소록 기능이 없으면 문자 작성 화면의 받는 사람 고르기에서 주소록 탭이 사라지고 사용자·부서 검색과 번호 직접 입력만 남습니다.',
    anchors: [{ path: 'frontend/src/app/admin/uss/ion/sms/SmsAdminClient.tsx', anchor: "useRecipientAddressBook('sms')" },
      { path: RECIPIENT_PICKER_CONTRIBUTION, anchor: "defineContributions('recipient-picker-sources'" }] },
  // 업무 홈(Phase 2 9단계): 실시간 통계는 게시판 포트로 오늘 게시글 수를 센다. 포트 구현이 없으면 프레임이 provided=false 를 실어
  //   화면이 카드를 그리지 않는다. 근거는 실시간 서비스에만 있는 줄이다(같은 포트 주입은 통계 서비스에도 있어 근거가 될 수 없다).
  { from: 'dashboard', to: 'board', via: 'port:PostStatisticsContributor',
    reason: '게시판 기능이 없으면 업무 홈의 실시간 상태 구역에서 신규 게시글 카드가 사라집니다.',
    anchors: [{ path: 'business-app/src/main/java/nuri/business/service/dashboard/RealTimeDashboardService.java',
      anchor: 'CountSnapshot currentPosts = getTodayPostsCount();' }] },
  // 게시판이 커뮤니티 회원 판정 포트(CommunityBoardAccessPort)로 받는 연결도 같은 저하다 — 커뮤니티가 없으면 회원 전용 게시판이 없다.
  { from: 'board', to: 'community', via: 'fk-optional:fk_tb_bbs_master_tb_cmnty_info', ports: ['CommunityBoardAccessPort'],
    reason: '커뮤니티 기능이 없으면 게시판 생성 마법사에서 커뮤니티 귀속 선택이 사라져 게시판을 커뮤니티 회원 전용으로 만들 수 없습니다.',
    anchors: [{ path: 'api-server/src/main/resources/db/migration/V2_102__add_reference_integrity_fks.sql', anchor: 'ADD CONSTRAINT fk_tb_bbs_master_tb_cmnty_info' }] },
  // DEC-OPS-280: 템플릿 배정 구현은 템플릿 기능의 서비스다. 커뮤니티는 포트를 선택 주입으로 받고 관리 창 후보도 커뮤니티 API 로 받는다.
  { from: 'community', to: 'template', via: 'port:TemplateAssignmentPolicy',
    reason: '템플릿 기능이 없으면 커뮤니티 관리 창에서 템플릿 칸이 사라집니다. 템플릿 값은 커뮤니티 화면 표시에 쓰이지 않습니다.',
    anchors: [{ path: 'business-app/src/main/java/nuri/business/service/community/CommunityService.java',
      anchor: 'ObjectProvider<nuri.foundation.core.template.TemplateAssignmentPolicy>' },
    { path: 'frontend/src/components/business/community/CommunityManageDialog.tsx', anchor: 'communityAdminService.getTemplateOptions()' }] },
];

/*
 * 계산된 이벤트 연결 가운데 잃는 것이 없는 것. 수신 기능이 자기 행만 정리하므로, 그 기능이 없으면 정리할 행도 없다.
 * 계산과 정확히 맞아야 한다 — 이 목록에만 있고 계산에 없는 행, 두 목록에 모두 있는 행은 카탈로그가 거부한다.
 */
export const REGISTRATION_ONLY_EVENTS = [
  ...['addressbook', 'board', 'comment', 'community', 'notification'].map(to => ({ from: 'core', to, event: 'UserDeletionEvent',
    reason: '사용자를 지울 때 그 사용자의 행을 함께 정리할 뿐이라, 이 기능이 없으면 정리할 행도 없습니다.' })),
];

/*
 * 계산된 포트 연결(derivePortConnections) 가운데 잃는 것이 없는 것(Phase 2 11단계 C2, GAP-COMPOSE-001 포트 부분). 받는 쪽이
 * 구현 기능의 데이터만 모으거나 그 기능의 항목만 내보내므로, 그 기능이 없으면 모을 것도 내보낼 것도 없다.
 * 계산과 정확히 맞아야 한다 — 이 목록에만 있고 계산에 없는 행, 연동 선언(via port: 또는 ports)과 이 목록에 모두 있는 행은 카탈로그가 거부한다.
 */
export const REGISTRATION_ONLY_PORTS = [
  ...['board', 'mail', 'memoreport', 'note', 'promotion', 'report', 'reward', 'schedule'].map(to => ({ from: 'core', to, port: 'AttachmentSourceContributor',
    reason: '이 기능이 없으면 그 기능의 첨부도 없어, 첨부가 어디에 쓰였는지 판정할 때 빠지는 것이 없습니다.' })),
  ...['board', 'informalsanction'].map(to => ({ from: 'core', to, port: 'DashboardItemProvider',
    reason: '이 기능이 없으면 대시보드 응답에서 그 기능의 항목만 빠지고 다른 항목은 그대로입니다.' })),
  { from: 'core', to: 'board', port: 'DataUsageStatisticsContributor',
    reason: '게시판 기능이 없으면 자료 이용 통계에 셀 게시물이 없고, 그 통계를 보이던 탭도 함께 빠져 다른 통계는 그대로입니다.' },
  { from: 'core', to: 'board', port: 'PostStatisticsContributor',
    reason: '게시판 기능이 없으면 게시물 통계에 셀 글이 없고, 그 수를 보이던 칸도 함께 빠져 다른 통계는 그대로입니다.' },
  { from: 'core', to: 'community', port: 'CommunityBoardAccessPort',
    reason: '커뮤니티 기능이 없으면 커뮤니티 회원 전용 게시판도 없어, 첨부 열람을 판정할 때 빠지는 것이 없습니다.' },
  { from: 'core', to: 'notification', port: 'DurableWorkHandler',
    reason: '알림 기능이 없으면 알림 전달 후속 작업도 생기지 않아, 후속 작업을 처리할 때 빠지는 것이 없습니다.' },
  ...['board', 'community'].map(to => ({ from: 'template', to, port: 'TemplateReferenceContributor',
    reason: '이 기능이 없으면 그 기능이 쓰는 템플릿도 없어, 템플릿을 지우기 전 사용처를 확인할 때 빠지는 것이 없습니다.' })),
];

/*
 * 기여 분류(슬롯 단계 PR-4). 슬롯 기여 파일(frontend/src/extensions/<기능>/<슬롯>.ts)마다 정확히 한쪽이어야 한다:
 * - INTEGRATES 의 근거(anchor)가 그 파일을 가리킨다 — 그 기여가 빠지면 다른 기능의 동작이 줄어든다(계획이 기능 저하로 알린다).
 * - 이 표에 사유와 함께 있다 — 기여가 빠져도 그 기능 자신의 진입점만 사라지고 잃는 것이 없다(REGISTRATION_ONLY_EVENTS 와 같은 뜻).
 * 연동 종류에 slot 을 두지 않는 대신, 선언 없이 들어온 새 기여는 카탈로그가 거부한다. 기여는 그 기능의 연동 근거만 될 수 있다.
 */
export const REGISTRATION_ONLY_CONTRIBUTIONS = [
  { path: 'frontend/src/extensions/help/shell-links.ts',
    reason: '도움말 기능이 없으면 머리글·바닥글·오류 화면에서 도움말 화면으로 가는 링크만 사라지고 다른 기능은 그대로입니다.' },
  { path: 'frontend/src/extensions/notification/header-widgets.ts',
    reason: '알림 기능이 없으면 머리글의 알림 벨만 사라지고 다른 기능은 그대로입니다.' },
  { path: 'frontend/src/extensions/scrap/post-actions.ts',
    reason: '스크랩 기능이 없으면 게시글 상세의 스크랩 버튼만 사라지고 게시판 기능은 그대로입니다.' },
  { path: 'frontend/src/extensions/community/hub-tabs.ts',
    reason: '커뮤니티 기능이 없으면 지식 허브의 커뮤니티 탭과 그 머리 동작만 사라지고 위키·자주 묻는 질문·질의응답은 그대로입니다.' },
  { path: 'frontend/src/extensions/note/hub-tabs.ts',
    reason: '쪽지 기능이 없으면 협업 허브의 쪽지 탭만 사라지고 다른 탭은 그대로입니다.' },
  { path: 'frontend/src/extensions/showcase/hub-tabs.ts',
    reason: '시연 화면 기능이 없으면 감시 허브의 하네스 아틀라스 샘플 탭만 사라지고 로그·가동 상태 탭은 그대로입니다.' },
  { path: 'frontend/src/extensions/scrap/hub-tabs.ts',
    reason: '스크랩 기능이 없으면 협업 허브의 스크랩 탭만 사라지고 다른 탭은 그대로입니다.' },
  { path: 'frontend/src/extensions/note/shell-links.ts',
    reason: '쪽지 기능이 없으면 명령 센터의 협업 허브 바로가기만 사라지고 허브는 그대로입니다.' },
  { path: 'frontend/src/extensions/addressbook/shell-links.ts',
    reason: '주소록 기능이 없으면 협업 허브의 주소록 관리 링크만 사라지고 허브는 그대로입니다.' },
  { path: 'frontend/src/extensions/mail/shell-links.ts',
    reason: '메일 기능이 없으면 협업 허브의 메일 발송 링크만 사라지고 허브는 그대로입니다.' },
  { path: 'frontend/src/extensions/report/shell-links.ts',
    reason: '업무 보고 기능이 없으면 나의 업무 탭 줄의 업무 보고 탭만 사라지고 업무 관리 목록은 그대로입니다.' },
  { path: 'frontend/src/extensions/schedule/shell-links.ts',
    reason: '일정 기능이 없으면 나의 업무 탭 줄의 일정 탭만 사라지고 업무 관리 목록은 그대로입니다.' },
  { path: 'frontend/src/extensions/memoreport/shell-links.ts',
    reason: '메모 보고 기능이 없으면 업무 보고 화면의 메모보고 관리 링크와 안내 문장만 사라지고 업무 보고는 그대로입니다.' },
  // 업무 홈(Phase 2 9단계): 기능마다 자기 데이터의 조각을 업무 홈에 기여한다. 빠지면 그 조각만 사라지고 업무 홈은 그대로다.
  { path: 'frontend/src/extensions/board/home-sections.ts',
    reason: '게시판 기능이 없으면 업무 홈의 게시판 글 수 카드·최근 글 목록·새 게시글 작성 단추만 사라지고 업무 홈은 그대로입니다.' },
  { path: 'frontend/src/extensions/dashboard/home-sections.ts',
    reason: '실시간 대시보드 기능이 없으면 업무 홈의 실시간 상태 구역만 사라지고 최근 활동 구역이 전체 폭을 씁니다.' },
  { path: 'frontend/src/extensions/informalsanction/home-sections.ts',
    reason: '약식 전자결재 기능이 없으면 업무 홈의 결재 대기 카드와 결재함 열기 단추만 사라지고 업무 홈은 그대로입니다.' },
  { path: 'frontend/src/extensions/note/home-sections.ts',
    reason: '쪽지 기능이 없으면 업무 홈의 안 읽은 쪽지 카드만 사라지고 업무 홈은 그대로입니다.' },
  { path: 'frontend/src/extensions/promotion/home-sections.ts',
    reason: '배너·팝업 기능이 없으면 업무 홈의 공지 팝업과 홍보 배너만 사라지고 업무 홈은 그대로입니다.' },
  { path: 'frontend/src/extensions/board/stats-panels.ts',
    reason: '게시판 기능이 없으면 통계 화면의 게시물·자료 이용 탭과 누적 게시물 칸만 사라지고 통계는 그대로입니다.' },
  { path: 'frontend/src/extensions/survey/stats-panels.ts',
    reason: '설문 기능이 없으면 통계 화면의 설문조사 분석 탭만 사라지고 통계는 그대로입니다.' },
];

export const INTEGRATION_KINDS = ['event', 'port', 'fk-optional'];
const SCAN_ROOTS = ['foundation/src/main/java', 'business-core/src/main/java', 'business-app/src/main/java', 'api-server/src/main/java'];
const APP_PREFIX = 'business-app/src/main/java/nuri/business/';
const API_PREFIX = 'api-server/src/main/java/nuri/api/';
// 받는 타입이 이것이면 어떤 이벤트를 받는지 정할 수 없다. 클래스를 애노테이션에 적어야 한다.
const BROAD_EVENT_TYPES = new Set(['Object', 'ApplicationEvent', 'DomainEvent', 'PayloadApplicationEvent', 'Record']);
const JAVA_IDENTIFIER = /^[A-Za-z_$][\w$]*$/u;
// 로캘과 무관한 정렬. 카탈로그 해시가 실행 환경에 따라 달라지지 않게 한다.
const byCodeUnits = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

function walk(directory) {
  if (!existsSync(directory)) return [];
  if (!statSync(directory).isDirectory()) return [directory];
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory()
    ? walk(join(directory, entry.name)) : [join(directory, entry.name)]).sort();
}
const lineAt = (text, index) => text.slice(0, index).split('\n').length;
const simpleName = qualified => qualified.replace(/<[\s\S]*$/u, '').replace(/\[\]/gu, '').split('.').pop();
const TS_STRING_KEYWORDS = /(?:^|[^\w$])(?:return|case|typeof|in|of|yield|await|else|do|throw|new|delete|void|export|import|from|default|extends|as)$/u;

/** TS 에서 따옴표가 문자열을 여는 자리인가. JSX 본문의 아포스트로피(don't)는 문자열이 아니다. */
function opensTsString(source, index) {
  let back = index - 1;
  while (back >= 0 && /[ \t]/u.test(source[back])) back -= 1;
  if (back < 0 || source[back] === '\n' || source[back] === '\r') return true;
  if ('=(,:[{?!&|+-*%<>;~^}'.includes(source[back])) return true;
  return TS_STRING_KEYWORDS.test(source.slice(Math.max(0, back - 10), back + 1));
}

/**
 * 주석을 공백으로 바꾼다(줄·위치 보존). strings=false 면 문자열·문자 리터럴도 지운다.
 * kind: java(텍스트 블록 포함)·ts(템플릿 문자열 포함, 코드 위치의 따옴표만 문자열로 본다)·sql.
 * TS 정규식 리터럴은 해석하지 않는다 — 따옴표가 든 정규식 뒤 같은 줄의 주석은 놓칠 수 있다.
 */
export function stripComments(source, { kind = 'java', strings = true } = {}) {
  const out = source.split('');
  const blank = (from, to) => { for (let i = from; i < to; i += 1) if (out[i] !== '\n' && out[i] !== '\r') out[i] = ' '; };
  let i = 0;
  while (i < source.length) {
    const two = source.slice(i, i + 2);
    if ((kind !== 'sql' && two === '//') || (kind === 'sql' && two === '--')) {
      const end = source.indexOf('\n', i);
      const stop = end < 0 ? source.length : end;
      blank(i, stop); i = stop; continue;
    }
    if (two === '/*') {
      const end = source.indexOf('*/', i + 2);
      const stop = end < 0 ? source.length : end + 2;
      blank(i, stop); i = stop; continue;
    }
    if (kind === 'java' && source.startsWith('"""', i)) {
      let j = i + 3;
      while (j < source.length && !source.startsWith('"""', j)) j += source[j] === '\\' ? 2 : 1;
      const stop = Math.min(j + 3, source.length);
      if (!strings) blank(i, stop);
      i = stop; continue;
    }
    const quote = source[i];
    if ((quote === '"' || quote === "'" || (kind === 'ts' && quote === '`')) && (kind !== 'ts' || opensTsString(source, i))) {
      let j = i + 1;
      while (j < source.length && source[j] !== quote) {
        if (source[j] === '\\' && kind !== 'sql') j += 1;
        else if (quote !== '`' && source[j] === '\n') break;
        j += 1;
      }
      const stop = Math.min(j + 1, source.length);
      if (!strings) blank(i, stop);
      i = stop; continue;
    }
    i += 1;
  }
  return out.join('');
}

function balancedEnd(code, open, [opening, closing] = ['(', ')']) {
  let depth = 0;
  for (let i = open; i < code.length; i += 1) {
    if (code[i] === opening) depth += 1;
    else if (code[i] === closing) { depth -= 1; if (depth === 0) return i + 1; }
  }
  return -1;
}
function skipSpace(code, index) { while (index < code.length && /\s/u.test(code[index])) index += 1; return index; }
function skipAnnotation(code, index) {
  const annotation = /^@(?:[\w$]+\.)*[\w$]+/u.exec(code.slice(index));
  let end = index + annotation[0].length;
  const next = skipSpace(code, end);
  if (code[next] === '(') end = balancedEnd(code, next);
  return end;
}
function firstParameterType(parameters) {
  let depth = 0;
  let end = parameters.length;
  for (let i = 0; i < parameters.length; i += 1) {
    if ('<('.includes(parameters[i])) depth += 1;
    else if ('>)'.includes(parameters[i])) depth -= 1;
    else if (parameters[i] === ',' && depth === 0) { end = i; break; }
  }
  const first = parameters.slice(0, end).replace(/@(?:[\w$]+\.)*[\w$]+(?:\s*\([^)]*\))?/gu, ' ').replace(/\bfinal\b/gu, ' ').trim();
  if (!first) return null;
  const tokens = first.replace(/<[\s\S]*>/gu, '').trim().split(/\s+/u);
  return tokens.length >= 2 ? simpleName(tokens[tokens.length - 2]) : null;
}

/**
 * 주석·문자열을 지운 Java 코드에서 이벤트 리스너가 받는 타입과 선언 줄을 찾는다. 해석하지 못하면 실패한다.
 * 애노테이션에 클래스를 적으면 그 클래스만 받는다(Spring 과 같다) — 매개변수는 그 상위 타입일 수 있다.
 */
export function eventListenersIn(code, path = '<source>') {
  const result = [];
  for (const match of code.matchAll(/@(?:[\w$]+\.)*(?:Transactional)?EventListener\b/gu)) {
    const where = `${path}:${lineAt(code, match.index)}`;
    let index = match.index + match[0].length;
    let declared = [];
    const open = skipSpace(code, index);
    if (code[open] === '(') {
      const close = balancedEnd(code, open);
      declared = [...code.slice(open + 1, close - 1).matchAll(/((?:[\w$]+\.)*[\w$]+)\s*\.\s*class\b/gu)].map(found => simpleName(found[1]));
      index = close;
    }
    // 애노테이션·수식어·반환 타입을 토큰 단위로 지나 메서드 이름 뒤의 괄호에 닿는다. 애노테이션 괄호를 매개변수로 읽지 않는다.
    let cursor = index;
    for (;;) {
      cursor = skipSpace(code, cursor);
      if (code[cursor] === '@') { cursor = skipAnnotation(code, cursor); continue; }
      if (code[cursor] === '<') { cursor = balancedEnd(code, cursor, ['<', '>']); continue; }
      if (code[cursor] === '(') break;
      const word = /^[\w$.[\]?]+/u.exec(code.slice(cursor));
      if (!word) throw new Error(`Event listener has no method: ${where}`);
      cursor += word[0].length;
    }
    const parameterType = firstParameterType(code.slice(cursor + 1, balancedEnd(code, cursor) - 1));
    const types = declared.length ? declared : parameterType ? [parameterType] : [];
    if (!types.length) throw new Error(`Event listener type could not be resolved: ${where}`);
    for (const type of types) {
      if (!JAVA_IDENTIFIER.test(type)) throw new Error(`Event listener type could not be resolved: ${where}`);
      result.push({ type, line: lineAt(code, cursor) });
    }
  }
  for (const match of code.matchAll(/\bimplements\b[^{;]*?\bApplicationListener\s*<\s*((?:[\w$]+\.)*[\w$]+)/gu)) {
    result.push({ type: simpleName(match[1]), line: lineAt(code, match.index) });
  }
  return result;
}

/**
 * 이벤트 객체를 만드는 위치. 만드는 것을 발행 의도로 본다(변수에 담아 발행하는 곳도 있다).
 * 생성자·생성자 참조뿐 아니라 그 타입의 정적 호출(빌더·팩토리: T.builder(, T.of()도 센다 — 놓치면 연동이 숨는다.
 * 넓게 세서 생기는 거짓 연결은 '선언되지 않은 연동'으로 드러나 사람이 판정한다.
 */
export function eventConstructionsIn(code, type) {
  if (!JAVA_IDENTIFIER.test(type)) throw new Error(`Event type is not a Java identifier: ${type}`);
  const name = type.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  const pattern = new RegExp(`(?:\\bnew\\s+(?:[\\w$]+\\.)*${name}\\s*(?:<[^<>]*>)?\\s*\\(`
    + `|(?<![\\w$])(?:[\\w$]+\\.)*${name}\\s*::\\s*new\\b`
    + `|(?<![\\w$.])(?:[\\w$]+\\.)*${name}\\s*\\.\\s*(?!class\\b)[A-Za-z_$][\\w$]*\\s*\\()`, 'gu');
  return [...code.matchAll(pattern)].map(found => lineAt(code, found.index));
}

/** 직접 선택 폐포(화면 결합 포함). '함께 포함된다'와 '소유가 정해진다'가 같은 관계를 쓴다. */
export function requiresClosure(capabilities) {
  const requires = new Map(capabilities.map(capability => [capability.id, capability.requires.map(edge => edge.domain)]));
  const cache = new Map();
  return from => {
    if (!cache.has(from)) {
      const seen = new Set([from]);
      const queue = [from];
      while (queue.length) for (const next of requires.get(queue.shift()) ?? []) if (!seen.has(next)) { seen.add(next); queue.push(next); }
      cache.set(from, seen);
    }
    return cache.get(from);
  };
}

/**
 * api-server 생산 소스의 디렉터리 소유 기능(Phase 2 커뮤니티 후속, DEC-OPS-280). `api-server/src/main/java/nuri/api/` 아래
 * 디렉터리 구간 가운데 기능 id 인 마지막 구간이다(`controller/business/admin/content/community/…` 는 community). 없으면 null.
 * 카탈로그 간선·수동 삭제 판정·소스 생존 검사·이벤트 소유 판정이 이 하나를 쓴다.
 */
export function apiSourceOwner(path, domains) {
  if (!path.startsWith(API_PREFIX)) return null;
  const features = domains instanceof Set ? domains : new Set(domains);
  return path.slice(API_PREFIX.length).split('/').slice(0, -1).reverse().find(segment => features.has(segment)) ?? null;
}

/**
 * 파일 소유 판정. domainSupportFiles 선언이 먼저, 그다음 업무 앱 디렉터리다. foundation·business-core 는 core 다.
 * 그 밖(주로 api-server)은 참조하는 업무 패키지로 정한다 — 생성기는 그 기능이 빠지면 참조 파일을 함께 지운다.
 * 여러 기능을 참조하는 api-server 파일은 그 가운데 디렉터리 소유 기능(apiSourceOwner)이 소유자다 — 카탈로그가 그 기능이 나머지
 * 참조 기능을 요구한다고 센다. 디렉터리 소유가 없으면 나머지를 모두 끌어오는 기능이 소유자다(그 기능이 있어야 파일이 남는다).
 * 그런 기능이 없으면 실패한다.
 * 같은 패키지의 단순 이름 참조처럼 이 규칙이 못 보는 연쇄 제거는 시험이 생성기 제거 계획과 대조해 잡는다.
 */
export function sourceOwner(supportOwners, domains, closure) {
  const selectable = new Set(domains);
  return (path, code) => {
    if (supportOwners.has(path)) return supportOwners.get(path);
    if (path.startsWith(APP_PREFIX)) return path.slice(APP_PREFIX.length).match(/^(?:domain|service)\/([a-z][a-z0-9_]*)\//u)?.[1] ?? 'core';
    if (/^(?:foundation|business-core)\//u.test(path)) return 'core';
    const referenced = [...new Set([...code.matchAll(/(?<![\w$])nuri\.business\.(?:domain|service)\.([a-z][a-z0-9_]*)\./gu)]
      .map(found => found[1]).filter(domain => selectable.has(domain)))].sort(byCodeUnits);
    if (referenced.length <= 1) return referenced[0] ?? 'core';
    const directory = apiSourceOwner(path, selectable);
    if (directory && referenced.includes(directory)) return directory;
    const owners = referenced.filter(domain => referenced.every(other => closure(domain).has(other)));
    if (!owners.length) throw new Error(`Event source ownership is ambiguous: ${path} references ${referenced.join(', ')}`);
    return owners[0];
  };
}

/** 네 모듈의 생산 Java 를 주석·문자열을 지운 코드로 읽는다. 이벤트·포트 판정이 한 번 읽은 목록을 함께 쓴다. */
export function javaSourceFiles(root) {
  return SCAN_ROOTS.flatMap(scanRoot => walk(join(root, scanRoot))).filter(path => path.endsWith('.java'))
    .map(absolute => ({ path: relative(root, absolute).split(sep).join('/'), code: stripComments(readFileSync(absolute, 'utf8'), { strings: false }) }));
}

/** 리스너와 그 리스너가 받는 이벤트를 만드는 위치를 모두 찾는다(소유가 core 인 것 포함). */
export function deriveEventSources(root, ownerOf, files = javaSourceFiles(root)) {
  const owners = new Map();
  const owner = file => { if (!owners.has(file.path)) owners.set(file.path, ownerOf(file.path, file.code)); return owners.get(file.path); };
  const listeners = files.flatMap(file => eventListenersIn(file.code, file.path).map(listener => ({ ...listener, path: file.path, owner: owner(file) })));
  const constructions = [];
  for (const type of [...new Set(listeners.filter(listener => listener.owner !== 'core').map(listener => listener.type))].sort(byCodeUnits)) {
    const found = files.flatMap(file => eventConstructionsIn(file.code, type).map(line => ({ path: file.path, line, type, owner: owner(file) })));
    const where = listeners.find(listener => listener.type === type && listener.owner !== 'core');
    if (BROAD_EVENT_TYPES.has(type)) throw new Error(`Event listener type is too broad to tell its events apart: ${where.path}:${where.line} ${type}`);
    // 어떤 방법으로도 만들지 않는 이벤트의 리스너는 불리지 않는다(죽은 리스너). 발행자가 없으니 잃는 것도 없다.
    constructions.push(...found);
  }
  return { listeners, constructions };
}

/**
 * (발행 기능, 수신 기능, 이벤트) 연결을 계산한다. 수신이 core 이면 늘 있으므로, 발행과 수신이 같은 기능이면 연동이 아니므로 뺀다.
 */
export function deriveEventTriples(root, ownerOf, sources = deriveEventSources(root, ownerOf)) {
  const triples = new Map();
  for (const listener of sources.listeners.filter(row => row.owner !== 'core')) {
    for (const publisher of sources.constructions.filter(row => row.type === listener.type)) {
      if (publisher.owner === listener.owner) continue;
      const key = `${publisher.owner}\u0000${listener.owner}\u0000${listener.type}`;
      if (!triples.has(key)) triples.set(key, { from: publisher.owner, to: listener.owner, event: listener.type, publishers: [], listeners: [] });
      const triple = triples.get(key);
      if (!triple.publishers.some(row => row.path === publisher.path && row.line === publisher.line)) triple.publishers.push({ path: publisher.path, line: publisher.line });
      if (!triple.listeners.some(row => row.path === listener.path && row.line === listener.line)) triple.listeners.push({ path: listener.path, line: listener.line });
    }
  }
  return [...triples.values()].sort((a, b) => byCodeUnits(`${a.from}\u0000${a.to}\u0000${a.event}`, `${b.from}\u0000${b.to}\u0000${b.event}`));
}

// 스프링 빈 표지. 포트는 빈이 주입받아야 연결된다 — 빈이 아닌 클래스가 그 타입을 쓰는 것(예외 객체의 ErrorCode 필드)은 연결이 아니다.
const SPRING_BEAN = /@(?:[\w$]+\.)*(?:Service|Component|Repository|Controller|RestController|Configuration)\b/u;
const PORT_ROOT = /^(?:foundation|business-core)\//u;

/** `implements` 절의 타입 단순 이름(최상위 쉼표로 나눈다). 클래스·레코드·열거형 선언만 본다. */
function implementedTypes(code) {
  const result = [];
  for (const match of code.matchAll(/\b(?:class|record|enum)\s+[A-Za-z_$][\w$]*[^{;]*?\bimplements\s+([^{]+)\{/gu)) {
    let depth = 0;
    let current = '';
    const parts = [];
    for (const character of match[1]) {
      if (character === '<') depth += 1;
      else if (character === '>') depth -= 1;
      if (character === ',' && depth === 0) { parts.push(current); current = ''; } else current += character;
    }
    parts.push(current);
    for (const part of parts) {
      const name = simpleName(part.trim());
      if (JAVA_IDENTIFIER.test(name)) result.push({ type: name, line: lineAt(code, match.index) });
    }
  }
  return result;
}

/**
 * Java 포트 연결(11단계 C2, GAP-COMPOSE-001 포트 부분). foundation·business-core 의 인터페이스를 업무 기능 소유의 클래스가 구현하고,
 * 그 구현과 소유가 다른 스프링 빈이 주입 지점(ObjectProvider·List·Optional·Collection·Set·Iterable·Map<String, P>, 필드·생성자
 * 매개변수)으로 받으면 (받는 소유 → 구현 소유, 포트)는 연결이다. 구현 기능이 빠지면 받는 쪽은 그 구현 없이 돈다. 직접 implements 만
 * 보고, 빈 판정은 표지 애노테이션으로 한다 — 놓치면 연동이 숨으므로 넓게 세고, 거짓 연결은 '분류되지 않은 연결'로 드러나 사람이 판정한다.
 * `interfaces` 는 포트가 될 수 있는 인터페이스 이름 전부다(선언된 포트 이름이 Java 포트인지 가른다).
 */
export function derivePortConnections(root, ownerOf, files = javaSourceFiles(root)) {
  const interfaces = new Map();
  for (const file of files.filter(row => PORT_ROOT.test(row.path))) {
    for (const match of file.code.matchAll(/(?<![\w$@])interface\s+([A-Z][\w$]*)/gu)) {
      if (!interfaces.has(match[1])) interfaces.set(match[1], new Set());
      interfaces.get(match[1]).add(file.path);
    }
  }
  const owners = new Map();
  const owner = file => { if (!owners.has(file.path)) owners.set(file.path, ownerOf(file.path, file.code)); return owners.get(file.path); };
  const implementations = new Map();
  for (const file of files) for (const row of implementedTypes(file.code).filter(row => interfaces.has(row.type))) {
    if (!implementations.has(row.type)) implementations.set(row.type, []);
    implementations.get(row.type).push({ file, line: row.line });
  }
  const connections = new Map();
  for (const [port, implemented] of [...implementations].sort(([left], [right]) => byCodeUnits(left, right))) {
    const featureImplementations = implemented.filter(row => owner(row.file) !== 'core');
    if (!featureImplementations.length) continue;
    const name = port.replace(/[$]/gu, '\\$&');
    // 포트 타입 뒤의 타입 인자(Port<String>)도 같은 포트다. 한 겹 중첩까지 본다.
    const type = `(?:[\\w$]+\\.)*${name}(?:\\s*<(?:[^<>;{}()=]|<[^<>;{}()=]*>)*>)?`;
    const injection = new RegExp(`(?:ObjectProvider|List|Optional|Collection|Set|Iterable)\\s*<\\s*${type}\\s*>`
      + `|Map\\s*<\\s*String\\s*,\\s*${type}\\s*>|(?<![\\w$.])${type}\\s+[a-z_$][\\w$]*\\s*[;,)=]`, 'u');
    const excluded = new Set([...interfaces.get(port), ...implemented.map(row => row.file.path)]);
    for (const consumer of files.filter(file => !excluded.has(file.path) && SPRING_BEAN.test(file.code))) {
      const found = injection.exec(consumer.code);
      if (!found) continue;
      const from = owner(consumer);
      for (const implementation of featureImplementations) {
        const to = owner(implementation.file);
        if (to === from) continue;
        const key = `${from}>${to} (${port})`;
        if (!connections.has(key)) connections.set(key, { from, to, port, consumers: [], implementations: [] });
        const row = connections.get(key);
        const use = { path: consumer.path, line: lineAt(consumer.code, found.index) };
        if (!row.consumers.some(item => item.path === use.path)) row.consumers.push(use);
        if (!row.implementations.some(item => item.path === implementation.file.path)) row.implementations.push({ path: implementation.file.path, line: implementation.line });
      }
    }
  }
  return { interfaces: new Set(interfaces.keys()),
    connections: [...connections.values()].sort((left, right) => byCodeUnits(`${left.from}>${left.to} (${left.port})`, `${right.from}>${right.to} (${right.port})`)) };
}

/**
 * from 이 들어간 어떤 구성에서 to 가 빠질 수 있는가. 이벤트 판정과 '저하될 수 없는 선언' 판정이 같은 술어를 쓴다 —
 * 두 판정이 다르면 선언할 수도 안 할 수도 없는 쌍이 생긴다.
 */
export function degradationPredicate(capabilities, presets) {
  const closure = requiresClosure(capabilities);
  return (from, to) => from === 'core'
    || !(closure(from).has(to) && presets.filter(preset => preset.domains.includes(from)).every(preset => preset.domains.includes(to)));
}

function anchorEvidence(root, { path, anchor }) {
  const absolute = join(root, path);
  const testSource = path.includes('/__tests__/') || /\.(?:test|spec)\.[cm]?[jt]sx?$/u.test(path);
  if (!/^(?:frontend\/src|[a-z-]+\/src\/main)\//u.test(path) || testSource || !existsSync(absolute)) {
    throw new Error(`integration evidence is not a product source: ${path}`);
  }
  const kind = path.endsWith('.sql') ? 'sql' : path.endsWith('.java') ? 'java' : 'ts';
  const code = stripComments(readFileSync(absolute, 'utf8').replace(/\r\n/gu, '\n'), { kind });
  const first = code.indexOf(anchor);
  if (first < 0) throw new Error(`declared integration drifted: ${path} lacks ${anchor}`);
  if (code.indexOf(anchor, first + 1) >= 0) throw new Error(`integration evidence anchor is ambiguous: ${path} ${anchor}`);
  return { path, line: lineAt(code, first), role: 'anchor' };
}

/**
 * 선언을 계산과 대조해 계획에 실을 연동 목록을 만든다. 순수 판정은 triples·canDegrade 를 받아 합성 입력으로 시험한다.
 */
export function resolveIntegrations({ root, declared = INTEGRATES, registrationOnly = REGISTRATION_ONLY_EVENTS, triples, canDegrade, domains, optionalForeignKeys,
  contributions = [], registrationOnlyContributions = REGISTRATION_ONLY_CONTRIBUTIONS, ports = null, registrationOnlyPorts = REGISTRATION_ONLY_PORTS }) {
  const fail = message => { throw new Error(`project-composer catalog: ${message}`); };
  const known = new Set(domains);
  const keys = new Set();
  const rows = [];
  for (const edge of declared) {
    const [kind, target] = String(edge.via ?? '').split(/:(.+)/u);
    if (!INTEGRATION_KINDS.includes(kind) || !target) fail(`unsupported integration kind: ${edge.via}`);
    if (!(edge.from === 'core' || known.has(edge.from)) || !known.has(edge.to) || edge.from === edge.to) fail(`invalid integration endpoints: ${edge.from} -> ${edge.to}`);
    if (typeof edge.reason !== 'string' || !/[가-힣]/u.test(edge.reason) || !edge.reason.endsWith('.')) fail(`integration needs a user sentence: ${edge.from} -> ${edge.to}`);
    const key = `${edge.from}\u0000${edge.to}\u0000${edge.via}`;
    if (keys.has(key)) fail(`duplicate integration: ${edge.from} -> ${edge.to} via ${edge.via}`);
    keys.add(key);
    if (!canDegrade(edge.from, edge.to)) fail(`declared integration can never degrade: ${edge.from} -> ${edge.to}`);
    let evidence;
    if (kind === 'event') {
      if (edge.anchors) fail(`event integration evidence is derived, not declared: ${edge.from} -> ${edge.to}`);
      const triple = triples.find(row => row.from === edge.from && row.to === edge.to && row.event === target);
      if (!triple) fail(`declared event integration has no publisher and listener: ${edge.from} -> ${edge.to} via ${edge.via}`);
      evidence = [...triple.publishers.map(row => ({ ...row, role: 'publisher' })), ...triple.listeners.map(row => ({ ...row, role: 'listener' }))];
    } else {
      if (!Array.isArray(edge.anchors) || !edge.anchors.length) fail(`integration needs evidence anchors: ${edge.from} -> ${edge.to}`);
      evidence = edge.anchors.map(anchor => anchorEvidence(root, anchor));
    }
    if (kind === 'fk-optional') {
      const fk = optionalForeignKeys.find(row => row.name === target);
      if (!fk || fk.sourceDomain !== edge.from || fk.targetDomain !== edge.to) fail(`fk-optional integration does not match an optional foreign key: ${target}`);
    }
    rows.push({ from: edge.from, to: edge.to, via: edge.via, reason: edge.reason,
      evidence: evidence.sort((a, b) => byCodeUnits(`${a.path}:${String(a.line).padStart(6, '0')}`, `${b.path}:${String(b.line).padStart(6, '0')}`)) });
  }
  for (const fk of optionalForeignKeys) {
    if (rows.filter(row => row.via === `fk-optional:${fk.name}`).length !== 1) fail(`optional foreign key lacks its integration: ${fk.name}`);
  }
  const registrationKeys = new Set();
  for (const row of registrationOnly) {
    const key = `${row.from}\u0000${row.to}\u0000${row.event}`;
    if (registrationKeys.has(key)) fail(`duplicate registration-only event: ${row.from} -> ${row.to} via ${row.event}`);
    registrationKeys.add(key);
    if (!triples.some(triple => triple.from === row.from && triple.to === row.to && triple.event === row.event)) {
      fail(`registration-only event has no publisher and listener: ${row.from} -> ${row.to} via ${row.event}`);
    }
    if (!canDegrade(row.from, row.to)) fail(`registration-only event can never degrade: ${row.from} -> ${row.to}`);
  }
  for (const triple of triples) {
    const declaredHere = keys.has(`${triple.from}\u0000${triple.to}\u0000event:${triple.event}`);
    const registered = registrationKeys.has(`${triple.from}\u0000${triple.to}\u0000${triple.event}`);
    if (declaredHere && registered) fail(`event classified twice: ${triple.from} -> ${triple.to} via ${triple.event}`);
    if (!canDegrade(triple.from, triple.to)) continue;
    if (!declaredHere && !registered) fail(`undeclared integration: ${triple.from} -> ${triple.to} via event:${triple.event}`);
  }
  classifyContributions({ declared, contributions, registrationOnlyContributions, fail });
  // 포트 분류는 계산된 연결(derivePortConnections)을 받을 때만 한다. 합성 입력의 시험은 연결을 넘기지 않으면 이 단계를 건너뛴다.
  if (ports) classifyPorts({ declared, ports, registrationOnlyPorts, canDegrade, fail });
  return rows.sort((a, b) => byCodeUnits(`${a.from}\u0000${a.to}\u0000${a.via}`, `${b.from}\u0000${b.to}\u0000${b.via}`));
}

/**
 * 포트 분류 완전성(REGISTRATION_ONLY_PORTS 설명 참조). 연동 선언은 via 'port:<포트>' 또는 ports 로 포트 연결을 덮는다. via 의 포트가
 * Java 인터페이스가 아니면(수신자 피커의 주소록 출처 같은 화면 포트) 슬롯 기여 분류가 근거를 대조하므로 여기서는 보지 않는다.
 * 늘 함께 포함되어 저하될 수 없는 연결은 선언하지 않는다(이벤트와 같은 술어).
 */
function classifyPorts({ declared, ports: { interfaces, connections }, registrationOnlyPorts, canDegrade, fail }) {
  const key = (from, to, port) => `${from}>${to} (${port})`;
  const detected = new Map(connections.map(row => [key(row.from, row.to, row.port), row]));
  const covered = new Set();
  for (const edge of declared) {
    if (edge.ports !== undefined && (!Array.isArray(edge.ports) || !edge.ports.length || edge.ports.some(port => !JAVA_IDENTIFIER.test(port)))) {
      fail(`integration ports must be Java port names: ${edge.from} -> ${edge.to}`);
    }
    const viaPort = String(edge.via).startsWith('port:') ? [String(edge.via).slice('port:'.length)] : [];
    for (const port of [...viaPort, ...(edge.ports ?? [])]) {
      if (!interfaces.has(port)) {
        if (edge.ports?.includes(port)) fail(`integration names an unknown Java port: ${key(edge.from, edge.to, port)}`);
        continue;
      }
      const name = key(edge.from, edge.to, port);
      if (!detected.has(name)) fail(`declared port integration has no implementation and injection: ${name}`);
      covered.add(name);
    }
  }
  const registered = new Set();
  for (const row of registrationOnlyPorts) {
    const name = key(row.from, row.to, row.port);
    if (registered.has(name)) fail(`duplicate registration-only port connection: ${name}`);
    registered.add(name);
    if (!detected.has(name)) fail(`registration-only port connection has no implementation and injection: ${name}`);
    if (!canDegrade(row.from, row.to)) fail(`registration-only port connection can never degrade: ${name}`);
    if (typeof row.reason !== 'string' || !/[가-힣]/u.test(row.reason) || !row.reason.trim().endsWith('.')) {
      fail(`registration-only port connection needs a user sentence: ${name}`);
    }
  }
  for (const [name, row] of detected) {
    if (covered.has(name) && registered.has(name)) fail(`port connection classified twice: ${name}`);
    if (!canDegrade(row.from, row.to)) continue;
    if (!covered.has(name) && !registered.has(name)) fail(`unclassified port connection: ${name}`);
  }
}

/** 기여 분류 완전성(REGISTRATION_ONLY_CONTRIBUTIONS 설명 참조). `contributions` 는 카탈로그가 슬롯 디렉터리에서 찾은 기여 파일이다. */
function classifyContributions({ declared, contributions, registrationOnlyContributions, fail }) {
  const owners = new Map();
  for (const row of contributions) {
    if (owners.has(row.path)) fail(`duplicate slot contribution: ${row.path}`);
    owners.set(row.path, row.owner);
  }
  const anchored = new Set();
  for (const edge of declared) for (const anchor of edge.anchors ?? []) {
    if (!owners.has(anchor.path)) continue;
    if (owners.get(anchor.path) !== edge.to) fail(`slot contribution evidences another feature's integration: ${anchor.path} (${edge.from} -> ${edge.to})`);
    anchored.add(anchor.path);
  }
  const registered = new Set();
  for (const row of registrationOnlyContributions) {
    if (registered.has(row.path)) fail(`duplicate registration-only contribution: ${row.path}`);
    registered.add(row.path);
    if (!owners.has(row.path)) fail(`registration-only contribution is not a slot contribution file: ${row.path}`);
    if (typeof row.reason !== 'string' || !/[가-힣]/u.test(row.reason) || !row.reason.trim().endsWith('.')) {
      fail(`registration-only contribution needs a user sentence: ${row.path}`);
    }
  }
  for (const path of owners.keys()) {
    if (anchored.has(path) && registered.has(path)) fail(`slot contribution classified twice: ${path}`);
    if (!anchored.has(path) && !registered.has(path)) fail(`unclassified slot contribution: ${path}`);
  }
}
