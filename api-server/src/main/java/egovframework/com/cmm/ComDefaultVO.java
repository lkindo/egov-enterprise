package egovframework.com.cmm;

import java.io.Serializable;

import org.apache.commons.lang3.builder.ToStringBuilder;

/**
 * @Class Name : ComDefaultVO.java
 * @Description : ComDefaultVO class
 * @Modification Information
 * @
 *   @ 수정일 수정자 수정내용
 *   @ ------- -------- ---------------------------
 *   @ 2009.02.01 조재영 최초 생성
 *
 * @author 공통서비스 개발팀 조재영
 * @since 2009.02.01
 * @version 1.0
 * @see
 * 
 */
public class ComDefaultVO implements Serializable {

    private static final long serialVersionUID = -4351058296740922143L;

    /** 검색조건 */
    private String searchCondition = "";

    /** 검색Keyword */
    private String searchKeyword = "";

    /** 검색사용여부 */
    private String searchUseYn = "";

    /** 현재페이지 */
    private int pageIndex = 1;

    /** 페이지개수 */
    private int pageUnit = 10;

    /** 페이지사이즈 */
    private int pageSize = 10;

    /** firstIndex */
    private int firstIndex = 1;

    /** lastIndex */
    private int lastIndex = 1;

    /** recordCountPerPage */
    private int recordCountPerPage = 10;

    /** 검색KeywordFrom */
    private String searchKeywordFrom = "";

    /** 검색KeywordTo */
    private String searchKeywordTo = "";

    /** 검색시작일 */
    private String searchBgnDe = "";

    /** 검색종료일 */
    private String searchEndDe = "";

    /** 검색단어 */
    private String searchWrd = "";

    public int getFirstIndex() {
        return firstIndex;
    }

    public void setFirstIndex(int firstIndex) {
        this.firstIndex = firstIndex;
    }

    public int getLastIndex() {
        return lastIndex;
    }

    public void setLastIndex(int lastIndex) {
        this.lastIndex = lastIndex;
    }

    public int getRecordCountPerPage() {
        return recordCountPerPage;
    }

    public void setRecordCountPerPage(int recordCountPerPage) {
        this.recordCountPerPage = recordCountPerPage;
    }

    public String getSearchCondition() {
        return searchCondition;
    }

    public void setSearchCondition(String searchCondition) {
        this.searchCondition = searchCondition;
    }

    public String getSearchKeyword() {
        return searchKeyword;
    }

    public void setSearchKeyword(String searchKeyword) {
        this.searchKeyword = searchKeyword;
    }

    public String getSearchUseYn() {
        return searchUseYn;
    }

    public void setSearchUseYn(String searchUseYn) {
        this.searchUseYn = searchUseYn;
    }

    public int getPageIndex() {
        return pageIndex;
    }

    public void setPageIndex(int pageIndex) {
        this.pageIndex = pageIndex;
    }

    public int getPageUnit() {
        return pageUnit;
    }

    public void setPageUnit(int pageUnit) {
        this.pageUnit = pageUnit;
    }

    public int getPageSize() {
        return pageSize;
    }

    public void setPageSize(int pageSize) {
        this.pageSize = pageSize;
    }

    public String toString() {
        return ToStringBuilder.reflectionToString(this);
    }

    /**
     * searchKeywordFrom attribute를 리턴한다.
     * 
     * @return String
     */
    public String getSearchKeywordFrom() {
        return searchKeywordFrom;
    }

    /**
     * searchKeywordFrom attribute 값을 설정한다.
     * 
     * @param searchKeywordFrom String
     */
    public void setSearchKeywordFrom(String searchKeywordFrom) {
        this.searchKeywordFrom = searchKeywordFrom;
    }

    /**
     * searchKeywordTo attribute를 리턴한다.
     * 
     * @return String
     */
    public String getSearchKeywordTo() {
        return searchKeywordTo;
    }

    /**
     * searchKeywordTo attribute 값을 설정한다.
     * 
     * @param searchKeywordTo String
     */
    public void setSearchKeywordTo(String searchKeywordTo) {
        this.searchKeywordTo = searchKeywordTo;
    }

    /**
     * searchBgnDe attribute를 리턴한다.
     * 
     * @return String
     */
    public String getSearchBgnDe() {
        return searchBgnDe;
    }

    /**
     * searchBgnDe attribute 값을 설정한다.
     * 
     * @param searchBgnDe String
     */
    public void setSearchBgnDe(String searchBgnDe) {
        this.searchBgnDe = searchBgnDe;
    }

    /**
     * searchEndDe attribute를 리턴한다.
     * 
     * @return String
     */
    public String getSearchEndDe() {
        return searchEndDe;
    }

    /**
     * searchEndDe attribute 값을 설정한다.
     * 
     * @param searchEndDe String
     */
    public void setSearchEndDe(String searchEndDe) {
        this.searchEndDe = searchEndDe;
    }

    /**
     * searchWrd attribute를 리턴한다.
     * 
     * @return String
     */
    public String getSearchWrd() {
        return searchWrd;
    }

    /**
     * searchWrd attribute 값을 설정한다.
     * 
     * @param searchWrd String
     */
    public void setSearchWrd(String searchWrd) {
        this.searchWrd = searchWrd;
    }
}
