import { z } from 'zod';

/**
 * ?�역 ?��? ?�효??검???�키�?모음
 */

// --- 공통 ?�효??검??규칙 ---
export const commonRules = {
  required: (msg: string) => z.string().min(1, msg),
  yn: z.enum(['Y', 'N']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD ?�식???�닙?�다.'),
};

// --- ?�문 관�?(Poll) ?�키�?---
export const pollSchema = z.object({
  pollId: z.string().optional(),
  pollNm: z.string().min(1, '?�문 주제???�수?�니??'),
  pollBeginDe: z.string().min(1, '?�작?��? ?�수?�니??'),
  pollEndDe: z.string().min(1, '종료?��? ?�수?�니??'),
  pollKindCode: z.string(),
  pollDsuseYn: z.string().optional().default('N'),
}).refine(data => {
  if (data.pollBeginDe && data.pollEndDe) {
    return new Date(data.pollEndDe) >= new Date(data.pollBeginDe);
  }
  return true;
}, {
  message: '종료?��? ?�작?�보??빠�? ???�습?�다.',
  path: ['pollEndDe']
});

// --- SMS 관�??�키�?---
export const smsSchema = z.object({
  trnsmitTelno: z.string().min(1, '발신 번호�??�력?�주?�요.'),
  recptnTelno: z.string().min(1, '?�신 번호�??�력?�주?�요.'),
  trnsmitCn: z.string().min(1, '메시지 ?�용???�력?�주?�요.').max(80, '메시지??80???�내?�야 ?�니??'),
});

// --- 메뉴 관�??�키�?---
export const menuSchema = z.object({
  menuNo: z.coerce.number().min(1, '메뉴 번호???�수?�니??'),
  menuNm: z.string().min(1, '메뉴 명칭?� ?�수?�니??'),
  progrmFileNm: z.string().optional(),
  menuOrdr: z.coerce.number().min(0),
  menuDc: z.string().optional(),
  relateImagePath: z.string().optional(),
  relateImageNm: z.string().optional(),
  upperMenuId: z.coerce.number().optional().default(0),
  modernRoute: z.string().optional(),
});

// --- 게시??마스???�키�?---
export const boardMasterSchema = z.object({
  bbsTtl: z.string().min(1, '게시??명칭?� ?�수?�니??'),
  bbsIntroCn: z.string().min(1, '게시???�개???�수?�니??'),
  bbsTypeCd: z.string().min(1, '게시???�형?� ?�수?�니??'),
  bbsAttrCd: z.string().min(1, '게시???�성?� ?�수?�니??'),
  replyPsblYn: z.enum(['Y', 'N']),
  fileAtchPsblYn: z.enum(['Y', 'N']),
  posblAtchFileNumber: z.coerce.number().min(0).max(10),
  tmplatId: z.string().min(1, '?�플�??�택?� ?�수?�니??'),
  useYn: z.enum(['Y', 'N']),
});

// --- 게시??BBS) ?�세 ?�키�?---
export const boardSchema = z.object({
  pstId: z.number().optional(),
  bbsId: z.string(),
  pstTtl: z.string().min(1, '?�목?� ?�수?�며 ?�효?�야 ?�니??'),
  nttCn: z.string().min(1, '?�용???�력?�주?�요.'),
  ntceBgnde: z.string().optional(),
  ntceEndde: z.string().optional(),
  password: z.string().optional(),
  ntcrId: z.string().optional(),
  ntcrNm: z.string().optional(),
  noticeAt: z.enum(['Y', 'N']).optional(),
  secretAt: z.enum(['Y', 'N']).optional(),
  useYn: z.enum(['Y', 'N']).optional(),
  eventDate: z.string().optional(),
});

// --- ?�라??매뉴???�키m ---
export const manualSchema = z.object({
  onlineMnlId: z.string().optional(),
  onlineMnlNm: z.string().min(1, '매뉴??명칭?� ?�수?�니??'),
  onlineMnlDc: z.string().min(1, '매뉴???�명?� ?�수?�니??'),
  onlineMnlDf: z.string().min(1, '매뉴??경로???�수?�니??'),
});

// --- ?�용??관�??�키�?(Contract Testing?? ---
export const userManageSchema = z.object({
  userId: z.string().min(1, '?�이?�는 ?�수?�니??'),
  userNm: z.string().min(1, '?�명?� ?�수?�니??'),
  email: z.string().email('?�효???�메???�식???�닙?�다.'),
  userSttusCode: z.enum(['P', 'A', 'D']),
  password: z.string().optional(),
  moblphonNo: z.string().optional(),
  orgnztId: z.string().optional(),
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
// --- 공통 코드 (Group) ?�키�?---
export const codeSchema = z.object({
  clCode: z.string().min(1, '분류 코드???�수?�니??'),
  codeId: z.string().min(1, '코드 ID???�수?�니??'),
  codeIdNm: z.string().min(1, '코드 명칭?� ?�수?�니??'),
  codeIdDc: z.string().optional(),
  useYn: z.enum(['Y', 'N']).default('Y'),
});

// --- ?�세 코드 ?�키�?---
export const codeDetailSchema = z.object({
  codeId: z.string().min(1, '코드 ID???�수?�니??'),
  code: z.string().min(1, '코드 값�? ?�수?�니??'),
  codeNm: z.string().min(1, '코드 명칭?� ?�수?�니??'),
  codeDc: z.string().optional(),
  useYn: z.enum(['Y', 'N']).default('Y'),
  ordr: z.coerce.number().optional().default(0),
});
