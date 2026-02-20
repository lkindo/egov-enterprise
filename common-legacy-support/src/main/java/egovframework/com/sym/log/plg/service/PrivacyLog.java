package egovframework.com.sym.log.plg.service;

import java.io.Serializable;

/**
 * @Class Name : PrivacyLog.java
 * @Description : ?? ????????? ? VO ?????
 * @Modification Information
 *
 *    ????        ????        ????
 *    -------        -------     -------------------
 *    2014.09.11	???????	???
* @author Vincent Han
 * @since 2014.09.11
 * @version 3.5
 **/
public class PrivacyLog implements Serializable {

	/**
	 * Default Serial Version UID
	 **/
	private static final long serialVersionUID = 1L;
	
	/** ? ID (REQUST_ID) **/
	private String requestId = "";
	
	/** ??? (INQIRE_DT) **/
	private String inquiryDatetime = "";

	/** ?????(SRVC_NM) **/
	private String serviceName = "";
	
	/** ??? ?(INQIRE_INFO) **/
	private String inquiryInfo = "";

	/** ??????(RQESTER_ID) **/
	private String requesterId = "";	

	/** ??????(RQESTER_NM) **/
	private String requesterName = "";

	/** ????(RQESTER_IP) **/
	private String requesterIp = "";
	
	/** ???**/
	private String searchCondition = "";	

	/** ??? **/
	private String searchBeginDate = "";

	/** ?????**/
	private String searchEndDate = "";
	
	/** ??? (??? **/
	private String searchBeginDateView = "";	// ex: 2014.09.14
	
	/** ?????(??? **/
	private String searchEndDateView = "";	// ex: 2014.09.14	

	/** ????**/
	private String searchWord = "";

	/** ??? (DESC, ASC) **/
	private String sortOrder = "";
	
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
		
    /** rowNo  **/
	private int rowNo = 0;
	
	public String getRequestId() {
		return requestId;
	}

	public void setRequestId(String requestId) {
		this.requestId = requestId;
	}

	public String getInquiryDatetime() {
		return inquiryDatetime;
	}

	public void setInquiryDatetime(String inquiryDatetime) {
		this.inquiryDatetime = inquiryDatetime;
	}

	public String getServiceName() {
		return serviceName;
	}

	public void setServiceName(String serviceName) {
		this.serviceName = serviceName;
	}

	public String getInquiryInfo() {
		return inquiryInfo;
	}

	public void setInquiryInfo(String inquiryInfo) {
		this.inquiryInfo = inquiryInfo;
	}

	public String getRequesterId() {
		return requesterId;
	}

	public void setRequesterId(String requesterId) {
		this.requesterId = requesterId;
	}

	public String getRequesterName() {
		return requesterName;
	}

	public void setRequesterName(String requesterName) {
		this.requesterName = requesterName;
	}

	public String getRequesterIp() {
		return requesterIp;
	}

	public void setRequesterIp(String requesterIp) {
		this.requesterIp = requesterIp;
	}

	public String getSearchCondition() {
		return searchCondition;
	}

	public void setSearchCondition(String searchCondition) {
		this.searchCondition = searchCondition;
	}

	public String getSearchBeginDate() {
		return searchBeginDate;
	}

	public void setSearchBeginDate(String searchBeginDate) {
		this.searchBeginDate = searchBeginDate;
	}

	public String getSearchEndDate() {
		return searchEndDate;
	}

	public void setSearchEndDate(String searchEndDate) {
		this.searchEndDate = searchEndDate;
	}

	public String getSearchBeginDateView() {
		return searchBeginDateView;
	}

	public void setSearchBeginDateView(String searchBeginDateView) {
		this.searchBeginDateView = searchBeginDateView;
	}

	public String getSearchEndDateView() {
		return searchEndDateView;
	}

	public void setSearchEndDateView(String searchEndDateView) {
		this.searchEndDateView = searchEndDateView;
	}

	public String getSearchWord() {
		return searchWord;
	}

	public void setSearchWord(String searchWord) {
		this.searchWord = searchWord;
	}

	public String getSortOrder() {
		return sortOrder;
	}

	public void setSortOrder(String sortOrder) {
		this.sortOrder = sortOrder;
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

	public int getRowNo() {
		return rowNo;
	}

	public void setRowNo(int rowNo) {
		this.rowNo = rowNo;
	}
}
