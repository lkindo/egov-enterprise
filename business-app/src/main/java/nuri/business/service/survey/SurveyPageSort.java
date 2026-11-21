package nuri.business.service.survey;

import java.util.Objects;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

/**
 * 설문·투표 목록의 기본 정렬.
 *
 * <p>[2026-11-21] 정렬 없는 페이지 조회는 DB 가 순서를 보장하지 않는다 — 다음 쪽으로 넘기면 같은 설문이 두 번 보이거나
 * 빠질 수 있었고, 업무 홈의 설문 카드가 최신 설문을 보장하지 않았다. 요청이 정렬을 주지 않으면 최신순(일련번호 역순)으로
 * 둔다. 메모 보고 목록({@code MemoReportService#newestFirst})과 같은 규칙이다.
 */
final class SurveyPageSort {

    private SurveyPageSort() {
    }

    static Pageable newestFirst(Pageable pageable, String serialProperty) {
        Objects.requireNonNull(pageable, "pageable");
        if (pageable.getSort().isSorted() || pageable.isUnpaged()) {
            return pageable;
        }
        return PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
                Sort.by(Sort.Direction.DESC, serialProperty));
    }
}
