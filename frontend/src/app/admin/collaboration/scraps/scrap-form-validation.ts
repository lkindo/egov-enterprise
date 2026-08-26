import { z } from 'zod';

import { ScrapDtoSchema } from '@/types/generated-zod';

const scrapNameSchema = ScrapDtoSchema.shape.scrapNm
  .unwrap()
  .trim()
  .min(1, '스크랩명을 입력해 주세요.')
  .max(100, '스크랩명은 최대 100자까지 입력할 수 있습니다.');

const scrapUrlSchema = ScrapDtoSchema.shape.scrapUrl
  .unwrap()
  .trim()
  .min(1, '참조 URL을 입력해 주세요.')
  .max(1000, '참조 URL은 최대 1000자까지 입력할 수 있습니다.')
  .url('올바른 URL 형식을 입력해 주세요.')
  .refine(
    (value) => /^https?:\/\//i.test(value),
    '참조 URL은 http:// 또는 https://로 시작해야 합니다.',
  );

const scrapExplanationSchema = ScrapDtoSchema.shape.scrapExpln.unwrap();
const scrapUseSchema = ScrapDtoSchema.shape.useYn.pipe(z.enum(['Y', 'N']));

export const scrapCreateFormSchema = ScrapDtoSchema.pick({
  scrapNm: true,
  scrapUrl: true,
  scrapExpln: true,
  useYn: true,
}).extend({
  scrapNm: scrapNameSchema,
  scrapUrl: scrapUrlSchema,
  scrapExpln: scrapExplanationSchema,
  useYn: scrapUseSchema,
});

export const scrapEditFormSchema = scrapCreateFormSchema;

export const scrapValidationLabels = {
  scrapExpln: '설명',
  scrapNm: '스크랩명',
  scrapUrl: '참조 URL',
  useYn: '사용 여부',
};

