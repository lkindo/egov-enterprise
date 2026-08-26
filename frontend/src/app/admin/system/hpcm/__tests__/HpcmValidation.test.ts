import { describe, expect, it } from 'vitest';

import { hpcmSchema } from '../HpcmClient';

const validHpcm = {
  hlpSeCd: 'BBS',
  hlpDfn: '게시판 도움말',
  hlpExpln: '게시판 사용 방법을 설명합니다.',
};

describe('HPCM validation', () => {
  it('requires all editable fields and preserves generated maximum lengths', () => {
    expect(hpcmSchema.safeParse(validHpcm).success).toBe(true);
    expect(hpcmSchema.safeParse({ ...validHpcm, hlpSeCd: '' }).success).toBe(false);
    expect(hpcmSchema.safeParse({ ...validHpcm, hlpSeCd: 'ABCD' }).success).toBe(false);
    expect(hpcmSchema.safeParse({ ...validHpcm, hlpDfn: '가'.repeat(1001) }).success).toBe(false);
    expect(hpcmSchema.safeParse({ ...validHpcm, hlpExpln: '가'.repeat(65_536) }).success).toBe(false);
  });
});
