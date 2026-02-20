package egovframework.com.utl.sys.prm.service;

/**
 * ??
 * - PROCESS?? ???????Vo ?????? ???.
 *
 * ???
 * - PROCESS????????? ?? ? ????
 * @author ??
 * @version 1.0
 * @created 08-9-2010 ?? 3:54:47
 **/

public class ProcessMonLogVO extends ProcessMonLog {

	private static final long serialVersionUID = -7374180958172370475L;

	/** ???**/
    private String searchCondition = "";

    /** ??yword **/
    private String searchKeyword = "";

    /** ???? ?? **/
    private String searchBgnDe = "";

    /** ???? ?? **/
    private String searchBgnHour = "";

    /** ???? ?? **/
    private String searchBgnDt = "";

    /** ??? ?? **/
    private String searchEndDe = "";

    /** ??? ?? **/
    private String searchEndHour = "";

    /** ??? ?? **/
    private String searchEndDt = "";

    /** ??? **/
    private int pageIndex = 1;

    /** ????**/
    private int pageUnit = 10;

    /** ??????**/
    private int pageSize = 10;

    /** ???? ???**/
    private int firstIndex = 1;

    /** ????? ???**/
    private int lastIndex = 1;

    /** ??????????**/
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
	 * @return the searchBgnHour
	 **/
	public String getSearchBgnHour() {
		return searchBgnHour;
	}

	/**
	 * @param searchBgnHour the searchBgnHour to set
	 **/
	public void setSearchBgnHour(String searchBgnHour) {
		this.searchBgnHour = searchBgnHour;
	}

	/**
	 * @return the searchBgnDt
	 **/
	public String getSearchBgnDt() {
		return searchBgnDt;
	}

	/**
	 * @param searchBgnDt the searchBgnDt to set
	 **/
	public void setSearchBgnDt(String searchBgnDt) {
		this.searchBgnDt = searchBgnDt;
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
	 * @return the searchEndHour
	 **/
	public String getSearchEndHour() {
		return searchEndHour;
	}

	/**
	 * @param searchEndHour the searchEndHour to set
	 **/
	public void setSearchEndHour(String searchEndHour) {
		this.searchEndHour = searchEndHour;
	}

	/**
	 * @return the searchEndDt
	 **/
	public String getSearchEndDt() {
		return searchEndDt;
	}

	/**
	 * @param searchEndDt the searchEndDt to set
	 **/
	public void setSearchEndDt(String searchEndDt) {
		this.searchEndDt = searchEndDt;
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

}
