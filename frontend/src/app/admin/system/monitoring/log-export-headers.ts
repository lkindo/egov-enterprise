import type { LoginLog } from '@/types/foundation/system';

type ExportHeader<T> = {
  label: string;
  key: keyof T;
};

/** 생성된 LoginLogDto 계약에 존재하는 필드만 CSV로 반출한다. */
export const LOGIN_LOG_EXPORT_HEADERS: ExportHeader<LoginLog>[] = [
  { label: '로그인 일련번호', key: 'lgnSn' },
  { label: '로그인ID', key: 'loginId' },
  { label: '로그인방식', key: 'loginMthd' },
  { label: '접속IP', key: 'loginIp' },
  { label: '오류여부', key: 'errOccrrAt' },
  { label: '오류코드', key: 'errorCode' },
  { label: '일시', key: 'creatDt' },
];
