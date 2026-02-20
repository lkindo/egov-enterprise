package egovframework.com.uss.olh.wor.service;

import java.io.Serializable;

import org.apache.commons.lang3.builder.ToStringBuilder;

/**
 * @Class Name  : WordDicaryDefaultVO.java
 * @Description : WordDicaryDefaultVO class
 * @Modification Information
 * @
 * @  ?섏젙??        ?섏젙??                  ?섏젙?댁슜
 * @ -------    --------    ---------------------------
 * @ 2009.02.01     諛뺤젙洹?         理쒖큹 ?앹꽦
 *
 *  @author 怨듯넻?쒕퉬??媛쒕컻?  諛뺤젙洹?
 *  @since 2009.02.01
 *  @version 1.0
 *  @see
 *
 */
public class WordDicaryDefaultVO implements Serializable {

	private static final long serialVersionUID = 3772228415902548017L;

	/** 寃?됱“嫄?*/
	private String searchCnd = "";

	/** 寃?덷eyword */
	private String searchWrd = "";

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
	 * searchCnd attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getSearchCnd() {
		return searchCnd;
	}

	/**
	 * searchCnd attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return searchCnd String
	 */
	public void setSearchCnd(String searchCnd) {
		this.searchCnd = searchCnd;
	}

	/**
	 * searchWrd attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getSearchWrd() {
		return searchWrd;
	}

	/**
	 * searchWrd attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return searchWrd String
	 */
	public void setSearchWrd(String searchWrd) {
		this.searchWrd = searchWrd;
	}

	/**
	 * searchUseYn attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getSearchUseYn() {
		return searchUseYn;
	}

	/**
	 * searchUseYn attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return searchUseYn String
	 */
	public void setSearchUseYn(String searchUseYn) {
		this.searchUseYn = searchUseYn;
	}

	/**
	 * pageIndex attribute 瑜?由ы꽩?쒕떎.
	 * @return the int
	 */
	public int getPageIndex() {
		return pageIndex;
	}

	/**
	 * pageIndex attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return pageIndex int
	 */
	public void setPageIndex(int pageIndex) {
		this.pageIndex = pageIndex;
	}

	/**
	 * pageUnit attribute 瑜?由ы꽩?쒕떎.
	 * @return the int
	 */
	public int getPageUnit() {
		return pageUnit;
	}

	/**
	 * pageUnit attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return pageUnit int
	 */
	public void setPageUnit(int pageUnit) {
		this.pageUnit = pageUnit;
	}

	/**
	 * pageSize attribute 瑜?由ы꽩?쒕떎.
	 * @return the int
	 */
	public int getPageSize() {
		return pageSize;
	}

	/**
	 * pageSize attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return pageSize int
	 */
	public void setPageSize(int pageSize) {
		this.pageSize = pageSize;
	}

	/**
	 * firstIndex attribute 瑜?由ы꽩?쒕떎.
	 * @return the int
	 */
	public int getFirstIndex() {
		return firstIndex;
	}

	/**
	 * firstIndex attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return firstIndex int
	 */
	public void setFirstIndex(int firstIndex) {
		this.firstIndex = firstIndex;
	}

	/**
	 * lastIndex attribute 瑜?由ы꽩?쒕떎.
	 * @return the int
	 */
	public int getLastIndex() {
		return lastIndex;
	}

	/**
	 * lastIndex attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return lastIndex int
	 */
	public void setLastIndex(int lastIndex) {
		this.lastIndex = lastIndex;
	}

	/**
	 * recordCountPerPage attribute 瑜?由ы꽩?쒕떎.
	 * @return the int
	 */
	public int getRecordCountPerPage() {
		return recordCountPerPage;
	}

	/**
	 * recordCountPerPage attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return recordCountPerPage int
	 */
	public void setRecordCountPerPage(int recordCountPerPage) {
		this.recordCountPerPage = recordCountPerPage;
	}

	/**
	 * toString 硫붿냼?쒕? ?移섑븳??
	 */
	public String toString(){
		return ToStringBuilder.reflectionToString(this);
	}

}
