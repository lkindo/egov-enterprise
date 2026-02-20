package egovframework.com.ssi.syi.sim.service;

import java.io.Serializable;

/**
 * ?쒖뒪?쒖뿰怨?紐⑤뜽 ?대옒??
 * @author 怨듯넻?쒕퉬??媛쒕컻? ?댁쨷??
 * @since 2009.04.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.04.01  ?댁쨷??         理쒖큹 ?앹꽦
 *
 * Copyright (C) 2009 by MOPAS  All rights reserved.
 * </pre>
 */
public class SystemCntc implements Serializable {

	private static final long serialVersionUID = 3756509144236517156L;

	/*
	 * ?곌퀎ID
	 */
	private String cntcId            = "";

	/*
	 * ?곌퀎紐?
	 */
	private String cntcNm            = "";

	/*
	 * ?곌퀎?좏삎肄붾뱶
	 */
	private String cntcType          = "";

	/*
	 * ?쒓났湲곌?ID
	 */
	private String provdInsttId      = "";

	/*
	 * ?쒓났?쒖뒪?쏧D
	 */
	private String provdSysId        = "";

	/*
	 * ?쒓났?쒕퉬?짪D
	 */
	private String provdSvcId        = "";

	/*
	 * ?붿껌湲곌?ID
	 */
	private String requstInsttId     = "";

	/*
	 * ?붿껌?쒖뒪?쏧D
	 */
	private String requstSysId       = "";

	/*
	 * ?뱀씤?щ?
	 */
	private String confmAt           = "";

	/*
	 * ?ъ슜?щ?
	 */
	private String useAt             = "";

	/*
	 * ?좏슚?쒖옉?쇱옄
	 */
	private String validBeginDe      = "";

	/*
	 * ?좏슚醫낅즺?쇱옄
	 */
	private String validEndDe        = "";

	/*
	 * 理쒖큹?깅줉?륤D
	 */
	private String frstRegisterId    = "";

	/*
	 * 理쒖쥌?섏젙?륤D
	 */
	private String lastUpdusrId      = "";

	/**
	 * cntcId attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getCntcId() {
		return cntcId;
	}

	/**
	 * cntcId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param cntcId String
	 */
	public void setCntcId(String cntcId) {
		this.cntcId = cntcId;
	}

	/**
	 * cntcNm attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getCntcNm() {
		return cntcNm;
	}

	/**
	 * cntcNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param cntcNm String
	 */
	public void setCntcNm(String cntcNm) {
		this.cntcNm = cntcNm;
	}

	/**
	 * cntcType attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getCntcType() {
		return cntcType;
	}

	/**
	 * cntcType attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param cntcType String
	 */
	public void setCntcType(String cntcType) {
		this.cntcType = cntcType;
	}

	/**
	 * provdInsttId attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getProvdInsttId() {
		return provdInsttId;
	}

	/**
	 * provdInsttId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param provdInsttId String
	 */
	public void setProvdInsttId(String provdInsttId) {
		this.provdInsttId = provdInsttId;
	}

	/**
	 * provdSysId attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getProvdSysId() {
		return provdSysId;
	}

	/**
	 * provdSysId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param provdSysId String
	 */
	public void setProvdSysId(String provdSysId) {
		this.provdSysId = provdSysId;
	}

	/**
	 * provdSvcId attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getProvdSvcId() {
		return provdSvcId;
	}

	/**
	 * provdSvcId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param provdSvcId String
	 */
	public void setProvdSvcId(String provdSvcId) {
		this.provdSvcId = provdSvcId;
	}

	/**
	 * requstInsttId attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getRequstInsttId() {
		return requstInsttId;
	}

	/**
	 * requstInsttId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param requstInsttId String
	 */
	public void setRequstInsttId(String requstInsttId) {
		this.requstInsttId = requstInsttId;
	}

	/**
	 * requstSysId attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getRequstSysId() {
		return requstSysId;
	}

	/**
	 * requstSysId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param requstSysId String
	 */
	public void setRequstSysId(String requstSysId) {
		this.requstSysId = requstSysId;
	}

	/**
	 * confmAt attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getConfmAt() {
		return confmAt;
	}

	/**
	 * confmAt attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param confmAt String
	 */
	public void setConfmAt(String confmAt) {
		this.confmAt = confmAt;
	}

	/**
	 * useAt attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getUseAt() {
		return useAt;
	}

	/**
	 * useAt attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param useAt String
	 */
	public void setUseAt(String useAt) {
		this.useAt = useAt;
	}

	/**
	 * validBeginDe attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getValidBeginDe() {
		return validBeginDe;
	}

	/**
	 * validBeginDe attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param validBeginDe String
	 */
	public void setValidBeginDe(String validBeginDe) {
		this.validBeginDe = validBeginDe;
	}

	/**
	 * validEndDe attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getValidEndDe() {
		return validEndDe;
	}

	/**
	 * validEndDe attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param validEndDe String
	 */
	public void setValidEndDe(String validEndDe) {
		this.validEndDe = validEndDe;
	}

	/**
	 * frstRegisterId attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getFrstRegisterId() {
		return frstRegisterId;
	}

	/**
	 * frstRegisterId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param frstRegisterId String
	 */
	public void setFrstRegisterId(String frstRegisterId) {
		this.frstRegisterId = frstRegisterId;
	}

	/**
	 * lastUpdusrId attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getLastUpdusrId() {
		return lastUpdusrId;
	}

	/**
	 * lastUpdusrId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param lastUpdusrId String
	 */
	public void setLastUpdusrId(String lastUpdusrId) {
		this.lastUpdusrId = lastUpdusrId;
	}


}
