export interface Vacation {
  applcntId: string;
  vcatnSe: string; // 01: 연차, 02: 반차, 03: 병가 등
  vcatnSeNm?: string;
  bgnde: string; // yyyyMMdd
  endde: string;
  vcatnResn: string;
  reqstDe: string;
  occrrncYear: string;
  noonSe?: string; // 1: 오전, 2: 오후
  confmAt: 'R' | 'Y' | 'N'; // R: 신청, Y: 승인, N: 반려
  sanctnDt?: string;
  returnResn?: string;
}

export interface YearlyLeave {
  occrrncYear: string;
  userId: string;
  yrycOccrrncCo: number;
  useYrycCo: number;
  remndrYrycCo: number;
}