package egovframework.com.cop.smt.djm.service;

/**
 * ??
 * - ?????????Vo ?????? ???.
 * 
 * ???
 * - ??????????? ?? ? ????
 * 
 * @author ???
 * @version 1.0
 * @created 28-6-2010 ?? 10:59:05
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
public class DeptJobVO extends DeptJob {

	private static final long serialVersionUID = 1L;

	/** ???**/
	private String searchCnd = "";

	/** ????**/
	private String searchWrd = "";

	/** ????? **/
	private String searchDeptId = "";

	/** ????D?? **/
	private String searchDeptJobBxId = "";

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

	public String getSearchDeptId() {
		return searchDeptId;
	}

	public void setSearchDeptId(String searchDeptId) {
		this.searchDeptId = searchDeptId;
	}

	public String getSearchDeptJobBxId() {
		return searchDeptJobBxId;
	}

	public void setSearchDeptJobBxId(String searchDeptJobBxId) {
		this.searchDeptJobBxId = searchDeptJobBxId;
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

}
