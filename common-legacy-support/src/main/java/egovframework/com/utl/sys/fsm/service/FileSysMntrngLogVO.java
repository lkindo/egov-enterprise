package egovframework.com.utl.sys.fsm.service;

/**
 * ??
 * - ????????? ???????Vo ?????? ???.
 *
 * ???
 * - ????????? ???????? ?? ? ????
 * 
 * @author ???
 * @version 1.0
 * @created 28-6-2010 ?? 11:33:26
 **/
public class FileSysMntrngLogVO extends FileSysMntrngLog {

	private static final long serialVersionUID = 1L;

	/** ???**/
	private String searchCnd = "";

	/** ????**/
	private String searchWrd = "";

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
	 * ?????
	 **/
	public String getSearchCnd() {
		return searchCnd;
	}

	/**
	 * ?????
	 **/
	public void setSearchCnd(String searchCnd) {
		this.searchCnd = searchCnd;
	}

	/**
	 * ?? ??
	 **/
	public String getSearchWrd() {
		return searchWrd;
	}

	/**
	 * ?? ??
	 **/
	public void setSearchWrd(String searchWrd) {
		this.searchWrd = searchWrd;
	}

	/**
	 * ????????
	 **/
	public String getSearchBgnDe() {
		return searchBgnDe;
	}

	/**
	 * ????????
	 **/
	public void setSearchBgnDe(String searchBgnDe) {
		this.searchBgnDe = searchBgnDe;
	}

	/**
	 * ???? ?? ??
	 **/
	public String getSearchBgnHour() {
		return searchBgnHour;
	}

	/**
	 * ???? ?? ??
	 **/
	public void setSearchBgnHour(String searchBgnHour) {
		this.searchBgnHour = searchBgnHour;
	}

	/**
	 * ???? ?? ??
	 **/
	public String getSearchBgnDt() {
		return searchBgnDt;
	}

	/**
	 * ???? ?? ??
	 **/
	public void setSearchBgnDt(String searchBgnDt) {
		this.searchBgnDt = searchBgnDt;
	}

	/**
	 * ???????
	 **/
	public String getSearchEndDe() {
		return searchEndDe;
	}

	/**
	 * ???????
	 **/
	public void setSearchEndDe(String searchEndDe) {
		this.searchEndDe = searchEndDe;
	}

	/**
	 * ?????? ??
	 **/
	public String getSearchEndHour() {
		return searchEndHour;
	}

	/**
	 * ?????? ??
	 **/
	public void setSearchEndHour(String searchEndHour) {
		this.searchEndHour = searchEndHour;
	}

	/**
	 * ?????? ??
	 **/
	public String getSearchEndDt() {
		return searchEndDt;
	}

	/**
	 * ?????? ??
	 **/
	public void setSearchEndDt(String searchEndDt) {
		this.searchEndDt = searchEndDt;
	}

	/**
	 * ?? ?????
	 **/
	public int getPageIndex() {
		return pageIndex;
	}

	/**
	 * ?? ?????
	 **/
	public void setPageIndex(int pageIndex) {
		this.pageIndex = pageIndex;
	}

	/**
	 * ?? ?? ??
	 **/
	public int getPageUnit() {
		return pageUnit;
	}

	/**
	 * ?? ?? ??
	 **/
	public void setPageUnit(int pageUnit) {
		this.pageUnit = pageUnit;
	}

	/**
	 * ?? ?????
	 **/
	public int getPageSize() {
		return pageSize;
	}

	/**
	 * ?? ?????
	 **/
	public void setPageSize(int pageSize) {
		this.pageSize = pageSize;
	}

	/**
	 * ??? ?????
	 **/
	public int getFirstIndex() {
		return firstIndex;
	}

	/**
	 * ??? ?????
	 **/
	public void setFirstIndex(int firstIndex) {
		this.firstIndex = firstIndex;
	}

	/**
	 * ???? ?????
	 **/
	public int getLastIndex() {
		return lastIndex;
	}

	/**
	 * ???? ?????
	 **/
	public void setLastIndex(int lastIndex) {
		this.lastIndex = lastIndex;
	}

	/**
	 * ????????????
	 **/
	public int getRecordCountPerPage() {
		return recordCountPerPage;
	}

	/**
	 * ????????????
	 **/
	public void setRecordCountPerPage(int recordCountPerPage) {
		this.recordCountPerPage = recordCountPerPage;
	}

}
