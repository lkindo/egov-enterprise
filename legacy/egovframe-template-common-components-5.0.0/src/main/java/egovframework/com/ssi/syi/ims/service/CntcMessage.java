package egovframework.com.ssi.syi.ims.service;

import java.io.Serializable;

/**
 * ?곌퀎硫붿떆吏 紐⑤뜽 ?대옒??
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
public class CntcMessage implements Serializable {

	private static final long serialVersionUID = 8864230247777324500L;

	/*
	 * ?곌퀎硫붿떆吏ID
	 */
	private String cntcMessageId      = "";

	/*
	 * ?곌퀎硫붿떆吏紐?
	 */
	private String cntcMessageNm      = "";

	/*
	 * ?곸쐞?곌퀎硫붿떆吏ID
	 */
	private String upperCntcMessageId = "";

	/*
	 * 理쒖큹?깅줉?륤D
	 */
	private String frstRegisterId     = "";

	/*
	 * 理쒖쥌?섏젙?륤D
	 */
	private String lastUpdusrId       = "";

	/**
	 * cntcMessageId attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getCntcMessageId() {
		return cntcMessageId;
	}

	/**
	 * cntcMessageId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param cntcMessageId String
	 */
	public void setCntcMessageId(String cntcMessageId) {
		this.cntcMessageId = cntcMessageId;
	}

	/**
	 * cntcMessageNm attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getCntcMessageNm() {
		return cntcMessageNm;
	}

	/**
	 * cntcMessageNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param cntcMessageNm String
	 */
	public void setCntcMessageNm(String cntcMessageNm) {
		this.cntcMessageNm = cntcMessageNm;
	}

	/**
	 * upperCntcMessageId attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getUpperCntcMessageId() {
		return upperCntcMessageId;
	}

	/**
	 * upperCntcMessageId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param upperCntcMessageId String
	 */
	public void setUpperCntcMessageId(String upperCntcMessageId) {
		this.upperCntcMessageId = upperCntcMessageId;
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
