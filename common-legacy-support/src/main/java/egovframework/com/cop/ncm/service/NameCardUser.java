package egovframework.com.cop.ncm.service;

import java.io.Serializable;

import org.apache.commons.lang3.builder.ToStringBuilder;

/**
 * ???????????? ???????
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
 *   2009.3.28  ????         ????
 *
 *      </pre>
 **/
public class NameCardUser implements Serializable {
    private static final long serialVersionUID = 1L;

    /** ???? **/
    private String creatDt = "";

    /** ???**/
    private String ncrdId = "";

    /** ????**/
    private String registSeCode = "";

    /** ?????? **/
    private String useAt = "";

    /** ????????**/
    private String emplyrId = "";

    /** ??????**/
    private String userNm = "";

    /** ????**/
    private String ncrdNm = "";

    /** ???? **/
    private String frstRegisterPnttm = "";

    /** ???????**/
    private String frstRegisterId = "";

    /** ????**/
    private String cmpnyNm = "";

    /** ??? **/
    private String deptNm = "";

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

    /** ???? ???**/
    private int firstIndex = 1;

    /** ????? ???**/
    private int lastIndex = 1;

    /** ??????????**/
    private int recordCountPerPage = 10;

    /** ??????**/
    private int rowNo = 0;

    /**
     * creatDt attribute?????.
     * 
     * @return the creatDt
     **/
    public String getCreatDt() {
        return creatDt;
    }

    /**
     * creatDt attribute ???????.
     * 
     * @param creatDt
     *                the creatDt to set
     **/
    public void setCreatDt(String creatDt) {
        this.creatDt = creatDt;
    }

    /**
     * ncrdId attribute?????.
     * 
     * @return the ncrdId
     **/
    public String getNcrdId() {
        return ncrdId;
    }

    /**
     * ncrdId attribute ???????.
     * 
     * @param ncrdId
     *               the ncrdId to set
     **/
    public void setNcrdId(String ncrdId) {
        this.ncrdId = ncrdId;
    }

    /**
     * registSeCode attribute?????.
     * 
     * @return the registSeCode
     **/
    public String getRegistSeCode() {
        return registSeCode;
    }

    /**
     * registSeCode attribute ???????.
     * 
     * @param registSeCode
     *                     the registSeCode to set
     **/
    public void setRegistSeCode(String registSeCode) {
        this.registSeCode = registSeCode;
    }

    /**
     * useAt attribute?????.
     * 
     * @return the useAt
     **/
    public String getUseAt() {
        return useAt;
    }

    /**
     * useAt attribute ???????.
     * 
     * @param useAt
     *              the useAt to set
     **/
    public void setUseAt(String useAt) {
        this.useAt = useAt;
    }

    /**
     * emplyrId attribute?????.
     * 
     * @return the emplyrId
     **/
    public String getEmplyrId() {
        return emplyrId;
    }

    /**
     * emplyrId attribute ???????.
     * 
     * @param emplyrId
     *                 the emplyrId to set
     **/
    public void setEmplyrId(String emplyrId) {
        this.emplyrId = emplyrId;
    }

    /**
     * userNm attribute?????.
     * 
     * @return the userNm
     **/
    public String getUserNm() {
        return userNm;
    }

    /**
     * userNm attribute ???????.
     * 
     * @param userNm
     *               the userNm to set
     **/
    public void setUserNm(String userNm) {
        this.userNm = userNm;
    }

    /**
     * ncrdNm attribute?????.
     * 
     * @return the ncrdNm
     **/
    public String getNcrdNm() {
        return ncrdNm;
    }

    /**
     * ncrdNm attribute ???????.
     * 
     * @param ncrdNm
     *               the ncrdNm to set
     **/
    public void setNcrdNm(String ncrdNm) {
        this.ncrdNm = ncrdNm;
    }

    /**
     * frstRegisterPnttm attribute?????.
     * 
     * @return the frstRegisterPnttm
     **/
    public String getFrstRegisterPnttm() {
        return frstRegisterPnttm;
    }

    /**
     * frstRegisterPnttm attribute ???????.
     * 
     * @param frstRegisterPnttm
     *                          the frstRegisterPnttm to set
     **/
    public void setFrstRegisterPnttm(String frstRegisterPnttm) {
        this.frstRegisterPnttm = frstRegisterPnttm;
    }

    /**
     * frstRegisterId attribute?????.
     * 
     * @return the frstRegisterId
     **/
    public String getFrstRegisterId() {
        return frstRegisterId;
    }

    /**
     * frstRegisterId attribute ???????.
     * 
     * @param frstRegisterId
     *                       the frstRegisterId to set
     **/
    public void setFrstRegisterId(String frstRegisterId) {
        this.frstRegisterId = frstRegisterId;
    }

    /**
     * cmpnyNm attribute?????.
     * 
     * @return the cmpnyNm
     **/
    public String getCmpnyNm() {
        return cmpnyNm;
    }

    /**
     * cmpnyNm attribute ???????.
     * 
     * @param cmpnyNm
     *                the cmpnyNm to set
     **/
    public void setCmpnyNm(String cmpnyNm) {
        this.cmpnyNm = cmpnyNm;
    }

    /**
     * deptNm attribute?????.
     * 
     * @return the deptNm
     **/
    public String getDeptNm() {
        return deptNm;
    }

    /**
     * deptNm attribute ???????.
     * 
     * @param deptNm
     *               the deptNm to set
     **/
    public void setDeptNm(String deptNm) {
        this.deptNm = deptNm;
    }

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
     * toString ???? ????
     **/
    public String toString() {
        return ToStringBuilder.reflectionToString(this);
    }
}
