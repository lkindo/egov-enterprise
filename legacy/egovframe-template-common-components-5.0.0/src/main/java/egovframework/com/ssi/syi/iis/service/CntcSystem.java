package egovframework.com.ssi.syi.iis.service;

import java.io.Serializable;

/**
 * ?곌퀎?쒖뒪??紐⑤뜽 ?대옒??
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
public class CntcSystem implements Serializable {

	private static final long serialVersionUID = 4087217199729479930L;

	/*
	 * 湲곌?ID
	 */
	private String insttId        = "";

	/*
	 * ?쒖뒪?쏧D
	 */
	private String sysId          = "";

	/*
	 * ?쒖뒪?쒕챸
	 */
	private String sysNm          = "";

	/*
	 * ?쒖뒪?쏧P
	 */
	private String sysIp          = "";

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
	 * sysNm attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getSysNm() {
		return sysNm;
	}

	/**
	 * sysNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param sysNm String
	 */
	public void setSysNm(String sysNm) {
		this.sysNm = sysNm;
	}

	/**
	 * sysIp attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getSysIp() {
		return sysIp;
	}

	/**
	 * sysIp attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param sysIp String
	 */
	public void setSysIp(String sysIp) {
		this.sysIp = sysIp;
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
