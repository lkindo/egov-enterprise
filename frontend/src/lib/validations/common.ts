import * as z from 'zod';

/**
 * 공통 검증 스키마 및 규칙
 */
export const commonSchemas = {
  // 필수 문자열
  requiredString: (fieldNm: string) => 
    z.string().min(1, { message: `${fieldNm}은(는) 필수 입력 항목입니다.` }),

  // 이메일
  email: z.string()
    .min(1, { message: '이메일을 입력해주세요.' })
    .email({ message: '올바른 이메일 형식이 아닙니다.' }),

  // 아이디 (영문/숫자 조합 5~20자)
  userId: z.string()
    .min(5, { message: '아이디는 최소 5자 이상이어야 합니다.' })
    .max(20, { message: '아이디는 최대 20자까지 가능합니다.' })
    .regex(/^[a-zA-Z0-9]+$/, { message: '아이디는 영문과 숫자만 사용 가능합니다.' }),

  // 비밀번호 (특수문자 포함 8~20자)
  password: z.string()
    .min(8, { message: '비밀번호는 최소 8자 이상이어야 합니다.' })
    .max(20, { message: '비밀번호는 최대 20자까지 가능합니다.' })
    .regex(/^(?=.*[a-zA-Z])(?=.*[!@#$%^*+=-])(?=.*[0-9]).{8,20}$/, {
      message: '비밀번호는 영문, 숫자, 특수문자를 포함해야 합니다.',
    }),

  // 전화번호 (숫자 및 하이픈)
  phone: z.string()
    .regex(/^01([0|1|6|7|8|9])-?([0-9]{3,4})-?([0-9]{4})$/, {
      message: '올바른 휴대폰 번호 형식이 아닙니다.',
    }),

  // 코드 형식 (영문/숫자/언더바)
  code: z.string()
    .min(1, { message: '코드를 입력해주세요.' })
    .regex(/^[A-Z0-9_]+$/, { message: '코드는 영문 대문자, 숫자, 언더바(_)만 가능합니다.' }),
    
  // 사용 여부 (YN)
  useAt: z.enum(['Y', 'N']),
};

/**
 * 전역 폼 제출 에러 처리 (Sonner Toast 연동용)
 */
export const handleFormError = (errors: any, toast: any) => {
  console.error('Validation Errors:', errors);
  const firstError = Object.values(errors)[0] as any;
  if (firstError?.message) {
    toast.error(firstError.message);
  } else {
    toast.error('입력 항목을 확인해주세요.');
  }
};
