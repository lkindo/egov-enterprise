import { describe, expect, it } from 'vitest';
import { parseGeneratedOperationResponse } from '@/lib/api/generated-operation';
import { loginOperation } from '@/types/generated-operations';

describe('공용 MSW handler generated 계약', () => {
  it('로그인 fixture는 실제 ApiResponse<TokenResponse> envelope와 role 필드를 사용한다', async () => {
    const response = await fetch('http://localhost:8080/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'admin', password: 'Password1!' }),
    });

    const body: unknown = await response.json();

    expect(parseGeneratedOperationResponse(loginOperation, body)).toStrictEqual({
      accessToken: 'fixture-access-token',
      role: 'ROLE_ADMIN',
    });
  });
});
