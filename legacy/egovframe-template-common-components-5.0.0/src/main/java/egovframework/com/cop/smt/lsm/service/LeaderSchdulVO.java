package egovframework.com.cop.smt.lsm.service;

/**
 * 媛쒖슂
 * - 媛꾨??쇱젙?????Vo ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - 媛꾨??쇱젙??紐⑸줉 ??ぉ, 議고쉶議곌굔 ?깆쓣 愿由ы븳??
 * @author ?μ쿋??
 * @version 1.0
 * @created 28-6-2010 ?ㅼ쟾 10:59:06
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *   
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.6.28	?μ쿋??         理쒖큹 ?앹꽦
 *
 * </pre>
 */
@SuppressWarnings("serial")
public class LeaderSchdulVO extends LeaderSchdul {
	
	/** ?붾퀎/二쇰퀎/?쇰퀎 ?쇱젙議고쉶 議고쉶議곌굔 */
	private String searchMode;
	/** ??議고쉶議곌굔	 */
	private String searchMonth;
	/** ?쒖옉?쇱옄 議고쉶議곌굔 */
	private String searchBgnDe;
	/** 醫낅즺?쇱옄 議고쉶議곌굔	*/
	private String searchEndDe;
	/** ?쇱옄 議고쉶議곌굔 */
	private String searchDay;
	/** ??議고쉶議곌굔 */
	private String year;
	/** ??議고쉶議곌굔 */
	private String month;
	/** 二?議고쉶議곌굔 */
	private String week;
	/** ??議고쉶議곌굔 */
	private String day;
	/** 寃?됱“嫄?*/
	private String searchCondition;
	/** 寃?됰떒??*/
	private String searchKeyword;
	/** 蹂댁“寃?됰떒??*/
	private String searchKeywordEx;
	
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


	
}
