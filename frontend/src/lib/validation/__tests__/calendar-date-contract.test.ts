import { describe, expect, it } from 'vitest';
import {
  ScheduleDtoRequestSchema,
  EventInfoDtoRequestSchema,
  EventInfoRequestSchema,
  EventInfoDtoResponseSchema,
  SurveyInfoDtoRequestSchema,
  OnlinePollManageRequestSchema,
  OnlinePollManageDtoResponseSchema,
  WorkReportDtoRequestSchema,
  MemoReportDtoRequestSchema,
  ExternalHrDtoRequestSchema,
} from '@/types/generated-zod';
import { pollSchema } from '@/lib/validation/schemas';
import { deptScheduleFormSchema } from '@/app/smart-toolkit/schedule/dept/schedule-form-validation';

const dates = [
  ScheduleDtoRequestSchema.shape.schdlBgngYmd,
  ScheduleDtoRequestSchema.shape.schdlEndYmd,
  EventInfoDtoRequestSchema.shape.evntBgngYmd,
  EventInfoDtoRequestSchema.shape.evntEndYmd,
  EventInfoDtoRequestSchema.shape.evntAprvYmd,
  SurveyInfoDtoRequestSchema.shape.srvyBgngYmd,
  SurveyInfoDtoRequestSchema.shape.srvyEndYmd,
  OnlinePollManageRequestSchema.shape.pollBgngYmd,
  OnlinePollManageRequestSchema.shape.pollEndYmd,
  WorkReportDtoRequestSchema.shape.rptYmd,
  MemoReportDtoRequestSchema.shape.memoRptYmd,
  ExternalHrDtoRequestSchema.shape.brdtYmd,
];

describe('generated calendar input contracts', () => {
  it.each(['20260229', '19000229', '21000229', '20260931', '20260001', '20260100', '00000101', '2026-09-', ' ', '\n', '2026011'])
  ('rejects invalid calendar input %j in every date field', (value) => {
    for (const schema of dates) expect(schema.safeParse(value).success).toBe(false);
  });

  it.each(['00010101', '20000229', '20240229', '24000229', '20260930', '99991231', '', undefined])
  ('preserves valid dates and optional absence %j', (value) => {
    for (const schema of dates) expect(schema.safeParse(value).success).toBe(true);
  });

  it('allows operators to read legacy poll dates while rejecting them on writes', () => {
    const legacy = { pollNm: '기존 설문', pollBgngYmd: '2026-09-', pollEndYmd: '2026-09-' };
    expect(OnlinePollManageDtoResponseSchema.safeParse(legacy).success).toBe(true);
    expect(pollSchema.safeParse(legacy).success).toBe(false);
  });

  it('keeps historical unnamed events readable and requires a name on writes', () => {
    expect(EventInfoDtoResponseSchema.safeParse({ evntNm: null }).success).toBe(true);
    expect(EventInfoRequestSchema.safeParse({}).success).toBe(false);
  });

  it('rejects blank poll names, invalid flags, impossible dates, and reversed periods', () => {
    const valid = { pollNm: '설문', pollBgngYmd: '20260910', pollEndYmd: '20260911' };
    expect(pollSchema.safeParse(valid).success).toBe(true);
    for (const change of [{ pollNm: '  ' }, { pollDsuseYn: 'X' }, { pollAtmcDsuseYn: ' ' }, { pollEndYmd: '20260909' }, { pollEndYmd: '20260931' }]) {
      expect(pollSchema.safeParse({ ...valid, ...change }).success).toBe(false);
    }
  });

  it('keeps generated date checks in the department schedule form', () => {
    const valid = { schdlSeCd: '1', schdlNm: '일정', schdlCn: '', schdlPlcNm: '', schdlBgngYmd: '20260910', schdlEndYmd: '20260911' };
    expect(deptScheduleFormSchema.safeParse(valid).success).toBe(true);
    expect(deptScheduleFormSchema.safeParse({ ...valid, schdlEndYmd: '20260931' }).success).toBe(false);
    expect(deptScheduleFormSchema.safeParse({ ...valid, schdlEndYmd: '20260909' }).success).toBe(false);
  });
});
