package egovframework.com.sym.log.slg.service;

import org.apache.commons.lang3.builder.ToStringBuilder;


/**
 * @Class Name : SysHistoryVO.java
 * @Description : ???????????? ? ????
 * @Modification Information
 *
 *    ????      ????        ????
 *    -------        -------     -------------------
 *    2009. 3. 9.     ????
 *
 * @author ????????? ????
 * @since 2009. 3. 9.
 * @version
 * @see
 *
 **/
public class SysHistoryVO extends SysHistory {

	private static final long serialVersionUID = 3236791243469450106L;

	/**
	 * ??????
	 **/
	private String frstRegisterNm = "";

	/**
	 * ??????
	 **/
	private String lastUpdusrNm = "";

	/**
	 * ? ????
	 **/
	private String histSeCodeNm = "";

	/**
	 * ????ID
	 **/
	private String atchFileId = "";
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
	 * @return the frstRegisterNm
	 **/
	public String getFrstRegisterNm() {
		return frstRegisterNm;
	}

	/**
	 * @param frstRegisterNm the frstRegisterNm to set
	 **/
	public void setFrstRegisterNm(String frstRegisterNm) {
		this.frstRegisterNm = frstRegisterNm;
	}

	/**
	 * @return the lastUpdusrNm
	 **/
	public String getLastUpdusrNm() {
		return lastUpdusrNm;
	}

	/**
	 * @param lastUpdusrNm the lastUpdusrNm to set
	 **/
	public void setLastUpdusrNm(String lastUpdusrNm) {
		this.lastUpdusrNm = lastUpdusrNm;
	}

	/**
	 * @return the histSeCodeNm
	 **/
	public String getHistSeCodeNm() {
		return histSeCodeNm;
	}

	/**
	 * @param histSeCodeNm the histSeCodeNm to set
	 **/
	public void setHistSeCodeNm(String histSeCodeNm) {
		this.histSeCodeNm = histSeCodeNm;
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



	@Override
	public String getAtchFileId() {
		return atchFileId;
	}

	@Override
	public void setAtchFileId(String atchFileId) {
		this.atchFileId = atchFileId;
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
