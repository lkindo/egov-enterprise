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
import { pollFormSchema } from '@/app/admin/survey/manage/poll-form-validation';
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

  // 투표 쓰기 경로는 두 겹이다: 화면 폼(pollFormSchema — 이름·플래그·yyyyMMdd 형식·기간 순서)과
  // 생성 전송 경계(OnlinePollManageRequestSchema — generated executor 가 요청 전에 parse 하는 달력 유효성).
  it('allows operators to read legacy poll dates while rejecting them on writes', () => {
    const legacy = { pollNm: '기존 설문', pollKndCd: '001', pollDsuseYn: 'N', pollBgngYmd: '2026-09-', pollEndYmd: '2026-09-' };
    expect(OnlinePollManageDtoResponseSchema.safeParse(legacy).success).toBe(true);
    expect(pollFormSchema.safeParse(legacy).success).toBe(false);
    expect(OnlinePollManageRequestSchema.safeParse(legacy).success).toBe(false);
  });

  it('keeps historical unnamed events readable and requires a name on writes', () => {
    expect(EventInfoDtoResponseSchema.safeParse({ evntNm: null }).success).toBe(true);
    expect(EventInfoRequestSchema.safeParse({}).success).toBe(false);
  });

  it('rejects blank poll names, invalid flags, impossible dates, and reversed periods on writes', () => {
    const valid = { pollNm: '설문', pollKndCd: '001', pollDsuseYn: 'N', pollBgngYmd: '20260910', pollEndYmd: '20260911' };
    expect(pollFormSchema.safeParse(valid).success).toBe(true);
    expect(OnlinePollManageRequestSchema.safeParse(valid).success).toBe(true);
    for (const change of [{ pollNm: '  ' }, { pollDsuseYn: 'X' }, { pollAtmcDsuseYn: ' ' }, { pollEndYmd: '20260909' }]) {
      expect(pollFormSchema.safeParse({ ...valid, ...change }).success).toBe(false);
    }
    // 폼은 yyyyMMdd 형식만 본다. 없는 날짜는 생성 전송 경계가 요청 전에 거부한다.
    expect(OnlinePollManageRequestSchema.safeParse({ ...valid, pollEndYmd: '20260931' }).success).toBe(false);
  });

  it('keeps generated date checks in the department schedule form', () => {
    const valid = { schdlSeCd: '1', schdlNm: '일정', schdlCn: '', schdlPlcNm: '', schdlBgngYmd: '20260910', schdlEndYmd: '20260911' };
    expect(deptScheduleFormSchema.safeParse(valid).success).toBe(true);
    expect(deptScheduleFormSchema.safeParse({ ...valid, schdlEndYmd: '20260931' }).success).toBe(false);
    expect(deptScheduleFormSchema.safeParse({ ...valid, schdlEndYmd: '20260909' }).success).toBe(false);
  });
});
