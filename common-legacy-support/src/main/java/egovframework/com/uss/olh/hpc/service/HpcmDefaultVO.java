package egovframework.com.uss.olh.hpc.service;

import java.io.Serializable;

import org.apache.commons.lang3.builder.ToStringBuilder;

/**
 *
 * ??????? DefaultVO ?????
 * @author ???????? ??
 * @since 2009.04.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << ?????Modification Information) >>
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.04.01  ??         ????
 *   2016.08.02	?		???????.6 ?
 *
 * </pre>
 **/
public class HpcmDefaultVO implements Serializable {

	private static final long serialVersionUID = 4448507252972240186L;

	/** ???**/
    private String searchCnd = "";

    /** ??yword **/
    private String searchWrd = "";

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
	 * searchCnd attribute ?????.
	 * @return the String
	 **/
	public String getSearchCnd() {
		return searchCnd;
	}

	/**
	 * searchCnd attribute ???????.
	 * @return searchCnd String
	 **/
	public void setSearchCnd(String searchCnd) {
		this.searchCnd = searchCnd;
	}

	/**
	 * searchWrd attribute ?????.
	 * @return the String
	 **/
	public String getSearchWrd() {
		return searchWrd;
	}

	/**
	 * searchWrd attribute ???????.
	 * @return searchWrd String
	 **/
	public void setSearchWrd(String searchWrd) {
		this.searchWrd = searchWrd;
	}

	/**
	 * searchUseYn attribute ?????.
	 * @return the String
	 **/
	public String getSearchUseYn() {
		return searchUseYn;
	}

	/**
	 * searchUseYn attribute ???????.
	 * @return searchUseYn String
	 **/
	public void setSearchUseYn(String searchUseYn) {
		this.searchUseYn = searchUseYn;
	}

	/**
	 * pageIndex attribute ?????.
	 * @return the int
	 **/
	public int getPageIndex() {
		return pageIndex;
	}

	/**
	 * pageIndex attribute ???????.
	 * @return pageIndex int
	 **/
	public void setPageIndex(int pageIndex) {
		this.pageIndex = pageIndex;
	}

	/**
	 * pageUnit attribute ?????.
	 * @return the int
	 **/
	public int getPageUnit() {
		return pageUnit;
	}

	/**
	 * pageUnit attribute ???????.
	 * @return pageUnit int
	 **/
	public void setPageUnit(int pageUnit) {
		this.pageUnit = pageUnit;
	}

	/**
	 * pageSize attribute ?????.
	 * @return the int
	 **/
	public int getPageSize() {
		return pageSize;
	}

	/**
	 * pageSize attribute ???????.
	 * @return pageSize int
	 **/
	public void setPageSize(int pageSize) {
		this.pageSize = pageSize;
	}

	/**
	 * firstIndex attribute ?????.
	 * @return the int
	 **/
	public int getFirstIndex() {
		return firstIndex;
	}

	/**
	 * firstIndex attribute ???????.
	 * @return firstIndex int
	 **/
	public void setFirstIndex(int firstIndex) {
		this.firstIndex = firstIndex;
	}

	/**
	 * lastIndex attribute ?????.
	 * @return the int
	 **/
	public int getLastIndex() {
		return lastIndex;
	}

	/**
	 * lastIndex attribute ???????.
	 * @return lastIndex int
	 **/
	public void setLastIndex(int lastIndex) {
		this.lastIndex = lastIndex;
	}

	/**
	 * recordCountPerPage attribute ?????.
	 * @return the int
	 **/
	public int getRecordCountPerPage() {
		return recordCountPerPage;
	}

	/**
	 * recordCountPerPage attribute ???????.
	 * @return recordCountPerPage int
	 **/
	public void setRecordCountPerPage(int recordCountPerPage) {
		this.recordCountPerPage = recordCountPerPage;
	}

	/**
	 * toString ???? ????
	 **/
	public String toString(){
		return ToStringBuilder.reflectionToString(this);
	}

}
