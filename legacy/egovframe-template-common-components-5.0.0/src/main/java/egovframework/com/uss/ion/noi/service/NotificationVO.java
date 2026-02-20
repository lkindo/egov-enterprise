package egovframework.com.uss.ion.noi.service;

import org.apache.commons.lang3.builder.ToStringBuilder;

/**
 * ?뺣낫?뚮┝???쒕퉬?ㅻ? ?꾪븳 VO ?대옒??
 * @author 怨듯넻而댄룷?뚰듃媛쒕컻? ?쒖꽦怨?
 * @since 2009.06.08
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *   
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.6.8  ?쒖꽦怨?         理쒖큹 ?앹꽦
 *
 * </pre>
 */
@SuppressWarnings("serial")
public class NotificationVO extends Notification {

    /** 寃?됱“嫄?*/
    private String searchCnd = "";
    
    /** 寃?됰떒??*/
    private String searchWrd = "";
    
    /** ?뺣젹?쒖꽌(DESC,ASC) */
    private String sortOrdr = "";
    
    /** ?꾩옱?섏씠吏 */
    private int pageIndex = 1;

    /** ?섏씠吏媛쒖닔 */
    private int pageUnit = 10;

    /** ?섏씠吏?ъ씠利?*/
    private int pageSize = 10;

    /** firstIndex */
    private int firstIndex = 1;

    /** lastIndex */
    private int lastIndex = 1;

    /** recordCountPerPage */
    private int recordCountPerPage = 10;

    /** rowNo */
    private int rowNo = 0;
    
    /** ?뺣낫?뚮┝???쒖떆瑜??꾪븳 ?쒖옉??諛??쒖옉?쒓컙 */
    private String startDateTime = "";
    
    /** ?뺣낫?뚮┝???쒖떆瑜??꾪븳 醫낅즺??諛?醫낅즺?쒓컙 */
    private String endDateTime = "";

    /**
     * searchCnd attribute瑜?由ы꽩?쒕떎.
     * @return the searchCnd
     */
    public String getSearchCnd() {
        return searchCnd;
    }

    /**
     * searchCnd attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param searchCnd the searchCnd to set
     */
    public void setSearchCnd(String searchCnd) {
        this.searchCnd = searchCnd;
    }

    /**
     * searchWrd attribute瑜?由ы꽩?쒕떎.
     * @return the searchWrd
     */
    public String getSearchWrd() {
        return searchWrd;
    }

    /**
     * searchWrd attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param searchWrd the searchWrd to set
     */
    public void setSearchWrd(String searchWrd) {
        this.searchWrd = searchWrd;
    }

    /**
     * sortOrdr attribute瑜?由ы꽩?쒕떎.
     * @return the sortOrdr
     */
    public String getSortOrdr() {
        return sortOrdr;
    }

    /**
     * sortOrdr attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param sortOrdr the sortOrdr to set
     */
    public void setSortOrdr(String sortOrdr) {
        this.sortOrdr = sortOrdr;
    }

    /**
     * pageIndex attribute瑜?由ы꽩?쒕떎.
     * @return the pageIndex
     */
    public int getPageIndex() {
        return pageIndex;
    }

    /**
     * pageIndex attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param pageIndex the pageIndex to set
     */
    public void setPageIndex(int pageIndex) {
        this.pageIndex = pageIndex;
    }

    /**
     * pageUnit attribute瑜?由ы꽩?쒕떎.
     * @return the pageUnit
     */
    public int getPageUnit() {
        return pageUnit;
    }

    /**
     * pageUnit attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param pageUnit the pageUnit to set
     */
    public void setPageUnit(int pageUnit) {
        this.pageUnit = pageUnit;
    }

    /**
     * pageSize attribute瑜?由ы꽩?쒕떎.
     * @return the pageSize
     */
    public int getPageSize() {
        return pageSize;
    }

    /**
     * pageSize attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param pageSize the pageSize to set
     */
    public void setPageSize(int pageSize) {
        this.pageSize = pageSize;
    }

    /**
     * firstIndex attribute瑜?由ы꽩?쒕떎.
     * @return the firstIndex
     */
    public int getFirstIndex() {
        return firstIndex;
    }

    /**
     * firstIndex attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param firstIndex the firstIndex to set
     */
    public void setFirstIndex(int firstIndex) {
        this.firstIndex = firstIndex;
    }

    /**
     * lastIndex attribute瑜?由ы꽩?쒕떎.
     * @return the lastIndex
     */
    public int getLastIndex() {
        return lastIndex;
    }

    /**
     * lastIndex attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param lastIndex the lastIndex to set
     */
    public void setLastIndex(int lastIndex) {
        this.lastIndex = lastIndex;
    }

    /**
     * recordCountPerPage attribute瑜?由ы꽩?쒕떎.
     * @return the recordCountPerPage
     */
    public int getRecordCountPerPage() {
        return recordCountPerPage;
    }

    /**
     * recordCountPerPage attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param recordCountPerPage the recordCountPerPage to set
     */
    public void setRecordCountPerPage(int recordCountPerPage) {
        this.recordCountPerPage = recordCountPerPage;
    }

    /**
     * rowNo attribute瑜?由ы꽩?쒕떎.
     * @return the rowNo
     */
    public int getRowNo() {
        return rowNo;
    }

    /**
     * rowNo attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param rowNo the rowNo to set
     */
    public void setRowNo(int rowNo) {
        this.rowNo = rowNo;
    }
    
    /**
     * startDateTime attribute瑜?由ы꽩?쒕떎.
     * @return the startDateTime
     */
    public String getStartDateTime() {
        return startDateTime;
    }

    /**
     * startDateTime attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param startDateTime the startDateTime to set
     */
    public void setStartDateTime(String startDateTime) {
        this.startDateTime = startDateTime;
    }

    /**
     * endDateTime attribute瑜?由ы꽩?쒕떎.
     * @return the endDateTime
     */
    public String getEndDateTime() {
        return endDateTime;
    }

    /**
     * endDateTime attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * @param endDateTime the endDateTime to set
     */
    public void setEndDateTime(String endDateTime) {
        this.endDateTime = endDateTime;
    }

    /**
     * toString 硫붿냼?쒕? ?移섑븳??
     */
    public String toString() {
	return ToStringBuilder.reflectionToString(this);
    }
}
