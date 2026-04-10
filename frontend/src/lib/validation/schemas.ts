import { z } from 'zod';

/**
 * 전역 표준 유효성 검사 스키마 모음
 */

// --- 공통 유효성 검사 규칙 ---
export const commonRules = {
  required: (msg: string) => z.string().min(1, msg),
  yn: z.enum(['Y', 'N']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 형식이 아닙니다.'),
};

// --- 설문 관리 (Poll) 스키마 ---
export const pollSchema = z.object({
  pollId: z.string().optional(),
  pollNm: z.string().min(1, '설문 주제는 필수입니다.'),
  pollBeginDe: z.string().min(1, '시작일은 필수입니다.'),
  pollEndDe: z.string().min(1, '종료일은 필수입니다.'),
  pollKindCode: z.string(),
  pollDsuseYn: z.string().optional().default('N'),
}).refine(data => {
  if (data.pollBeginDe && data.pollEndDe) {
    return new Date(data.pollEndDe) >= new Date(data.pollBeginDe);
  }
  return true;
}, {
  message: '종료일은 시작일보다 빠를 수 없습니다.',
  path: ['pollEndDe']
});

// --- SMS 관리 스키마 ---
export const smsSchema = z.object({
  trnsmitTelno: z.string().min(1, '발신 번호를 입력해주세요.'),
  recptnTelno: z.string().min(1, '수신 번호를 입력해주세요.'),
  trnsmitCn: z.string().min(1, '메시지 내용을 입력해주세요.').max(80, '메시지는 80자 이내여야 합니다.'),
});

// --- 메뉴 관리 스키마 ---
export const menuSchema = z.object({
  menuNo: z.coerce.number().min(1, '메뉴 번호는 필수입니다.'),
  menuNm: z.string().min(1, '메뉴 명칭은 필수입니다.'),
  progrmFileNm: z.string().optional(),
  menuOrdr: z.coerce.number().min(0),
  menuDc: z.string().optional(),
  relateImagePath: z.string().optional(),
  relateImageNm: z.string().optional(),
  upperMenuId: z.coerce.number().optional().default(0),
  modernRoute: z.string().optional(),
});

// --- 게시판 마스터 스키마 ---
export const boardMasterSchema = z.object({
  bbsNm: z.string().min(1, '게시판 명칭은 필수입니다.'),
  bbsIntrcn: z.string().min(1, '게시판 소개는 필수입니다.'),
  bbsTyCode: z.string().min(1, '게시판 유형은 필수입니다.'),
  bbsAttrbCode: z.string().min(1, '게시판 속성은 필수입니다.'),
  replyPosblAt: z.enum(['Y', 'N']),
  fileAtchPosblAt: z.enum(['Y', 'N']),
  posblAtchFileNumber: z.coerce.number().min(0).max(10),
  tmplatId: z.string().min(1, '템플릿 선택은 필수입니다.'),
  useAt: z.enum(['Y', 'N']),
});
