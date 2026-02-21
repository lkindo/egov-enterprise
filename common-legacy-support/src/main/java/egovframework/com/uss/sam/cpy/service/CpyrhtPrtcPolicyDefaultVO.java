package egovframework.com.uss.sam.cpy.service;

import java.io.Serializable;

/**
 *
 * ???????????? DefaultVO ?????
 * 
 * @author ???????? ??
 * @since 2009.04.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << ?????Modification Information) >>
 *
 *   ????         ????      ????
 *  -----------    --------    ---------------------------
 *   2009.04.01     ??      ????
 *
 * </pre>
 **/
public class CpyrhtPrtcPolicyDefaultVO implements Serializable {

	private static final long serialVersionUID = -1756683013057173109L;

	/** ???**/
    private String searchCondition = "";

    /** ??yword **/
    private String searchKeyword = "";

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

	/**
	 * searchCondition attribute ?????.
	 * 
	 * @return the String
	 **/
	public String getSearchCondition() {
		return searchCondition;
	}

	/**
	 * searchCondition attribute ???????.
	 * 
	 * @return searchCondition String
	 **/
	public void setSearchCondition(String searchCondition) {
		this.searchCondition = searchCondition;
	}

	/**
	 * searchKeyword attribute ?????.
	 * 
	 * @return the String
	 **/
	public String getSearchKeyword() {
		return searchKeyword;
	}

	/**
	 * searchKeyword attribute ???????.
	 * 
	 * @return searchKeyword String
	 **/
	public void setSearchKeyword(String searchKeyword) {
		this.searchKeyword = searchKeyword;
	}

	/**
	 * searchUseYn attribute ?????.
	 * 
	 * @return the String
	 **/
	public String getSearchUseYn() {
		return searchUseYn;
	}

	/**
	 * searchUseYn attribute ???????.
	 * 
	 * @return searchUseYn String
	 **/
	public void setSearchUseYn(String searchUseYn) {
		this.searchUseYn = searchUseYn;
	}

	/**
	 * pageIndex attribute ?????.
	 * 
	 * @return the int
	 **/
	public int getPageIndex() {
		return pageIndex;
	}

	/**
	 * pageIndex attribute ???????.
	 * 
	 * @return pageIndex int
	 **/
	public void setPageIndex(int pageIndex) {
		this.pageIndex = pageIndex;
	}

	/**
	 * pageUnit attribute ?????.
	 * 
	 * @return the int
	 **/
	public int getPageUnit() {
		return pageUnit;
	}

	/**
	 * pageUnit attribute ???????.
	 * 
	 * @return pageUnit int
	 **/
	public void setPageUnit(int pageUnit) {
		this.pageUnit = pageUnit;
	}

	/**
	 * pageSize attribute ?????.
	 * 
	 * @return the int
	 **/
	public int getPageSize() {
		return pageSize;
	}

	/**
	 * pageSize attribute ???????.
	 * 
	 * @return pageSize int
	 **/
	public void setPageSize(int pageSize) {
		this.pageSize = pageSize;
	}

	/**
	 * firstIndex attribute ?????.
	 * 
	 * @return the int
	 **/
	public int getFirstIndex() {
		return firstIndex;
	}

	/**
	 * firstIndex attribute ???????.
	 * 
	 * @return firstIndex int
	 **/
	public void setFirstIndex(int firstIndex) {
		this.firstIndex = firstIndex;
	}

	/**
	 * lastIndex attribute ?????.
	 * 
	 * @return the int
	 **/
	public int getLastIndex() {
		return lastIndex;
	}

	/**
	 * lastIndex attribute ???????.
	 * 
	 * @return lastIndex int
	 **/
	public void setLastIndex(int lastIndex) {
		this.lastIndex = lastIndex;
	}

	/**
	 * recordCountPerPage attribute ?????.
	 * 
	 * @return the int
	 **/
	public int getRecordCountPerPage() {
		return recordCountPerPage;
	}

	/**
	 * recordCountPerPage attribute ???????.
	 * 
	 * @return recordCountPerPage int
	 **/
	public void setRecordCountPerPage(int recordCountPerPage) {
		this.recordCountPerPage = recordCountPerPage;
	}


}
