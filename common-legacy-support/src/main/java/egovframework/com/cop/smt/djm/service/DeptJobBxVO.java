package egovframework.com.cop.smt.djm.service;

/**
 * ??
 * - ??????????Vo ?????? ???.
 * 
 * ???
 * - ??????????? ?? ? ????
 * 
 * @author ???
 * @version 1.0
 * @created 28-6-2010 ?? 10:59:04
 * 
 *          <pre>
 * << ?????Modification Information) >>
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2010.6.28	???         ????
 *
 *          </pre>
 **/
public class DeptJobBxVO extends DeptJobBx {

	private static final long serialVersionUID = 1L;

	/** ???**/
	private String searchCnd = "";

	/** ????**/
	private String searchWrd = "";

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

	/** ???? ??**/
	private String ordrCnd = "";

	/** ?? ?**/
	private String popupCnd = "";

	public String getSearchCnd() {
		return searchCnd;
	}

	public void setSearchCnd(String searchCnd) {
		this.searchCnd = searchCnd;
	}

	public String getSearchWrd() {
		return searchWrd;
	}

	public void setSearchWrd(String searchWrd) {
		this.searchWrd = searchWrd;
	}

	public int getPageIndex() {
		return pageIndex;
	}

	public void setPageIndex(int pageIndex) {
		this.pageIndex = pageIndex;
	}

	public int getPageUnit() {
		return pageUnit;
	}

	public void setPageUnit(int pageUnit) {
		this.pageUnit = pageUnit;
	}

	public int getPageSize() {
		return pageSize;
	}

	public void setPageSize(int pageSize) {
		this.pageSize = pageSize;
	}

	public int getFirstIndex() {
		return firstIndex;
	}

	public void setFirstIndex(int firstIndex) {
		this.firstIndex = firstIndex;
	}

	public int getLastIndex() {
		return lastIndex;
	}

	public void setLastIndex(int lastIndex) {
		this.lastIndex = lastIndex;
	}

	public int getRecordCountPerPage() {
		return recordCountPerPage;
	}

	public void setRecordCountPerPage(int recordCountPerPage) {
		this.recordCountPerPage = recordCountPerPage;
	}

	public String getOrdrCnd() {
		return ordrCnd;
	}

	public void setOrdrCnd(String ordrCnd) {
		this.ordrCnd = ordrCnd;
	}

	public String getPopupCnd() {
		return popupCnd;
	}

	public void setPopupCnd(String popupCnd) {
		this.popupCnd = popupCnd;
	}

}
