import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { SearchResultsContent } from '../SearchClient';

/**
 * 🔗 `/search` 하이드레이션 불변식 — **첫 렌더는 검색 파라미터에 의존하지 않는다.**
 *
 * [왜 필요한가 — 2026-08-11 확인된 결함]
 * 이 라우트는 PPR 대상이다(next.config `cacheComponents: true`, 빌드 산출물 `◐ /search`).
 * 정적 셸은 **검색 파라미터 없이** 프리렌더되므로 그 HTML 의 입력값은 항상 빈 문자열이다.
 * 그런데 종전 구현은 `useState(searchParams.get('q'))` 로 초기 상태를 만들어,
 * `/search?q=X` 진입 시 클라이언트 첫 렌더가 `value="X"` 가 되면서 셸과 어긋났다:
 *
 *     🚨 Minified React error #418 (server rendered HTML didn't match the client)
 *
 * CI 실측 2건(2026-08-09 · 2026-08-11) 모두 **검색 내비게이션 직후 ~0.3초**에만 발생했고
 * `/search` 초기 진입에서는 한 번도 나지 않았다 — 위 설명과 정확히 일치한다.
 *
 * [왜 단위 테스트인가]
 * 이 결함은 E2E 에서 **간헐적**으로만 드러났다(때로는 재시도로 통과해 flaky 로 기록됐다).
 * 간헐 신호를 회귀 방어로 삼을 수는 없다 — 고쳐졌는지 판정할 수 없기 때문이다.
 * 여기서는 같은 불변식을 **결정적으로** 고정한다: 검색 파라미터가 무엇이든 첫 렌더의
 * 입력값은 서버·프리렌더와 같아야 한다.
 *
 * ⚠ 이 테스트는 "입력칸이 URL 을 반영하지 않는다"를 요구하는 것이 아니다. 반영은 마운트
 *   이후(useEffect)에 일어나며, 아래 두 번째 케이스가 그것까지 확인한다.
 */

const mockGet = vi.fn();

vi.mock('next/navigation', () => ({
    useSearchParams: () => ({ get: mockGet }),
    useRouter: () => ({ push: vi.fn() }),
}));

// 결과 조회는 이 테스트의 관심사가 아니다 — 네트워크를 타지 않게 막는다.
vi.mock('@/lib/api/client', () => ({
    default: { get: vi.fn().mockResolvedValue({ data: { resultList: [] } }) },
}));

describe('/search 하이드레이션 불변식', () => {
    beforeEach(() => {
        mockGet.mockReset();
    });

    it('검색 파라미터가 있어도 첫 렌더(=서버 HTML)에는 검색어가 들어가지 않는다', () => {
        // 정적 셸에는 파라미터가 없다. 클라이언트만 값을 갖는 상황을 재현한다.
        mockGet.mockReturnValue('관리자');

        // ⚠ Testing Library 의 render 는 act() 로 **effect 를 flush** 하므로 '첫 렌더'를 관측할 수 없다.
        //   하이드레이션이 비교하는 것은 effect 이전의 렌더 결과이므로, 서버가 만드는 것과 같은
        //   renderToString 으로 그 시점을 그대로 잡는다.
        const html = renderToString(
            <SearchResultsContent initialResults={{ articles: [], users: [], menus: [] }} query="" />,
        );

        // 종전 구현(useState(query))이면 여기에 '관리자' 가 박혀 클라이언트 렌더와 어긋난다.
        expect(html).not.toContain('관리자');
    });

    it('마운트 이후에는 URL 의 검색어가 입력값에 반영된다', async () => {
        mockGet.mockReturnValue('관리자');

        render(<SearchResultsContent initialResults={{ articles: [], users: [], menus: [] }} query="" />);

        const input = screen.getByRole('textbox') as HTMLInputElement;
        // useEffect 는 render 직후 flush 되므로 findBy 로 반영을 기다린다.
        await vi.waitFor(() => expect(input.value).toBe('관리자'));
    });
});
