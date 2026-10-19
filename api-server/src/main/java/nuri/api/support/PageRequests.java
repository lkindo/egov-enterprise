package nuri.api.support;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

/**
 * {@link UnsortedPageable} 목록의 정렬을 걷는다(ADR-0036).
 *
 * <p>페이지 번호의 1→0 변환과 범위 검증은 Spring 리졸버(one-indexed)와 {@link PaginationRequestFilter} 가 맡는다 —
 * 여기서 다시 하지 않는다. 종전 {@code of(int pageIndex, int pageUnit)} 는 {@code @RequestParam int pageIndex} 핸들러가
 * 쓰던 세 번째 변환 경로라 걷었다.
 */
public final class PageRequests {
    private PageRequests() { }

    /** 같은 번호·크기에 정렬 없는 요청. */
    public static PageRequest unsorted(Pageable pageable) {
        return PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
    }
}
