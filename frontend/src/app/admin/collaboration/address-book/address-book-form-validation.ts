import { z } from 'zod';

import {
  AddressBookDtoSchema,
  AddressBookUserDtoSchema,
} from '@/types/generated-zod';

const addressBookNameSchema = AddressBookDtoSchema.shape.adbkNm
  .trim()
  .min(1, '주소록 명칭을 입력해 주세요.')
  .max(100, '주소록 명칭은 최대 100자까지 입력할 수 있습니다.');

const releaseScopeSchema = AddressBookDtoSchema.shape.rlsScopeCd
  .trim()
  .min(1, '공개 범위 설정을 확인해 주세요.');

const memberUserIdSchema = AddressBookUserDtoSchema.shape.userId
  .trim()
  .min(1, '로그인 사용자 정보를 확인할 수 없습니다.')
  .max(20, '사용자 ID는 최대 20자까지 입력할 수 있습니다.');

/**
 * 백엔드 연락처 길이는 구분자를 제외한 11자리다. 입력 단계에서는 하이픈/공백을 허용하되,
 * generated AddressBookUserDto의 max(11)과 숫자 형식을 적용하기 전에 정규화한다.
 */
const memberPhoneSchema = z.preprocess(
  (value) => typeof value === 'string' ? value.replace(/[-\s]/g, '') : value,
  AddressBookUserDtoSchema.shape.mblTelno
    .unwrap()
    .trim()
    .regex(/^\d*$/, '전화번호는 숫자와 구분용 하이픈만 입력해 주세요.'),
);

const memberEmailSchema = AddressBookUserDtoSchema.shape.emlAddr
  .unwrap()
  .trim()
  .refine(
    (value) => value.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    '이메일 형식을 확인해 주세요.',
  );

export const addressBookCreateFormSchema = AddressBookDtoSchema.pick({
  adbkNm: true,
  rlsScopeCd: true,
}).extend({
  adbkNm: addressBookNameSchema,
  rlsScopeCd: releaseScopeSchema,
  userId: memberUserIdSchema,
  telNo: memberPhoneSchema,
  email: memberEmailSchema,
});

export const addressBookEditFormSchema = AddressBookDtoSchema.pick({
  adbkNm: true,
  rlsScopeCd: true,
}).extend({
  adbkNm: addressBookNameSchema,
  rlsScopeCd: releaseScopeSchema,
});

export const addressBookCreateValidationLabels = {
  adbkNm: '주소록 명칭',
  email: '이메일',
  rlsScopeCd: '공개 범위',
  telNo: '전화번호',
  userId: '로그인 사용자',
};

export const addressBookEditValidationLabels = {
  adbkNm: '주소록 명칭',
  rlsScopeCd: '공개 범위',
};

const createFieldAliases: Record<string, string> = {
  'adbkMan.0.emlAddr': 'email',
  'adbkMan.0.mblTelno': 'telNo',
  'adbkMan.0.userId': 'userId',
  'adbkMan[0].emlAddr': 'email',
  'adbkMan[0].mblTelno': 'telNo',
  'adbkMan[0].userId': 'userId',
  emlAddr: 'email',
  mblTelno: 'telNo',
};

/** 서버의 nested DTO field path를 이 화면의 편집 가능한 field name으로 귀속한다. */
export function mapAddressBookCreateFieldErrors(errors: Record<string, string>) {
  const mapped: Record<string, string> = {};
  for (const [field, message] of Object.entries(errors)) {
    const target = createFieldAliases[field] ?? field;
    if (!(target in mapped)) mapped[target] = message;
  }
  return mapped;
}

