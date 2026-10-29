const INTERNAL_PATH = /^\/(?![/\\])[^\s\\\p{Cc}]*$/u;

/**
 * 스크랩의 안전한 이동 목적지를 판정한다. 레거시 게시판 주소 변환은 표시할 링크에만
 * 적용하며, 편집 검증에서 반환 주소를 저장값으로 사용하지 않는다.
 */
export function parseScrapUrl(url: string | undefined): { isInternal: boolean; resolvedHref: string } | null {
    // trim/new URL이 제어 문자를 지우거나 역슬래시를 바꾸기 전에 원문을 검사한다.
    if (!url || /[\\\p{Cc}]/u.test(url)) return null;
    const trimmed = url.trim();
    if (!trimmed) return null;

    // 레거시 변환은 내부 경로에만 적용한다. 외부 URL의 bbsId/nttId로 호스트를 잃지 않는다.
    if (INTERNAL_PATH.test(trimmed)) {
        const bbsMatch = trimmed.match(/[?&]bbsId=([^&#\s]+)/i)?.[1];
        const nttMatch = trimmed.match(/[?&](?:pstSn|nttId)=([^&#\s]+)/i)?.[1];
        if (bbsMatch && nttMatch) {
            return {
                isInternal: true,
                resolvedHref: `/admin/community/boards/detail?bbsId=${encodeURIComponent(bbsMatch)}&pstSn=${encodeURIComponent(nttMatch)}`,
            };
        }
        return { isInternal: true, resolvedHref: trimmed };
    }

    if (/^https?:\/\//i.test(trimmed)) {
        try {
            const parsed = new URL(trimmed);
            if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
                return { isInternal: false, resolvedHref: parsed.href };
            }
        } catch {
            return null;
        }
    }

    return null;
}
