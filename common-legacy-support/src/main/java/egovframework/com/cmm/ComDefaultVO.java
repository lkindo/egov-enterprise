package egovframework.com.cmm;

import java.io.Serializable;

import org.apache.commons.lang3.builder.ToStringBuilder;

/**
 * @Class Name : ComDefaultVO.java
 * @Description : ComDefaultVO class
 * @Modification Information
 * @
 *   @ ????????????
 *   @ ------- -------- ---------------------------
 *   @ 2009.02.01 ???????
 *
 * @author ???????? ???
 * @since 2009.02.01
 * @version 1.0
 * @see
 * 
 **/
public class ComDefaultVO implements Serializable {

    private static final long serialVersionUID = -4351058296740922143L;

    /** ???**/
    private String searchCondition = "";

    /** ??yword **/
    private String searchKeyword = "";

    /** ????? **/
    private String searchUseYn = "";

    /** ??? **/
    private int pageIndex = 1;

    /** ????**/
    private int pageUnit = 10;

    /** ??????**/
    private int pageSize = 10;

    /** firstIndex **/
    private int firstIndex = 1;

    /** lastIndex **/
    private int lastIndex = 1;

    /** recordCountPerPage **/
    private int recordCountPerPage = 10;

    /** ??ywordFrom **/
    private String searchKeywordFrom = "";

    /** ??ywordTo **/
    private String searchKeywordTo = "";

    /** ??? **/
    private String searchBgnDe = "";

    /** ?????**/
    private String searchEndDe = "";

    /** ????**/
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
     * searchKeywordFrom attribute?????.
     * 
     * @return String
     **/
    public String getSearchKeywordFrom() {
        return searchKeywordFrom;
    }

    /**
     * searchKeywordFrom attribute ???????.
     * 
     * @param searchKeywordFrom String
     **/
    public void setSearchKeywordFrom(String searchKeywordFrom) {
        this.searchKeywordFrom = searchKeywordFrom;
    }

    /**
     * searchKeywordTo attribute?????.
     * 
     * @return String
     **/
    public String getSearchKeywordTo() {
        return searchKeywordTo;
    }

    /**
     * searchKeywordTo attribute ???????.
     * 
     * @param searchKeywordTo String
     **/
    public void setSearchKeywordTo(String searchKeywordTo) {
        this.searchKeywordTo = searchKeywordTo;
    }

    /**
     * searchBgnDe attribute?????.
     * 
     * @return String
     **/
    public String getSearchBgnDe() {
        return searchBgnDe;
    }

    /**
     * searchBgnDe attribute ???????.
     * 
     * @param searchBgnDe String
     **/
    public void setSearchBgnDe(String searchBgnDe) {
        this.searchBgnDe = searchBgnDe;
    }

    /**
     * searchEndDe attribute?????.
     * 
     * @return String
     **/
    public String getSearchEndDe() {
        return searchEndDe;
    }

    /**
     * searchEndDe attribute ???????.
     * 
     * @param searchEndDe String
     **/
    public void setSearchEndDe(String searchEndDe) {
        this.searchEndDe = searchEndDe;
    }

    /**
     * searchWrd attribute?????.
     * 
     * @return String
     **/
    public String getSearchWrd() {
        return searchWrd;
    }

    /**
     * searchWrd attribute ???????.
     * 
     * @param searchWrd String
     **/
    public void setSearchWrd(String searchWrd) {
        this.searchWrd = searchWrd;
    }
}
