/* IDE Re-indexing Trigger */
package nuri.business.domain.common;

import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.io.Serializable;

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
}
