package egovframework.com.sym.log.tlg.service;

import java.io.Serializable;

/**
 * @Class Name : TrsmrcvLog.java
 * @Description : ????????? ? VO ?????? ???.
 * @Modification Information
 *
 *    ????        ????        ????
 *    -------        -------     -------------------
 *    2009. 3. 11.   ????       ???
 *    2011. 7. 01.   ????       ??? ???sym.log -> sym.log.tlg)
 *    2011.09.14     ?????      ??????? ????? ??????.
 * @author ????????? ????
 * @since 2009. 3. 11.
 * @version
 * @see
 *
 **/
public class TrsmrcvLog implements Serializable {

	private static final long serialVersionUID = -4676693360868052168L;

	/**
	 * ????
	 **/
	private String requstId = "";

	/**
	 * ??
	 **/
	private String occrrncDe = "";

	/**
	 * ???????
	 **/
	private String trsmrcvSeCode = "";

	/**
	 * ????????
	 **/
	private String trsmrcvSeCodeNm = "";

    /** ?D **/
	private String cntcId;

    /** ???ID **/
	private String provdInsttId;

    /** ?????? **/
	private String provdSysId;

    /** ????? **/
	private String provdSvcId;

    /** ??ID **/
	private String requstInsttId;

    /** ????? **/
	private String requstSysId;

    /** ????? **/
	private String requstTrnsmitTm;

    /** ????? **/
	private String requstRecptnTm;

    /** ????? **/
	private String rspnsTrnsmitTm;

    /** ????? **/
	private String rspnsRecptnTm;

    /** ? **/
	private String resultCode;

    /** ? **/
	private String resultMessage;

	/**
	 * ????
	 **/
	private String frstRegisterPnttm = "";

	/**
	 * ??????
	 **/
	private String rqesterId = "";

	/**
	 * ??????
	 **/
	private String rqsterNm = "";

	/**
	 * ???
	 **/
	private String searchBgnDe = "";
	/**
	 * ???
	 **/
	private String searchCnd = "";
	/**
	 * ?????
	 **/
	private String searchEndDe = "";
	/**
	 * ????
	 **/
	private String searchWrd = "";
	/**
	 * ???(DESC,ASC)
	 **/
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

    /** rowNo  **/
	private int rowNo = 0;

	/**
	 * ???_???
	 **/
	private String searchBgnDeView = "";//2011.09.14

	/**
	 * ????????
	 **/
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

	public String getTrsmrcvSeCode() {
		return trsmrcvSeCode;
	}

	public void setTrsmrcvSeCode(String trsmrcvSeCode) {
		this.trsmrcvSeCode = trsmrcvSeCode;
	}

	public String getTrsmrcvSeCodeNm() {
		return trsmrcvSeCodeNm;
	}

	public void setTrsmrcvSeCodeNm(String trsmrcvSeCodeNm) {
		this.trsmrcvSeCodeNm = trsmrcvSeCodeNm;
	}

	public String getcntcId() {
		return cntcId;
	}

	public void setcntcId(String cntcId) {
		this.cntcId = cntcId;
	}

	public String getProvdInsttId() {
		return provdInsttId;
	}

	public void setProvdInsttId(String provdInsttId) {
		this.provdInsttId = provdInsttId;
	}

	public String getProvdSysId() {
		return provdSysId;
	}

	public void setProvdSysId(String provdSysId) {
		this.provdSysId = provdSysId;
	}

	public String getProvdSvcId() {
		return provdSvcId;
	}

	public void setProvdSvcId(String provdSvcId) {
		this.provdSvcId = provdSvcId;
	}

	public String getRequstInsttId() {
		return requstInsttId;
	}

	public void setRequstInsttId(String requstInsttId) {
		this.requstInsttId = requstInsttId;
	}

	public String getRequstSysId() {
		return requstSysId;
	}

	public void setRequstSysId(String requstSysId) {
		this.requstSysId = requstSysId;
	}

	public String getRequstTrnsmitTm() {
		return requstTrnsmitTm;
	}

	public void setRequstTrnsmitTm(String requstTrnsmitTm) {
		this.requstTrnsmitTm = requstTrnsmitTm;
	}

	public String getRequstRecptnTm() {
		return requstRecptnTm;
	}

	public void setRequstRecptnTm(String requstRecptnTm) {
		this.requstRecptnTm = requstRecptnTm;
	}

	public String getRspnsTrnsmitTm() {
		return rspnsTrnsmitTm;
	}

	public void setRspnsTrnsmitTm(String rspnsTrnsmitTm) {
		this.rspnsTrnsmitTm = rspnsTrnsmitTm;
	}

	public String getRspnsRecptnTm() {
		return rspnsRecptnTm;
	}

	public void setRspnsRecptnTm(String rspnsRecptnTm) {
		this.rspnsRecptnTm = rspnsRecptnTm;
	}

	public String getResultCode() {
		return resultCode;
	}

	public void setResultCode(String resultCode) {
		this.resultCode = resultCode;
	}

	public String getResultMessage() {
		return resultMessage;
	}

	public void setResultMessage(String resultMessage) {
		this.resultMessage = resultMessage;
	}

	public String getFrstRegisterPnttm() {
		return frstRegisterPnttm;
	}

	public void setFrstRegisterPnttm(String frstRegisterPnttm) {
		this.frstRegisterPnttm = frstRegisterPnttm;
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
