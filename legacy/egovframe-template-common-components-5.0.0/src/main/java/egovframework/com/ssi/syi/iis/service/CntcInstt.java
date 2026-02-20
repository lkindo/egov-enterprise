package egovframework.com.ssi.syi.iis.service;

import java.io.Serializable;

/**
 * ?곌퀎湲곌? 紐⑤뜽 ?대옒??
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
public class CntcInstt implements Serializable {

	private static final long serialVersionUID = -4176567860232641639L;

	/*
	 * 湲곌?ID
	 */
	private String insttId        = "";

	/*
	 * 湲곌?紐?
	 */
	private String insttNm        = "";

	/*
	 * 理쒖큹?깅줉?륤D
	 */
	private String frstRegisterId = "";

	/*
	 * 理쒖쥌?섏젙?륤D
	 */
	private String lastUpdusrId   = "";

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
	 * insttNm attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getInsttNm() {
		return insttNm;
	}

	/**
	 * insttNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param insttNm String
	 */
	public void setInsttNm(String insttNm) {
		this.insttNm = insttNm;
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
