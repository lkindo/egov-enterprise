import { z } from 'zod';
import { SmsDtoSchema, SmsRecptnDtoSchema } from '@/types/generated-zod';

/**
 * 문자 발송 폼 스키마 — 문자 기능 소유(Phase 2 10단계 10c-1). 문자 발송 화면 둘(관리 화면·옛 문자 목록)이 함께 쓴다.
 * 종전에는 공유 모듈(lib/validation/schemas.ts)에 있어 문자를 고르지 않은 생성물에도 남았고, 생성 계약을 구성으로 줄이면(10c)
 * 그 생성물에서 사라진 계약 이름(SmsDtoSchema)을 import 하게 된다. 문자 디렉터리에 두면 기능과 함께 빠진다.
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
