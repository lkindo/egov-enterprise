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
public class CntcService implements Serializable {

	private static final long serialVersionUID = 5832384226958481369L;

	/*
	 * ?ID
	 */
	private String insttId          = "";

	/*
	 * ????
	 */
	private String sysId            = "";

	/*
	 * ???
	 */
	private String svcId            = "";

	/*
	 * ????
	 */
	private String svcNm            = "";

	/*
	 * ???ID
	 */
	private String requestMessageId = "";

	/*
	 * ???ID
	 */
	private String rspnsMessageId   = "";

	/*
	 * ???
	 */
	private String frstRegisterId   = "";

	/*
	 * ???
	 */
	private String lastUpdusrId     = "";

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
	 * svcId attribute ?????.
	 * @return String
	 **/
	public String getSvcId() {
		return svcId;
	}

	/**
	 * svcId attribute ???????.
	 * @param svcId String
	 **/
	public void setSvcId(String svcId) {
		this.svcId = svcId;
	}

	/**
	 * svcNm attribute ?????.
	 * @return String
	 **/
	public String getSvcNm() {
		return svcNm;
	}

	/**
	 * svcNm attribute ???????.
	 * @param svcNm String
	 **/
	public void setSvcNm(String svcNm) {
		this.svcNm = svcNm;
	}

	/**
	 * requestMessageId attribute ?????.
	 * @return String
	 **/
	public String getRequestMessageId() {
		return requestMessageId;
	}

	/**
	 * requestMessageId attribute ???????.
	 * @param requestMessageId String
	 **/
	public void setRequestMessageId(String requestMessageId) {
		this.requestMessageId = requestMessageId;
	}

	/**
	 * rspnsMessageId attribute ?????.
	 * @return String
	 **/
	public String getRspnsMessageId() {
		return rspnsMessageId;
	}

	/**
	 * rspnsMessageId attribute ???????.
	 * @param rspnsMessageId String
	 **/
	public void setRspnsMessageId(String rspnsMessageId) {
		this.rspnsMessageId = rspnsMessageId;
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
