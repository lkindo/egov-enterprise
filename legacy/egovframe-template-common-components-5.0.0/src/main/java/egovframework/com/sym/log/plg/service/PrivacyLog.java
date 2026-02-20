package egovframework.com.sym.log.plg.service;

import java.io.Serializable;

/**
 * @Class Name : PrivacyLog.java
 * @Description : 媛쒖씤?뺣낫 議고쉶 ?대젰 愿由щ? ?꾪븳 VO ?대옒??
 * @Modification Information
 *
 *    ?섏젙??        ?섏젙??        ?섏젙?댁슜
 *    -------        -------     -------------------
 *    2014.09.11	?쒖??꾨젅?꾩썙??	理쒖큹?앹꽦
* @author Vincent Han
 * @since 2014.09.11
 * @version 3.5
 */
public class PrivacyLog implements Serializable {

	/**
	 * Default Serial Version UID
	 */
	private static final long serialVersionUID = 1L;
	
	/** ?붿껌 ID (REQUST_ID) */
	private String requestId = "";
	
	/** 議고쉶?쇱떆 (INQIRE_DT) */
	private String inquiryDatetime = "";

	/** ?쒕퉬??紐?(SRVC_NM) */
	private String serviceName = "";
	
	/** 議고쉶 ?뺣낫 紐?(INQIRE_INFO) */
	private String inquiryInfo = "";

	/** ?붿껌?먯븘?대뵒 (RQESTER_ID) */
	private String requesterId = "";	

	/** ?붿껌???대쫫 (RQESTER_NM) */
	private String requesterName = "";

	/** ?붿껌?꾩씠??(RQESTER_IP) */
	private String requesterIp = "";
	
	/** 寃?됱“嫄?*/
	private String searchCondition = "";	

	/** 寃?됱떆?묒씪 */
	private String searchBeginDate = "";

	/** 寃?됱쥌猷뚯씪 */
	private String searchEndDate = "";
	
	/** 寃?됱떆?묒씪 (?붾㈃?? */
	private String searchBeginDateView = "";	// ex: 2014.09.14
	
	/** 寃?됱쥌猷뚯씪 (?붾㈃?? */
	private String searchEndDateView = "";	// ex: 2014.09.14	

	/** 寃?됰떒??*/
	private String searchWord = "";

	/** ?뺣젹?쒖꽌 (DESC, ASC) */
	private String sortOrder = "";
	
	/** 寃?됱궗?⑹뿬遺 */
    private String searchUseYn = "";
    
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
		
    /** rowNo  */
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
