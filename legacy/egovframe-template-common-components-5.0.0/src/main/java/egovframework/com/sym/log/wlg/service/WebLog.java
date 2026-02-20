package egovframework.com.sym.log.wlg.service;

import java.io.Serializable;

/**
 * @Class Name : WebLog.java
 * @Description : ??濡쒓렇 愿由щ? ?꾪븳 VO ?대옒??
 * @Modification Information
 *
 *    ?섏젙??        ?섏젙??        ?섏젙?댁슜
 *    -------        -------     -------------------
 *    2009. 3. 11.   ?댁궪??        理쒖큹?앹꽦
 *    2011. 7. 01.   ?닿린??        ?⑦궎吏 遺꾨━(sym.log -> sym.log.wlg)
 *    2011.09.14     ?쒖???      ?붾㈃??寃?됱씪?먮? ?쒖떆?섍린?꾪븳 硫ㅻ쾭蹂??異붽?.
 * @author 怨듯넻 ?쒕퉬??媛쒕컻? ?댁궪??
 * @since 2009. 3. 11.
 * @version
 * @see
 *
 */
public class WebLog implements Serializable {

	private static final long serialVersionUID = -7768865822788140496L;

	/**
	 * ?붿껌?꾩씠??
	 */
	private String requstId = "";

	/**
	 * 諛쒖깮?쇱옄
	 */
	private String occrrncDe = "";

	/**
	 * URL
	 */
	private String url = "";

	/**
	 * ?붿껌?먯븘?대뵒
	 */
	private String rqesterId = "";

	/**
	 * ?붿껌???대쫫
	 */
	private String rqsterNm = "";

	/**
	 * ?붿껌?꾩씠??
	 */
	private String rqesterIp = "";

	/**
	 * 寃?됱떆?묒씪
	 */
	private String searchBgnDe = "";

	/**
	 * 寃?됱“嫄?
	 */
	private String searchCnd = "";

	/**
	 * 寃?됱쥌猷뚯씪
	 */
	private String searchEndDe = "";

	/**
	 * 寃?됰떒??
	 */
	private String searchWrd = "";

	/**
	 * ?뺣젹?쒖꽌(DESC,ASC)
	 */
	private String sortOrdr = "";

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

	/**
	 * 寃?됱떆?묒씪_?붾㈃??
	 */
	private String searchBgnDeView = "";//2011.09.14

	/**
	 * 寃?됱쥌猷뚯씪_?붾㈃??
	 */
	private String searchEndDeView = "";//2011.09.14

	public String getSearchEndDeView() {
		return searchEndDeView;
	}
	public void setSearchEndDeView(String searchEndDeView) {
		this.searchEndDeView = searchEndDeView;
	}
	public String getSearchBgnDeView() {
		return searchBgnDeView;
	}
	public void setSearchBgnDeView(String searchBgnDeView) {
		this.searchBgnDeView = searchBgnDeView;
	}

	public String getRequstId() {
		return requstId;
	}

	public void setRequstId(String requstId) {
		this.requstId = requstId;
	}

	public String getOccrrncDe() {
		return occrrncDe;
	}

	public void setOccrrncDe(String occrrncDe) {
		this.occrrncDe = occrrncDe;
	}

	public String getUrl() {
		return url;
	}

	public void setUrl(String url) {
		this.url = url;
	}

	public String getRqesterId() {
		return rqesterId;
	}

	public void setRqesterId(String rqesterId) {
		this.rqesterId = rqesterId;
	}

	public String getRqsterNm() {
		return rqsterNm;
	}

	public void setRqsterNm(String rqsterNm) {
		this.rqsterNm = rqsterNm;
	}

	public String getRqesterIp() {
		return rqesterIp;
	}

	public void setRqesterIp(String rqesterIp) {
		this.rqesterIp = rqesterIp;
	}

	public String getSearchBgnDe() {
		return searchBgnDe;
	}

	public void setSearchBgnDe(String searchBgnDe) {
		this.searchBgnDe = searchBgnDe;
	}

	public String getSearchCnd() {
		return searchCnd;
	}

	public void setSearchCnd(String searchCnd) {
		this.searchCnd = searchCnd;
	}

	public String getSearchEndDe() {
		return searchEndDe;
	}

	public void setSearchEndDe(String searchEndDe) {
		this.searchEndDe = searchEndDe;
	}

	public String getSearchWrd() {
		return searchWrd;
	}

	public void setSearchWrd(String searchWrd) {
		this.searchWrd = searchWrd;
	}

	public String getSortOrdr() {
		return sortOrdr;
	}

	public void setSortOrdr(String sortOrdr) {
		this.sortOrdr = sortOrdr;
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
