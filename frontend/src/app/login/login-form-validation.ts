import { z } from 'zod';

import { LoginRequestSchema } from '@/types/generated-zod';

/** 로그인 요청 DTO의 필수값과 사용자 아이디 20자·비밀번호 128자 경계를 그대로 사용한다. */
export const loginFormSchema = LoginRequestSchema.extend({
  userId: LoginRequestSchema.shape.userId
    .trim()
    .min(1, '아이디를 입력해 주세요.'),
  // 인증 비밀번호는 공백도 자격증명의 일부일 수 있으므로 trim 하지 않는다. 공백만 있는 값은 서버(@NotBlank)가 거부한다.
  //   필수 안내가 먼저 보이도록 화면 규칙을 먼저 보고, 그다음 생성 계약(길이)을 지난다.
  password: z.string()
    .refine((value) => value.trim().length > 0, '비밀번호를 입력해 주세요.')
    .pipe(LoginRequestSchema.shape.password),
}).pick({
  userId: true,
  password: true,
});
