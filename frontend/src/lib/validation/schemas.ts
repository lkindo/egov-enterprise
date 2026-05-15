import { z } from 'zod';

/**
 * ?„ì—­ ?œì? ? íš¨??ê²€???¤í‚¤ë§?ëª¨ìŒ
 */

// --- ê³µí†µ ? íš¨??ê²€??ê·œì¹™ ---
export const commonRules = {
  required: (msg: string) => z.string().min(1, msg),
  yn: z.enum(['Y', 'N']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD ?•ì‹???„ë‹™?ˆë‹¤.'),
};

// --- ?¤ë¬¸ ê´€ë¦?(Poll) ?¤í‚¤ë§?---
export const pollSchema = z.object({
  pollId: z.string().optional(),
  pollNm: z.string().min(1, '?¤ë¬¸ ì£¼ì œ???„ìˆ˜?…ë‹ˆ??'),
  pollBeginDe: z.string().min(1, '?œì‘?¼ì? ?„ìˆ˜?…ë‹ˆ??'),
  pollEndDe: z.string().min(1, 'ì¢…ë£Œ?¼ì? ?„ìˆ˜?…ë‹ˆ??'),
  pollKindCode: z.string(),
  pollDsuseYn: z.string().optional().default('N'),
}).refine(data => {
  if (data.pollBeginDe && data.pollEndDe) {
    return new Date(data.pollEndDe) >= new Date(data.pollBeginDe);
  }
  return true;
}, {
  message: 'ì¢…ë£Œ?¼ì? ?œì‘?¼ë³´??ë¹ ë? ???†ìŠµ?ˆë‹¤.',
  path: ['pollEndDe']
});

// --- SMS ê´€ë¦??¤í‚¤ë§?---
export const smsSchema = z.object({
  trnsmitTelno: z.string().min(1, 'ë°œì‹  ë²ˆí˜¸ë¥??…ë ¥?´ì£¼?¸ìš”.'),
  recptnTelno: z.string().min(1, '?˜ì‹  ë²ˆí˜¸ë¥??…ë ¥?´ì£¼?¸ìš”.'),
  trnsmitCn: z.string().min(1, 'ë©”ì‹œì§€ ?´ìš©???…ë ¥?´ì£¼?¸ìš”.').max(80, 'ë©”ì‹œì§€??80???´ë‚´?¬ì•¼ ?©ë‹ˆ??'),
});

// --- ë©”ë‰´ ê´€ë¦??¤í‚¤ë§?---
export const menuSchema = z.object({
  menuNo: z.coerce.number().min(1, 'ë©”ë‰´ ë²ˆí˜¸???„ìˆ˜?…ë‹ˆ??'),
  menuNm: z.string().min(1, 'ë©”ë‰´ ëª…ì¹­?€ ?„ìˆ˜?…ë‹ˆ??'),
  progrmFileNm: z.string().optional(),
  menuOrdr: z.coerce.number().min(0),
  menuDc: z.string().optional(),
  relateImagePath: z.string().optional(),
  relateImageNm: z.string().optional(),
  upperMenuId: z.coerce.number().optional().default(0),
  modernRoute: z.string().optional(),
});

// --- ê²Œì‹œ??ë§ˆìŠ¤???¤í‚¤ë§?---
export const boardMasterSchema = z.object({
  bbsNm: z.string().min(1, 'ê²Œì‹œ??ëª…ì¹­?€ ?„ìˆ˜?…ë‹ˆ??'),
  bbsIntrcn: z.string().min(1, 'ê²Œì‹œ???Œê°œ???„ìˆ˜?…ë‹ˆ??'),
  bbsTyCode: z.string().min(1, 'ê²Œì‹œ??? í˜•?€ ?„ìˆ˜?…ë‹ˆ??'),
  bbsAttrbCode: z.string().min(1, 'ê²Œì‹œ???ì„±?€ ?„ìˆ˜?…ë‹ˆ??'),
  replyPosblAt: z.enum(['Y', 'N']),
  fileAtchPosblAt: z.enum(['Y', 'N']),
  posblAtchFileNumber: z.coerce.number().min(0).max(10),
  tmplatId: z.string().min(1, '?œí”Œë¦?? íƒ?€ ?„ìˆ˜?…ë‹ˆ??'),
  useAt: z.enum(['Y', 'N']),
});

// --- ê²Œì‹œ??BBS) ?ì„¸ ?¤í‚¤ë§?---
export const boardSchema = z.object({
  pstId: z.number().optional(),
  bbsId: z.string(),
  pstTtl: z.string().min(1, '?œëª©?€ ?„ìˆ˜?´ë©° ? íš¨?´ì•¼ ?©ë‹ˆ??'),
  nttCn: z.string().min(1, '?´ìš©???…ë ¥?´ì£¼?¸ìš”.'),
  ntceBgnde: z.string().optional(),
  ntceEndde: z.string().optional(),
  password: z.string().optional(),
  ntcrId: z.string().optional(),
  ntcrNm: z.string().optional(),
  noticeAt: z.enum(['Y', 'N']).optional(),
  secretAt: z.enum(['Y', 'N']).optional(),
  useAt: z.enum(['Y', 'N']).optional(),
  eventDate: z.string().optional(),
});

// --- ?¨ë¼??ë§¤ë‰´???¤í‚¤m ---
export const manualSchema = z.object({
  onlineMnlId: z.string().optional(),
  onlineMnlNm: z.string().min(1, 'ë§¤ë‰´??ëª…ì¹­?€ ?„ìˆ˜?…ë‹ˆ??'),
  onlineMnlDc: z.string().min(1, 'ë§¤ë‰´???¤ëª…?€ ?„ìˆ˜?…ë‹ˆ??'),
  onlineMnlDf: z.string().min(1, 'ë§¤ë‰´??ê²½ë¡œ???„ìˆ˜?…ë‹ˆ??'),
});

// --- ?¬ìš©??ê´€ë¦??¤í‚¤ë§?(Contract Testing?? ---
export const userManageSchema = z.object({
  userId: z.string().min(1, '?„ì´?”ëŠ” ?„ìˆ˜?…ë‹ˆ??'),
  userNm: z.string().min(1, '?±ëª…?€ ?„ìˆ˜?…ë‹ˆ??'),
  email: z.string().email('? íš¨???´ë©”???•ì‹???„ë‹™?ˆë‹¤.'),
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
// --- ê³µí†µ ì½”ë“œ (Group) ?¤í‚¤ë§?---
export const codeSchema = z.object({
  clCode: z.string().min(1, 'ë¶„ë¥˜ ì½”ë“œ???„ìˆ˜?…ë‹ˆ??'),
  codeId: z.string().min(1, 'ì½”ë“œ ID???„ìˆ˜?…ë‹ˆ??'),
  codeIdNm: z.string().min(1, 'ì½”ë“œ ëª…ì¹­?€ ?„ìˆ˜?…ë‹ˆ??'),
  codeIdDc: z.string().optional(),
  useAt: z.enum(['Y', 'N']).default('Y'),
});

// --- ?ì„¸ ì½”ë“œ ?¤í‚¤ë§?---
export const codeDetailSchema = z.object({
  codeId: z.string().min(1, 'ì½”ë“œ ID???„ìˆ˜?…ë‹ˆ??'),
  code: z.string().min(1, 'ì½”ë“œ ê°’ì? ?„ìˆ˜?…ë‹ˆ??'),
  codeNm: z.string().min(1, 'ì½”ë“œ ëª…ì¹­?€ ?„ìˆ˜?…ë‹ˆ??'),
  codeDc: z.string().optional(),
  useAt: z.enum(['Y', 'N']).default('Y'),
  ordr: z.coerce.number().optional().default(0),
});
