import { describe, expect, it } from 'vitest';

import { administCodeSchema } from '@/app/admin/system/codes/administ/AdministCodeClient';
import { bannerSchema, popupSchema } from '@/app/admin/system/banner/BannerAdminClient';
import { ismSchema } from '@/app/admin/system/ism/IsmClient';
import { authorSchema } from '@/components/admin/security/AuthorForm';
import { programFormSchema } from '@/components/admin/system/ProgramForm';
import { createUserSchema, userSchema } from '@/components/admin/user/UserManageForm';
import {
  manualSchema,
  menuSchema,
  pollSchema,
  userManageSchema,
} from '@/lib/validation/schemas';

describe('generated DTO constraints stay attached to form schemas', () => {
  it('keeps author max lengths while adding required rules', () => {
    expect(authorSchema.safeParse({ authrtCd: 'A'.repeat(21), authrtNm: '관리자' }).success).toBe(false);
    expect(authorSchema.safeParse({ authrtCd: 'ADMIN', authrtNm: '가'.repeat(61) }).success).toBe(false);
    expect(authorSchema.safeParse({
      authrtCd: 'ADMIN',
      authrtNm: '관리자',
      authrtExpln: '가'.repeat(201),
    }).success).toBe(false);
  });

  it.each([
    ['prgrmFileNm', 101],
    ['prgrmStrgPath', 1001],
    ['prgrmKornNm', 101],
    ['url', 1001],
  ] as const)('keeps the generated %s max length', (field, length) => {
    const validProgram = {
      prgrmFileNm: 'Program.tsx',
      prgrmStrgPath: '/admin/program',
      prgrmKornNm: '프로그램',
      url: '/admin/program',
    };

    expect(programFormSchema.safeParse({
      ...validProgram,
      [field]: 'a'.repeat(length),
    }).success).toBe(false);
  });

  it('keeps user id, name, contact, organization, and password constraints', () => {
    const validUser = { userId: 'user_1', userNm: '홍길동', pswd: '' };

    expect(userSchema.safeParse({ ...validUser, userId: 'a'.repeat(21) }).success).toBe(false);
    expect(userSchema.safeParse({ ...validUser, userId: 'invalid-id!' }).success).toBe(false);
    expect(userSchema.safeParse({ ...validUser, userNm: '가'.repeat(51) }).success).toBe(false);
    expect(userSchema.safeParse({ ...validUser, emlAddr: 'not-an-email' }).success).toBe(false);
    expect(userSchema.safeParse({ ...validUser, mblTelno: '1'.repeat(12) }).success).toBe(false);
    expect(userSchema.safeParse({ ...validUser, ognzId: 'A'.repeat(21) }).success).toBe(false);
    expect(userSchema.safeParse(validUser).success).toBe(true);
    expect(userSchema.safeParse({ ...validUser, pswd: 'abcdefgh' }).success).toBe(false);
    expect(userSchema.safeParse({ ...validUser, pswd: `${'Aa1!'.repeat(25)}X` }).success).toBe(false);
    expect(createUserSchema.safeParse(validUser).success).toBe(false);
    expect(createUserSchema.safeParse({ ...validUser, pswd: 'Password1!' }).success).toBe(true);
  });

  it('keeps shared poll, menu, manual, and user constraints', () => {
    expect(pollSchema.safeParse({ pollNm: '가'.repeat(101) }).success).toBe(false);
    expect(pollSchema.safeParse({ pollNm: '설문', pollBgngYmd: '202601011' }).success).toBe(false);
    expect(menuSchema.safeParse({ menuNm: '', menuOrdr: 1 }).success).toBe(false);
    expect(manualSchema.safeParse({ onlnMnlNm: '', onlnMnlSeCd: 'GUIDE' }).success).toBe(false);
    expect(manualSchema.safeParse({ onlnMnlNm: '매뉴얼', onlnMnlSeCd: '' }).success).toBe(false);
    expect(userManageSchema.safeParse({
      userId: 'user_1',
      userNm: '홍길동',
      pswd: 'abcdefgh',
    }).success).toBe(false);
  });

  it('keeps administrative-code max lengths', () => {
    const validCode = {
      admdstCd: '1234567890',
      admdstZoneNm: '서울특별시',
      admdstSeCd: '1',
      upAdmdstCd: '0',
      useYn: 'Y',
    };

    expect(administCodeSchema.safeParse({ ...validCode, admdstZoneNm: '가'.repeat(101) }).success).toBe(false);
    expect(administCodeSchema.safeParse({ ...validCode, admdstSeCd: '1'.repeat(13) }).success).toBe(false);
    expect(administCodeSchema.safeParse({ ...validCode, upAdmdstCd: '1'.repeat(13) }).success).toBe(false);
    expect(administCodeSchema.safeParse({ ...validCode, useYn: 'YN' }).success).toBe(false);
  });

  it('keeps sanction max lengths while making rejection reason required', () => {
    expect(ismSchema.safeParse({ rjctRsnCn: '가'.repeat(4001) }).success).toBe(false);
    expect(ismSchema.safeParse({ taskSeCd: 'A'.repeat(13), rjctRsnCn: '반려 사유' }).success).toBe(false);
    expect(ismSchema.safeParse({ aplcntId: 'A'.repeat(21), rjctRsnCn: '반려 사유' }).success).toBe(false);
    expect(ismSchema.safeParse({ aprvrId: 'A'.repeat(21), rjctRsnCn: '반려 사유' }).success).toBe(false);
  });

  it('keeps banner and popup generated string lengths', () => {
    expect(bannerSchema.safeParse({
      bnrNm: '가'.repeat(101),
      sortOrdr: 0,
      rfltYn: 'Y',
    }).success).toBe(false);

    const validPopup = {
      popupTtlNm: '공지',
      ntceBgnde: '2026-08-26',
      ntceEndde: '2026-08-27',
      popupWdthPstn: 0,
      popupVrtcPstn: 0,
      popupWdthSz: 400,
      popupVrtcSz: 400,
      ntceYn: 'Y',
      stopvewSetupYn: 'Y',
    };

    expect(popupSchema.safeParse({ ...validPopup, popupTtlNm: '가'.repeat(101) }).success).toBe(false);
    expect(popupSchema.safeParse({ ...validPopup, popupWdthPstn: '1'.repeat(13) }).success).toBe(false);
  });
});
