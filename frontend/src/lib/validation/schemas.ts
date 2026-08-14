import { z } from 'zod';
import {
  OnlinePollManageDtoSchema,
  SmsDtoSchema,
  MenuDtoSchema,
  BoardMasterDtoSchema,
  BoardSaveRequestSchema,
  OnlineManualDtoSchema,
  UserDtoSchema,
  CmmnCodeDtoSchema,
  CmmnDetailCodeDtoSchema,
  PageResponseUserDtoSchema,
  NetworkDtoSchema
} from '@/types/generated-zod';

/**
 * 전역 폼 유효성 검사 스키마 모음
 */

// --- 공통 유효성 검사 규칙 ---
export const commonRules = {
  yn: z.enum(['Y', 'N']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 형식이 아닙니다.'),
};

export const pollSchema = OnlinePollManageDtoSchema.extend({
  pollSn: z.number().optional(),
  pollNm: z.string().min(1),
  pollDsuseYn: z.string().optional().default('N'),
  pollBgngYmd: z.string().min(0).max(10).optional(),
  pollEndYmd: z.string().min(0).max(10).optional(),
}).refine(data => {
  if (data.pollBgngYmd && data.pollEndYmd) {
    return new Date(data.pollEndYmd) >= new Date(data.pollBgngYmd);
  }
  return true;
}, {
  message: '종료일은 시작일보다 빠를 수 없습니다.',
  path: ['pollEndYmd']
});

export const smsSchema = SmsDtoSchema.extend({
  sndngTelno: z.string().min(1),
  rcptnTelno: z.string().min(1),
  sndngCn: z.string().min(1).max(80),
});

export const menuSchema = MenuDtoSchema.extend({
  menuNo: z.coerce.number().min(1),
  upperMenuId: z.coerce.number().optional().default(0),
  menuOrdr: z.coerce.number(),
});

export const boardMasterSchema = BoardMasterDtoSchema.extend({
  posblAtchFileNumber: z.coerce.number().min(0).max(10),
});

export const boardSchema = BoardSaveRequestSchema.extend({
  pstSn: z.number().optional(),
  password: z.string().optional().or(z.string().max(200)),
  noticeAt: z.enum(['Y', 'N']).optional(),
  secretAt: z.enum(['Y', 'N']).optional(),
});

export const manualSchema = OnlineManualDtoSchema.extend({
  onlnMnlSn: z.number().optional(),
});

export const userManageSchema = UserDtoSchema.extend({
  pswd: z.string().optional(),
  mblTelno: z.string().optional(),
});

export const userListResponseSchema = PageResponseUserDtoSchema;

export const networkSchema = NetworkDtoSchema.extend({
  manageIem: z.string().min(1),
  userNm: z.string().min(1),
  ntwrkIp: z.string().regex(/^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}$/, "올바른 IPv4 주소를 입력하세요."),
  subnet: z.string().min(1),
  gtwy: z.string().min(1),
  useYn: commonRules.yn,
});

export const codeSchema = CmmnCodeDtoSchema.extend({});

export const codeDetailSchema = CmmnDetailCodeDtoSchema.extend({
  ordr: z.coerce.number().optional().default(0),
});

