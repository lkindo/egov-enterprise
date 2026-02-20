package egovframework.com.sym.log.lgm.service;

import java.io.Serializable;

import org.apache.commons.lang3.builder.ToStringBuilder;

/**
 * @Class Name : SysLog.java
 * @Description : ??????????? VO ?????? ???.
 * @Modification Information
 *
 *    ????         ????        ????
 *    -------         -------     -------------------
 *    2009. 3. 11.     ????     ???
 *    2011. 7. 01.     ????     ??? ???sym.log -> sym.log.lgm)
 *    2011.09.14       ?????     ??????? ????? ??????.
 *    2017.09.19       ????      ???_??? ????????????
 * @author ????????? ????
 * @since 2009. 3. 11.
 * @version
 * @see
 *
 **/

public class SysLog implements Serializable{


	private static final long serialVersionUID = 540569951549295059L;
	
	/**
	 * ????
	 **/
	private int errorCo = 0;
	/**
	 * ????
	 **/
	private String errorCode = "";
	/**
	 * ?????
	 **/
	private String errorCodeNm = "";
	/**
	 * ???
	 **/
	private String errorSe = "";
	/**
	 * ???
	 **/
	private String insttCode = "";
	/**
	 * ????
	 **/
	private String insttCodeNm = "";
	/**
	 * ????
	 **/
	private String jobSeCode = "";

	/**
	 * ?????
	 **/
	private String jobSeCodeNm = "";
	/**
	 * ??
	 **/
	private String methodNm = "";
	/**
	 * ??
	 **/
	private String occrrncDe = "";
	/**
	 * ???
	 **/
	private int processCo = 0;
	/**
	 * ???
	 **/
	private String processSeCode = "";
	/**
	 * ????
	 **/
	private String processSeCodeNm = "";
	/**
	 * ???
	 **/
	private String processTime = "";
	/**
	 * ????
	 **/
	private String requstId = "";
	/**
	 * ??????
	 **/
	private String rqesterId = "";
	/**
	 * ??????
	 **/
	private String rqsterNm = "";
	/**
	 * ????
	 **/
	private String rqesterIp = "";
	/**
	 * ???
	 **/
	private String rspnsCode = "";
	/**
	 * ????
	 **/
	private String rspnsCodeNm = "";
	/**
	 * ????
	 **/
	private String srvcNm = "";
	/**
	 * ??????
	 **/
	private String trgetMenuNm = "";
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
	 * @return the errorCo
	 **/
	public int getErrorCo() {
		return errorCo;
	}
	/**
	 * @param errorCo the errorCo to set
	 **/
	public void setErrorCo(int errorCo) {
		this.errorCo = errorCo;
	}
	/**
	 * @return the errorCode
	 **/
	public String getErrorCode() {
		return errorCode;
	}
	/**
	 * @param errorCode the errorCode to set
	 **/
	public void setErrorCode(String errorCode) {
		this.errorCode = errorCode;
	}
	/**
	 * @return the errorCodeNm
	 **/
	public String getErrorCodeNm() {
		return errorCodeNm;
	}
	/**
	 * @param errorCodeNm the errorCodeNm to set
	 **/
	public void setErrorCodeNm(String errorCodeNm) {
		this.errorCodeNm = errorCodeNm;
	}
	/**
	 * @return the errorSe
	 **/
	public String getErrorSe() {
		return errorSe;
	}
	/**
	 * @param errorSe the errorSe to set
	 **/
	public void setErrorSe(String errorSe) {
		this.errorSe = errorSe;
	}
	/**
	 * @return the insttCode
	 **/
	public String getInsttCode() {
		return insttCode;
	}
	/**
	 * @param insttCode the insttCode to set
	 **/
	public void setInsttCode(String insttCode) {
		this.insttCode = insttCode;
	}
	/**
	 * @return the insttCodeNm
	 **/
	public String getInsttCodeNm() {
		return insttCodeNm;
	}
	/**
	 * @param insttCodeNm the insttCodeNm to set
	 **/
	public void setInsttCodeNm(String insttCodeNm) {
		this.insttCodeNm = insttCodeNm;
	}
	/**
	 * @return the jobSeCode
	 **/
	public String getJobSeCode() {
		return jobSeCode;
	}
	/**
	 * @param jobSeCode the jobSeCode to set
	 **/
	public void setJobSeCode(String jobSeCode) {
		this.jobSeCode = jobSeCode;
	}
	/**
	 * @return the jobSeCodeNm
	 **/
	public String getJobSeCodeNm() {
		return jobSeCodeNm;
	}
	/**
	 * @param jobSeCodeNm the jobSeCodeNm to set
	 **/
	public void setJobSeCodeNm(String jobSeCodeNm) {
		this.jobSeCodeNm = jobSeCodeNm;
	}
	/**
	 * @return the methodNm
	 **/
	public String getMethodNm() {
		return methodNm;
	}
	/**
	 * @param methodNm the methodNm to set
	 **/
	public void setMethodNm(String methodNm) {
		this.methodNm = methodNm;
	}
	/**
	 * @return the occrrncDe
	 **/
	public String getOccrrncDe() {
		return occrrncDe;
	}
	/**
	 * @param occrrncDe the occrrncDe to set
	 **/
	public void setOccrrncDe(String occrrncDe) {
		this.occrrncDe = occrrncDe;
	}
	/**
	 * @return the processCo
	 **/
	public int getProcessCo() {
		return processCo;
	}
	/**
	 * @param processCo the processCo to set
	 **/
	public void setProcessCo(int processCo) {
		this.processCo = processCo;
	}
	/**
	 * @return the processSeCode
	 **/
	public String getProcessSeCode() {
		return processSeCode;
	}
	/**
	 * @param processSeCode the processSeCode to set
	 **/
	public void setProcessSeCode(String processSeCode) {
		this.processSeCode = processSeCode;
	}
	/**
	 * @return the processSeCodeNm
	 **/
	public String getProcessSeCodeNm() {
		return processSeCodeNm;
	}
	/**
	 * @param processSeCodeNm the processSeCodeNm to set
	 **/
	public void setProcessSeCodeNm(String processSeCodeNm) {
		this.processSeCodeNm = processSeCodeNm;
	}
	/**
	 * @return the processTime
	 **/
	public String getProcessTime() {
		return processTime;
	}
	/**
	 * @param processTime the processTime to set
	 **/
	public void setProcessTime(String processTime) {
		this.processTime = processTime;
	}
	/**
	 * @return the requstId
	 **/
	public String getRequstId() {
		return requstId;
	}
	/**
	 * @param requstId the requstId to set
	 **/
	public void setRequstId(String requstId) {
		this.requstId = requstId;
	}
	/**
	 * @return the rqesterId
	 **/
	public String getRqesterId() {
		return rqesterId;
	}
	/**
	 * @param rqesterId the rqesterId to set
	 **/
	public void setRqesterId(String rqesterId) {
		this.rqesterId = rqesterId;
	}
	/**
	 * @return the rqsterNm
	 **/
	public String getRqsterNm() {
		return rqsterNm;
	}
	/**
	 * @param rqsterNm the rqsterNm to set
	 **/
	public void setRqsterNm(String rqsterNm) {
		this.rqsterNm = rqsterNm;
	}
	/**
	 * @return the rqesterIp
	 **/
	public String getRqesterIp() {
		return rqesterIp;
	}
	/**
	 * @param rqesterIp the rqesterIp to set
	 **/
	public void setRqesterIp(String rqesterIp) {
		this.rqesterIp = rqesterIp;
	}
	/**
	 * @return the rspnsCode
	 **/
	public String getRspnsCode() {
		return rspnsCode;
	}
	/**
	 * @param rspnsCode the rspnsCode to set
	 **/
	public void setRspnsCode(String rspnsCode) {
		this.rspnsCode = rspnsCode;
	}
	/**
	 * @return the rspnsCodeNm
	 **/
	public String getRspnsCodeNm() {
		return rspnsCodeNm;
	}
	/**
	 * @param rspnsCodeNm the rspnsCodeNm to set
	 **/
	public void setRspnsCodeNm(String rspnsCodeNm) {
		this.rspnsCodeNm = rspnsCodeNm;
	}
	/**
	 * @return the srvcNm
	 **/
	public String getSrvcNm() {
		return srvcNm;
	}
	/**
	 * @param srvcNm the srvcNm to set
	 **/
	public void setSrvcNm(String srvcNm) {
		this.srvcNm = srvcNm;
	}
	/**
	 * @return the trgetMenuNm
	 **/
	public String getTrgetMenuNm() {
		return trgetMenuNm;
	}
	/**
	 * @param trgetMenuNm the trgetMenuNm to set
	 **/
	public void setTrgetMenuNm(String trgetMenuNm) {
		this.trgetMenuNm = trgetMenuNm;
	}

	/**
	 * @return the searchBgnDe
	 **/
	public String getSearchBgnDe() {
		return searchBgnDe;
	}
	/**
	 * @param searchBgnDe the searchBgnDe to set
	 **/
	public void setSearchBgnDe(String searchBgnDe) {
		this.searchBgnDe = searchBgnDe;
	}
	/**
	 * @return the searchCnd
	 **/
	public String getSearchCnd() {
		return searchCnd;
	}
	/**
	 * @param searchCnd the searchCnd to set
	 **/
	public void setSearchCnd(String searchCnd) {
		this.searchCnd = searchCnd;
	}
	/**
	 * @return the searchEndDe
	 **/
	public String getSearchEndDe() {
		return searchEndDe;
	}
	/**
	 * @param searchEndDe the searchEndDe to set
	 **/
	public void setSearchEndDe(String searchEndDe) {
		this.searchEndDe = searchEndDe;
	}
	/**
	 * @return the searchWrd
	 **/
	public String getSearchWrd() {
		return searchWrd;
	}
	/**
	 * @param searchWrd the searchWrd to set
	 **/
	public void setSearchWrd(String searchWrd) {
		this.searchWrd = searchWrd;
	}
	/**
	 * @return the sortOrdr
	 **/
	public String getSortOrdr() {
		return sortOrdr;
	}
	/**
	 * @param sortOrdr the sortOrdr to set
	 **/
	public void setSortOrdr(String sortOrdr) {
		this.sortOrdr = sortOrdr;
	}
	/**
	 * @return the searchUseYn
	 **/
	public String getSearchUseYn() {
		return searchUseYn;
	}
	/**
	 * @param searchUseYn the searchUseYn to set
	 **/
	public void setSearchUseYn(String searchUseYn) {
		this.searchUseYn = searchUseYn;
	}
	/**
	 * @return the pageIndex
	 **/
	public int getPageIndex() {
		return pageIndex;
	}
	/**
	 * @param pageIndex the pageIndex to set
	 **/
	public void setPageIndex(int pageIndex) {
		this.pageIndex = pageIndex;
	}
	/**
	 * @return the pageUnit
	 **/
	public int getPageUnit() {
		return pageUnit;
	}
	/**
	 * @param pageUnit the pageUnit to set
	 **/
	public void setPageUnit(int pageUnit) {
		this.pageUnit = pageUnit;
	}
	/**
	 * @return the pageSize
	 **/
	public int getPageSize() {
		return pageSize;
	}
	/**
	 * @param pageSize the pageSize to set
	 **/
	public void setPageSize(int pageSize) {
		this.pageSize = pageSize;
	}
	/**
	 * @return the firstIndex
	 **/
	public int getFirstIndex() {
		return firstIndex;
	}
	/**
	 * @param firstIndex the firstIndex to set
	 **/
	public void setFirstIndex(int firstIndex) {
		this.firstIndex = firstIndex;
	}
	/**
	 * @return the lastIndex
	 **/
	public int getLastIndex() {
		return lastIndex;
	}
	/**
	 * @param lastIndex the lastIndex to set
	 **/
	public void setLastIndex(int lastIndex) {
		this.lastIndex = lastIndex;
	}
	/**
	 * @return the recordCountPerPage
	 **/
	public int getRecordCountPerPage() {
		return recordCountPerPage;
	}
	/**
	 * @param recordCountPerPage the recordCountPerPage to set
	 **/
	public void setRecordCountPerPage(int recordCountPerPage) {
		this.recordCountPerPage = recordCountPerPage;
	}
	/**
	 * @return the rowNo
	 **/
	public int getRowNo() {
		return rowNo;
	}
	/**
	 * @param rowNo the rowNo to set
	 **/
	public void setRowNo(int rowNo) {
		this.rowNo = rowNo;
	}
	/**
	 *
	 **/
	@Override
	public String toString(){
		return ToStringBuilder.reflectionToString(this);
	}


}
