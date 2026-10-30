import { describe, expect, it } from 'vitest';
import { parseGeneratedOperationResponse } from '@/lib/api/generated-operation';
import { getHeadMenuOperation, getMyBookmarkStatusOperation, getMyBookmarksOperation, loginOperation } from '@/types/generated-operations';

describe('공용 MSW handler generated 계약', () => {
  it('로그인 fixture는 생성 envelope와 명시적 권한 스냅샷을 사용한다', async () => {
    const response = await fetch('http://localhost:8080/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'admin', password: 'Password1!' }),
    });

    const body: unknown = await response.json();

    expect(parseGeneratedOperationResponse(loginOperation, body)).toStrictEqual({
      accessToken: 'fixture-access-token',
      role: 'ROLE_ADMIN',
      groups: ['ROLE_ADMIN'],
      permissions: [],
      authorizationVersion: 'fixture-authorization-v1',
    });
  });

  it('공용 레이아웃의 메뉴 조회 fixture는 생성 응답 계약과 맞는 빈 목록이다', async () => {
    const head: unknown = await (await fetch('http://localhost:8080/api/v1/menus/head')).json();
    expect(parseGeneratedOperationResponse(getHeadMenuOperation, head)).toStrictEqual({ list: [] });

    const bookmarks: unknown = await (await fetch('http://localhost:8080/api/v1/menus/bookmarks')).json();
    expect(parseGeneratedOperationResponse(getMyBookmarksOperation, bookmarks)).toStrictEqual([]);
    const status: unknown = await (await fetch('http://localhost:8080/api/v1/menus/bookmarks/status')).json();
    expect(parseGeneratedOperationResponse(getMyBookmarkStatusOperation, status)).toStrictEqual({ bookmarks: [], unavailableCount: 0 });
  });
});
