package egovframework.com.utl.sys.prm.service;

/**
 * ??
 * - PROCESS????????Vo ?????? ???.
 *
 * ???
 * - PROCESS????????? ?? ? ????
 * @author ??
 * @version 1.0
 * @created 08-9-2010 ?? 3:54:47
 **/
public class ProcessMonVO extends ProcessMon {

	private static final long serialVersionUID = 1449367210024945087L;

	/** ???**/
    private String searchCondition = "";

    /** ??yword **/
    private String searchKeyword = "";

    /** ????**/
    private int pageUnit = 10;

	/** ??????**/
    private int pageSize = 10;

    /** ??? **/
    private int pageIndex = 1;

    /** firstIndex **/
    private int firstIndex = 1;

	/** lastIndex **/
    private int lastIndex = 1;

	/** recordCountPerPage **/
    private int recordCountPerPage = 10;

	/**
	 * @return the searchCondition
	 **/
	public String getSearchCondition() {
		return searchCondition;
	}

	/**
	 * @param searchCondition the searchCondition to set
	 **/
	public void setSearchCondition(String searchCondition) {
		this.searchCondition = searchCondition;
	}

	/**
	 * @return the searchKeyword
	 **/
	public String getSearchKeyword() {
		return searchKeyword;
	}

	/**
	 * @param searchKeyword the searchKeyword to set
	 **/
	public void setSearchKeyword(String searchKeyword) {
		this.searchKeyword = searchKeyword;
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
}
