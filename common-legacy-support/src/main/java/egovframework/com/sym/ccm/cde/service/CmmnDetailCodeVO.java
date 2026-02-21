package egovframework.com.sym.ccm.cde.service;

import egovframework.com.cmm.service.CmmnDetailCode;

/**
 *
 * ?????VO ?????
 * 
 * @author ???????? ????
 * @since 2009.04.01
 * @version 1.0
 * @see
 *
 *      <pre>
* << ?????Modification Information) >>
*
*   ????     ????          ????
*  -------    --------    ---------------------------
*   2009.04.01  ????         ????
 *
 *      </pre>
 **/

public class CmmnDetailCodeVO extends CmmnDetailCode {

	private static final long serialVersionUID = 9137280036724974467L;

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
	 * @return String
	 **/
	public String getSearchCondition() {
		return searchCondition;
	}

	/**
	 * searchCondition attribute ???????.
	 * 
	 * @param searchCondition String
	 **/
	public void setSearchCondition(String searchCondition) {
		this.searchCondition = searchCondition;
	}

	/**
	 * searchKeyword attribute ?????.
	 * 
	 * @return String
	 **/
	public String getSearchKeyword() {
		return searchKeyword;
	}

	/**
	 * searchKeyword attribute ???????.
	 * 
	 * @param searchKeyword String
	 **/
	public void setSearchKeyword(String searchKeyword) {
		this.searchKeyword = searchKeyword;
	}

	/**
	 * searchUseYn attribute ?????.
	 * 
	 * @return String
	 **/
	public String getSearchUseYn() {
		return searchUseYn;
	}

	/**
	 * searchUseYn attribute ???????.
	 * 
	 * @param searchUseYn String
	 **/
	public void setSearchUseYn(String searchUseYn) {
		this.searchUseYn = searchUseYn;
	}

	/**
	 * pageIndex attribute ?????.
	 * 
	 * @return int
	 **/
	public int getPageIndex() {
		return pageIndex;
	}

	/**
	 * pageIndex attribute ???????.
	 * 
	 * @param pageIndex int
	 **/
	public void setPageIndex(int pageIndex) {
		this.pageIndex = pageIndex;
	}

	/**
	 * pageUnit attribute ?????.
	 * 
	 * @return int
	 **/
	public int getPageUnit() {
		return pageUnit;
	}

	/**
	 * pageUnit attribute ???????.
	 * 
	 * @param pageUnit int
	 **/
	public void setPageUnit(int pageUnit) {
		this.pageUnit = pageUnit;
	}

	/**
	 * pageSize attribute ?????.
	 * 
	 * @return int
	 **/
	public int getPageSize() {
		return pageSize;
	}

	/**
	 * pageSize attribute ???????.
	 * 
	 * @param pageSize int
	 **/
	public void setPageSize(int pageSize) {
		this.pageSize = pageSize;
	}

	/**
	 * firstIndex attribute ?????.
	 * 
	 * @return int
	 **/
	public int getFirstIndex() {
		return firstIndex;
	}

	/**
	 * firstIndex attribute ???????.
	 * 
	 * @param firstIndex int
	 **/
	public void setFirstIndex(int firstIndex) {
		this.firstIndex = firstIndex;
	}

	/**
	 * lastIndex attribute ?????.
	 * 
	 * @return int
	 **/
	public int getLastIndex() {
		return lastIndex;
	}

	/**
	 * lastIndex attribute ???????.
	 * 
	 * @param lastIndex int
	 **/
	public void setLastIndex(int lastIndex) {
		this.lastIndex = lastIndex;
	}

	/**
	 * recordCountPerPage attribute ?????.
	 * 
	 * @return int
	 **/
	public int getRecordCountPerPage() {
		return recordCountPerPage;
	}

	/**
	 * recordCountPerPage attribute ???????.
	 * 
	 * @param recordCountPerPage int
	 **/
	public void setRecordCountPerPage(int recordCountPerPage) {
		this.recordCountPerPage = recordCountPerPage;
	}
}
