package egovframework.com.cop.bbs.service;

import org.apache.commons.lang3.builder.ToStringBuilder;

public class BlogVO extends Blog {

    /** ??? **/
    private String searchBgnDe = "";

    /** ???**/
    private String searchCnd = "";

    /** ?????**/
    private String searchEndDe = "";

    /** ????**/
    private String searchWrd = "";

    /** ???(DESC,ASC) **/
    private long sortOrdr = 0L;

    /** ????? **/
    private String searchUseYn = "";

    /** ??? **/
    private int pageIndex = 1;

    /** ????**/
    private int pageUnit = 10;

    /** ??????**/
    private int pageSize = 10;

    /** ???? ???**/
    private int firstIndex = 1;

    /** ????? ???**/
    private int lastIndex = 1;

    /** ??????????**/
    private int recordCountPerPage = 10;

    /** ??????**/
    private int rowNo = 0;

    /** ?? ??**/
    private String registSeCodeNm = "";

    /** ????? **/
    private String frstRegisterNm = "";

    /** ??????**/
    private String bbsId = "";

    /** ??????**/
    private String bbsNm = "";

    /** ?? URL **/
    private String provdUrl = "";

    private String blogId = "";

    /**
     * searchBgnDe attribute?????.
     * 
     * @return the searchBgnDe
     **/
    public String getSearchBgnDe() {
        return searchBgnDe;
    }

    /**
     * searchBgnDe attribute ???????.
     * 
     * @param searchBgnDe
     *                    the searchBgnDe to set
     **/
    public void setSearchBgnDe(String searchBgnDe) {
        this.searchBgnDe = searchBgnDe;
    }

    /**
     * searchCnd attribute?????.
     * 
     * @return the searchCnd
     **/
    public String getSearchCnd() {
        return searchCnd;
    }

    /**
     * searchCnd attribute ???????.
     * 
     * @param searchCnd
     *                  the searchCnd to set
     **/
    public void setSearchCnd(String searchCnd) {
        this.searchCnd = searchCnd;
    }

    /**
     * searchEndDe attribute?????.
     * 
     * @return the searchEndDe
     **/
    public String getSearchEndDe() {
        return searchEndDe;
    }

    /**
     * searchEndDe attribute ???????.
     * 
     * @param searchEndDe
     *                    the searchEndDe to set
     **/
    public void setSearchEndDe(String searchEndDe) {
        this.searchEndDe = searchEndDe;
    }

    /**
     * searchWrd attribute?????.
     * 
     * @return the searchWrd
     **/
    public String getSearchWrd() {
        return searchWrd;
    }

    /**
     * searchWrd attribute ???????.
     * 
     * @param searchWrd
     *                  the searchWrd to set
     **/
    public void setSearchWrd(String searchWrd) {
        this.searchWrd = searchWrd;
    }

    /**
     * sortOrdr attribute?????.
     * 
     * @return the sortOrdr
     **/
    public long getSortOrdr() {
        return sortOrdr;
    }

    /**
     * sortOrdr attribute ???????.
     * 
     * @param sortOrdr
     *                 the sortOrdr to set
     **/
    public void setSortOrdr(long sortOrdr) {
        this.sortOrdr = sortOrdr;
    }

    /**
     * searchUseYn attribute?????.
     * 
     * @return the searchUseYn
     **/
    public String getSearchUseYn() {
        return searchUseYn;
    }

    /**
     * searchUseYn attribute ???????.
     * 
     * @param searchUseYn
     *                    the searchUseYn to set
     **/
    public void setSearchUseYn(String searchUseYn) {
        this.searchUseYn = searchUseYn;
    }

    /**
     * pageIndex attribute?????.
     * 
     * @return the pageIndex
     **/
    public int getPageIndex() {
        return pageIndex;
    }

    /**
     * pageIndex attribute ???????.
     * 
     * @param pageIndex
     *                  the pageIndex to set
     **/
    public void setPageIndex(int pageIndex) {
        this.pageIndex = pageIndex;
    }

    /**
     * pageUnit attribute?????.
     * 
     * @return the pageUnit
     **/
    public int getPageUnit() {
        return pageUnit;
    }

    /**
     * pageUnit attribute ???????.
     * 
     * @param pageUnit
     *                 the pageUnit to set
     **/
    public void setPageUnit(int pageUnit) {
        this.pageUnit = pageUnit;
    }

    /**
     * pageSize attribute?????.
     * 
     * @return the pageSize
     **/
    public int getPageSize() {
        return pageSize;
    }

    /**
     * pageSize attribute ???????.
     * 
     * @param pageSize
     *                 the pageSize to set
     **/
    public void setPageSize(int pageSize) {
        this.pageSize = pageSize;
    }

    /**
     * firstIndex attribute?????.
     * 
     * @return the firstIndex
     **/
    public int getFirstIndex() {
        return firstIndex;
    }

    /**
     * firstIndex attribute ???????.
     * 
     * @param firstIndex
     *                   the firstIndex to set
     **/
    public void setFirstIndex(int firstIndex) {
        this.firstIndex = firstIndex;
    }

    /**
     * lastIndex attribute?????.
     * 
     * @return the lastIndex
     **/
    public int getLastIndex() {
        return lastIndex;
    }

    /**
     * lastIndex attribute ???????.
     * 
     * @param lastIndex
     *                  the lastIndex to set
     **/
    public void setLastIndex(int lastIndex) {
        this.lastIndex = lastIndex;
    }

    /**
     * recordCountPerPage attribute?????.
     * 
     * @return the recordCountPerPage
     **/
    public int getRecordCountPerPage() {
        return recordCountPerPage;
    }

    /**
     * recordCountPerPage attribute ???????.
     * 
     * @param recordCountPerPage
     *                           the recordCountPerPage to set
     **/
    public void setRecordCountPerPage(int recordCountPerPage) {
        this.recordCountPerPage = recordCountPerPage;
    }

    /**
     * rowNo attribute?????.
     * 
     * @return the rowNo
     **/
    public int getRowNo() {
        return rowNo;
    }

    /**
     * rowNo attribute ???????.
     * 
     * @param rowNo
     *              the rowNo to set
     **/
    public void setRowNo(int rowNo) {
        this.rowNo = rowNo;
    }

    /**
     * registSeCodeNm attribute?????.
     * 
     * @return the registSeCodeNm
     **/
    public String getRegistSeCodeNm() {
        return registSeCodeNm;
    }

    /**
     * registSeCodeNm attribute ???????.
     * 
     * @param registSeCodeNm
     *                       the registSeCodeNm to set
     **/
    public void setRegistSeCodeNm(String registSeCodeNm) {
        this.registSeCodeNm = registSeCodeNm;
    }

    /**
     * frstRegisterNm attribute?????.
     * 
     * @return the frstRegisterNm
     **/
    public String getFrstRegisterNm() {
        return frstRegisterNm;
    }

    /**
     * frstRegisterNm attribute ???????.
     * 
     * @param frstRegisterNm
     *                       the frstRegisterNm to set
     **/
    public void setFrstRegisterNm(String frstRegisterNm) {
        this.frstRegisterNm = frstRegisterNm;
    }

    /**
     * bbsId attribute?????.
     * 
     * @return the bbsId
     **/
    public String getBbsId() {
        return bbsId;
    }

    /**
     * bbsId attribute ???????.
     * 
     * @param bbsId
     *              the bbsId to set
     **/
    public void setBbsId(String bbsId) {
        this.bbsId = bbsId;
    }

    public String getBlogId() {
        return blogId;
    }

    /**
     * bbsId attribute ???????.
     * 
     * @param bbsId
     *              the bbsId to set
     **/
    public void setBlogId(String blogId) {
        this.blogId = blogId;
    }

    /**
     * bbsNm attribute?????.
     * 
     * @return the bbsNm
     **/
    public String getBbsNm() {
        return bbsNm;
    }

    /**
     * bbsNm attribute ???????.
     * 
     * @param bbsNm
     *              the bbsNm to set
     **/
    public void setBbsNm(String bbsNm) {
        this.bbsNm = bbsNm;
    }

    /**
     * provdUrl attribute?????.
     * 
     * @return the provdUrl
     **/
    public String getProvdUrl() {
        return provdUrl;
    }

    /**
     * provdUrl attribute ???????.
     * 
     * @param provdUrl the provdUrl to set
     **/
    public void setProvdUrl(String provdUrl) {
        this.provdUrl = provdUrl;
    }

    /**
     * toString ???? ????
     **/
    public String toString() {
        return ToStringBuilder.reflectionToString(this);
    }
}
