package egovframework.com.uss.ion.evt.service;

import java.io.Serializable;
import java.util.List;

/**
 * 媛쒖슂
 * - ?됱궗愿由ъ뿉 ???Vo ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?됱궗愿由ъ쓽 紐⑸줉 ??ぉ??愿由ы븳??
 * @author ?댁슜
 * @version 1.0
 * @created 06-15-2010 ?ㅽ썑 2:08:56
 */


public class EventManageVO extends EventManage implements Serializable {

	/**
	 * serialVersionUID
	 */
	private static final long serialVersionUID = 1L;
	/**
	 * 諛곕꼫 紐⑸줉
	 */
	List<EventManageVO> eventManageList;

	/**
	*  ?좎껌?륤D
	*/
	private String applcntId;

	/**
	*  ?좎껌?쇱옄
	*/
	private String reqstDe;

	/**
	*  寃곗옱?륤D
	*/
	private String sanctnerId;

	/**
	*  ?뱀씤?щ?
	*/
	private String confmAt;

	/**
	*  寃곗옱?쇱떆
	*/
	private String sanctnDt;

	/**
	*  諛섎젮?ъ쑀
	*/
	private String returnResn;

	/**
	*  ?쎌떇寃곗옱ID
	*/
	private String infrmlSanctnId;

	/**
	*  eventTemp1
	*/
	private String eventTemp1;

	/**
	*  eventTemp1
	*/
	private String eventTemp2;
	/**
	*  eventTemp1
	*/

	private String eventTemp3;

	/**
	*  eventTemp4
	*/
	private String eventTemp4;

	/**
	*  eventTemp5
	*/
	private String eventTemp5;

	/**
	*  eventTemp6
	*/
	private String eventTemp6;

	/**
	*  eventTemp7
	*/
	private String eventTemp7;

	/**
	*  寃곗옱?먮챸
	*/
	private String sanctnerNm;

	/**
	*  ?좎껌?먮챸
	*/
	private String applcntNm;

	/**
	*  ?됱궗援щ텇紐?
	*/
	private String eventSeNm;

	/**
	*  寃???곕룄
	*/
	private String searchYear;

	/**
	*  寃????
	*/
	private String searchMonth;

	/**
	*  寃??紐?
	*/
	private String searchNm;

	/**
	*  寃??援щ텇紐?
	*/
	private String searchSe;

	/**
	*  泥댄겕 ?됱궗?묒닔湲곌컙 ?쇱닔
	*/
	private int eventDayCount;

	/**
	*  泥댄겕 ?됱궗李몄뿬?몄썝
	*/
	private int eventAtdrnCount;

	/**
	*  searchToDateView
	*/
	private String searchToDateView;

	/**
	*  searchFromDateView
	*/
	private String searchFromDateView;

	/**
	*  寃???뱀씤?щ?
	*/
	private String searchConfmAt;

	/**
	 * @return the searchConfmAt
	 */
	public String getSearchConfmAt() {
		return searchConfmAt;
	}
	/**
	 * @param searchConfmAt the searchConfmAt to set
	 */
	public void setSearchConfmAt(String searchConfmAt) {
		this.searchConfmAt = searchConfmAt;
	}
	/**
	 * @return the searchToDateView
	 */
	public String getSearchToDateView() {
		return searchToDateView;
	}
	/**
	 * @param searchToDateView the searchToDateView to set
	 */
	public void setSearchToDateView(String searchToDateView) {
		this.searchToDateView = searchToDateView;
	}
	/**
	 * @return the searchFromDateView
	 */
	public String getSearchFromDateView() {
		return searchFromDateView;
	}
	/**
	 * @param searchFromDateView the searchFromDateView to set
	 */
	public void setSearchFromDateView(String searchFromDateView) {
		this.searchFromDateView = searchFromDateView;
	}

	/**
	 * @return the searchNm
	 */
	public String getSearchNm() {
		return searchNm;
	}

	/**
	 * @param searchNm the searchNm to set
	 */
	public void setSearchNm(String searchNm) {
		this.searchNm = searchNm;
	}

	/**
	 * @return the searchSe
	 */
	public String getSearchSe() {
		return searchSe;
	}

	/**
	 * @param searchSe the searchSe to set
	 */
	public void setSearchSe(String searchSe) {
		this.searchSe = searchSe;
	}

	/**
	 * @return the searchYear
	 */
	public String getSearchYear() {
		return searchYear;
	}

	/**
	 * @param searchYear the searchYear to set
	 */
	public void setSearchYear(String searchYear) {
		this.searchYear = searchYear;
	}

	/**
	 * @return the searchMonth
	 */
	public String getSearchMonth() {
		return searchMonth;
	}

	/**
	 * @param searchMonth the searchMonth to set
	 */
	public void setSearchMonth(String searchMonth) {
		this.searchMonth = searchMonth;
	}

	/**
	 * @return the applcntNm
	 */
	public String getApplcntNm() {
		return applcntNm;
	}

	/**
	 * @param applcntNm the applcntNm to set
	 */
	public void setApplcntNm(String applcntNm) {
		this.applcntNm = applcntNm;
	}

	/**
	 * @return the eventSeNm
	 */
	public String getEventSeNm() {
		return eventSeNm;
	}

	/**
	 * @param eventSeNm the eventSeNm to set
	 */
	public void setEventSeNm(String eventSeNm) {
		this.eventSeNm = eventSeNm;
	}

	/**
	 * @return the sanctnerNm
	 */
	public String getSanctnerNm() {
		return sanctnerNm;
	}

	/**
	 * @param sanctnerNm the sanctnerNm to set
	 */
	public void setSanctnerNm(String sanctnerNm) {
		this.sanctnerNm = sanctnerNm;
	}

	/**
	 * @return the eventTemp1
	 */
	public String getEventTemp1() {
		return eventTemp1;
	}

	/**
	 * @param eventTemp1 the eventTemp1 to set
	 */
	public void setEventTemp1(String eventTemp1) {
		this.eventTemp1 = eventTemp1;
	}

	/**
	 * @return the eventTemp2
	 */
	public String getEventTemp2() {
		return eventTemp2;
	}

	/**
	 * @param eventTemp2 the eventTemp2 to set
	 */
	public void setEventTemp2(String eventTemp2) {
		this.eventTemp2 = eventTemp2;
	}

	/**
	 * @return the eventTemp3
	 */
	public String getEventTemp3() {
		return eventTemp3;
	}

	/**
	 * @param eventTemp3 the eventTemp3 to set
	 */
	public void setEventTemp3(String eventTemp3) {
		this.eventTemp3 = eventTemp3;
	}

	/**
	 * @return the eventTemp4
	 */
	public String getEventTemp4() {
		return eventTemp4;
	}

	/**
	 * @param eventTemp4 the eventTemp4 to set
	 */
	public void setEventTemp4(String eventTemp4) {
		this.eventTemp4 = eventTemp4;
	}

	/**
	 * @return the eventTemp5
	 */
	public String getEventTemp5() {
		return eventTemp5;
	}

	/**
	 * @param eventTemp5 the eventTemp5 to set
	 */
	public void setEventTemp5(String eventTemp5) {
		this.eventTemp5 = eventTemp5;
	}

	/**
	 * @return the eventTemp6
	 */
	public String getEventTemp6() {
		return eventTemp6;
	}

	/**
	 * @param eventTemp6 the eventTemp6 to set
	 */
	public void setEventTemp6(String eventTemp6) {
		this.eventTemp6 = eventTemp6;
	}

	/**
	 * @return the eventTemp7
	 */
	public String getEventTemp7() {
		return eventTemp7;
	}

	/**
	 * @param eventTemp7 the eventTemp7 to set
	 */
	public void setEventTemp7(String eventTemp7) {
		this.eventTemp7 = eventTemp7;
	}

	/**
	 * @return the applcntId
	 */
	public String getApplcntId() {
		return applcntId;
	}

	/**
	 * @param applcntId the applcntId to set
	 */
	public void setApplcntId(String applcntId) {
		this.applcntId = applcntId;
	}

	/**
	 * @return the reqstDe
	 */
	public String getReqstDe() {
		return reqstDe;
	}

	/**
	 * @param reqstDe the reqstDe to set
	 */
	public void setReqstDe(String reqstDe) {
		this.reqstDe = reqstDe;
	}

	/**
	 * @return the sanctnerId
	 */
	public String getSanctnerId() {
		return sanctnerId;
	}

	/**
	 * @param sanctnerId the sanctnerId to set
	 */
	public void setSanctnerId(String sanctnerId) {
		this.sanctnerId = sanctnerId;
	}

	/**
	 * @return the confmAt
	 */
	public String getConfmAt() {
		return confmAt;
	}

	/**
	 * @param confmAt the confmAt to set
	 */
	public void setConfmAt(String confmAt) {
		this.confmAt = confmAt;
	}

	/**
	 * @return the sanctnDt
	 */
	public String getSanctnDt() {
		return sanctnDt;
	}

	/**
	 * @param sanctnDt the sanctnDt to set
	 */
	public void setSanctnDt(String sanctnDt) {
		this.sanctnDt = sanctnDt;
	}

	/**
	 * @return the returnResn
	 */
	public String getReturnResn() {
		return returnResn;
	}

	/**
	 * @param returnResn the returnResn to set
	 */
	public void setReturnResn(String returnResn) {
		this.returnResn = returnResn;
	}

	/**
	 * @return the eventManageList
	 */
	public List<EventManageVO> getEventManageList() {
		return eventManageList;
	}
	/**
	 * @param eventManage the eventManage to set
	 */
	public void setEventManageList(List<EventManageVO> eventManageList) {
		this.eventManageList = eventManageList;
	}

	/**
	 * @return the infrmlSanctnId
	 */
	public String getInfrmlSanctnId() {
		return infrmlSanctnId;
	}

	/**
	 * @param infrmlSanctnId the infrmlSanctnId to set
	 */
	public void setInfrmlSanctnId(String infrmlSanctnId) {
		this.infrmlSanctnId = infrmlSanctnId;
	}

	/**
	 * @return the eventDayCount
	 */
	public int getEventDayCount() {
		return eventDayCount;
	}

	/**
	 * @param eventDayCount the eventDayCount to set
	 */
	public void setEventDayCount(int eventDayCount) {
		this.eventDayCount = eventDayCount;
	}

	/**
	 * @return the eventAtdrnCount
	 */
	public int getEventAtdrnCount() {
		return eventAtdrnCount;
	}

	/**
	 * @param eventAtdrnCount the eventAtdrnCount to set
	 */
	public void setEventAtdrnCount(int eventAtdrnCount) {
		this.eventAtdrnCount = eventAtdrnCount;
	}

}
