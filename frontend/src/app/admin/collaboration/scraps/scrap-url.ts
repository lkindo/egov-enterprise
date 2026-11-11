const INTERNAL_PATH = /^\/(?![/\\])[^\s\\\p{Cc}]*$/u;
const MAX_BBS_ID_LENGTH = 20;
const POSITIVE_POST_SN = /^[1-9][0-9]{0,18}$/;
const MAX_JAVA_LONG = BigInt('9223372036854775807');

function decodeQueryComponent(raw: string): string | null {
    try {
        return decodeURIComponent(raw.replace(/\+/g, ' '));
    } catch {
        return null;
    }
}

/**
 * 서버 ScrapService.normalizeAndValidateUrl(SafeUrls.isLinkable)과 동일한 기본 링크 가능성 검사.
 * 수정 시 URL이 바뀌지 않은 레거시 내부 경로(예: 목록형 /cop/bbs/selectArticleList.do)의 제목·설명 편집을 막지 않되,
 * 제어문자·역슬래시·위험 스킴은 항상 차단한다.
 */
export function isLinkableScrapUrl(url: string | undefined): boolean {
    if (!url || /[\\\p{Cc}]/u.test(url)) return false;
    const trimmed = url.trim();
    if (!trimmed) return false;
    if (INTERNAL_PATH.test(trimmed)) return true;
    if (/^https?:\/\//i.test(trimmed)) {
        try {
            const parsed = new URL(trimmed);
            return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch {
            return false;
        }
    }
    return false;
}

/**
 * 스크랩의 안전한 이동 목적지를 판정한다. 레거시 게시판 주소 변환은 표시할 링크에만
 * 적용하며, 편집 검증에서 반환 주소를 저장값으로 사용하지 않는다.
 *
 * 내부 게시글 경로 판정과 식별자 형식 검사는 백엔드 ScrapService.verifyBoardTargetIfInternal 과 맞춘다:
 * #fragment 뒤는 쿼리 파라미터로 읽지 않으며, 누락·충돌·비정상 게시판 파라미터는 거부한다.
 */
export function parseScrapUrl(url: string | undefined): { isInternal: boolean; resolvedHref: string } | null {
    // trim/new URL이 제어 문자를 지우거나 역슬래시를 바꾸기 전에 원문을 검사한다.
    if (!url || /[\\\p{Cc}]/u.test(url)) return null;
    const trimmed = url.trim();
    if (!trimmed) return null;

    // 레거시 변환은 내부 경로에만 적용한다. 외부 URL의 bbsId/nttId로 호스트를 잃지 않는다.
    if (INTERNAL_PATH.test(trimmed)) {
        const fragmentIdx = trimmed.indexOf('#');
        const withoutFragment = fragmentIdx >= 0 ? trimmed.slice(0, fragmentIdx) : trimmed;
        const queryIdx = withoutFragment.indexOf('?');
        const path = queryIdx >= 0 ? withoutFragment.slice(0, queryIdx) : withoutFragment;
        const query = queryIdx >= 0 ? withoutFragment.slice(queryIdx + 1) : '';

        const lowerPath = path.toLowerCase();
        const explicitBoardPath = lowerPath === '/admin/community/boards/detail'
            || lowerPath.startsWith('/admin/community/boards/detail/')
            || lowerPath.startsWith('/cop/bbs/');

        let bbsId: string | null = null;
        let postIdRaw: string | null = null;
        let seenBoardQueryParam = false;

        if (query.length > 0) {
            for (const pair of query.split('&')) {
                if (!pair) continue;
                const eqIdx = pair.indexOf('=');
                const rawKey = eqIdx >= 0 ? pair.slice(0, eqIdx) : pair;
                const rawVal = eqIdx >= 0 ? pair.slice(eqIdx + 1) : '';
                const key = decodeQueryComponent(rawKey);
                if (key === null) return null;
                const lowerKey = key.toLowerCase();
                if (lowerKey === 'bbsid') {
                    seenBoardQueryParam = true;
                    const decodedVal = decodeQueryComponent(rawVal);
                    if (decodedVal === null) return null;
                    const normalized = decodedVal.trim();
                    if (bbsId !== null && bbsId !== normalized) return null;
                    bbsId = normalized;
                } else if (lowerKey === 'pstsn' || lowerKey === 'nttid') {
                    seenBoardQueryParam = true;
                    const decodedVal = decodeQueryComponent(rawVal);
                    if (decodedVal === null) return null;
                    const normalized = decodedVal.trim();
                    if (postIdRaw !== null && postIdRaw !== normalized) return null;
                    postIdRaw = normalized;
                }
            }
        }

        if (!explicitBoardPath && !seenBoardQueryParam) {
            return { isInternal: true, resolvedHref: trimmed };
        }
        if (!bbsId || bbsId.length > MAX_BBS_ID_LENGTH || /[\p{Cc}]/u.test(bbsId)) {
            return null;
        }
        if (!postIdRaw || !POSITIVE_POST_SN.test(postIdRaw) || BigInt(postIdRaw) > MAX_JAVA_LONG) {
            return null;
        }
        return {
            isInternal: true,
            resolvedHref: `/admin/community/boards/detail?bbsId=${encodeURIComponent(bbsId)}&pstSn=${encodeURIComponent(postIdRaw)}`,
        };
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
