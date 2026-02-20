package egovframework.com.uss.cmt.service;

import java.io.Serializable;

/**
 * 異쒗눜洹쇨?由?VO ?대옒??
 * @author ?쒖??꾨젅?꾩썙?ъ꽱??媛쒕컻?
 * @since 2014.12.20
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??         ?섏젙??      ?섏젙?댁슜
 *  -----------    --------    ---------------------------
 *   2014.12.20     媛쒕컻?       理쒖큹 ?앹꽦
 *
 * </pre>
 */
public class CmtDefaultVO implements Serializable {

	private static final long serialVersionUID = -2782974258506027986L;

	/** 寃?됱“嫄?*/
    private String searchCondition = "";

    /** 寃?덷eyword */
    private String searchKeyword = "";

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


	/**
	 * searchCondition attribute 媛믪쓣  由ы꽩?쒕떎.
	 * 
	 * @return String
	 */
	public String getSearchCondition() {
		return searchCondition;
	}

	/**
	 * searchCondition attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @param searchCondition String
	 */
	public void setSearchCondition(String searchCondition) {
		this.searchCondition = searchCondition;
	}

	/**
	 * searchKeyword attribute 媛믪쓣  由ы꽩?쒕떎.
	 * 
	 * @return String
	 */
	public String getSearchKeyword() {
		return searchKeyword;
	}

	/**
	 * searchKeyword attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @param searchKeyword String
	 */
	public void setSearchKeyword(String searchKeyword) {
		this.searchKeyword = searchKeyword;
	}

	/**
	 * searchUseYn attribute 媛믪쓣  由ы꽩?쒕떎.
	 * 
	 * @return String
	 */
	public String getSearchUseYn() {
		return searchUseYn;
	}

	/**
	 * searchUseYn attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @param searchUseYn String
	 */
	public void setSearchUseYn(String searchUseYn) {
		this.searchUseYn = searchUseYn;
	}

	/**
	 * pageIndex attribute 媛믪쓣  由ы꽩?쒕떎.
	 * 
	 * @return int
	 */
	public int getPageIndex() {
		return pageIndex;
	}

	/**
	 * pageIndex attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @param pageIndex int
	 */
	public void setPageIndex(int pageIndex) {
		this.pageIndex = pageIndex;
	}

	/**
	 * pageUnit attribute 媛믪쓣  由ы꽩?쒕떎.
	 * 
	 * @return int
	 */
	public int getPageUnit() {
		return pageUnit;
	}

	/**
	 * pageUnit attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @param pageUnit int
	 */
	public void setPageUnit(int pageUnit) {
		this.pageUnit = pageUnit;
	}

	/**
	 * pageSize attribute 媛믪쓣  由ы꽩?쒕떎.
	 * 
	 * @return int
	 */
	public int getPageSize() {
		return pageSize;
	}

	/**
	 * pageSize attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @param pageSize int
	 */
	public void setPageSize(int pageSize) {
		this.pageSize = pageSize;
	}

	/**
	 * firstIndex attribute 媛믪쓣  由ы꽩?쒕떎.
	 * 
	 * @return int
	 */
	public int getFirstIndex() {
		return firstIndex;
	}

	/**
	 * firstIndex attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @param firstIndex int
	 */
	public void setFirstIndex(int firstIndex) {
		this.firstIndex = firstIndex;
	}

	/**
	 * lastIndex attribute 媛믪쓣  由ы꽩?쒕떎.
	 * 
	 * @return int
	 */
	public int getLastIndex() {
		return lastIndex;
	}

	/**
	 * lastIndex attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @param lastIndex int
	 */
	public void setLastIndex(int lastIndex) {
		this.lastIndex = lastIndex;
	}

	/**
	 * recordCountPerPage attribute 媛믪쓣  由ы꽩?쒕떎.
	 * 
	 * @return int
	 */
	public int getRecordCountPerPage() {
		return recordCountPerPage;
	}

	/**
	 * recordCountPerPage attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * 
	 * @param recordCountPerPage int
	 */
	public void setRecordCountPerPage(int recordCountPerPage) {
		this.recordCountPerPage = recordCountPerPage;
	}



}
