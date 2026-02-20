package egovframework.com.uss.ion.ecc.service;

import java.io.Serializable;

import egovframework.com.cmm.ComDefaultVO;
/**
 * ?됱궗/?대깽??罹좏럹??VO Class 援ы쁽
 * @author 怨듯넻?쒕퉬???λ룞??
 * @since 2009.03.20
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.03.20  ?λ룞??         理쒖큹 ?앹꽦
 *
 * </pre>
 */
public class EventCmpgnVO extends ComDefaultVO implements Serializable {

	private static final long serialVersionUID = -5817021412630105195L;

	/**
	 * ?됱궗/?대깽??罹좏럹?퇙D
	 */
	private String eventId = "";

	/**
	 * ?ъ뾽?곕룄
	 */
	private String bsnsYear = "";

	/**
	 * ?ъ뾽肄붾뱶
	 */
	private String bsnsCode = "";

	/**
	 * ?됱궗?쒖옉?쇱옄
	 */
	private String eventSvcBeginDe = "";

	/**
	 * ?쒕퉬?ㅼ씠???몄썝??
	 */
	private int svcUseNmprCo = 0;

	/**
	 * ?대떦?먮챸
	 */
	private String chargerNm = "";

	/**
	 * ?됱궗?댁슜
	 */
	private String eventCn = "";

	/**
	 * ?됱궗醫낅즺?쇱옄
	 */
	private String eventSvcEndDe = "";

	/**
	 * ?됱궗?좏삎肄붾뱶
	 */
	private String eventTyCode = "";
	
	/**
	 * ?됱궗?좏삎肄붾뱶紐?
	 */
	private String eventTyCodeNm = "";

	/**
	 * 以鍮꾨Ъ?댁슜
	 */
	private String prparetgCn = "";

	/**
	 * 理쒖큹?깅줉?쒖젏
	 */
	private String frstRegisterPnttm = "";
	/**
	 * 理쒖큹?깅줉ID
	 */
	private String frstRegisterId = "";
	/**
	 * 理쒖큹?깅줉??
	 */
	private String frstRegisterNm = "";
	/**
	 * 理쒖쥌?섏젙?쒖젏
	 */
	private String lastUpdusrPnttm = "";
	/**
	 * 理쒖쥌?섏젙ID
	 */
	private String lastUpdusrId = "";
	/**
	 * ?붾㈃泥섎━ 紐낅졊??
	 */
	private String cmd = "";


	/**
	 * ?됱궗/?대깽???뱀씤?щ?
	 */
	private String eventConfmAt = "";

	/**
	 * ?됱궗/?대깽???뱀씤??
	 */
	private String eventConfmDe = "";


	/**
	 * eventConfmDe attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getEventConfmDe() {
		return eventConfmDe;
	}
	/**
	 * eventConfmDe attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return eventId String
	 */
	public void setEventConfmDe(String eventConfmDe) {
		this.eventConfmDe = eventConfmDe;
	}

	/**
	 * eventConfmAt attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getEventConfmAt() {
		return eventConfmAt;
	}
	/**
	 * eventConfmAt attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return eventId String
	 */
	public void setEventConfmAt(String eventConfmAt) {
		this.eventConfmAt = eventConfmAt;
	}


	/**
	 * eventId attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getEventId() {
		return eventId;
	}
	/**
	 * eventId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return eventId String
	 */
	public void setEventId(String eventId) {
		this.eventId = eventId;
	}
	/**
	 * bsnsYear attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getBsnsYear() {
		return bsnsYear;
	}
	/**
	 * bsnsYear attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return bsnsYear String
	 */
	public void setBsnsYear(String bsnsYear) {
		this.bsnsYear = bsnsYear;
	}
	/**
	 * bsnsCode attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getBsnsCode() {
		return bsnsCode;
	}
	/**
	 * bsnsCode attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return bsnsCode String
	 */
	public void setBsnsCode(String bsnsCode) {
		this.bsnsCode = bsnsCode;
	}
	/**
	 * eventSvcBeginDe attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getEventSvcBeginDe() {
		return eventSvcBeginDe;
	}
	/**
	 * eventSvcBeginDe attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return eventSvcBeginDe String
	 */
	public void setEventSvcBeginDe(String eventSvcBeginDe) {
		this.eventSvcBeginDe = eventSvcBeginDe;
	}
	/**
	 * svcUseNmprCo attribute 瑜?由ы꽩?쒕떎.
	 * @return the int
	 */
	public int getSvcUseNmprCo() {
		return svcUseNmprCo;
	}
	/**
	 * svcUseNmprCo attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return svcUseNmprCo int
	 */
	public void setSvcUseNmprCo(int svcUseNmprCo) {
		this.svcUseNmprCo = svcUseNmprCo;
	}
	/**
	 * chargerNm attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getChargerNm() {
		return chargerNm;
	}
	/**
	 * chargerNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return chargerNm String
	 */
	public void setChargerNm(String chargerNm) {
		this.chargerNm = chargerNm;
	}
	/**
	 * eventCn attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getEventCn() {
		return eventCn;
	}
	/**
	 * eventCn attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return eventCn String
	 */
	public void setEventCn(String eventCn) {
		this.eventCn = eventCn;
	}
	/**
	 * eventSvcEndDe attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getEventSvcEndDe() {
		return eventSvcEndDe;
	}
	/**
	 * eventSvcEndDe attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return eventSvcEndDe String
	 */
	public void setEventSvcEndDe(String eventSvcEndDe) {
		this.eventSvcEndDe = eventSvcEndDe;
	}
	/**
	 * eventTyCode attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getEventTyCode() {
		return eventTyCode;
	}
	/**
	 * eventTyCode attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return eventTyCode String
	 */
	public void setEventTyCode(String eventTyCode) {
		this.eventTyCode = eventTyCode;
	}
	/**
	 * eventTyCodeNm attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getEventTyCodeNm() {
		return eventTyCodeNm;
	}
	/**
	 * eventTyCodeNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return eventTyCodeNm String
	 */
	public void setEventTyCodeNm(String eventTyCodeNm) {
		this.eventTyCodeNm = eventTyCodeNm;
	}
	/**
	 * prparetgCn attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getPrparetgCn() {
		return prparetgCn;
	}
	/**
	 * prparetgCn attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return prparetgCn String
	 */
	public void setPrparetgCn(String prparetgCn) {
		this.prparetgCn = prparetgCn;
	}
	/**
	 * frstRegisterPnttm attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getFrstRegisterPnttm() {
		return frstRegisterPnttm;
	}
	/**
	 * frstRegisterPnttm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return frstRegisterPnttm String
	 */
	public void setFrstRegisterPnttm(String frstRegisterPnttm) {
		this.frstRegisterPnttm = frstRegisterPnttm;
	}
	/**
	 * frstRegisterId attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getFrstRegisterId() {
		return frstRegisterId;
	}
	/**
	 * frstRegisterId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return frstRegisterId String
	 */
	public void setFrstRegisterId(String frstRegisterId) {
		this.frstRegisterId = frstRegisterId;
	}
	/**
	 * frstRegisterNm attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getFrstRegisterNm() {
		return frstRegisterNm;
	}
	/**
	 * frstRegisterNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return frstRegisterNm String
	 */
	public void setFrstRegisterNm(String frstRegisterNm) {
		this.frstRegisterNm = frstRegisterNm;
	}
	/**
	 * lastUpdusrPnttm attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getLastUpdusrPnttm() {
		return lastUpdusrPnttm;
	}
	/**
	 * lastUpdusrPnttm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return lastUpdusrPnttm String
	 */
	public void setLastUpdusrPnttm(String lastUpdusrPnttm) {
		this.lastUpdusrPnttm = lastUpdusrPnttm;
	}
	/**
	 * lastUpdusrId attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getLastUpdusrId() {
		return lastUpdusrId;
	}
	/**
	 * lastUpdusrId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return lastUpdusrId String
	 */
	public void setLastUpdusrId(String lastUpdusrId) {
		this.lastUpdusrId = lastUpdusrId;
	}
	/**
	 * cmd attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getCmd() {
		return cmd;
	}
	/**
	 * cmd attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return cmd String
	 */
	public void setCmd(String cmd) {
		this.cmd = cmd;
	}





}
