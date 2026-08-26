import { z } from 'zod';

import { SatisfactionDtoSchema } from '@/types/generated-zod';

const scoreSchema = SatisfactionDtoSchema.shape.dgstfnScr
  .unwrap()
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

