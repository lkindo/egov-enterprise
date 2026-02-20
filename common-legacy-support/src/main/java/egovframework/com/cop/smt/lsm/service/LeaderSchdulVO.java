package egovframework.com.cop.smt.lsm.service;

/**
 * ??
 * - ?????????Vo ?????? ???.
 * 
 * ???
 * - ?????????? ?? ? ????
 * 
 * @author ???
 * @version 1.0
 * @created 28-6-2010 ?? 10:59:06
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
public class LeaderSchdulVO extends LeaderSchdul {

	private static final long serialVersionUID = 1L;

	/** ????????????? **/
	private String searchMode;
	/** ???? **/
	private String searchMonth;
	/** ???? ?? **/
	private String searchBgnDe;
	/** ??? ?? **/
	private String searchEndDe;
	/** ?? ?? **/
	private String searchDay;
	/** ???? **/
	private String year;
	/** ???? **/
	private String month;
	/** ??? **/
	private String week;
	/** ???? **/
	private String day;
	/** ???**/
	private String searchCondition;
	/** ????**/
	private String searchKeyword;
	/** ??????**/
	private String searchKeywordEx;

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

	/** ??????**/
	private int rowNo = 0;

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

	public int getRowNo() {
		return rowNo;
	}

	public void setRowNo(int rowNo) {
		this.rowNo = rowNo;
	}

	public String getSearchMode() {
		return searchMode;
	}

	public void setSearchMode(String searchMode) {
		this.searchMode = searchMode;
	}

	public String getSearchMonth() {
		return searchMonth;
	}

	public void setSearchMonth(String searchMonth) {
		this.searchMonth = searchMonth;
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

	public String getSearchDay() {
		return searchDay;
	}

	public void setSearchDay(String searchDay) {
		this.searchDay = searchDay;
	}

	public String getYear() {
		return year;
	}

	public void setYear(String year) {
		this.year = year;
	}

	public String getMonth() {
		return month;
	}

	public void setMonth(String month) {
		this.month = month;
	}

	public String getWeek() {
		return week;
	}

	public void setWeek(String week) {
		this.week = week;
	}

	public String getDay() {
		return day;
	}

	public void setDay(String day) {
		this.day = day;
	}

	public String getSearchCondition() {
		return searchCondition;
	}

	public void setSearchCondition(String searchCondition) {
		this.searchCondition = searchCondition;
	}

	public String getSearchKeyword() {
		return searchKeyword;
	}

	public void setSearchKeyword(String searchKeyword) {
		this.searchKeyword = searchKeyword;
	}

	public String getSearchKeywordEx() {
		return searchKeywordEx;
	}

	public void setSearchKeywordEx(String searchKeywordEx) {
		this.searchKeywordEx = searchKeywordEx;
	}

	public String getSearchWrd() {
		return searchKeyword;
	}

}
