package egovframework.com.cop.cmy.service;

import java.io.Serializable;

import org.apache.commons.lang3.builder.ToStringBuilder;


/**
 * 而ㅻ??곕땲 ?ъ슜??愿由щ? ?꾪븳 VO  ?대옒??
 * @author 怨듯넻?쒕퉬?ㅺ컻諛쒗? ?댁궪??
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *   
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.4.2  ?댁궪??         理쒖큹 ?앹꽦
 *
 * </pre>
 */
@SuppressWarnings("serial")
public class CommunityUserVO extends CommunityUser implements Serializable {
    
    /** 寃?됱떆?묒씪 */
    private String searchBgnDe = "";
    
    /** 寃?됱“嫄?*/
    private String searchCnd = "";
    
    /** 寃?됱쥌猷뚯씪 */
    private String searchEndDe = "";
    
    /** 寃?됰떒??*/
    private String searchWrd = "";
    
    /** ?뺣젹?쒖꽌(DESC,ASC) */
    private long sortOrdr = 0L;
    
    /** 寃?됱궗?⑹뿬遺 */
    private String searchUseYn = "";
    
    /** ?꾩옱?섏씠吏 */
    private int pageIndex = 1;
    
    /** ?섏씠吏媛쒖닔 */
    private int pageUnit = 10;
    
    /** ?섏씠吏?ъ씠利?*/
    private int pageSize = 10;
    
    /** 泥ロ럹?댁? ?몃뜳??*/
    private int firstIndex = 1;
    
    /** 留덉?留됲럹?댁? ?몃뜳??*/
    private int lastIndex = 1;
    
    /** ?섏씠吏???덉퐫??媛쒖닔 */
    private int recordCountPerPage = 10;
    
    /** ?덉퐫??踰덊샇 */
    private int rowNo = 0;

    /**
     * searchBgnDe attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the searchBgnDe
     */
    public String getSearchBgnDe() {
	return searchBgnDe;
    }

    /**
     * searchBgnDe attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param searchBgnDe
     *            the searchBgnDe to set
     */
    public void setSearchBgnDe(String searchBgnDe) {
	this.searchBgnDe = searchBgnDe;
    }

    /**
     * searchCnd attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the searchCnd
     */
    public String getSearchCnd() {
	return searchCnd;
    }

    /**
     * searchCnd attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param searchCnd
     *            the searchCnd to set
     */
    public void setSearchCnd(String searchCnd) {
	this.searchCnd = searchCnd;
    }

    /**
     * searchEndDe attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the searchEndDe
     */
    public String getSearchEndDe() {
	return searchEndDe;
    }

    /**
     * searchEndDe attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param searchEndDe
     *            the searchEndDe to set
     */
    public void setSearchEndDe(String searchEndDe) {
	this.searchEndDe = searchEndDe;
    }

    /**
     * searchWrd attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the searchWrd
     */
    public String getSearchWrd() {
	return searchWrd;
    }

    /**
     * searchWrd attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param searchWrd
     *            the searchWrd to set
     */
    public void setSearchWrd(String searchWrd) {
	this.searchWrd = searchWrd;
    }

    /**
     * sortOrdr attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the sortOrdr
     */
    public long getSortOrdr() {
	return sortOrdr;
    }

    /**
     * sortOrdr attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param sortOrdr
     *            the sortOrdr to set
     */
    public void setSortOrdr(long sortOrdr) {
	this.sortOrdr = sortOrdr;
    }

    /**
     * searchUseYn attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the searchUseYn
     */
    public String getSearchUseYn() {
	return searchUseYn;
    }

    /**
     * searchUseYn attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param searchUseYn
     *            the searchUseYn to set
     */
    public void setSearchUseYn(String searchUseYn) {
	this.searchUseYn = searchUseYn;
    }

    /**
     * pageIndex attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the pageIndex
     */
    public int getPageIndex() {
	return pageIndex;
    }

    /**
     * pageIndex attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param pageIndex
     *            the pageIndex to set
     */
    public void setPageIndex(int pageIndex) {
	this.pageIndex = pageIndex;
    }

    /**
     * pageUnit attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the pageUnit
     */
    public int getPageUnit() {
	return pageUnit;
    }

    /**
     * pageUnit attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param pageUnit
     *            the pageUnit to set
     */
    public void setPageUnit(int pageUnit) {
	this.pageUnit = pageUnit;
    }

    /**
     * pageSize attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the pageSize
     */
    public int getPageSize() {
	return pageSize;
    }

    /**
     * pageSize attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param pageSize
     *            the pageSize to set
     */
    public void setPageSize(int pageSize) {
	this.pageSize = pageSize;
    }

    /**
     * firstIndex attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the firstIndex
     */
    public int getFirstIndex() {
	return firstIndex;
    }

    /**
     * firstIndex attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param firstIndex
     *            the firstIndex to set
     */
    public void setFirstIndex(int firstIndex) {
	this.firstIndex = firstIndex;
    }

    /**
     * lastIndex attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the lastIndex
     */
    public int getLastIndex() {
	return lastIndex;
    }

    /**
     * lastIndex attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param lastIndex
     *            the lastIndex to set
     */
    public void setLastIndex(int lastIndex) {
	this.lastIndex = lastIndex;
    }

    /**
     * recordCountPerPage attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the recordCountPerPage
     */
    public int getRecordCountPerPage() {
	return recordCountPerPage;
    }

    /**
     * recordCountPerPage attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param recordCountPerPage
     *            the recordCountPerPage to set
     */
    public void setRecordCountPerPage(int recordCountPerPage) {
	this.recordCountPerPage = recordCountPerPage;
    }

    /**
     * rowNo attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the rowNo
     */
    public int getRowNo() {
	return rowNo;
    }

    /**
     * rowNo attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param rowNo
     *            the rowNo to set
     */
    public void setRowNo(int rowNo) {
	this.rowNo = rowNo;
    }

    /**
     * toString 硫붿냼?쒕? ?移섑븳??
     */
    public String toString() {
	return ToStringBuilder.reflectionToString(this);
    }
}
