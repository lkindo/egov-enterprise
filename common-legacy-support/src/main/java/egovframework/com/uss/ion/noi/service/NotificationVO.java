package egovframework.com.uss.ion.noi.service;

import org.apache.commons.lang3.builder.ToStringBuilder;

/**
 * ??????????? ? VO ?????
 * 
 * @author ?????? ????
 * @since 2009.06.08
 * @version 1.0
 * @see
 *
 *      <pre>
 * << ?????Modification Information) >>
 *   
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.6.8  ????         ????
 *
 *      </pre>
 **/
public class NotificationVO extends Notification {

    private static final long serialVersionUID = 1L;

    /** ???**/
    private String searchCnd = "";

    /** ????**/
    private String searchWrd = "";

    /** ???(DESC,ASC) **/
    private String sortOrdr = "";

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

    /** ??????????? ????????? **/
    private String startDateTime = "";

    /** ??????????? ??????? **/
    private String endDateTime = "";

    /** ? ??? ??HH) **/
    private String ntfcHH = "";

    /** ? ??? ??MM) **/
    private String ntfcMM = "";

    public String getNtfcHH() {
        return ntfcHH;
    }

    public void setNtfcHH(String ntfcHH) {
        this.ntfcHH = ntfcHH;
    }

    public String getNtfcMM() {
        return ntfcMM;
    }

    public void setNtfcMM(String ntfcMM) {
        this.ntfcMM = ntfcMM;
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
     * @param searchCnd the searchCnd to set
     **/
    public void setSearchCnd(String searchCnd) {
        this.searchCnd = searchCnd;
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
     * @param searchWrd the searchWrd to set
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
     * @param sortOrdr the sortOrdr to set
     **/
    public void setSortOrdr(String sortOrdr) {
        this.sortOrdr = sortOrdr;
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
     * @param pageIndex the pageIndex to set
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
     * @param pageUnit the pageUnit to set
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
     * @param pageSize the pageSize to set
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
     * @param firstIndex the firstIndex to set
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
     * @param lastIndex the lastIndex to set
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
     * @param recordCountPerPage the recordCountPerPage to set
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
     * @param rowNo the rowNo to set
     **/
    public void setRowNo(int rowNo) {
        this.rowNo = rowNo;
    }

    /**
     * startDateTime attribute?????.
     * 
     * @return the startDateTime
     **/
    public String getStartDateTime() {
        return startDateTime;
    }

    /**
     * startDateTime attribute ???????.
     * 
     * @param startDateTime the startDateTime to set
     **/
    public void setStartDateTime(String startDateTime) {
        this.startDateTime = startDateTime;
    }

    /**
     * endDateTime attribute?????.
     * 
     * @return the endDateTime
     **/
    public String getEndDateTime() {
        return endDateTime;
    }

    /**
     * endDateTime attribute ???????.
     * 
     * @param endDateTime the endDateTime to set
     **/
    public void setEndDateTime(String endDateTime) {
        this.endDateTime = endDateTime;
    }

    /**
     * toString ???? ????
     **/
    public String toString() {
        return ToStringBuilder.reflectionToString(this);
    }
}
