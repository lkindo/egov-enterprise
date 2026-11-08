import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';

/**
 * 정책 열람 화면의 제목.
 *
 * [2026-11-08] 정책 PK 는 대문자(`PRIVACY`·`COPYRIGHT`)인데 대체 제목 표는 소문자 키라, 그 PK 로 열고 조회에 실패하면
 * (권한 벽·미등록·오류) 늘 일반 제목 '약관 및 정책' 이 나왔다. 지금은 이 화면으로 가는 링크가 없다(바닥글 링크는 걷었다).
 * 대소문자를 가리지 않고 찾는다. 받은 정책 제목이 있으면 그것이 먼저다.
 */
const mocks = vi.hoisted(() => ({ getPolicy: vi.fn() }));

vi.mock('@/services/foundation/system/PolicyAdminService', () => ({
  policyAdminService: { getPolicy: mocks.getPolicy },
}));

const { default: PolicyViewPage } = await import('../[type]/page');

async function renderPolicy(type: string) {
  const element = await PolicyViewPage({ params: Promise.resolve({ type }) });
  render(element as ReactElement);
}

const forbidden = () => Object.assign(new Error('forbidden'), { response: { status: 403 } });

describe('정책 열람 — 제목', () => {
  it.each([
    ['PRIVACY', '개인정보 처리 방침'],
    ['COPYRIGHT', '저작권 정책'],
    ['privacy', '개인정보 처리 방침'],
  ])('정책 PK(%s)로 열면 권한 벽에서도 그 정책 이름을 제목으로 보인다', async (type, title) => {
    mocks.getPolicy.mockRejectedValueOnce(forbidden());
    await renderPolicy(type);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(title);
  });

  it('모르는 정책 유형은 일반 제목을 보인다', async () => {
    mocks.getPolicy.mockRejectedValueOnce(forbidden());
    await renderPolicy('UNKNOWN');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('약관 및 정책');
  });

  it('받은 정책 제목이 있으면 그것을 보인다', async () => {
    mocks.getPolicy.mockResolvedValueOnce({ plcyId: 'PRIVACY', plcyTtl: '개인정보 처리방침(2026 개정)', plcyCn: '<p>본문</p>' });
    await renderPolicy('PRIVACY');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('개인정보 처리방침(2026 개정)');
  });
});
