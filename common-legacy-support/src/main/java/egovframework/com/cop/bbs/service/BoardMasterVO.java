package egovframework.com.cop.bbs.service;

import org.apache.commons.lang3.builder.ToStringBuilder;

/**
 * ????? ??????? VO ?????
 * 
 * @author ??????? ????
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 *      <pre>
 * << ?????Modification Information) >>
 *   
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.3.12  ????         ????
 *
 *      </pre>
 **/
public class BoardMasterVO extends BoardMaster {

    private static final long serialVersionUID = 1L;

    /** ??? **/
    private String searchBgnDe = "";

    /** ???**/
    private String searchCnd = "";

    /** ?????**/
    private String searchEndDe = "";

    /** ????**/
    private String searchWrd = "";

    /** ???(DESC,ASC) **/
    private String sortOrdr = "";

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

    /** rowNo **/
    private int rowNo = 0;

    /** ????? **/
    private String frstRegisterNm = "";

    /** ????????**/
    private String bbsTyCodeNm = "";

    /** ?????**/
    private String tmplatNm = "";

    /** ????? **/
    private String lastUpdusrNm = "";

    /** ?????? **/
    private String authFlag = "";

    /** ????**/
    private String tmplatCours = "";

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
    public String getSortOrdr() {
        return sortOrdr;
    }

    /**
     * sortOrdr attribute ???????.
     * 
     * @param sortOrdr
     *                 the sortOrdr to set
     **/
    public void setSortOrdr(String sortOrdr) {
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
     * bbsTyCodeNm attribute?????.
     * 
     * @return the bbsTyCodeNm
     **/
    public String getBbsTyCodeNm() {
        return bbsTyCodeNm;
    }

    /**
     * bbsTyCodeNm attribute ???????.
     * 
     * @param bbsTyCodeNm
     *                    the bbsTyCodeNm to set
     **/
    public void setBbsTyCodeNm(String bbsTyCodeNm) {
        this.bbsTyCodeNm = bbsTyCodeNm;
    }

    /**
     * tmplatNm attribute?????.
     * 
     * @return the tmplatNm
     **/
    public String getTmplatNm() {
        return tmplatNm;
    }

    /**
     * tmplatNm attribute ???????.
     * 
     * @param tmplatNm
     *                 the tmplatNm to set
     **/
    public void setTmplatNm(String tmplatNm) {
        this.tmplatNm = tmplatNm;
    }

    /**
     * lastUpdusrNm attribute?????.
     * 
     * @return the lastUpdusrNm
     **/
    public String getLastUpdusrNm() {
        return lastUpdusrNm;
    }

    /**
     * lastUpdusrNm attribute ???????.
     * 
     * @param lastUpdusrNm
     *                     the lastUpdusrNm to set
     **/
    public void setLastUpdusrNm(String lastUpdusrNm) {
        this.lastUpdusrNm = lastUpdusrNm;
    }

    /**
     * authFlag attribute?????.
     * 
     * @return the authFlag
     **/
    public String getAuthFlag() {
        return authFlag;
    }

    /**
     * authFlag attribute ???????.
     * 
     * @param authFlag
     *                 the authFlag to set
     **/
    public void setAuthFlag(String authFlag) {
        this.authFlag = authFlag;
    }

    /**
     * tmplatCours attribute?????.
     * 
     * @return the tmplatCours
     **/
    public String getTmplatCours() {
        return tmplatCours;
    }

    /**
     * tmplatCours attribute ???????.
     * 
     * @param tmplatCours
     *                    the tmplatCours to set
     **/
    public void setTmplatCours(String tmplatCours) {
        this.tmplatCours = tmplatCours;
    }

    /**
     * toString ???? ????
     **/
    public String toString() {
        return ToStringBuilder.reflectionToString(this);
    }
}
