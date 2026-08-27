import { z } from 'zod';
import {
  OnlinePollManageDtoSchema,
  SmsDtoSchema,
  SmsRecptnDtoSchema,
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
  pollNm: OnlinePollManageDtoSchema.shape.pollNm.min(1),
  pollDsuseYn: OnlinePollManageDtoSchema.shape.pollDsuseYn.default('N'),
  pollBgngYmd: OnlinePollManageDtoSchema.shape.pollBgngYmd,
  pollEndYmd: OnlinePollManageDtoSchema.shape.pollEndYmd,
}).refine(data => {
  if (data.pollBgngYmd && data.pollEndYmd) {
    // API/DB 계약의 YYYYMMDD 저장 형식은 문자열 정렬과 날짜 정렬이 동일하다.
    return data.pollEndYmd >= data.pollBgngYmd;
  }
  return true;
}, {
  message: '종료일은 시작일보다 빠를 수 없습니다.',
  path: ['pollEndYmd']
});

export const smsSchema = SmsDtoSchema.extend({
  sndngTelno: z.string()
    .trim()
    .min(1, '발신 번호를 입력해 주세요.')
    .max(13, '발신 번호는 최대 13자까지 입력할 수 있습니다.')
    .regex(/^[0-9-]+$/, '발신 번호는 숫자와 하이픈만 입력해 주세요.')
    .pipe(SmsDtoSchema.shape.sndngTelno.unwrap()),
  rcptnTelno: z.string()
    .trim()
    .min(1, '수신 번호를 입력해 주세요.')
    .max(20, '수신 번호는 최대 20자까지 입력할 수 있습니다.')
    .regex(/^[0-9-]+$/, '수신 번호는 숫자와 하이픈만 입력해 주세요.')
    .pipe(SmsRecptnDtoSchema.shape.rcptnTelno.unwrap()),
  sndngCn: z.string()
    .trim()
    .min(1, '메시지 내용을 입력해 주세요.')
    // 이 화면의 기존 SMS 길이 정책(80자)은 백엔드 4,000자보다 엄격하므로 보존한다.
    .max(80, '메시지 내용은 최대 80자까지 입력할 수 있습니다.')
    .pipe(SmsDtoSchema.shape.sndngCn.unwrap()),
});

export const menuSchema = MenuDtoSchema.extend({
  menuNo: z.coerce.number().pipe(MenuDtoSchema.shape.menuNo.unwrap().min(1)).optional(),
  menuNm: z.string()
    .trim()
    .min(1, '메뉴 명칭을 입력해 주세요.')
    .max(100, '메뉴 명칭은 최대 100자까지 입력할 수 있습니다.')
    .pipe(MenuDtoSchema.shape.menuNm),
  upperMenuId: z.coerce.number().pipe(MenuDtoSchema.shape.upperMenuId.unwrap()).optional().default(0),
  menuOrdr: z.coerce.number({ error: '정렬 순서는 숫자로 입력해 주세요.' })
    .finite('정렬 순서는 유한한 숫자로 입력해 주세요.')
    .int('정렬 순서는 정수로 입력해 주세요.')
    .min(-2147483648, '정렬 순서는 -2147483648 이상이어야 합니다.')
    .max(2147483647, '정렬 순서는 2147483647 이하여야 합니다.')
    .pipe(MenuDtoSchema.shape.menuOrdr),
  prgrmFileNm: z.string()
    .trim()
    .max(100, '연결 프로그램은 최대 100자까지 입력할 수 있습니다.')
    .pipe(MenuDtoSchema.shape.prgrmFileNm.unwrap())
    .optional(),
  menuExpln: z.string()
    .trim()
    .max(4000, '메뉴 설명은 최대 4000자까지 입력할 수 있습니다.')
    .pipe(MenuDtoSchema.shape.menuExpln.unwrap())
    .optional(),
  modernRoute: z.string()
    .trim()
    .max(500, '연결 라우트는 최대 500자까지 입력할 수 있습니다.')
    .pipe(MenuDtoSchema.shape.modernRoute.unwrap())
    .optional(),
  useYn: z.intersection(
    z.enum(['Y', 'N']),
    MenuDtoSchema.shape.useYn.unwrap(),
  )
    .default('Y'),
});

export const boardMasterSchema = BoardMasterDtoSchema.extend({
  posblAtchFileNumber: z.coerce.number().min(0).max(10),
});

// [2026-08-27] noticeAt·secretAt 확장 제거. 이 두 줄이 zod strip 을 통과시켜 계약 밖 키를
//   payload 에 남겼고, 서버는 fail-on-unknown-properties 라 게시물 등록이 **항상 400** 이었다.
//   secretAt 은 계약의 scrtYn 으로 이름만 다른 같은 축이고, noticeAt(공지 여부)은 BoardSaveRequest
//   에 대응 필드 자체가 없어 보낼 방법이 없다 — 화면의 공지 스위치도 함께 제거했다.
export const boardSchema = BoardSaveRequestSchema.extend({
  pstSn: z.number().optional(),
  password: z.string().optional().or(z.string().max(200)),
});

export const manualSchema = OnlineManualDtoSchema.extend({
  onlnMnlNm: z.string()
    .trim()
    .min(1, '매뉴얼 명칭을 입력해 주세요.')
    .max(100, '매뉴얼 명칭은 최대 100자까지 입력할 수 있습니다.')
    .pipe(OnlineManualDtoSchema.shape.onlnMnlNm),
  onlnMnlSeCd: z.string()
    .trim()
    .min(1, '매뉴얼 구분 코드를 입력해 주세요.')
    .max(12, '매뉴얼 구분 코드는 최대 12자까지 입력할 수 있습니다.')
    .pipe(OnlineManualDtoSchema.shape.onlnMnlSeCd),
  onlnMnlDfn: z.string()
    .trim()
    .max(1000, '리소스 경로는 최대 1000자까지 입력할 수 있습니다.')
    .pipe(OnlineManualDtoSchema.shape.onlnMnlDfn.unwrap())
    .optional(),
  onlnMnlExpln: z.string()
    .trim()
    .max(4000, '상세 설명은 최대 4000자까지 입력할 수 있습니다.')
    .pipe(OnlineManualDtoSchema.shape.onlnMnlExpln.unwrap())
    .optional(),
});

export const userManageSchema = UserDtoSchema.extend({
  pswd: UserDtoSchema.shape.pswd.optional().or(z.literal('')),
  mblTelno: UserDtoSchema.shape.mblTelno,
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

