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

    /** 현재페이지 (1-based) */
    private int pageIndex = 1;

    /** 페이지당 레코드 수 (Page Unit) */
    private int pageUnit = 10;

    /** 페이지 네비게이션 사이즈 */
    private int pageSize = 10;

    /** 시작 인덱스 (SQL Offset 계산용) */
    private int firstIndex = 0;

    /** 종료 인덱스 */
    private int lastIndex = 1;

    /** 페이지당 레코드 수 ( recordCountPerPage) */
    private int recordCountPerPage = 10;

    /** 검색 범위 시작일/값 */
    private String searchKeywordFrom = "";

    /** 검색 범위 종료일/값 */
    private String searchKeywordTo = "";
    
    /**
     * 페이지 번호에 따른 오프셋 계산 유틸리티
     */
    public void calculatePagination() {
        this.firstIndex = (pageIndex - 1) * recordCountPerPage;
        this.lastIndex = pageIndex * recordCountPerPage;
    }

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

    /** {@code pageUnit} 이 유효하지 않을 때 쓰는 기본 페이지 크기. */
    public static final int DEFAULT_PAGE_UNIT = 10;

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
        // ⚠ `Math.max(0, pageIndex - 1)` 로 쓰면 안 된다.
        //   pageIndex 가 Integer.MIN_VALUE 일 때 `- 1` 이 오버플로해 Integer.MAX_VALUE 가 되고,
        //   Math.max(0, MAX_VALUE) 는 그대로 MAX_VALUE 라 **음수를 막겠다는 의도가 무력화**된다.
        //   종전 16개 호출부가 모두 그 형태였다(2026-08-09 추출 시 테스트로 확인).
        //   비교를 먼저 해서 뺄셈 자체를 하지 않으면 오버플로 경로가 사라진다.
        return pageIndex <= 1 ? 0 : pageIndex - 1;
    }

    /**
     * 페이지 크기를 결정한다. 0 이하는 의미가 없으므로 기본값으로 대체한다.
     *
     * <p>⚠ {@code pageSize} 필드가 아니라 {@code pageUnit} 이 기준이다 —
     * 이 DTO 의 {@code pageSize} 는 <b>페이지 네비게이션 사이즈</b>(하단 페이지 번호 개수)이지
     * 페이지당 레코드 수가 아니다. 이름만 보고 바꾸면 페이징이 조용히 어긋난다.
     */
    private int effectivePageUnit() {
        return pageUnit > 0 ? pageUnit : DEFAULT_PAGE_UNIT;
    }
}
