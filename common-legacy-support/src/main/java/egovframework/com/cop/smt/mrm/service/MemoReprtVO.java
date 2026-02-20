package egovframework.com.cop.smt.mrm.service;

/**
 * ??
 * - ????????Vo ?????? ???.
 * 
 * ???
 * - ????????? ?? ? ????
 * 
 * @author ???
 * @version 1.0
 * @created 19-7-2010 ?? 10:14:53
 * 
 *          <pre>
 * << ?????Modification Information) >>
 *   
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2010.7.19	???         ????
 *
 *          </pre>
 **/
public class MemoReprtVO extends MemoReprt {

	private static final long serialVersionUID = 1L;

	/** ???**/
	private String searchCnd = "";

	/** ????**/
	private String searchWrd = "";

	/** ?????? **/
	private String searchId = "";

	/** ???? ?? **/
	private String searchBgnDe = "";

	/** ??? ?? **/
	private String searchEndDe = "";

	/** ????? ?? **/
	private String searchSttus = "";

	/** ????????? ?? **/
	private String searchDrctMatter = "";

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

	public String getSearchId() {
		return searchId;
	}

	public void setSearchId(String searchId) {
		this.searchId = searchId;
	}

	public String getSearchBgnDe() {
		return searchBgnDe;
	}

	public void setSearchBgnDe(String searchBgnDe) {
		this.searchBgnDe = searchBgnDe;
	}

	public String getSearchEndDe() {
		return searchEndDe;
	}

	public void setSearchEndDe(String searchEndDe) {
		this.searchEndDe = searchEndDe;
	}

	public String getSearchSttus() {
		return searchSttus;
	}

	public void setSearchSttus(String searchSttus) {
		this.searchSttus = searchSttus;
	}

	public String getSearchDrctMatter() {
		return searchDrctMatter;
	}

	public void setSearchDrctMatter(String searchDrctMatter) {
		this.searchDrctMatter = searchDrctMatter;
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
