import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { SearchResultsContent } from '../SearchClient';

/**
 * 🔗 `/search` 하이드레이션 불변식 — **렌더 경로에 클라이언트 전용 소스가 없다.**
 *
 * [배경 — 두 번의 수정]
 * 이 라우트는 PPR 대상이라(`next.config` `cacheComponents: true`) 정적 셸이 **검색 파라미터 없이**
 * 프리렌더된다. 그런데 클라이언트가 렌더 도중 `useSearchParams()` 로 검색어를 다시 만들면
 * 서버 HTML 과 클라이언트 첫 렌더가 어긋나 터진다:
 *
 *     🚨 Minified React error #418 (server rendered HTML didn't match the client)
 *
 * · **1차 수정(#382)** 은 입력칸 초기값만 서버와 맞췄고, 이 테스트도 "첫 렌더에 검색어가
 *   들어가지 않는다"를 단언했다. 그러나 그것은 **증상 하나를 고정한 것**이라, 검색어에서
 *   파생되는 렌더가 늘면 같은 결함이 다시 열렸다 — 실제로 재발했다.
 * · **2차 수정(2026-08-12)** 은 원인을 없앴다. 검색어 해석을 서버(`page.tsx`)로 되돌리고
 *   클라이언트는 prop 만 쓴다. 이제 어긋날 값 자체가 존재하지 않는다.
 *
 * [그래서 이 테스트의 단언이 바뀌었다 — 약해진 것이 아니라 강해졌다]
 * 종전: "첫 렌더에 검색어가 없어야 한다"(우회책의 흔적을 고정)
 * 현재: **"렌더 도중 `useSearchParams()` 를 읽으면 안 된다"**(결함의 원인 자체를 금지)
 * 후자는 전자가 잡던 경우를 포함하면서, 전자가 놓치던 **모든 다른 파생 렌더**까지 막는다.
 *
 * ⚠ 간헐 E2E(09 티어의 ConsoleErrorGuard)는 "고쳐졌는가"를 판정할 수 없다 — 재시도로 통과해
 *   flaky 로 묻히기 때문이다. 그래서 같은 불변식을 여기서 **결정적으로** 고정한다.
 */

// 이 테스트의 핵심 장치: 렌더 도중 useSearchParams() 를 읽으면 즉시 터뜨린다.
vi.mock('next/navigation', () => ({
    useSearchParams: () => {
        throw new Error(
            '렌더 도중 useSearchParams() 를 읽었다 — 검색어 없이 프리렌더된 정적 셸과 어긋나 '
            + 'React #418(hydration mismatch)을 만든다. 검색어는 서버(page.tsx)가 해석해 prop 으로 내려야 한다.',
        );
    },
    useRouter: () => ({ push: vi.fn() }),
}));

// 결과 조회는 이 테스트의 관심사가 아니다 — 네트워크를 타지 않게 막는다.
vi.mock('@/lib/api/client', () => ({
    default: { get: vi.fn().mockResolvedValue({ data: { resultList: [] } }) },
}));

describe('/search 하이드레이션 불변식', () => {
    const emptyResults = { articles: [], users: [], menus: [] };

    it('렌더 도중 useSearchParams() 를 읽지 않는다', () => {
        // renderToString 은 effect 이전, 즉 **하이드레이션이 비교하는 바로 그 시점**을 잡는다.
        expect(() =>
            renderToString(<SearchResultsContent initialResults={emptyResults} query="관리자" />),
        ).not.toThrow();
    });

    it('서버가 준 검색어가 첫 렌더에 그대로 실린다 — 서버 HTML 과 클라이언트 첫 렌더가 같은 입력을 쓴다', () => {
        const html = renderToString(
            <SearchResultsContent initialResults={emptyResults} query="관리자" />,
        );

        // 서버도 클라이언트도 같은 prop 을 쓰므로, 검색어가 들어 있는 것이 **정상**이다.
        // (종전 구조에서는 이 값이 서버에만 없거나 클라이언트에만 있어서 불일치가 났다.)
        expect(html).toContain('관리자');
    });

    it('검색어가 없으면 첫 렌더에도 없다 — 셸과 동일하다', () => {
        const html = renderToString(
            <SearchResultsContent initialResults={emptyResults} query="" />,
        );

        expect(html).not.toContain('관리자');
    });
});
