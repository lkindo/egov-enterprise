package egovframework.com.ssi.syi.ist.service;

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
public class CntcSttus implements Serializable {

	private static final long serialVersionUID = -6726609672185845666L;

	/*
	 * ?D
	 */
	private String cntcId        = "";

	/*
	 * ??
	 */
	private String cntcNm        = "";

	/*
	 * ??
	 */
	private String cntcType      = "";

	/*
	 * ???
	 */
	private String cntAll        = "";

	/*
	 * ????
	 */
	private String cntSuccess    = "";

	/*
	 * ?????
	 */
	private String cntFail       = "";

	/*
	 * ???ID
	 */
	private String provdInsttId  = "";

	/*
	 * ????
	 */
	private String provdInsttNm  = "";

	/*
	 * ??????
	 */
	private String provdSysId    = "";

	/*
	 * ??????
	 */
	private String provdSysNm    = "";

	/*
	 * ?????
	 */
	private String provdSvcId    = "";

	/*
	 * ??????
	 */
	private String provdSvcNm    = "";

	/*
	 * ??ID
	 */
	private String requstInsttId = "";

	/*
	 * ???
	 */
	private String requstInsttNm = "";

	/*
	 * ?????
	 */
	private String requstSysId   = "";

	/*
	 * ?????
	 */
	private String requstSysNm   = "";

	/**
	 * cntcId attribute ?????.
	 * @return String
	 **/
	public String getCntcId() {
		return cntcId;
	}

	/**
	 * cntcId attribute ???????.
	 * @param cntcId String
	 **/
	public void setCntcId(String cntcId) {
		this.cntcId = cntcId;
	}

	/**
	 * cntcNm attribute ?????.
	 * @return String
	 **/
	public String getCntcNm() {
		return cntcNm;
	}

	/**
	 * cntcNm attribute ???????.
	 * @param cntcNm String
	 **/
	public void setCntcNm(String cntcNm) {
		this.cntcNm = cntcNm;
	}

	/**
	 * cntcType attribute ?????.
	 * @return String
	 **/
	public String getCntcType() {
		return cntcType;
	}

	/**
	 * cntcType attribute ???????.
	 * @param cntcType String
	 **/
	public void setCntcType(String cntcType) {
		this.cntcType = cntcType;
	}

	/**
	 * cntAll attribute ?????.
	 * @return String
	 **/
	public String getCntAll() {
		return cntAll;
	}

	/**
	 * cntAll attribute ???????.
	 * @param cntAll String
	 **/
	public void setCntAll(String cntAll) {
		this.cntAll = cntAll;
	}

	/**
	 * cntSuccess attribute ?????.
	 * @return String
	 **/
	public String getCntSuccess() {
		return cntSuccess;
	}

	/**
	 * cntSuccess attribute ???????.
	 * @param cntSuccess String
	 **/
	public void setCntSuccess(String cntSuccess) {
		this.cntSuccess = cntSuccess;
	}

	/**
	 * cntFail attribute ?????.
	 * @return String
	 **/
	public String getCntFail() {
		return cntFail;
	}

	/**
	 * cntFail attribute ???????.
	 * @param cntFail String
	 **/
	public void setCntFail(String cntFail) {
		this.cntFail = cntFail;
	}

	/**
	 * provdInsttId attribute ?????.
	 * @return String
	 **/
	public String getProvdInsttId() {
		return provdInsttId;
	}

	/**
	 * provdInsttId attribute ???????.
	 * @param provdInsttId String
	 **/
	public void setProvdInsttId(String provdInsttId) {
		this.provdInsttId = provdInsttId;
	}

	/**
	 * provdInsttNm attribute ?????.
	 * @return String
	 **/
	public String getProvdInsttNm() {
		return provdInsttNm;
	}

	/**
	 * provdInsttNm attribute ???????.
	 * @param provdInsttNm String
	 **/
	public void setProvdInsttNm(String provdInsttNm) {
		this.provdInsttNm = provdInsttNm;
	}

	/**
	 * provdSysId attribute ?????.
	 * @return String
	 **/
	public String getProvdSysId() {
		return provdSysId;
	}

	/**
	 * provdSysId attribute ???????.
	 * @param provdSysId String
	 **/
	public void setProvdSysId(String provdSysId) {
		this.provdSysId = provdSysId;
	}

	/**
	 * provdSysNm attribute ?????.
	 * @return String
	 **/
	public String getProvdSysNm() {
		return provdSysNm;
	}

	/**
	 * provdSysNm attribute ???????.
	 * @param provdSysNm String
	 **/
	public void setProvdSysNm(String provdSysNm) {
		this.provdSysNm = provdSysNm;
	}

	/**
	 * provdSvcId attribute ?????.
	 * @return String
	 **/
	public String getProvdSvcId() {
		return provdSvcId;
	}

	/**
	 * provdSvcId attribute ???????.
	 * @param provdSvcId String
	 **/
	public void setProvdSvcId(String provdSvcId) {
		this.provdSvcId = provdSvcId;
	}

	/**
	 * provdSvcNm attribute ?????.
	 * @return String
	 **/
	public String getProvdSvcNm() {
		return provdSvcNm;
	}

	/**
	 * provdSvcNm attribute ???????.
	 * @param provdSvcNm String
	 **/
	public void setProvdSvcNm(String provdSvcNm) {
		this.provdSvcNm = provdSvcNm;
	}

	/**
	 * requstInsttId attribute ?????.
	 * @return String
	 **/
	public String getRequstInsttId() {
		return requstInsttId;
	}

	/**
	 * requstInsttId attribute ???????.
	 * @param requstInsttId String
	 **/
	public void setRequstInsttId(String requstInsttId) {
		this.requstInsttId = requstInsttId;
	}

	/**
	 * requstInsttNm attribute ?????.
	 * @return String
	 **/
	public String getRequstInsttNm() {
		return requstInsttNm;
	}

	/**
	 * requstInsttNm attribute ???????.
	 * @param requstInsttNm String
	 **/
	public void setRequstInsttNm(String requstInsttNm) {
		this.requstInsttNm = requstInsttNm;
	}

	/**
	 * requstSysId attribute ?????.
	 * @return String
	 **/
	public String getRequstSysId() {
		return requstSysId;
	}

	/**
	 * requstSysId attribute ???????.
	 * @param requstSysId String
	 **/
	public void setRequstSysId(String requstSysId) {
		this.requstSysId = requstSysId;
	}

	/**
	 * requstSysNm attribute ?????.
	 * @return String
	 **/
	public String getRequstSysNm() {
		return requstSysNm;
	}

	/**
	 * requstSysNm attribute ???????.
	 * @param requstSysNm String
	 **/
	public void setRequstSysNm(String requstSysNm) {
		this.requstSysNm = requstSysNm;
	}


}
