package egovframework.com.ssi.syi.iis.service;

import java.io.Serializable;

/**
 * ?곌퀎?쒕퉬??紐⑤뜽 ?대옒??
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
public class CntcService implements Serializable {

	private static final long serialVersionUID = 5832384226958481369L;

	/*
	 * 湲곌?ID
	 */
	private String insttId          = "";

	/*
	 * ?쒖뒪?쏧D
	 */
	private String sysId            = "";

	/*
	 * ?쒕퉬?짪D
	 */
	private String svcId            = "";

	/*
	 * ?쒕퉬?ㅻ챸
	 */
	private String svcNm            = "";

	/*
	 * ?붿껌硫붿떆吏ID
	 */
	private String requestMessageId = "";

	/*
	 * ?묐떟硫붿떆吏ID
	 */
	private String rspnsMessageId   = "";

	/*
	 * 理쒖큹?깅줉?륤D
	 */
	private String frstRegisterId   = "";

	/*
	 * 理쒖쥌?섏젙?륤D
	 */
	private String lastUpdusrId     = "";

	/**
	 * insttId attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getInsttId() {
		return insttId;
	}

	/**
	 * insttId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param insttId String
	 */
	public void setInsttId(String insttId) {
		this.insttId = insttId;
	}

	/**
	 * sysId attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getSysId() {
		return sysId;
	}

	/**
	 * sysId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param sysId String
	 */
	public void setSysId(String sysId) {
		this.sysId = sysId;
	}

	/**
	 * svcId attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getSvcId() {
		return svcId;
	}

	/**
	 * svcId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param svcId String
	 */
	public void setSvcId(String svcId) {
		this.svcId = svcId;
	}

	/**
	 * svcNm attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getSvcNm() {
		return svcNm;
	}

	/**
	 * svcNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param svcNm String
	 */
	public void setSvcNm(String svcNm) {
		this.svcNm = svcNm;
	}

	/**
	 * requestMessageId attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getRequestMessageId() {
		return requestMessageId;
	}

	/**
	 * requestMessageId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param requestMessageId String
	 */
	public void setRequestMessageId(String requestMessageId) {
		this.requestMessageId = requestMessageId;
	}

	/**
	 * rspnsMessageId attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getRspnsMessageId() {
		return rspnsMessageId;
	}

	/**
	 * rspnsMessageId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param rspnsMessageId String
	 */
	public void setRspnsMessageId(String rspnsMessageId) {
		this.rspnsMessageId = rspnsMessageId;
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
