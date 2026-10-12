/**
 * 자동 포함 간선의 사용자용 한 문장(설계서 9.1 R5·E2).
 *
 * 카탈로그의 requires 간선은 개발자 근거(클래스명·묶음 선언·경위)를 들고 있다. 화면은 그 원문 대신
 * 기능 쌍(from>to)마다 하나인 이 문장을 보인다. 같은 쌍의 간선이 코드 참조와 묶음 선언으로 둘 있어도
 * 사유는 한 번만 나온다. 개발자 근거는 간선의 kind·evidence 로 남아 화면이 접어서 보인다.
 *
 * 선언은 실제 간선과 양방향으로 대조한다. 간선이 생겼는데 문장이 없거나, 간선이 사라졌는데 문장이 남으면
 * 카탈로그를 만들지 않는다. 문장에는 영문(클래스명·기능 id)을 쓰지 않는다. 화면 이름은 사용자가 실제로 보는
 * 메뉴·화면 제목을 쓴다. 문장은 카탈로그 해시에 들어가므로 고치면 모든 구성 해시가 바뀐다.
 */
export const REQUIRES_USER_REASONS = Object.freeze({
  'board>comment': '게시글 화면이 댓글을 함께 다룹니다.',
  'comment>board': '댓글은 게시글에 달립니다.',
  'community>board': '게시글 모아보기 화면이 게시판 글을 보여 줍니다.',
  'community>template': '커뮤니티를 만들 때 템플릿을 고릅니다.',
  'dashboard>board': '실시간 대시보드가 오늘 올라온 게시글 수를 보여 줍니다.',
  'dashboard>notification': '실시간 대시보드가 읽지 않은 알림 수를 보여 줍니다.',
  'help>board': '도움말 화면의 자주 묻는 질문·질의응답은 게시판 글입니다.',
  'reward>informalsanction': '포상 데이터가 결재 문서 표를 참조합니다.',
  'scrap>board': '스크랩은 게시글을 저장해 둡니다.',
});

const pairKey = (from, to) => `${from}>${to}`;

/** 사용자 문장의 형식. 영문이 들어가면 클래스명이나 기능 id 가 화면에 새는 것이다. */
export function userReasonProblem(sentence) {
  if (typeof sentence !== 'string' || !sentence.trim()) return 'is empty';
  if (/[A-Za-z]/.test(sentence)) return 'contains Latin text such as a class name or capability id';
  // 괄호는 경위 설명('…로 역전돼 더는 근거가 아니다')이 사용자 문장에 섞이는 통로였다.
  if (/[()]/.test(sentence)) return 'contains parentheses such as a history note';
  if (!sentence.endsWith('.')) return 'must end with a period';
  if (sentence.length > 60) return 'is longer than 60 characters';
  return null;
}

/**
 * 모든 requires 간선에 userReason 을 붙인 새 기능 목록을 돌려준다.
 * 선언 없는 간선·간선 없는 선언·형식이 틀린 문장은 이유와 함께 실패한다.
 */
export function attachUserReasons(capabilities, reasons = REQUIRES_USER_REASONS) {
  const used = new Set();
  const withReasons = capabilities.map(capability => ({ ...capability, requires: capability.requires.map(edge => {
    const key = pairKey(capability.id, edge.domain);
    if (!Object.hasOwn(reasons, key)) throw new Error(`requires edge lacks a user reason: ${key}`);
    const problem = userReasonProblem(reasons[key]);
    if (problem) throw new Error(`user reason ${problem}: ${key}`);
    used.add(key);
    return { ...edge, userReason: reasons[key] };
  }) }));
  const stale = Object.keys(reasons).filter(key => !used.has(key)).sort();
  if (stale.length) throw new Error(`user reason has no requires edge: ${stale.join(', ')}`);
  return withReasons;
}
