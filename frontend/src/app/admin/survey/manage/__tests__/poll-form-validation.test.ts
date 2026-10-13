import { describe, expect, it } from 'vitest';
import { adminPollFormSchema, pollFormSchema } from '../poll-form-validation';

const validPoll = {
  pollNm: '서비스 만족도',
  pollBgngYmd: '20260826',
  pollEndYmd: '20260827',
  pollKndCd: '001',
  pollDsuseYn: 'N',
};

describe('pollFormSchema', () => {
  it('requires a title and preserves the generated 100-character maximum', () => {
    expect(pollFormSchema.safeParse({ ...validPoll, pollNm: '' }).success).toBe(false);
    expect(pollFormSchema.safeParse({ ...validPoll, pollNm: '가'.repeat(100) }).success).toBe(true);
    expect(pollFormSchema.safeParse({ ...validPoll, pollNm: '가'.repeat(101) }).success).toBe(false);
  });

  it('requires storage-format dates and rejects a reversed range', () => {
    expect(pollFormSchema.safeParse({ ...validPoll, pollBgngYmd: '' }).success).toBe(false);
    expect(pollFormSchema.safeParse({ ...validPoll, pollEndYmd: '2026-08-27' }).success).toBe(false);

    const reversed = pollFormSchema.safeParse({
      ...validPoll,
      pollBgngYmd: '20260828',
      pollEndYmd: '20260827',
    });
    expect(reversed.success).toBe(false);
    if (!reversed.success) {
      expect(reversed.error.issues[0]).toMatchObject({
        path: ['pollBgngYmd'],
        message: '설문 시작일은 종료일보다 빠르거나 같아야 합니다.',
      });
    }
  });

  it('requires at least two non-empty articles and preserves their 100-character maximum', () => {
    const base = { ...validPoll, pollArticles: [{ pollArtclNm: '찬성' }, { pollArtclNm: '반대' }] };
    expect(adminPollFormSchema.safeParse(base).success).toBe(true);
    expect(adminPollFormSchema.safeParse({ ...base, pollArticles: [{ pollArtclNm: '' }] }).success).toBe(false);
    expect(adminPollFormSchema.safeParse({
      ...base,
      pollArticles: [{ pollArtclNm: '가'.repeat(101) }, { pollArtclNm: '반대' }],
    }).success).toBe(false);
  });
});

/*
  [Phase 2 10단계 10c-1] core 의 생성 제약 보존 시험(lib/validation/__tests__/generated-constraint-preservation)에서 옮겼다 — 그 파일이
  설문 모듈을 import 하면 설문을 고르지 않은 생성물에서 core 사례까지 연쇄로 빠졌다.
*/
describe('pollFormSchema keeps the shared generated constraints', () => {
  it('accepts a valid poll and rejects an over-long name and a non-8-digit start date', () => {
    expect(pollFormSchema.safeParse(validPoll).success).toBe(true);
    expect(pollFormSchema.safeParse({ ...validPoll, pollNm: '가'.repeat(101) }).success).toBe(false);
    expect(pollFormSchema.safeParse({ ...validPoll, pollBgngYmd: '202601011' }).success).toBe(false);
  });
});
