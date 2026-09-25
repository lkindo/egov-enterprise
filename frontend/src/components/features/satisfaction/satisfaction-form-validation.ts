import { z } from 'zod';

import { SatisfactionDtoSchema } from '@/types/generated-zod';

// [2026-09-26 DIP I6 ⑤] 서버 DTO 가 점수를 필수 1~5(@NotNull @Min(1) @Max(5))로 선언해 생성 스키마도
//   `z.number().int().min(1).max(5)` 가 됐다. 그 스키마에 이어 붙이면 생성 쪽 min(1) 이 먼저 실패해 영문 기본
//   문구가 첫 오류로 보고되므로(폼 검증은 필드마다 첫 오류만 쓴다), 같은 제약을 사용자 문구와 함께 다시 선언한다.
const scoreSchema = z.number({ error: '별점을 선택해 주세요.' })
  .int('별점은 정수여야 합니다.')
  .min(1, '별점을 선택해 주세요.')
  .max(5, '별점은 5점까지 선택할 수 있습니다.');

// DTO에 누락된 문자열 길이는 실제 Satisfaction entity @Column(length=4000)을 미러링한다.
const contentSchema = SatisfactionDtoSchema.shape.dgstfnCn
  .unwrap()
  .trim()
  .max(4000, '만족도 의견은 최대 4000자까지 입력할 수 있습니다.');

const useSchema = SatisfactionDtoSchema.shape.useYn.pipe(z.enum(['Y', 'N']));

export const satisfactionCreateSchema = SatisfactionDtoSchema.pick({
  dgstfnCn: true,
  dgstfnScr: true,
  useYn: true,
}).extend({
  dgstfnCn: contentSchema,
  dgstfnScr: scoreSchema,
  useYn: useSchema,
});

export const satisfactionValidationLabels = {
  dgstfnCn: '만족도 의견',
  dgstfnScr: '별점',
  useYn: '사용 여부',
};

