package egovframework.com.ssi.syi.ims.service;

import java.io.Serializable;

/**
 * ? ???????
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
public class CntcMessage implements Serializable {

	private static final long serialVersionUID = 8864230247777324500L;

	/*
	 * ?ID
	 */
	private String cntcMessageId      = "";

	/*
	 * ??
	 */
	private String cntcMessageNm      = "";

	/*
	 * ??ID
	 */
	private String upperCntcMessageId = "";

	/*
	 * ???
	 */
	private String frstRegisterId     = "";

	/*
	 * ???
	 */
	private String lastUpdusrId       = "";

	/**
	 * cntcMessageId attribute ?????.
	 * @return String
	 **/
	public String getCntcMessageId() {
		return cntcMessageId;
	}

	/**
	 * cntcMessageId attribute ???????.
	 * @param cntcMessageId String
	 **/
	public void setCntcMessageId(String cntcMessageId) {
		this.cntcMessageId = cntcMessageId;
	}

	/**
	 * cntcMessageNm attribute ?????.
	 * @return String
	 **/
	public String getCntcMessageNm() {
		return cntcMessageNm;
	}

	/**
	 * cntcMessageNm attribute ???????.
	 * @param cntcMessageNm String
	 **/
	public void setCntcMessageNm(String cntcMessageNm) {
		this.cntcMessageNm = cntcMessageNm;
	}

	/**
	 * upperCntcMessageId attribute ?????.
	 * @return String
	 **/
	public String getUpperCntcMessageId() {
		return upperCntcMessageId;
	}

	/**
	 * upperCntcMessageId attribute ???????.
	 * @param upperCntcMessageId String
	 **/
	public void setUpperCntcMessageId(String upperCntcMessageId) {
		this.upperCntcMessageId = upperCntcMessageId;
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
