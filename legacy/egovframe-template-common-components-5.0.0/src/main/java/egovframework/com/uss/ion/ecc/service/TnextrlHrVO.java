package egovframework.com.uss.ion.ecc.service;

import java.io.Serializable;

import egovframework.com.cmm.ComDefaultVO;
/**
 * ?몃??몄궗愿由?VO Class 援ы쁽
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
public class TnextrlHrVO extends ComDefaultVO implements Serializable {

	private static final long serialVersionUID = 1739374172177710041L;

	/**
	 * ?깅퀎肄붾뱶
	 */
	private String sexdstnCode = "";
	
	/**
	 * ?깅퀎肄붾뱶紐?
	 */
	private String sexdstnCodeNm = "";

	/**
	 * ?몃??몄궗紐?
	 */
	private String extrlHrNm = "";

	/**
	 * ?대찓?쇱＜??
	 */
	private String emailAdres = "";

	/**
	 * 吏곸뾽?좏삎肄붾뱶
	 */
	private String occpTyCode = "";
	
	/**
	 * 吏곸뾽?좏삎肄붾뱶紐?
	 */
	private String occpTyCodeNm = "";

	/**
	 * ?뚯냽湲곌?紐?
	 */
	private String psitnInsttNm = "";

	/**
	 * ?몃??몄궗ID
	 */
	private String extrlHrId = "";

	/**
	 * ?됱궗/?대깽??罹좏럹???꾩씠??
	 */
	private String eventId = "";
	
	/**
	 * ?됱궗/?대깽??罹좏럹?몃궡??
	 */
	private String eventCn = "";

	/**
	 * ?앸뀈?붿씪
	 */
	private String brth = "";

	/**
	 * 吏??쾲??
	 */
	private String areaNo = "";

	/**
	 * 以묎컙?꾪솕踰덊샇
	 */
	private String middleTelno = "";

	/**
	 * ?앹쟾?붾쾲??
	 */
	private String endTelno = "";

	/**
	 * ?앸뀈?붿씪(??
	 */
	private String brthYYYY = "";

	/**
	 * ?앸뀈?붿씪(??
	 */
	private String brthMM = "";

	/**
	 * ?앸뀈?붿씪(??
	 */
	private String brthDD = "";

	/**
	 * 理쒖큹?깅줉?쒖젏
	 */
	private String frstRegisterPnttm = "";

	/**
	 * 理쒖큹?깅줉ID
	 */
	private String frstRegisterId = "";
	
	/**
	 * 理쒖큹?깅줉ID
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
	 * sexdstnCode attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getSexdstnCode() {
		return sexdstnCode;
	}

	/**
	 * sexdstnCode attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return sexdstnCode String
	 */
	public void setSexdstnCode(String sexdstnCode) {
		this.sexdstnCode = sexdstnCode;
	}
	
	/**
	 * sexdstnCodeNm attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getSexdstnCodeNm() {
		return sexdstnCodeNm;
	}
	
	/**
	 * sexdstnCodeNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return sexdstnCodeNm String
	 */
	public void setSexdstnCodeNm(String sexdstnCodeNm) {
		this.sexdstnCodeNm = sexdstnCodeNm;
	}

	/**
	 * extrlHrNm attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getExtrlHrNm() {
		return extrlHrNm;
	}

	/**
	 * extrlHrNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return extrlHrNm String
	 */
	public void setExtrlHrNm(String extrlHrNm) {
		this.extrlHrNm = extrlHrNm;
	}

	/**
	 * emailAdres attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getEmailAdres() {
		return emailAdres;
	}

	/**
	 * emailAdres attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return emailAdres String
	 */
	public void setEmailAdres(String emailAdres) {
		this.emailAdres = emailAdres;
	}

	/**
	 * occpTyCode attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getOccpTyCode() {
		return occpTyCode;
	}

	/**
	 * occpTyCode attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return occpTyCode String
	 */
	public void setOccpTyCode(String occpTyCode) {
		this.occpTyCode = occpTyCode;
	}
	
	/**
	 * occpTyCodeNm attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getOccpTyCodeNm() {
		return occpTyCodeNm;
	}
	
	/**
	 * occpTyCodeNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return occpTyCodeNm String
	 */
	public void setOccpTyCodeNm(String occpTyCodeNm) {
		this.occpTyCodeNm = occpTyCodeNm;
	}

	/**
	 * psitnInsttNm attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getPsitnInsttNm() {
		return psitnInsttNm;
	}

	/**
	 * psitnInsttNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return psitnInsttNm String
	 */
	public void setPsitnInsttNm(String psitnInsttNm) {
		this.psitnInsttNm = psitnInsttNm;
	}

	/**
	 * extrlHrId attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getExtrlHrId() {
		return extrlHrId;
	}

	/**
	 * extrlHrId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return extrlHrId String
	 */
	public void setExtrlHrId(String extrlHrId) {
		this.extrlHrId = extrlHrId;
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
	 * brth attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getBrth() {
		return brth;
	}

	/**
	 * brth attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return brth String
	 */
	public void setBrth(String brth) {
		this.brth = brth;
	}

	/**
	 * areaNo attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getAreaNo() {
		return areaNo;
	}

	/**
	 * areaNo attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return areaNo String
	 */
	public void setAreaNo(String areaNo) {
		this.areaNo = areaNo;
	}

	/**
	 * middleTelno attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getMiddleTelno() {
		return middleTelno;
	}

	/**
	 * middleTelno attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return middleTelno String
	 */
	public void setMiddleTelno(String middleTelno) {
		this.middleTelno = middleTelno;
	}

	/**
	 * endTelno attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getEndTelno() {
		return endTelno;
	}

	/**
	 * endTelno attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return endTelno String
	 */
	public void setEndTelno(String endTelno) {
		this.endTelno = endTelno;
	}

	/**
	 * brthYYYY attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getBrthYYYY() {
		return brthYYYY;
	}

	/**
	 * brthYYYY attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return brthYYYY String
	 */
	public void setBrthYYYY(String brthYYYY) {
		this.brthYYYY = brthYYYY;
	}

	/**
	 * brthMM attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getBrthMM() {
		return brthMM;
	}

	/**
	 * brthMM attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return brthMM String
	 */
	public void setBrthMM(String brthMM) {
		this.brthMM = brthMM;
	}

	/**
	 * brthDD attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getBrthDD() {
		return brthDD;
	}

	/**
	 * brthDD attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return brthDD String
	 */
	public void setBrthDD(String brthDD) {
		this.brthDD = brthDD;
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





}
