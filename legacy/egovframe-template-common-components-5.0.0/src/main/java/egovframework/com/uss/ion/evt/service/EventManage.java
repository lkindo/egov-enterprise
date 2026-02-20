package egovframework.com.uss.ion.evt.service;

import egovframework.com.cmm.ComDefaultVO;

/**
 * 媛쒖슂
 * - ?됱궗愿由ъ뿉 ???model ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - ?됱궗愿由ъ쓽 ?됱궗ID,?됱궗援щ텇,?됱궗紐??됱궗紐⑹쟻,?됱궗?쒖옉?쇱옄,?됱궗醫낅즺?쇱옄,?됱궗二쇱턀湲곌?紐??됱궗二쇨?湲곌?紐??됱궗?μ냼,?됱궗?댁슜,鍮꾩슜諛쒖깮?щ?,李멸?鍮꾩슜,?뺤썝,李몄“URL,?묒닔?쒖옉?쇱옄,?묒닔醫낅즺?쇱옄,理쒖큹?깅줉?륤D,理쒖큹?깅줉?쒖젏,理쒖쥌?섏젙?륤D,理쒖쥌?섏젙?쒖젏 ??ぉ??愿由ы븳??
 * @author ?댁슜
 * @version 1.0
 * @created 06-15-2010 ?ㅽ썑 2:08:56
 */

public class EventManage extends ComDefaultVO {

	/**
	* serialVersionUID
	*/
	private static final long serialVersionUID = 1L;
	
	/**
	*  ?됱궗ID	      
	*/ 
	private String eventId;

	/**
	*  ?됱궗援щ텇	      
	*/ 
	private String eventSe;

	/**
	*  ?됱궗紐?      
	*/ 
	private String eventNm;

	/**
	*  ?됱궗紐⑹쟻	      
	*/ 
	private String eventPurps;

	/**
	*  ?됱궗?쒖옉?쇱옄	
	*/ 
	private String eventBeginDe;

	/**
	*  ?됱궗醫낅즺?쇱옄	
	*/ 
	private String eventEndDe;

	/**
	*  ?됱궗二쇱턀湲곌?紐?
	*/ 
	private String eventAuspcInsttNm;

	/**
	*  ?됱궗二쇨?湲곌?紐?
	*/ 
	private String eventMngtInsttNm;

	/**
	*  ?됱궗?μ냼	      
	*/ 
	private String eventPlace;

	/**
	*  ?됱궗?댁슜	      
	*/ 
	private String eventCn;

	/**
	*  鍮꾩슜諛쒖깮?щ?	
	*/ 
	private String ctOccrrncAt;

	/**
	*  李멸?鍮꾩슜	      
	*/ 
	private int partcptCt;

	/**
	*  ?뺤썝	         
	*/ 
	private int psncpa;

	/**
	*  李몄“URL	      
	*/ 
	private String refrnUrl;

	/**
	*  ?묒닔?쒖옉?쇱옄	
	*/ 
	private String rceptBeginDe;

	/**
	*  ?묒닔醫낅즺?쇱옄	
	*/ 
	private String rceptEndDe;

	/**
	*  理쒖큹?깅줉?륤D	
	*/ 
	private String frstRegisterId;

	/**
	*  理쒖큹?깅줉?쒖젏	
	*/ 
	private String frstRegisterPnttm;

	/**
	*  理쒖쥌?섏젙?륤D	
	*/ 
	private String lastUpdusrId;

	/**
	*  理쒖쥌?섏젙?쒖젏	
	*/ 
	private String lastUpdusrPnttm;



	/**
	 * @return the eventId
	 */
	public String getEventId() {
		return eventId;
	}

	/**
	 * @param eventId the eventId to set
	 */
	public void setEventId(String eventId) {
		this.eventId = eventId;
	}

	/**
	 * @return the eventSe
	 */
	public String getEventSe() {
		return eventSe;
	}

	/**
	 * @param eventSe the eventSe to set
	 */
	public void setEventSe(String eventSe) {
		this.eventSe = eventSe;
	}

	/**
	 * @return the eventNm
	 */
	public String getEventNm() {
		return eventNm;
	}

	/**
	 * @param eventNm the eventNm to set
	 */
	public void setEventNm(String eventNm) {
		this.eventNm = eventNm;
	}

	/**
	 * @return the eventPurps
	 */
	public String getEventPurps() {
		return eventPurps;
	}

	/**
	 * @param eventPurps the eventPurps to set
	 */
	public void setEventPurps(String eventPurps) {
		this.eventPurps = eventPurps;
	}

	/**
	 * @return the eventBeginDe
	 */
	public String getEventBeginDe() {
		return eventBeginDe;
	}

	/**
	 * @param eventBeginDe the eventBeginDe to set
	 */
	public void setEventBeginDe(String eventBeginDe) {
		this.eventBeginDe = eventBeginDe;
	}

	/**
	 * @return the eventEndDe
	 */
	public String getEventEndDe() {
		return eventEndDe;
	}

	/**
	 * @param eventEndDe the eventEndDe to set
	 */
	public void setEventEndDe(String eventEndDe) {
		this.eventEndDe = eventEndDe;
	}

	/**
	 * @return the eventAuspcInsttNm
	 */
	public String getEventAuspcInsttNm() {
		return eventAuspcInsttNm;
	}

	/**
	 * @param eventAuspcInsttNm the eventAuspcInsttNm to set
	 */
	public void setEventAuspcInsttNm(String eventAuspcInsttNm) {
		this.eventAuspcInsttNm = eventAuspcInsttNm;
	}

	/**
	 * @return the eventMngtInsttNm
	 */
	public String getEventMngtInsttNm() {
		return eventMngtInsttNm;
	}

	/**
	 * @param eventMngtInsttNm the eventMngtInsttNm to set
	 */
	public void setEventMngtInsttNm(String eventMngtInsttNm) {
		this.eventMngtInsttNm = eventMngtInsttNm;
	}

	/**
	 * @return the eventPlace
	 */
	public String getEventPlace() {
		return eventPlace;
	}

	/**
	 * @param eventPlace the eventPlace to set
	 */
	public void setEventPlace(String eventPlace) {
		this.eventPlace = eventPlace;
	}

	/**
	 * @return the eventCn
	 */
	public String getEventCn() {
		return eventCn;
	}

	/**
	 * @param eventCn the eventCn to set
	 */
	public void setEventCn(String eventCn) {
		this.eventCn = eventCn;
	}

	/**
	 * @return the ctOccrrncAt
	 */
	public String getCtOccrrncAt() {
		return ctOccrrncAt;
	}

	/**
	 * @param ctOccrrncAt the ctOccrrncAt to set
	 */
	public void setCtOccrrncAt(String ctOccrrncAt) {
		this.ctOccrrncAt = ctOccrrncAt;
	}

	/**
	 * @return the partcptCt
	 */
	public int getPartcptCt() {
		return partcptCt;
	}

	/**
	 * @param partcptCt the partcptCt to set
	 */
	public void setPartcptCt(int partcptCt) {
		this.partcptCt = partcptCt;
	}

	/**
	 * @return the garden
	 */
	public int getPsncpa() {
		return psncpa;
	}

	/**
	 * @param garden the garden to set
	 */
	public void setPsncpa(int psncpa) {
		this.psncpa = psncpa;
	}

	/**
	 * @return the refrnUrl
	 */
	public String getRefrnUrl() {
		return refrnUrl;
	}

	/**
	 * @param refrnUrl the refrnUrl to set
	 */
	public void setRefrnUrl(String refrnUrl) {
		this.refrnUrl = refrnUrl;
	}

	/**
	 * @return the rceptBeginDe
	 */
	public String getRceptBeginDe() {
		return rceptBeginDe;
	}

	/**
	 * @param rceptBeginDe the rceptBeginDe to set
	 */
	public void setRceptBeginDe(String rceptBeginDe) {
		this.rceptBeginDe = rceptBeginDe;
	}

	/**
	 * @return the rceptEndDe
	 */
	public String getRceptEndDe() {
		return rceptEndDe;
	}

	/**
	 * @param rceptEndDe the rceptEndDe to set
	 */
	public void setRceptEndDe(String rceptEndDe) {
		this.rceptEndDe = rceptEndDe;
	}

	/**
	 * @return the frstRegisterId
	 */
	public String getFrstRegisterId() {
		return frstRegisterId;
	}

	/**
	 * @param frstRegisterId the frstRegisterId to set
	 */
	public void setFrstRegisterId(String frstRegisterId) {
		this.frstRegisterId = frstRegisterId;
	}

	/**
	 * @return the frstRegisterPnttm
	 */
	public String getFrstRegisterPnttm() {
		return frstRegisterPnttm;
	}

	/**
	 * @param frstRegisterPnttm the frstRegisterPnttm to set
	 */
	public void setFrstRegisterPnttm(String frstRegisterPnttm) {
		this.frstRegisterPnttm = frstRegisterPnttm;
	}

	/**
	 * @return the lastUpdusrId
	 */
	public String getLastUpdusrId() {
		return lastUpdusrId;
	}

	/**
	 * @param lastUpdusrId the lastUpdusrId to set
	 */
	public void setLastUpdusrId(String lastUpdusrId) {
		this.lastUpdusrId = lastUpdusrId;
	}

	/**
	 * @return the lastUpdusrPnttm
	 */
	public String getLastUpdusrPnttm() {
		return lastUpdusrPnttm;
	}

	/**
	 * @param lastUpdusrPnttm the lastUpdusrPnttm to set
	 */
	public void setLastUpdusrPnttm(String lastUpdusrPnttm) {
		this.lastUpdusrPnttm = lastUpdusrPnttm;
	}
	
	
}