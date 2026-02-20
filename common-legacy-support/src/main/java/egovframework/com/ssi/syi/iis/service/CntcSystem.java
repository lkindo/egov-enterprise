package egovframework.com.ssi.syi.iis.service;

import java.io.Serializable;

/**
 * ????????????
 * @author ???????? ????
 * @since 2009.04.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << ?????Modification Information) >>
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.04.01  ????         ????
 *
 * Copyright (C) 2009 by MOPAS  All rights reserved.
 * </pre>
 **/
public class CntcSystem implements Serializable {

	private static final long serialVersionUID = 4087217199729479930L;

	/*
	 * ?ID
	 */
	private String insttId        = "";

	/*
	 * ????
	 */
	private String sysId          = "";

	/*
	 * ????
	 */
	private String sysNm          = "";

	/*
	 * ????
	 */
	private String sysIp          = "";

	/*
	 * ???
	 */
	private String frstRegisterId = "";

	/*
	 * ???
	 */
	private String lastUpdusrId   = "";

	/**
	 * insttId attribute ?????.
	 * @return String
	 **/
	public String getInsttId() {
		return insttId;
	}

	/**
	 * insttId attribute ???????.
	 * @param insttId String
	 **/
	public void setInsttId(String insttId) {
		this.insttId = insttId;
	}

	/**
	 * sysId attribute ?????.
	 * @return String
	 **/
	public String getSysId() {
		return sysId;
	}

	/**
	 * sysId attribute ???????.
	 * @param sysId String
	 **/
	public void setSysId(String sysId) {
		this.sysId = sysId;
	}

	/**
	 * sysNm attribute ?????.
	 * @return String
	 **/
	public String getSysNm() {
		return sysNm;
	}

	/**
	 * sysNm attribute ???????.
	 * @param sysNm String
	 **/
	public void setSysNm(String sysNm) {
		this.sysNm = sysNm;
	}

	/**
	 * sysIp attribute ?????.
	 * @return String
	 **/
	public String getSysIp() {
		return sysIp;
	}

	/**
	 * sysIp attribute ???????.
	 * @param sysIp String
	 **/
	public void setSysIp(String sysIp) {
		this.sysIp = sysIp;
	}

	/**
	 * frstRegisterId attribute ?????.
	 * @return String
	 **/
	public String getFrstRegisterId() {
		return frstRegisterId;
	}

	/**
	 * frstRegisterId attribute ???????.
	 * @param frstRegisterId String
	 **/
	public void setFrstRegisterId(String frstRegisterId) {
		this.frstRegisterId = frstRegisterId;
	}

	/**
	 * lastUpdusrId attribute ?????.
	 * @return String
	 **/
	public String getLastUpdusrId() {
		return lastUpdusrId;
	}

	/**
	 * lastUpdusrId attribute ???????.
	 * @param lastUpdusrId String
	 **/
	public void setLastUpdusrId(String lastUpdusrId) {
		this.lastUpdusrId = lastUpdusrId;
	}


}
