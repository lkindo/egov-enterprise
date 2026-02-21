package egovframework.com.uss.ion.ecc.service;

import egovframework.com.cmm.ComDefaultVO;

/**
 * ?? ??     ??   ?   ???VO Class ?            
 * 
 * @author ?      ???      ???      ??
 * @since 2009.03.20
 * @version 1.0
 * @see
 *
 *      <pre>
 * <<          ???  ??Modification Information) >>
 *
 *   ??      ??     ??      ??          ??      ??      
 *  -------    --------    ---------------------------
 *   2009.03.20  ?      ??                  ????      
 *
 *      </pre>
 */
public class EventCmpgnVO extends ComDefaultVO {

	private static final long serialVersionUID = -5817021412630105195L;

	/**
	 * ?? ??     ??   ?   ???      
	 */
	private String eventId = "";

	/**
	 * ???
	 **/
	private String bsnsYear = "";

	/**
	 * ??
	 **/
	private String bsnsCode = "";

	/**
	 * ??????
	 **/
	private String eventSvcBeginDe = "";

	/**
	 * ?????????
	 **/
	private int svcUseNmprCo = 0;

	/**
	 * ?????
	 **/
	private String chargerNm = "";

	/**
	 * ????
	 **/
	private String eventCn = "";

	/**
	 * ?????
	 **/
	private String eventSvcEndDe = "";

	/**
	 * ?????
	 **/
	private String eventTyCode = "";

	/**
	 * ?????
	 **/
	private String eventTyCodeNm = "";

	/**
	 * ????
	 **/
	private String prparetgCn = "";

	/**
	 * ????
	 **/
	private String frstRegisterPnttm = "";
	/**
	 * ??ID
	 **/
	private String frstRegisterId = "";
	/**
	 * ????
	 **/
	private String frstRegisterNm = "";
	/**
	 * ????
	 **/
	private String lastUpdusrPnttm = "";
	/**
	 * ??ID
	 **/
	private String lastUpdusrId = "";
	/**
	 * ?????
	 **/
	private String cmd = "";

	/**
	 * ?? ??     ???     ????   
	 */
	private String eventConfmAt = "";

	/**
	 * ?? ??     ???     ???   
	 */
	private String eventConfmDe = "";

	/**
	 * eventConfmDe attribute ?????.
	 * 
	 * @return the String
	 **/
	public String getEventConfmDe() {
		return eventConfmDe;
	}

	/**
	 * eventConfmDe attribute ???????.
	 * 
	 * @return eventId String
	 **/
	public void setEventConfmDe(String eventConfmDe) {
		this.eventConfmDe = eventConfmDe;
	}

	/**
	 * eventConfmAt attribute ?????.
	 * 
	 * @return the String
	 **/
	public String getEventConfmAt() {
		return eventConfmAt;
	}

	/**
	 * eventConfmAt attribute ???????.
	 * 
	 * @return eventId String
	 **/
	public void setEventConfmAt(String eventConfmAt) {
		this.eventConfmAt = eventConfmAt;
	}

	/**
	 * eventId attribute ?????.
	 * 
	 * @return the String
	 **/
	public String getEventId() {
		return eventId;
	}

	/**
	 * eventId attribute ???????.
	 * 
	 * @return eventId String
	 **/
	public void setEventId(String eventId) {
		this.eventId = eventId;
	}

	/**
	 * bsnsYear attribute ?????.
	 * 
	 * @return the String
	 **/
	public String getBsnsYear() {
		return bsnsYear;
	}

	/**
	 * bsnsYear attribute ???????.
	 * 
	 * @return bsnsYear String
	 **/
	public void setBsnsYear(String bsnsYear) {
		this.bsnsYear = bsnsYear;
	}

	/**
	 * bsnsCode attribute ?????.
	 * 
	 * @return the String
	 **/
	public String getBsnsCode() {
		return bsnsCode;
	}

	/**
	 * bsnsCode attribute ???????.
	 * 
	 * @return bsnsCode String
	 **/
	public void setBsnsCode(String bsnsCode) {
		this.bsnsCode = bsnsCode;
	}

	/**
	 * eventSvcBeginDe attribute ?????.
	 * 
	 * @return the String
	 **/
	public String getEventSvcBeginDe() {
		return eventSvcBeginDe;
	}

	/**
	 * eventSvcBeginDe attribute ???????.
	 * 
	 * @return eventSvcBeginDe String
	 **/
	public void setEventSvcBeginDe(String eventSvcBeginDe) {
		this.eventSvcBeginDe = eventSvcBeginDe;
	}

	/**
	 * svcUseNmprCo attribute ?????.
	 * 
	 * @return the int
	 **/
	public int getSvcUseNmprCo() {
		return svcUseNmprCo;
	}

	/**
	 * svcUseNmprCo attribute ???????.
	 * 
	 * @return svcUseNmprCo int
	 **/
	public void setSvcUseNmprCo(int svcUseNmprCo) {
		this.svcUseNmprCo = svcUseNmprCo;
	}

	/**
	 * chargerNm attribute ?????.
	 * 
	 * @return the String
	 **/
	public String getChargerNm() {
		return chargerNm;
	}

	/**
	 * chargerNm attribute ???????.
	 * 
	 * @return chargerNm String
	 **/
	public void setChargerNm(String chargerNm) {
		this.chargerNm = chargerNm;
	}

	/**
	 * eventCn attribute ?????.
	 * 
	 * @return the String
	 **/
	public String getEventCn() {
		return eventCn;
	}

	/**
	 * eventCn attribute ???????.
	 * 
	 * @return eventCn String
	 **/
	public void setEventCn(String eventCn) {
		this.eventCn = eventCn;
	}

	/**
	 * eventSvcEndDe attribute ?????.
	 * 
	 * @return the String
	 **/
	public String getEventSvcEndDe() {
		return eventSvcEndDe;
	}

	/**
	 * eventSvcEndDe attribute ???????.
	 * 
	 * @return eventSvcEndDe String
	 **/
	public void setEventSvcEndDe(String eventSvcEndDe) {
		this.eventSvcEndDe = eventSvcEndDe;
	}

	/**
	 * eventTyCode attribute ?????.
	 * 
	 * @return the String
	 **/
	public String getEventTyCode() {
		return eventTyCode;
	}

	/**
	 * eventTyCode attribute ???????.
	 * 
	 * @return eventTyCode String
	 **/
	public void setEventTyCode(String eventTyCode) {
		this.eventTyCode = eventTyCode;
	}

	/**
	 * eventTyCodeNm attribute ?????.
	 * 
	 * @return the String
	 **/
	public String getEventTyCodeNm() {
		return eventTyCodeNm;
	}

	/**
	 * eventTyCodeNm attribute ???????.
	 * 
	 * @return eventTyCodeNm String
	 **/
	public void setEventTyCodeNm(String eventTyCodeNm) {
		this.eventTyCodeNm = eventTyCodeNm;
	}

	/**
	 * prparetgCn attribute ?????.
	 * 
	 * @return the String
	 **/
	public String getPrparetgCn() {
		return prparetgCn;
	}

	/**
	 * prparetgCn attribute ???????.
	 * 
	 * @return prparetgCn String
	 **/
	public void setPrparetgCn(String prparetgCn) {
		this.prparetgCn = prparetgCn;
	}

	/**
	 * frstRegisterPnttm attribute ?????.
	 * 
	 * @return the String
	 **/
	public String getFrstRegisterPnttm() {
		return frstRegisterPnttm;
	}

	/**
	 * frstRegisterPnttm attribute ???????.
	 * 
	 * @return frstRegisterPnttm String
	 **/
	public void setFrstRegisterPnttm(String frstRegisterPnttm) {
		this.frstRegisterPnttm = frstRegisterPnttm;
	}

	/**
	 * frstRegisterId attribute ?????.
	 * 
	 * @return the String
	 **/
	public String getFrstRegisterId() {
		return frstRegisterId;
	}

	/**
	 * frstRegisterId attribute ???????.
	 * 
	 * @return frstRegisterId String
	 **/
	public void setFrstRegisterId(String frstRegisterId) {
		this.frstRegisterId = frstRegisterId;
	}

	/**
	 * frstRegisterNm attribute ?????.
	 * 
	 * @return the String
	 **/
	public String getFrstRegisterNm() {
		return frstRegisterNm;
	}

	/**
	 * frstRegisterNm attribute ???????.
	 * 
	 * @return frstRegisterNm String
	 **/
	public void setFrstRegisterNm(String frstRegisterNm) {
		this.frstRegisterNm = frstRegisterNm;
	}

	/**
	 * lastUpdusrPnttm attribute ?????.
	 * 
	 * @return the String
	 **/
	public String getLastUpdusrPnttm() {
		return lastUpdusrPnttm;
	}

	/**
	 * lastUpdusrPnttm attribute ???????.
	 * 
	 * @return lastUpdusrPnttm String
	 **/
	public void setLastUpdusrPnttm(String lastUpdusrPnttm) {
		this.lastUpdusrPnttm = lastUpdusrPnttm;
	}

	/**
	 * lastUpdusrId attribute ?????.
	 * 
	 * @return the String
	 **/
	public String getLastUpdusrId() {
		return lastUpdusrId;
	}

	/**
	 * lastUpdusrId attribute ???????.
	 * 
	 * @return lastUpdusrId String
	 **/
	public void setLastUpdusrId(String lastUpdusrId) {
		this.lastUpdusrId = lastUpdusrId;
	}

	/**
	 * cmd attribute ?????.
	 * 
	 * @return the String
	 **/
	public String getCmd() {
		return cmd;
	}

	/**
	 * cmd attribute ???????.
	 * 
	 * @return cmd String
	 **/
	public void setCmd(String cmd) {
		this.cmd = cmd;
	}

}
