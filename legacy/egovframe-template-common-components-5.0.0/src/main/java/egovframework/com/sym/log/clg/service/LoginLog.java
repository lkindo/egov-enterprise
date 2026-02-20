package egovframework.com.sym.log.clg.service;

import java.io.Serializable;

/**
 * @Class Name : LoginLog.java
 * @Description : ?묒냽 濡쒓렇 愿由щ? ?꾪븳 VO ?대옒??
 * @Modification Information
 *
 *    ?섏젙??      ?섏젙??        ?섏젙?댁슜
 *    -------      -------     -------------------
 *    2009. 3. 11.  ?댁궪??     理쒖큹?앹꽦
 *    2011. 7. 01.  ?닿린??     ?⑦궎吏 遺꾨━(sym.log -> sym.log.clg)
 *    2011.09.14       ?쒖???     ?붾㈃??寃?됱씪?먮? ?쒖떆?섍린?꾪븳 硫ㅻ쾭蹂??異붽?.
 *
 * @author 怨듯넻 ?쒕퉬??媛쒕컻? ?댁궪??
 * @since 2009. 3. 11.
 * @version
 * @see
 *
 */
public class LoginLog implements Serializable {

	private static final long serialVersionUID = 3492444929272088373L;

	/** 濡쒓렇ID */
	private String logId;

	/** ?ъ슜?륤D */
	private String loginId;

	/** ?ъ슜?먮챸 */
	private String loginNm;

	/** ?묒냽IP */
	private String loginIp;

	/** 濡쒓렇?좏삎 */
	private String loginMthd;

	/** ?먮윭諛쒖깮?щ? */
	private String errOccrrAt;

	/** ?먮윭肄붾뱶 */
	private String errorCode;

	/** ?앹꽦?쇱떆 */
	private String creatDt;

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
	/**
	 * 寃?됱쥌猷뚯씪_?붾㈃??
	 */
	public String getSearchEndDeView() {
		return searchEndDeView;
	}
	public void setSearchEndDeView(String searchEndDeView) {
		this.searchEndDeView = searchEndDeView;
	}

	/**
	 * 寃?됱떆?묒씪_?붾㈃??
	 */
	public String getSearchBgnDeView() {
		return searchBgnDeView;
	}
	public void setSearchBgnDeView(String searchBgnDeView) {
		this.searchBgnDeView = searchBgnDeView;
	}

	/**
	 * 濡쒓렇 ID
	 */
	public String getLogId() {
		return logId;
	}
	public void setLogId(String logId) {
		this.logId = logId;
	}

	/**
	 * 濡쒓렇??ID
	 */
	public String getLoginId() {
		return loginId;
	}
	public void setLoginId(String loginId) {
		this.loginId = loginId;
	}

	/**
	 * 濡쒓렇??IP
	 */
	public String getLoginIp() {
		return loginIp;
	}
	public void setLoginIp(String loginIp) {
		this.loginIp = loginIp;
	}

	/**
	 * 濡쒓렇??諛⑹떇
	 */
	public String getLoginMthd() {
		return loginMthd;
	}
	public void setLoginMthd(String loginMthd) {
		this.loginMthd = loginMthd;
	}

	/**
	 * ?ㅻ쪟 諛쒖깮 ?щ?
	 */
	public String getErrOccrrAt() {
		return errOccrrAt;
	}
	public void setErrOccrrAt(String errOccrrAt) {
		this.errOccrrAt = errOccrrAt;
	}

	/**
	 * ?ㅻ쪟 肄붾뱶
	 */
	public String getErrorCode() {
		return errorCode;
	}
	public void setErrorCode(String errorCode) {
		this.errorCode = errorCode;
	}

	/**
	 * ?앹꽦 ?좎쭨
	 */
	public String getCreatDt() {
		return creatDt;
	}
	public void setCreatDt(String creatDt) {
		this.creatDt = creatDt;
	}

	/**
	 * 寃???쒖옉??
	 */
	public String getSearchBgnDe() {
		return searchBgnDe;
	}
	public void setSearchBgnDe(String searchBgnDe) {
		this.searchBgnDe = searchBgnDe;
	}

	/**
	 * 寃??議곌굔
	 */
	public String getSearchCnd() {
		return searchCnd;
	}
	public void setSearchCnd(String searchCnd) {
		this.searchCnd = searchCnd;
	}

	/**
	 * 寃??醫낅즺??
	 */
	public String getSearchEndDe() {
		return searchEndDe;
	}
	public void setSearchEndDe(String searchEndDe) {
		this.searchEndDe = searchEndDe;
	}

	/**
	 * 寃???⑥뼱
	 */
	public String getSearchWrd() {
		return searchWrd;
	}
	public void setSearchWrd(String searchWrd) {
		this.searchWrd = searchWrd;
	}

	/**
	 * ?뺣젹 ?쒖꽌
	 */
	public String getSortOrdr() {
		return sortOrdr;
	}
	public void setSortOrdr(String sortOrdr) {
		this.sortOrdr = sortOrdr;
	}

	/**
	 * 寃???ъ슜 ?щ?
	 */
	public String getSearchUseYn() {
		return searchUseYn;
	}
	public void setSearchUseYn(String searchUseYn) {
		this.searchUseYn = searchUseYn;
	}

	/**
	 * ?섏씠吏 ?몃뜳??
	 */
	public int getPageIndex() {
		return pageIndex;
	}
	public void setPageIndex(int pageIndex) {
		this.pageIndex = pageIndex;
	}

	/**
	 * ?섏씠吏 ?⑥쐞
	 */
	public int getPageUnit() {
		return pageUnit;
	}
	public void setPageUnit(int pageUnit) {
		this.pageUnit = pageUnit;
	}

	/**
	 * ?섏씠吏 ?ш린
	 */
	public int getPageSize() {
		return pageSize;
	}
	public void setPageSize(int pageSize) {
		this.pageSize = pageSize;
	}

	/**
	 * 泥ル쾲吏??몃뜳??
	 */
	public int getFirstIndex() {
		return firstIndex;
	}
	public void setFirstIndex(int firstIndex) {
		this.firstIndex = firstIndex;
	}

	/**
	 * 留덉?留??몃뜳??
	 */
	public int getLastIndex() {
		return lastIndex;
	}
	public void setLastIndex(int lastIndex) {
		this.lastIndex = lastIndex;
	}

	/**
	 * ?섏씠吏 ???덉퐫??媛쒖닔
	 */
	public int getRecordCountPerPage() {
		return recordCountPerPage;
	}
	public void setRecordCountPerPage(int recordCountPerPage) {
		this.recordCountPerPage = recordCountPerPage;
	}

	/**
	 * ??踰덊샇
	 */
	public int getRowNo() {
		return rowNo;
	}
	public void setRowNo(int rowNo) {
		this.rowNo = rowNo;
	}

	/**
	 * 濡쒓렇???대쫫
	 */
	public String getLoginNm() {
		return loginNm;
	}
	public void setLoginNm(String loginNm) {
		this.loginNm = loginNm;
	}

}
