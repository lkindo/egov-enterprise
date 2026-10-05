/** Presentation only. Permission codes and authorization decisions remain source catalog owned. */
const DOMAIN_LABELS: Readonly<Record<string, string>> = {
  ABSENCE: '부재 관리', ADBK: '주소록', ADMCODE: '행정 코드', ADT_LOG: '민감 작업 감사', APPROVAL: '전자 결재',
  AUTHRT: '권한 관리', BANNER: '배너', BBS_MST: '게시판 설정', BOARD: '게시글',
  CLASS_GRP: '사용자 분류 그룹', CODE: '공통 코드', COMMENT: '댓글', COMMUNITY: '커뮤니티',
  DASHBOARD: '대시보드', DEPT: '조직·부서', DEPT_BOX: '부서 업무함', DEPT_JOB: '부서 업무', DWORK: '후속 작업',
  EVENT: '행사', EXT_HR: '외부 인사 연계', FAQ: 'FAQ', FILE: '파일', HELP: '도움말',
  INFORMAL: '약식 결재', INST_CODE: '기관 코드', LOGIN_LOG: '로그인 이력', LOGIN_POL: '로그인 정책',
  MAIL: '메일', MEMO_RPT: '메모 보고', MENU: '메뉴', MFA: '추가 인증',
  NOTE: '쪽지', NOTI: '알림', NOTICE: '공지사항', OPS: '시스템 운영', POLICY: '이용 정책',
  POLL: '투표', POPUP: '팝업', PRIVACY: '개인정보 조회 이력',
  REWARD: '포상', SATISFY: '만족도', SCHEDULE: '일정', SCRAP: '스크랩',
  SERVICE: '서비스 관리', SMS: '문자', STATS: '통계', SURVEY: '설문',
  SURVEY_RSP: '설문 응답', SYS_LOG: '시스템 이력', TEMPLATE: '서식', USER: '사용자',
  USER_LOG: '사용자 활동 이력', WEB_LOG: '웹 요청 이력', WORK_RPT: '업무 보고', WORKFLOW: '워크플로우',
};
const ACTION_LABELS: Readonly<Record<string, string>> = {
  ACK: '확인', ADMIN_READ: '관리 조회', APPR_ADMIN: '관리 경로 본인 결재',
  APPROVE: '승인', ASSIGN: '배정', AUDIT: '감사 이력 조회', CANCEL: '취소',
  CREATE: '등록', CREATE_ALL: '관리자 등록', DELETE: '삭제', DELETE_ALL: '타인 자료 삭제',
  DEPT: '부서 변경', DISPATCH: '알림 발송', DOWNLOAD: '다운로드', DOWNLOAD_ALL: '타인 자료 다운로드',
  EDIT: '편집', EXPORT: '내보내기', GRANT: '권한 설정', IMPORT: '가져오기', INSTRUCT: '업무 지시', JOIN: '가입',
  LIKE: '추천', MODERATE: '관리', PASSWORD: '비밀번호 변경', READ: '조회', READ_ALL: '타인 자료 포함 조회',
  RECOVER: '복구', REJECT: '반려', RETRY: '재처리', SEND: '발송', STATUS: '상태 변경', SUBMIT: '제출', UPDATE: '수정',
  UPDATE_ALL: '타인 자료 수정', UPLOAD: '업로드', UPLOAD_ALL: '관리자 업로드', VOTE: '투표',
};
export const permissionDomainLabel = (code: string): string => DOMAIN_LABELS[code] ?? code;
export const permissionActionLabel = (code: string): string => ACTION_LABELS[code] ?? code;

/**
 * 업무 영역을 묶는 분류(2026-10-02, 관리 콘솔 UX 1단계). 권한 편집기의 '기능별 권한' 표가 행을 이 순서로 묶는다.
 *
 * 화면 표현일 뿐 인가 판정에 쓰지 않는다. 카탈로그의 모든 영역은 정확히 한 분류에 속해야 하며(단위 테스트가 고정),
 * 표에 없는 새 영역은 '기타'로 보인다 — 빠뜨린 영역을 숨기지 않는다.
 */
export interface PermissionDomainCategory {
  readonly key: string;
  readonly label: string;
  readonly domains: readonly string[];
}
export const PERMISSION_DOMAIN_CATEGORIES: readonly PermissionDomainCategory[] = [
  { key: 'MY_WORK', label: '내 업무·결재', domains: ['DASHBOARD', 'APPROVAL', 'INFORMAL', 'WORKFLOW', 'DEPT_JOB', 'DEPT_BOX', 'SCHEDULE', 'WORK_RPT', 'MEMO_RPT', 'ABSENCE'] },
  { key: 'COMMUNICATION', label: '소통·연락', domains: ['NOTE', 'MAIL', 'SMS', 'NOTI', 'ADBK', 'SCRAP'] },
  { key: 'CONTENT', label: '게시·지식·커뮤니티', domains: ['BOARD', 'BBS_MST', 'NOTICE', 'FAQ', 'COMMENT', 'SATISFY', 'TEMPLATE', 'HELP', 'COMMUNITY', 'FILE'] },
  { key: 'SURVEY_EVENT', label: '설문·행사', domains: ['SURVEY', 'SURVEY_RSP', 'POLL', 'EVENT', 'EXT_HR', 'REWARD'] },
  { key: 'IDENTITY', label: '사용자·조직·권한', domains: ['USER', 'DEPT', 'CLASS_GRP', 'AUTHRT', 'LOGIN_POL', 'MFA', 'POLICY'] },
  { key: 'SYSTEM', label: '시스템 설정', domains: ['MENU', 'CODE', 'ADMCODE', 'INST_CODE', 'BANNER', 'POPUP', 'SERVICE', 'OPS', 'DWORK'] },
  { key: 'AUDIT', label: '로그·감사·통계', domains: ['LOGIN_LOG', 'SYS_LOG', 'WEB_LOG', 'USER_LOG', 'PRIVACY', 'ADT_LOG', 'STATS'] },
];
export const OTHER_PERMISSION_CATEGORY: PermissionDomainCategory = { key: 'OTHER', label: '기타', domains: [] };

const CATEGORY_BY_DOMAIN: ReadonlyMap<string, PermissionDomainCategory> = new Map(
  PERMISSION_DOMAIN_CATEGORIES.flatMap((category) => category.domains.map((domain) => [domain, category] as const)),
);

/** 영역이 속한 분류. 표에 없는 영역은 '기타'다. */
export const permissionDomainCategory = (domain: string): PermissionDomainCategory =>
  CATEGORY_BY_DOMAIN.get(domain) ?? OTHER_PERMISSION_CATEGORY;

/**
 * '기능별 권한' 표의 고정 열. 여기 없는 행위는 '그 밖의 기능' 칸에 라벨 붙은 체크박스로 보인다.
 * 본인 자료와 타인 자료(*_ALL) 행위는 인가 의미가 달라 열을 나눈다(H3).
 */
export const PERMISSION_MATRIX_COLUMNS: ReadonlyArray<{ readonly action: string; readonly label: string }> = [
  { action: 'READ', label: '조회' },
  { action: 'CREATE', label: '등록' },
  { action: 'UPDATE', label: '수정' },
  { action: 'DELETE', label: '삭제' },
  { action: 'READ_ALL', label: '타인 자료 조회' },
  { action: 'UPDATE_ALL', label: '타인 자료 수정' },
  { action: 'DELETE_ALL', label: '타인 자료 삭제' },
];
export const PERMISSION_MATRIX_OTHER_COLUMN_LABEL = '그 밖의 기능';
