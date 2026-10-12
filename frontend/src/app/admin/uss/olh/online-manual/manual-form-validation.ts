import { z } from 'zod';
import { OnlineManualDtoSchema } from '@/types/generated-zod';

/**
 * 온라인 매뉴얼 폼 스키마 — 도움말 기능 소유(Phase 2 10단계 10c-1). 종전에는 공유 모듈(lib/validation/schemas.ts)에 있어 도움말을
 * 고르지 않은 생성물에도 남았고, 생성 계약을 구성으로 줄이면(10c) 그 생성물에서 사라진 계약 이름(OnlineManualDtoSchema)을 import
 * 하게 된다. 매뉴얼 화면 옆에 두면 기능과 함께 빠진다.
 */
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
