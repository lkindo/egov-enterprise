/** Presentation only. Permission codes and authorization decisions remain source catalog owned. */
const DOMAIN_LABELS: Readonly<Record<string, string>> = {
  ABSENCE: '부재 관리', ADBK: '주소록', ADMCODE: '행정 코드', APPROVAL: '전자 결재',
  AUTHRT: '권한 관리', BANNER: '배너', BBS_MST: '게시판 설정', BOARD: '게시글',
  CLASS_GRP: '사용자 분류 그룹', CODE: '공통 코드', COMMENT: '댓글', COMMUNITY: '커뮤니티',
  DASHBOARD: '대시보드', DEPT: '조직·부서', DEPT_BOX: '부서 업무함', DEPT_JOB: '부서 업무',
  EVENT: '행사', EXT_HR: '외부 인사 연계', FILE: '파일', HELP: '도움말',
  INFORMAL: '약식 결재', INST_CODE: '기관 코드', LOGIN_LOG: '로그인 이력', LOGIN_POL: '로그인 정책',
  MAIL: '메일', MEMO_RPT: '메모 보고', MENU: '메뉴', NETWORK: '네트워크 모니터링',
  NOTE: '쪽지', NOTI: '알림', OPS: '시스템 운영', POLICY: '이용 정책',
  POLL: '투표', POPUP: '팝업', PRIVACY: '개인정보 조회 이력', PROGRAM: '프로그램',
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
  EXPORT: '내보내기', GRANT: '권한 설정', IMPORT: '가져오기', INSTRUCT: '업무 지시', JOIN: '가입',
  LIKE: '추천', MODERATE: '관리', PASSWORD: '비밀번호 변경', READ: '조회', READ_ALL: '타인 자료 포함 조회',
  REJECT: '반려', SEND: '발송', STATUS: '상태 변경', SUBMIT: '제출', UPDATE: '수정',
  UPDATE_ALL: '타인 자료 수정', UPLOAD: '업로드', UPLOAD_ALL: '관리자 업로드', VOTE: '투표',
};
export const permissionDomainLabel = (code: string): string => DOMAIN_LABELS[code] ?? code;
export const permissionActionLabel = (code: string): string => ACTION_LABELS[code] ?? code;
