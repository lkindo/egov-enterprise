/* IDE Re-indexing Trigger */
package nuri.business.domain.common;

import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.io.Serializable;
import java.util.Objects;

/**
 * 프로젝트 전역 공통 검색 DTO
 * eGovFrame의 ComDefaultVO를 대체하는 현대화된 기반 클래스입니다.
 */
@Getter
@Setter
@ToString
public class BaseSearchDto implements Serializable {

    private static final long serialVersionUID = 1L;

    /** 검색조건 (Category/Type) */
    @Size(max = 255)
    private String searchCondition = "";

    /** 검색어 (Keyword) */
    @Size(max = 255)
    private String searchKeyword = "";

    /** 검색사용여부 */
    @Size(max = 1)
    private String searchUseYn = "";

    /**
     * 현재 페이지 번호(1부터). HTTP 이름은 {@code page} 다(ADR-0036).
     *
     * <p>종전 HTTP 이름 {@code pageIndex}·{@code pageUnit} 은 한 릴리스 동안 {@code PaginationRequestFilter} 가
     * {@code page}·{@code size} 로 옮겨 받는다. 내부 호출부는 같은 값을 {@link #getPageIndex()}·{@link #getPageUnit()}
     * 로 계속 읽는다 — 이름만 둘이고 값은 하나다.
     */
    @Min(value = 1, message = "페이지 번호는 1 이상이어야 합니다.")
    private int page = 1;

    /** 페이지당 건수(1~100). HTTP 이름은 {@code size} 다(ADR-0036). */
    @Min(value = 1, message = "페이지당 조회 건수는 1 이상이어야 합니다.")
    @Max(value = MAX_PAGE_UNIT, message = "페이지당 조회 건수는 최대 100건입니다.")
    private int size = DEFAULT_PAGE_UNIT;

    // [ADR-0036] 서버가 읽지 않던 pageSize(페이지 네비 크기)·firstIndex·lastIndex·recordCountPerPage 를 걷었다 —
    //   스펙에 query 로 실려 있었지만 생산 코드 참조가 0이었다. 그 이름으로 오는 요청은 PaginationRequestFilter 가 400 으로 막는다.

    /** 검색 범위 시작일/값 */
    private String searchKeywordFrom = "";

    /** 검색 범위 종료일/값 */
    private String searchKeywordTo = "";

    // ─────────────────────────────────────────────────────────────────────────
    // Spring Data 페이징 변환
    //
    // [2026-08-09 추출] 아래 두 줄이 서비스 계층에 **13개소·10개 파일로 복제**돼 있었다
    // (계산부는 바이트 단위로 동일했고, 세 번째 줄만 Sort 유무가 달랐다):
    //
    //     int pageIndex = Math.max(0, searchVO.getPageIndex() - 1);
    //     int pageUnit  = searchVO.getPageUnit() > 0 ? searchVO.getPageUnit() : 10;
    //
    // 뮤테이션 테스트가 이 복제를 드러냈다 — 같은 모양의 뮤턴트가 호출부마다 따로 살아남아,
    // 한 스코프에서만 16개 중 10개가 이 두 줄이었다. 호출부마다 같은 테스트를 다시 쓰는 대신
    // 변환을 한 곳으로 모아 **검증 지점을 1곳**으로 만든다.
    //
    // 재복제 방지는 하네스 린터 PageableConstructionLinterTest 가 기계 강제한다.
    // ─────────────────────────────────────────────────────────────────────────

    /** {@code size} 가 유효하지 않을 때 쓰는 기본 페이지 크기. */
    public static final int DEFAULT_PAGE_UNIT = 10;

    /** HTTP 목록 요청 한 번에 허용하는 최대 레코드 수. */
    public static final int MAX_PAGE_UNIT = 100;

    /**
     * 1-based 화면 페이지 번호를 Spring Data 의 0-based {@link Pageable} 로 변환한다.
     *
     * @return 정렬 없는 {@link PageRequest}
     */
    public Pageable toPageable() {
        return PageRequest.of(zeroBasedPageIndex(), effectivePageUnit());
    }

    /**
     * 정렬을 지정해 {@link Pageable} 로 변환한다.
     *
     * @param sort 적용할 정렬 (null 불가)
     */
    public Pageable toPageable(Sort sort) {
        return PageRequest.of(zeroBasedPageIndex(), effectivePageUnit(), Objects.requireNonNull(sort));
    }

    /**
     * 화면의 1-based 페이지 번호를 0-based 로 낮춘다.
     * 0 이나 음수가 들어와도 첫 페이지로 수렴시킨다(PageRequest 는 음수를 거부한다).
     */
    private int zeroBasedPageIndex() {
        // ⚠ `Math.max(0, page - 1)` 로 쓰면 안 된다.
        //   page 가 Integer.MIN_VALUE 일 때 `- 1` 이 오버플로해 Integer.MAX_VALUE 가 되고,
        //   Math.max(0, MAX_VALUE) 는 그대로 MAX_VALUE 라 **음수를 막겠다는 의도가 무력화**된다.
        //   종전 16개 호출부가 모두 그 형태였다(2026-08-09 추출 시 테스트로 확인).
        //   비교를 먼저 해서 뺄셈 자체를 하지 않으면 오버플로 경로가 사라진다.
        return page <= 1 ? 0 : page - 1;
    }

    /** 페이지 크기를 결정한다. 0 이하는 의미가 없으므로 기본값으로 대체한다. */
    private int effectivePageUnit() {
        return size > 0 ? size : DEFAULT_PAGE_UNIT;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 내부 호출부의 종전 이름(ADR-0036). HTTP 이름은 page·size 하나이고, 아래는 같은 두 값을 가리킨다.
    //   스펙(springdoc)은 필드에서 query 이름을 만들므로 이 메서드들은 스펙에 실리지 않는다.
    // ─────────────────────────────────────────────────────────────────────────

    /** {@link #getPage()} 와 같다 — 1 기반 페이지 번호. */
    public int getPageIndex() {
        return page;
    }

    /** {@link #setPage(int)} 와 같다. */
    public void setPageIndex(int pageIndex) {
        this.page = pageIndex;
    }

    /** {@link #getSize()} 와 같다 — 페이지당 건수. */
    public int getPageUnit() {
        return size;
    }

    /** {@link #setSize(int)} 와 같다. */
    public void setPageUnit(int pageUnit) {
        this.size = pageUnit;
    }
}
