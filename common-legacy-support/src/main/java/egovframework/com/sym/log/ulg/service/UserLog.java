package egovframework.com.sym.log.ulg.service;

import java.io.Serializable;

import org.apache.commons.lang3.builder.ToStringBuilder;

/**
 * @Class Name : UserLog.java
 * @Description : ?????????? ? VO ?????
 * @Modification Information
 *
 *    ????         ????        ????
 *    -------         -------     -------------------
 *    2009. 3. 11.    ????       ???
 *    2011. 7. 01.    ????       ??? ???sym.log -> sym.log.ulg)
 *    2011.09.14       ?????     ??????? ????? ??????.
 * @author ????????? ????
 * @since 2009. 3. 11.
 * @version
 * @see
 *
 **/
public class UserLog implements Serializable {

	private static final long serialVersionUID = -3030641254553776910L;
	/**
	 * ??
	 **/
	private String occrrncDe = "";
	/**
	 * ??????
	 **/
	private String rqesterId = "";
	/**
	 * ??????
	 **/
	private String rqsterNm = "";
	/**
	 * ??
	 **/
	private String methodNm = "";
	/**
	 * ????
	 **/
	private String srvcNm = "";
	/**
	 * ????
	 **/
	private String creatCo = "";
	/**
	 * ????
	 **/
	private String updtCo = "";
	/**
	 * ???
	 **/
	private String rdCnt = "";
	/**
	 * ?????
	 **/
	private String deleteCo = "";
	/**
	 * ????
	 **/
	private String outptCo = "";
	/**
	 * ????
	 **/
	private String errorCo = "";
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

	@Override
	public String toString(){
		return ToStringBuilder.reflectionToString(this);
	}

	public String getOccrrncDe() {
		return occrrncDe;
	}

	public void setOccrrncDe(String occrrncDe) {
		this.occrrncDe = occrrncDe;
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

	public String getMethodNm() {
		return methodNm;
	}

	public void setMethodNm(String methodNm) {
		this.methodNm = methodNm;
	}

	public String getSrvcNm() {
		return srvcNm;
	}

	public void setSrvcNm(String srvcNm) {
		this.srvcNm = srvcNm;
	}

	public String getCreatCo() {
		return creatCo;
	}

	public void setCreatCo(String creatCo) {
		this.creatCo = creatCo;
	}

	public String getUpdtCo() {
		return updtCo;
	}

	public void setUpdtCo(String updtCo) {
		this.updtCo = updtCo;
	}

	public String getRdCnt() {
		return rdCnt;
	}

	public void setRdCnt(String rdCnt) {
		this.rdCnt = rdCnt;
	}

	public String getDeleteCo() {
		return deleteCo;
	}

	public void setDeleteCo(String deleteCo) {
		this.deleteCo = deleteCo;
	}

	public String getOutptCo() {
		return outptCo;
	}

	public void setOutptCo(String outptCo) {
		this.outptCo = outptCo;
	}

	public String getErrorCo() {
		return errorCo;
	}

	public void setErrorCo(String errorCo) {
		this.errorCo = errorCo;
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
