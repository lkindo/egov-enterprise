package egovframework.com.sym.log.clg.service;

import java.io.Serializable;

/**
 * @Class Name : LoginLog.java
 * @Description : ? ????? ? VO ?????
 * @Modification Information
 *
 *    ????      ????        ????
 *    -------      -------     -------------------
 *    2009. 3. 11.  ????     ???
 *    2011. 7. 01.  ????     ??? ???sym.log -> sym.log.clg)
 *    2011.09.14       ?????     ??????? ????? ??????.
 *
 * @author ????????? ????
 * @since 2009. 3. 11.
 * @version
 * @see
 *
 **/
public class LoginLog implements Serializable {

	private static final long serialVersionUID = 3492444929272088373L;

	/** ?D **/
	private String logId;

	/** ???? **/
	private String loginId;

	/** ????? **/
	private String loginNm;

	/** ?IP **/
	private String loginIp;

	/** ?? **/
	private String loginMthd;

	/** ????? **/
	private String errOccrrAt;

	/** ????**/
	private String errorCode;

	/** ???? **/
	private String creatDt;

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
	/**
	 * ????????
	 **/
	public String getSearchEndDeView() {
		return searchEndDeView;
	}
	public void setSearchEndDeView(String searchEndDeView) {
		this.searchEndDeView = searchEndDeView;
	}

	/**
	 * ???_???
	 **/
	public String getSearchBgnDeView() {
		return searchBgnDeView;
	}
	public void setSearchBgnDeView(String searchBgnDeView) {
		this.searchBgnDeView = searchBgnDeView;
	}

	/**
	 * ??ID
	 **/
	public String getLogId() {
		return logId;
	}
	public void setLogId(String logId) {
		this.logId = logId;
	}

	/**
	 * ???ID
	 **/
	public String getLoginId() {
		return loginId;
	}
	public void setLoginId(String loginId) {
		this.loginId = loginId;
	}

	/**
	 * ???IP
	 **/
	public String getLoginIp() {
		return loginIp;
	}
	public void setLoginIp(String loginIp) {
		this.loginIp = loginIp;
	}

	/**
	 * ?????
	 **/
	public String getLoginMthd() {
		return loginMthd;
	}
	public void setLoginMthd(String loginMthd) {
		this.loginMthd = loginMthd;
	}

	/**
	 * ?? ????
	 **/
	public String getErrOccrrAt() {
		return errOccrrAt;
	}
	public void setErrOccrrAt(String errOccrrAt) {
		this.errOccrrAt = errOccrrAt;
	}

	/**
	 * ?? ??
	 **/
	public String getErrorCode() {
		return errorCode;
	}
	public void setErrorCode(String errorCode) {
		this.errorCode = errorCode;
	}

	/**
	 * ?? ??
	 **/
	public String getCreatDt() {
		return creatDt;
	}
	public void setCreatDt(String creatDt) {
		this.creatDt = creatDt;
	}

	/**
	 * ??????
	 **/
	public String getSearchBgnDe() {
		return searchBgnDe;
	}
	public void setSearchBgnDe(String searchBgnDe) {
		this.searchBgnDe = searchBgnDe;
	}

	/**
	 * ???
	 **/
	public String getSearchCnd() {
		return searchCnd;
	}
	public void setSearchCnd(String searchCnd) {
		this.searchCnd = searchCnd;
	}

	/**
	 * ?????
	 **/
	public String getSearchEndDe() {
		return searchEndDe;
	}
	public void setSearchEndDe(String searchEndDe) {
		this.searchEndDe = searchEndDe;
	}

	/**
	 * ????
	 **/
	public String getSearchWrd() {
		return searchWrd;
	}
	public void setSearchWrd(String searchWrd) {
		this.searchWrd = searchWrd;
	}

	/**
	 * ? ??
	 **/
	public String getSortOrdr() {
		return sortOrdr;
	}
	public void setSortOrdr(String sortOrdr) {
		this.sortOrdr = sortOrdr;
	}

	/**
	 * ?????????
	 **/
	public String getSearchUseYn() {
		return searchUseYn;
	}
	public void setSearchUseYn(String searchUseYn) {
		this.searchUseYn = searchUseYn;
	}

	/**
	 * ?? ???
	 **/
	public int getPageIndex() {
		return pageIndex;
	}
	public void setPageIndex(int pageIndex) {
		this.pageIndex = pageIndex;
	}

	/**
	 * ?? ??
	 **/
	public int getPageUnit() {
		return pageUnit;
	}
	public void setPageUnit(int pageUnit) {
		this.pageUnit = pageUnit;
	}

	/**
	 * ?? ???
	 **/
	public int getPageSize() {
		return pageSize;
	}
	public void setPageSize(int pageSize) {
		this.pageSize = pageSize;
	}

	/**
	 * ????
	 **/
	public int getFirstIndex() {
		return firstIndex;
	}
	public void setFirstIndex(int firstIndex) {
		this.firstIndex = firstIndex;
	}

	/**
	 * ?????
	 **/
	public int getLastIndex() {
		return lastIndex;
	}
	public void setLastIndex(int lastIndex) {
		this.lastIndex = lastIndex;
	}

	/**
	 * ?? ????????
	 **/
	public int getRecordCountPerPage() {
		return recordCountPerPage;
	}
	public void setRecordCountPerPage(int recordCountPerPage) {
		this.recordCountPerPage = recordCountPerPage;
	}

	/**
	 * ????
	 **/
	public int getRowNo() {
		return rowNo;
	}
	public void setRowNo(int rowNo) {
		this.rowNo = rowNo;
	}

	/**
	 * ??????
	 **/
	public String getLoginNm() {
		return loginNm;
	}
	public void setLoginNm(String loginNm) {
		this.loginNm = loginNm;
	}

}
