package egovframework.com.uss.olp.qrm.service;

import java.io.Serializable;
/**
 * ?ㅻЦ?묐떟?먭?由?VO Class 援ы쁽
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
public class QustnrRespondManageVO implements Serializable {

	private static final long serialVersionUID = -4378392561239344699L;

	/** ?ㅻЦ吏ID */
	private String qestnrId = "";

	/** ?ㅻЦ?묐떟?먯븘?대뵒 */
	private String qestnrRespondId = "";

	/** ?ㅻ퀎肄붾뱶 */
	private String sexdstnCode = "";

	/** 吏곸뾽?좏삎肄붾뱶 */
	private String occpTyCode = "";

	/** ?묐떟?먮챸 */
	private String respondNm = "";

	/** ?앸뀈?붿씪 */
	private String brth = "";

	/** 泥ル쾲吏몄쟾?붾쾲??*/
	private String areaNo = "";

	/** ?먮쾲吏몄쟾?붾쾲??*/
	private String middleTelno = "";

	/** 留덉?留됱쟾?붾쾲??*/
	private String endTelno = "";

	/** 理쒖큹?깅줉?쒖젏 */
	private String frstRegisterPnttm = "";

	/** 理쒖큹?깅줉?륤D */
	private String frstRegisterId = "";

	/** 理쒖쥌?섏젙?쒖젏 */
	private String lastUpdusrPnttm = "";

	/** 理쒖쥌?섏젙ID */
	private String lastUpdusrId = "";

	/** ?ㅻЦ?쒗뵆由풦D */
	private String qestnrTmplatId = "";

	/**
	 * qestnrId attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getQestnrId() {
		return qestnrId;
	}

	/**
	 * qestnrId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return qestnrId String
	 */
	public void setQestnrId(String qestnrId) {
		this.qestnrId = qestnrId;
	}

	/**
	 * qestnrRespondId attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getQestnrRespondId() {
		return qestnrRespondId;
	}

	/**
	 * qestnrRespondId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return qestnrRespondId String
	 */
	public void setQestnrRespondId(String qestnrRespondId) {
		this.qestnrRespondId = qestnrRespondId;
	}

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
	 * respondNm attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getRespondNm() {
		return respondNm;
	}

	/**
	 * respondNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return respondNm String
	 */
	public void setRespondNm(String respondNm) {
		this.respondNm = respondNm;
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
	 * qestnrTmplatId attribute 瑜?由ы꽩?쒕떎.
	 * @return the String
	 */
	public String getQestnrTmplatId() {
		return qestnrTmplatId;
	}

	/**
	 * qestnrTmplatId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @return qestnrTmplatId String
	 */
	public void setQestnrTmplatId(String qestnrTmplatId) {
		this.qestnrTmplatId = qestnrTmplatId;
	}



}
