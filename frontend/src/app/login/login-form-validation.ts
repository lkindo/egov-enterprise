import { LoginRequestSchema } from '@/types/generated-zod';

/** 로그인 요청 DTO의 필수값과 사용자 아이디 20자 경계를 그대로 사용한다. */
export const loginFormSchema = LoginRequestSchema.extend({
  userId: LoginRequestSchema.shape.userId
    .trim()
    .min(1, '아이디를 입력해 주세요.'),
  // 인증 비밀번호는 공백도 자격증명의 일부일 수 있으므로 trim 하지 않는다.
  password: LoginRequestSchema.shape.password.unwrap()
    .min(1, '비밀번호를 입력해 주세요.'),
}).pick({
  userId: true,
  password: true,
});

