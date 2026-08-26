import { z } from 'zod';
import {
  OnlinePollArticleDtoSchema,
  OnlinePollManageDtoSchema,
} from '@/types/generated-zod';

const storageDateSchema = OnlinePollManageDtoSchema.shape.pollBgngYmd.unwrap()
  .trim()
  .regex(/^\d{8}$/, '날짜를 선택해 주세요.');

/** 설문 생성·수정 화면이 공유하는 API/DB 경계 검증. 날짜는 yyyyMMdd로만 전송한다. */
const pollFormFieldsSchema = OnlinePollManageDtoSchema.extend({
  pollNm: OnlinePollManageDtoSchema.shape.pollNm.trim()
    .min(1, '설문명을 입력해 주세요.'),
  pollBgngYmd: storageDateSchema,
  pollEndYmd: OnlinePollManageDtoSchema.shape.pollEndYmd.unwrap()
    .trim()
    .regex(/^\d{8}$/, '날짜를 선택해 주세요.'),
  pollKndCd: OnlinePollManageDtoSchema.shape.pollKndCd.unwrap()
    .trim()
    .min(1, '설문 유형을 선택해 주세요.'),
  pollDsuseYn: OnlinePollManageDtoSchema.shape.pollDsuseYn.unwrap()
    .trim()
    .min(1, '설문 사용 여부를 확인해 주세요.'),
});

function validatePollDateRange(
  value: z.output<typeof pollFormFieldsSchema>,
  context: z.RefinementCtx,
) {
  if (/^\d{8}$/.test(value.pollBgngYmd)
    && /^\d{8}$/.test(value.pollEndYmd)
    && value.pollBgngYmd > value.pollEndYmd) {
    context.addIssue({
      code: 'custom',
      path: ['pollBgngYmd'],
      message: '설문 시작일은 종료일보다 빠르거나 같아야 합니다.',
    });
  }
}

export const pollFormSchema = pollFormFieldsSchema.superRefine(validatePollDateRange);

export type PollFormValues = z.output<typeof pollFormSchema>;

const pollArticleFormSchema = OnlinePollArticleDtoSchema.extend({
  pollArtclNm: OnlinePollArticleDtoSchema.shape.pollArtclNm.trim()
    .min(1, '선택 항목 내용을 입력해 주세요.'),
});

export const adminPollFormSchema = pollFormFieldsSchema.extend({
  pollArticles: z.array(pollArticleFormSchema)
    .min(2, '선택 항목을 두 개 이상 입력해 주세요.'),
}).superRefine(validatePollDateRange);
