package egovframework.com.ssi.syi.iis.service;

import java.io.Serializable;

/**
 * ?? ???????
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
public class CntcInstt implements Serializable {

	private static final long serialVersionUID = -4176567860232641639L;

	/*
	 * ?ID
	 */
	private String insttId        = "";

	/*
	 * ??
	 */
	private String insttNm        = "";

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
	 * insttNm attribute ?????.
	 * @return String
	 **/
	public String getInsttNm() {
		return insttNm;
	}

	/**
	 * insttNm attribute ???????.
	 * @param insttNm String
	 **/
	public void setInsttNm(String insttNm) {
		this.insttNm = insttNm;
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
