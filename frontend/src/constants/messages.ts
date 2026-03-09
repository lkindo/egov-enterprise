/**
 * 프론트엔드 통합 메시지 관리 (i18n 준비 단계)
 */
export const MESSAGES = {
  common: {
    success: '성공',
    error: '오류가 발생했습니다.',
    save: '저장',
    delete: '삭제',
    cancel: '취소',
    confirm: '확인',
    search: '조회',
    loading: '처리 중...',
  },
  login: {
    title: '표준프레임워크 엔터프라이즈 시스템',
    idLabel: '아이디',
    idPlaceholder: '아이디를 입력하세요',
    pwLabel: '비밀번호',
    pwPlaceholder: '비밀번호를 입력하세요',
    rememberId: '아이디 저장',
    submit: '로그인',
    submitting: '로그인 중...',
    errorEmpty: '아이디와 비밀번호를 입력해주세요.',
    errorFailed: '로그인에 실패했습니다. 아이디 또는 비밀번호를 확인해주세요.',
    viewPassword: '비밀번호 보기',
    hidePassword: '비밀번호 숨기기',
  },
  user: {
    manage: '사용자 관리',
    registered: '사용자가 등록되었습니다.',
    updated: '사용자 정보가 수정되었습니다.',
    deleted: '사용자가 삭제되었습니다.',
  }
} as const;

export type MessageKey = keyof typeof MESSAGES;
