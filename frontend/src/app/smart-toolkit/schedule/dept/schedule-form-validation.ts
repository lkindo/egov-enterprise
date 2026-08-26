import { z } from 'zod';
import { ScheduleDtoSchema } from '@/types/generated-zod';

const storageDateSchema = ScheduleDtoSchema.shape.schdlBgngYmd.unwrap()
  .trim()
  .regex(/^\d{8}$/, '날짜를 선택해 주세요.');

const scheduleFieldsSchema = ScheduleDtoSchema.extend({
  schdlSeCd: ScheduleDtoSchema.shape.schdlSeCd.unwrap()
    .trim()
    .min(1, '일정 구분을 확인해 주세요.'),
  schdlNm: ScheduleDtoSchema.shape.schdlNm
    .trim()
    .min(1, '일정명을 입력해 주세요.'),
  schdlCn: ScheduleDtoSchema.shape.schdlCn.unwrap(),
  schdlBgngYmd: storageDateSchema,
  schdlEndYmd: ScheduleDtoSchema.shape.schdlEndYmd.unwrap()
    .trim()
    .regex(/^\d{8}$/, '날짜를 선택해 주세요.'),
  schdlPlcNm: ScheduleDtoSchema.shape.schdlPlcNm.unwrap(),
});

/** 부서 일정 생성·수정이 공유하는 required/길이/기간 계약. */
export const deptScheduleFormSchema = scheduleFieldsSchema.superRefine((value, context: z.RefinementCtx) => {
  if (/^\d{8}$/.test(value.schdlBgngYmd)
    && /^\d{8}$/.test(value.schdlEndYmd)
    && value.schdlBgngYmd > value.schdlEndYmd) {
    context.addIssue({
      code: 'custom',
      path: ['schdlBgngYmd'],
      message: '시작일은 종료일보다 빠르거나 같아야 합니다.',
    });
  }
});

