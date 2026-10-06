import { z } from 'zod';
import {
  SmsDtoSchema,
  SmsRecptnDtoSchema,
  OnlineManualDtoSchema,
} from '@/types/generated-zod';

/**
 * 여러 화면이 공유하는 폼 유효성 검사 스키마. 화면 하나만 쓰는 스키마는 그 화면 옆에 둔다
 * (예: 투표 폼은 admin/survey/manage/poll-form-validation.ts, 메뉴 속성은 admin/system/menus/menuDraft.ts).
 */

// 화면은 수신 번호 하나를 입력받고 API 경계에서 recipients[] 로 승격한다. 서버 응답/검색 필드와
// recipients 자체를 폼 상태에 섞지 않도록 생성 요청의 두 본문 필드만 선택한다.
export const smsRecipientNumberSchema = z.string()
  .trim()
  .min(1, '수신 번호를 입력해 주세요.')
  .max(13, '하이픈을 포함한 수신 번호는 최대 13자까지 입력할 수 있습니다.')
  .regex(/^[0-9-]+$/, '수신 번호는 숫자와 하이픈만 입력해 주세요.')
  .transform(value => value.replace(/-/g, ''))
  .pipe(SmsRecptnDtoSchema.shape.rcptnTelno.unwrap());

export const smsSchema = SmsDtoSchema.pick({ sndngTelno: true, sndngCn: true }).extend({
  sndngTelno: z.string()
    .trim()
    .min(1, '발신 번호를 입력해 주세요.')
    .max(13, '발신 번호는 최대 13자까지 입력할 수 있습니다.')
    .regex(/^[0-9-]+$/, '발신 번호는 숫자와 하이픈만 입력해 주세요.')
    .pipe(SmsDtoSchema.shape.sndngTelno),
  rcptnTelno: smsRecipientNumberSchema,
  sndngCn: z.string()
    .trim()
    .min(1, '메시지 내용을 입력해 주세요.')
    // 이 화면의 기존 SMS 길이 정책(80자)은 백엔드 4,000자보다 엄격하므로 보존한다.
    .max(80, '메시지 내용은 최대 80자까지 입력할 수 있습니다.')
    .pipe(SmsDtoSchema.shape.sndngCn),
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

