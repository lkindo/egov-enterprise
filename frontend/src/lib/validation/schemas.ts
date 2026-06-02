import { z } from 'zod';

/**
 * 전역 폼 유효성 검사 스키마 모음
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
  pollBgngYmd: z.string().min(1, '시작일은 필수입니다.'),
  pollEndYmd: z.string().min(1, '종료일은 필수입니다.'),
  pollKndCd: z.string(),
  pollDsuseYn: z.string().optional().default('N'),
}).refine(data => {
  if (data.pollBgngYmd && data.pollEndYmd) {
    return new Date(data.pollEndYmd) >= new Date(data.pollBgngYmd);
  }
  return true;
}, {
  message: '종료일은 시작일보다 빠를 수 없습니다.',
  path: ['pollEndYmd']
});

// --- SMS 관리 스키마 ---
export const smsSchema = z.object({
  sndngTelno: z.string().min(1, '발신 번호를 입력해 주세요.'),
  rcptnTelno: z.string().min(1, '수신 번호를 입력해 주세요.'),
  sndngCn: z.string().min(1, '메시지 내용을 입력해 주세요.').max(80, '메시지는 80자 이내여야 합니다.'),
});

// --- 메뉴 관리 스키마 ---
export const menuSchema = z.object({
  menuNo: z.coerce.number().min(1, '메뉴 번호는 필수입니다.'),
  menuNm: z.string().min(1, '메뉴 명칭은 필수입니다.'),
  prgrmFileNm: z.string().optional(),
  menuOrdr: z.coerce.number().min(0),
  menuDc: z.string().optional(),
  relImgPath: z.string().optional(),
  relImgNm: z.string().optional(),
  upperMenuId: z.coerce.number().optional().default(0),
  modernRoute: z.string().optional(),
});

// --- 게시판 마스터 스키마 ---
export const boardMasterSchema = z.object({
  bbsTtl: z.string().min(1, '게시판 명칭은 필수입니다.').max(100, '게시판 명칭은 100자 이내여야 합니다.'),
  bbsExpln: z.string().min(1, '게시판 소개는 필수입니다.').max(4000, '게시판 소개는 4000자 이내여야 합니다.'),
  bbsTypeCd: z.string().min(1, '게시판 유형은 필수입니다.'),
  bbsAtrbCd: z.string().min(1, '게시판 속성은 필수입니다.'),
  ansPsbltyYn: z.enum(['Y', 'N']),
  fileAtchPsbltyYn: z.enum(['Y', 'N']),
  posblAtchFileNumber: z.coerce.number().min(0).max(10),
  tmpltId: z.string().min(1, '템플릿 선택은 필수입니다.'),
  useYn: z.enum(['Y', 'N']),
});

// --- 게시물 (BBS) 상세 스키마 ---
export const boardSchema = z.object({
  pstId: z.number().optional(),
  bbsId: z.string().min(1, '게시판 ID는 필수입니다.').max(20, '게시판 ID는 20자 이내여야 합니다.'),
  pstTtl: z.string().min(1, '제목은 필수이며 유효해야 합니다.').max(100, '제목은 100자 이내여야 합니다.'),
  nttCn: z.string().min(1, '내용을 입력해 주세요.').max(4000, '내용은 4000자 이내여야 합니다.'),
  ntceBgnde: z.string().optional(),
  ntceEndde: z.string().optional(),
  password: z.string().optional().or(z.string().max(200, '비밀번호는 200자 이내여야 합니다.')),
  ntcrId: z.string().optional(),
  ntcrNm: z.string().optional().or(z.string().max(60, '작성자 명은 60자 이내여야 합니다.')),
  noticeAt: z.enum(['Y', 'N']).optional(),
  secretAt: z.enum(['Y', 'N']).optional(),
  useYn: z.enum(['Y', 'N']).optional(),
  eventDate: z.string().optional(),
});

// --- 온라인 매뉴얼 스키마 ---
export const manualSchema = z.object({
  onlnMnlId: z.string().optional(),
  onlnMnlNm: z.string().min(1, '매뉴얼 명칭은 필수입니다.'),
  onlnMnlExpln: z.string().min(1, '매뉴얼 설명은 필수입니다.'),
  onlnMnlDfn: z.string().min(1, '매뉴얼 경로는 필수입니다.'),
  onlnMnlSeCd: z.string().default('GNR'),
});

// --- 사용자 관리 스키마 (Contract Testing 용) ---
export const userManageSchema = z.object({
  userId: z.string().min(1, '아이디는 필수입니다.'),
  userNm: z.string().min(1, '성명은 필수입니다.'),
  emlAddr: z.string().email('유효한 이메일 형식이 아닙니다.'),
  userSttsCd: z.enum(['P', 'A', 'D']),
  pswd: z.string().optional(),
  mblTelno: z.string().optional(),
  ognzId: z.string().optional(),
  groupId: z.string().optional(),
});

export const userListResponseSchema = z.object({
  list: z.array(userManageSchema),
  paginationInfo: z.object({
    totalRecordCount: z.number(),
    currentPageNo: z.number(),
    recordCountPerPage: z.number(),
    pageSize: z.number(),
    totalPageCount: z.number(),
  }),
});

// --- 공통 코드 (Group) 스키마 ---
export const codeSchema = z.object({
  clCode: z.string().min(1, '분류 코드는 필수입니다.'),
  codeId: z.string().min(1, '코드 ID는 필수입니다.'),
  codeIdNm: z.string().min(1, '코드 명칭은 필수입니다.'),
  codeIdDc: z.string().optional(),
  useYn: z.enum(['Y', 'N']).default('Y'),
});

// --- 상세 코드 스키마 ---
export const codeDetailSchema = z.object({
  codeId: z.string().min(1, '코드 ID는 필수입니다.'),
  code: z.string().min(1, '코드 값은 필수입니다.'),
  codeNm: z.string().min(1, '코드 명칭은 필수입니다.'),
  codeDc: z.string().optional(),
  useYn: z.enum(['Y', 'N']).default('Y'),
  ordr: z.coerce.number().optional().default(0),
});
