package egovframework.com.ssi.syi.ist.service;

import java.io.Serializable;

/**
 * ?곌퀎?꾪솴 紐⑤뜽 ?대옒??
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
public class CntcSttus implements Serializable {

	private static final long serialVersionUID = -6726609672185845666L;

	/*
	 * ?곌퀎ID
	 */
	private String cntcId        = "";

	/*
	 * ?곌퀎紐?
	 */
	private String cntcNm        = "";

	/*
	 * ?곌퀎?좏삎
	 */
	private String cntcType      = "";

	/*
	 * 珥앹뿰怨꾧굔??
	 */
	private String cntAll        = "";

	/*
	 * ?깃났?곌퀎??
	 */
	private String cntSuccess    = "";

	/*
	 * ?ㅽ뙣?곌퀎??
	 */
	private String cntFail       = "";

	/*
	 * ?쒓났湲곌?ID
	 */
	private String provdInsttId  = "";

	/*
	 * ?쒓났湲곌?紐?
	 */
	private String provdInsttNm  = "";

	/*
	 * ?쒓났?쒖뒪?쏧D
	 */
	private String provdSysId    = "";

	/*
	 * ?쒓났?쒖뒪?쒕챸
	 */
	private String provdSysNm    = "";

	/*
	 * ?쒓났?쒕퉬?짪D
	 */
	private String provdSvcId    = "";

	/*
	 * ?쒓났?쒕퉬?ㅻ챸
	 */
	private String provdSvcNm    = "";

	/*
	 * ?붿껌湲곌?ID
	 */
	private String requstInsttId = "";

	/*
	 * ?붿껌湲곌?紐?
	 */
	private String requstInsttNm = "";

	/*
	 * ?붿껌?쒖뒪?쏧D
	 */
	private String requstSysId   = "";

	/*
	 * ?붿껌?쒖뒪?쒕챸
	 */
	private String requstSysNm   = "";

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
	 * cntAll attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getCntAll() {
		return cntAll;
	}

	/**
	 * cntAll attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param cntAll String
	 */
	public void setCntAll(String cntAll) {
		this.cntAll = cntAll;
	}

	/**
	 * cntSuccess attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getCntSuccess() {
		return cntSuccess;
	}

	/**
	 * cntSuccess attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param cntSuccess String
	 */
	public void setCntSuccess(String cntSuccess) {
		this.cntSuccess = cntSuccess;
	}

	/**
	 * cntFail attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getCntFail() {
		return cntFail;
	}

	/**
	 * cntFail attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param cntFail String
	 */
	public void setCntFail(String cntFail) {
		this.cntFail = cntFail;
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
	 * provdInsttNm attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getProvdInsttNm() {
		return provdInsttNm;
	}

	/**
	 * provdInsttNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param provdInsttNm String
	 */
	public void setProvdInsttNm(String provdInsttNm) {
		this.provdInsttNm = provdInsttNm;
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
	 * provdSysNm attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getProvdSysNm() {
		return provdSysNm;
	}

	/**
	 * provdSysNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param provdSysNm String
	 */
	public void setProvdSysNm(String provdSysNm) {
		this.provdSysNm = provdSysNm;
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
	 * provdSvcNm attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getProvdSvcNm() {
		return provdSvcNm;
	}

	/**
	 * provdSvcNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param provdSvcNm String
	 */
	public void setProvdSvcNm(String provdSvcNm) {
		this.provdSvcNm = provdSvcNm;
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
	 * requstInsttNm attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getRequstInsttNm() {
		return requstInsttNm;
	}

	/**
	 * requstInsttNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param requstInsttNm String
	 */
	public void setRequstInsttNm(String requstInsttNm) {
		this.requstInsttNm = requstInsttNm;
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
	 * requstSysNm attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getRequstSysNm() {
		return requstSysNm;
	}

	/**
	 * requstSysNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param requstSysNm String
	 */
	public void setRequstSysNm(String requstSysNm) {
		this.requstSysNm = requstSysNm;
	}


}
