package egovframework.com.cop.ncm.service;

import java.io.Serializable;

import org.apache.commons.lang3.builder.ToStringBuilder;


/**
 * 紐낇븿?ъ슜???뺣낫瑜?愿由ы븯湲??꾪븳 紐⑤뜽 ?대옒??
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
 *   2009.3.28  ?댁궪??         理쒖큹 ?앹꽦
 *
 * </pre>
 */
@SuppressWarnings("serial")
public class NameCardUser implements Serializable {

    /** ?앹꽦?쇱떆 */
    private String creatDt = "";
    
    /** 紐낇븿?꾩씠??*/
    private String ncrdId = "";
    
    /** ?깅줉援щ텇肄붾뱶 */
    private String registSeCode = "";
    
    /** ?ъ슜?щ? */
    private String useAt = "";
    
    /** ?ъ슜???꾩씠??*/
    private String emplyrId = "";
    
    /** ?ъ슜??紐?*/
    private String userNm = "";
    
    /** 紐낇븿 ?대쫫 */
    private String ncrdNm = "";

    /** 理쒖큹?깅줉?쒖젏 */
    private String frstRegisterPnttm = "";
    
    /** 理쒖큹?깅줉???꾩씠??*/
    private String frstRegisterId = "";
    
    /** ?뚯궗紐?*/
    private String cmpnyNm = "";
    
    /** 遺?쒕챸 */
    private String deptNm = "";

    /** 寃?됱떆?묒씪 */
    private String searchBgnDe = "";
    
    /** 寃?됱“嫄?*/
    private String searchCnd = "";
    
    /** 寃?됱쥌猷뚯씪 */
    private String searchEndDe = "";
    
    /** 寃?됰떒??*/
    private String searchWrd = "";
    
    /** ?뺣젹?쒖꽌(DESC,ASC) */
    private String sortOrdr = "";

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
     * creatDt attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the creatDt
     */
    public String getCreatDt() {
	return creatDt;
    }

    /**
     * creatDt attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param creatDt
     *            the creatDt to set
     */
    public void setCreatDt(String creatDt) {
	this.creatDt = creatDt;
    }

    /**
     * ncrdId attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the ncrdId
     */
    public String getNcrdId() {
	return ncrdId;
    }

    /**
     * ncrdId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param ncrdId
     *            the ncrdId to set
     */
    public void setNcrdId(String ncrdId) {
	this.ncrdId = ncrdId;
    }

    /**
     * registSeCode attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the registSeCode
     */
    public String getRegistSeCode() {
	return registSeCode;
    }

    /**
     * registSeCode attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param registSeCode
     *            the registSeCode to set
     */
    public void setRegistSeCode(String registSeCode) {
	this.registSeCode = registSeCode;
    }

    /**
     * useAt attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the useAt
     */
    public String getUseAt() {
	return useAt;
    }

    /**
     * useAt attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param useAt
     *            the useAt to set
     */
    public void setUseAt(String useAt) {
	this.useAt = useAt;
    }

    /**
     * emplyrId attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the emplyrId
     */
    public String getEmplyrId() {
	return emplyrId;
    }

    /**
     * emplyrId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param emplyrId
     *            the emplyrId to set
     */
    public void setEmplyrId(String emplyrId) {
	this.emplyrId = emplyrId;
    }

    /**
     * userNm attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the userNm
     */
    public String getUserNm() {
	return userNm;
    }

    /**
     * userNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param userNm
     *            the userNm to set
     */
    public void setUserNm(String userNm) {
	this.userNm = userNm;
    }

    /**
     * ncrdNm attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the ncrdNm
     */
    public String getNcrdNm() {
	return ncrdNm;
    }

    /**
     * ncrdNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param ncrdNm
     *            the ncrdNm to set
     */
    public void setNcrdNm(String ncrdNm) {
	this.ncrdNm = ncrdNm;
    }

    /**
     * frstRegisterPnttm attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the frstRegisterPnttm
     */
    public String getFrstRegisterPnttm() {
	return frstRegisterPnttm;
    }

    /**
     * frstRegisterPnttm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param frstRegisterPnttm
     *            the frstRegisterPnttm to set
     */
    public void setFrstRegisterPnttm(String frstRegisterPnttm) {
	this.frstRegisterPnttm = frstRegisterPnttm;
    }

    /**
     * frstRegisterId attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the frstRegisterId
     */
    public String getFrstRegisterId() {
	return frstRegisterId;
    }

    /**
     * frstRegisterId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param frstRegisterId
     *            the frstRegisterId to set
     */
    public void setFrstRegisterId(String frstRegisterId) {
	this.frstRegisterId = frstRegisterId;
    }

    /**
     * cmpnyNm attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the cmpnyNm
     */
    public String getCmpnyNm() {
	return cmpnyNm;
    }

    /**
     * cmpnyNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param cmpnyNm
     *            the cmpnyNm to set
     */
    public void setCmpnyNm(String cmpnyNm) {
	this.cmpnyNm = cmpnyNm;
    }

    /**
     * deptNm attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the deptNm
     */
    public String getDeptNm() {
	return deptNm;
    }

    /**
     * deptNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param deptNm
     *            the deptNm to set
     */
    public void setDeptNm(String deptNm) {
	this.deptNm = deptNm;
    }

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
    public String getSortOrdr() {
	return sortOrdr;
    }

    /**
     * sortOrdr attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param sortOrdr
     *            the sortOrdr to set
     */
    public void setSortOrdr(String sortOrdr) {
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
