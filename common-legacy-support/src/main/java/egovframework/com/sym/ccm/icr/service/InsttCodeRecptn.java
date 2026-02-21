package egovframework.com.sym.ccm.icr.service;

import java.io.Serializable;

/**
 * ?????????????
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
public class InsttCodeRecptn implements Serializable {

	private static final long serialVersionUID = 1370791089416059647L;

	/*
	 * ??
	 */
	private String occrrDe = "" ;

	/*
	 * ???
	 */
	private String insttCode = "" ;

    /**
     * ?????
     **/
    int	opertSn = 0;

	/*
	 * ???
	 */
	private String changeSeCode = "" ;

	/*
	 * ????
	 */
	private String processSe = "" ;

	/*
	 * ???
	 */
	private String etcCode = "" ;

	/*
	 * ???
	 */
	private String allInsttNm = "" ;

	/*
	 * ???
	 */
	private String lowestInsttNm = "" ;

	/*
	 * ????
	 */
	private String insttAbrvNm = "" ;

	/*
	 * ??
	 */
	private String odr = "" ;

	/*
	 * ??
	 */
	private String ord = "" ;

	/*
	 * ???
	 */
	private String insttOdr = "" ;

	/*
	 * ????
	 */
	private String bestInsttCode = "" ;

	/*
	 * ????
	 */
	private String upperInsttCode = "" ;

	/*
	 * ???????
	 */
	private String reprsntInsttCode = "" ;

	/*
	 * ??????
	 */
	private String insttTyLclas = "" ;

	/*
	 * ????
	 */
	private String insttTyMclas = "" ;

	/*
	 * ???????
	 */
	private String insttTySclas = "" ;

	/*
	 * ???
	 */
	private String telno = "" ;

	/*
	 * ????
	 */
	private String fxnum = "" ;

	/*
	 * ????
	 */
	private String creatDe = "" ;

	/*
	 * ????
	 */
	private String ablDe = "" ;

	/*
	 * ????
	 */
	private String ablEnnc = "" ;

	/*
	 * ???
	 */
	private String changede = "" ;

	/*
	 * ??
	 */
	private String changeTime = "" ;

	/*
	 * ???
	 */
	private String bsisDe = "" ;

	/*
	 * ???
	 */
	private int sortOrdr = 0 ;

	/*
	 * ???
	 */
	private String frstRegisterId = "" ;

	/*
	 * ???
	 */
	private String lastUpdusrId = "" ;

	/**
	 * occrrDe attribute ?????.
	 * @return String
	 **/
	public String getOccrrDe() {
		return occrrDe;
	}

	/**
	 * occrrDe attribute ???????.
	 * @param occrrDe String
	 **/
	public void setOccrrDe(String occrrDe) {
		this.occrrDe = occrrDe;
	}

	/**
	 * insttCode attribute ?????.
	 * @return String
	 **/
	public String getInsttCode() {
		return insttCode;
	}

	/**
	 * insttCode attribute ???????.
	 * @param insttCode String
	 **/
	public void setInsttCode(String insttCode) {
		this.insttCode = insttCode;
	}

	/**
	 * opertSn attribute ?????.
	 * @return int
	 **/
	public int getOpertSn() {
		return opertSn;
	}

	/**
	 * opertSn attribute ???????.
	 * @param opertSn int
	 **/
	public void setOpertSn(int opertSn) {
		this.opertSn = opertSn;
	}

	/**
	 * changeSeCode attribute ?????.
	 * @return String
	 **/
	public String getChangeSeCode() {
		return changeSeCode;
	}

	/**
	 * changeSeCode attribute ???????.
	 * @param changeSeCode String
	 **/
	public void setChangeSeCode(String changeSeCode) {
		this.changeSeCode = changeSeCode;
	}

	/**
	 * processSe attribute ?????.
	 * @return String
	 **/
	public String getProcessSe() {
		return processSe;
	}

	/**
	 * processSe attribute ???????.
	 * @param processSe String
	 **/
	public void setProcessSe(String processSe) {
		this.processSe = processSe;
	}

	/**
	 * etcCode attribute ?????.
	 * @return String
	 **/
	public String getEtcCode() {
		return etcCode;
	}

	/**
	 * etcCode attribute ???????.
	 * @param etcCode String
	 **/
	public void setEtcCode(String etcCode) {
		this.etcCode = etcCode;
	}

	/**
	 * allInsttNm attribute ?????.
	 * @return String
	 **/
	public String getAllInsttNm() {
		return allInsttNm;
	}

	/**
	 * allInsttNm attribute ???????.
	 * @param allInsttNm String
	 **/
	public void setAllInsttNm(String allInsttNm) {
		this.allInsttNm = allInsttNm;
	}

	/**
	 * lowestInsttNm attribute ?????.
	 * @return String
	 **/
	public String getLowestInsttNm() {
		return lowestInsttNm;
	}

	/**
	 * lowestInsttNm attribute ???????.
	 * @param lowestInsttNm String
	 **/
	public void setLowestInsttNm(String lowestInsttNm) {
		this.lowestInsttNm = lowestInsttNm;
	}

	/**
	 * insttAbrvNm attribute ?????.
	 * @return String
	 **/
	public String getInsttAbrvNm() {
		return insttAbrvNm;
	}

	/**
	 * insttAbrvNm attribute ???????.
	 * @param insttAbrvNm String
	 **/
	public void setInsttAbrvNm(String insttAbrvNm) {
		this.insttAbrvNm = insttAbrvNm;
	}

	/**
	 * odr attribute ?????.
	 * @return String
	 **/
	public String getOdr() {
		return odr;
	}

	/**
	 * odr attribute ???????.
	 * @param odr String
	 **/
	public void setOdr(String odr) {
		this.odr = odr;
	}

	/**
	 * ord attribute ?????.
	 * @return String
	 **/
	public String getOrd() {
		return ord;
	}

	/**
	 * ord attribute ???????.
	 * @param ord String
	 **/
	public void setOrd(String ord) {
		this.ord = ord;
	}

	/**
	 * insttOdr attribute ?????.
	 * @return String
	 **/
	public String getInsttOdr() {
		return insttOdr;
	}

	/**
	 * insttOdr attribute ???????.
	 * @param insttOdr String
	 **/
	public void setInsttOdr(String insttOdr) {
		this.insttOdr = insttOdr;
	}

	/**
	 * bestInsttCode attribute ?????.
	 * @return String
	 **/
	public String getBestInsttCode() {
		return bestInsttCode;
	}

	/**
	 * bestInsttCode attribute ???????.
	 * @param bestInsttCode String
	 **/
	public void setBestInsttCode(String bestInsttCode) {
		this.bestInsttCode = bestInsttCode;
	}

	/**
	 * upperInsttCode attribute ?????.
	 * @return String
	 **/
	public String getUpperInsttCode() {
		return upperInsttCode;
	}

	/**
	 * upperInsttCode attribute ???????.
	 * @param upperInsttCode String
	 **/
	public void setUpperInsttCode(String upperInsttCode) {
		this.upperInsttCode = upperInsttCode;
	}

	/**
	 * reprsntInsttCode attribute ?????.
	 * @return String
	 **/
	public String getReprsntInsttCode() {
		return reprsntInsttCode;
	}

	/**
	 * reprsntInsttCode attribute ???????.
	 * @param reprsntInsttCode String
	 **/
	public void setReprsntInsttCode(String reprsntInsttCode) {
		this.reprsntInsttCode = reprsntInsttCode;
	}

	/**
	 * insttTyLclas attribute ?????.
	 * @return String
	 **/
	public String getInsttTyLclas() {
		return insttTyLclas;
	}

	/**
	 * insttTyLclas attribute ???????.
	 * @param insttTyLclas String
	 **/
	public void setInsttTyLclas(String insttTyLclas) {
		this.insttTyLclas = insttTyLclas;
	}

	/**
	 * insttTyMclas attribute ?????.
	 * @return String
	 **/
	public String getInsttTyMclas() {
		return insttTyMclas;
	}

	/**
	 * insttTyMclas attribute ???????.
	 * @param insttTyMclas String
	 **/
	public void setInsttTyMclas(String insttTyMclas) {
		this.insttTyMclas = insttTyMclas;
	}

	/**
	 * insttTySclas attribute ?????.
	 * @return String
	 **/
	public String getInsttTySclas() {
		return insttTySclas;
	}

	/**
	 * insttTySclas attribute ???????.
	 * @param insttTySclas String
	 **/
	public void setInsttTySclas(String insttTySclas) {
		this.insttTySclas = insttTySclas;
	}

	/**
	 * telno attribute ?????.
	 * @return String
	 **/
	public String getTelno() {
		return telno;
	}

	/**
	 * telno attribute ???????.
	 * @param telno String
	 **/
	public void setTelno(String telno) {
		this.telno = telno;
	}

	/**
	 * fxnum attribute ?????.
	 * @return String
	 **/
	public String getFxnum() {
		return fxnum;
	}

	/**
	 * fxnum attribute ???????.
	 * @param fxnum String
	 **/
	public void setFxnum(String fxnum) {
		this.fxnum = fxnum;
	}

	/**
	 * creatDe attribute ?????.
	 * @return String
	 **/
	public String getCreatDe() {
		return creatDe;
	}

	/**
	 * creatDe attribute ???????.
	 * @param creatDe String
	 **/
	public void setCreatDe(String creatDe) {
		this.creatDe = creatDe;
	}

	/**
	 * ablDe attribute ?????.
	 * @return String
	 **/
	public String getAblDe() {
		return ablDe;
	}

	/**
	 * ablDe attribute ???????.
	 * @param ablDe String
	 **/
	public void setAblDe(String ablDe) {
		this.ablDe = ablDe;
	}

	/**
	 * ablEnnc attribute ?????.
	 * @return String
	 **/
	public String getAblEnnc() {
		return ablEnnc;
	}

	/**
	 * ablEnnc attribute ???????.
	 * @param ablEnnc String
	 **/
	public void setAblEnnc(String ablEnnc) {
		this.ablEnnc = ablEnnc;
	}

	/**
	 * changede attribute ?????.
	 * @return String
	 **/
	public String getChangede() {
		return changede;
	}

	/**
	 * changede attribute ???????.
	 * @param changede String
	 **/
	public void setChangede(String changede) {
		this.changede = changede;
	}

	/**
	 * changeTime attribute ?????.
	 * @return String
	 **/
	public String getChangeTime() {
		return changeTime;
	}

	/**
	 * changeTime attribute ???????.
	 * @param changeTime String
	 **/
	public void setChangeTime(String changeTime) {
		this.changeTime = changeTime;
	}

	/**
	 * bsisDe attribute ?????.
	 * @return String
	 **/
	public String getBsisDe() {
		return bsisDe;
	}

	/**
	 * bsisDe attribute ???????.
	 * @param bsisDe String
	 **/
	public void setBsisDe(String bsisDe) {
		this.bsisDe = bsisDe;
	}

	/**
	 * sortOrdr attribute ?????.
	 * @return int
	 **/
	public int getSortOrdr() {
		return sortOrdr;
	}

	/**
	 * sortOrdr attribute ???????.
	 * @param sortOrdr int
	 **/
	public void setSortOrdr(int sortOrdr) {
		this.sortOrdr = sortOrdr;
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
