package egovframework.com.sym.ccm.acr.service;

import java.io.Serializable;

/**
 * ??????????????
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
public class AdministCodeRecptn implements Serializable {

	private static final long serialVersionUID = -8112169445756353554L;

	/**
     * ??
     **/
    private String  occrrDe = "";

    /**
     * ????
     **/
    private String  administZoneSe = "";

    /**
     * ?????
     **/
    private String  administZoneCode = "";

    /**
     * ?????
     **/
    int	opertSn = 0;

    /**
     * ???
     **/
    private String  changeSeCode = "";

    /**
     * ????
     **/
    private String  processSe = "";

    /**
     * ????
     **/
    private String  administZoneNm = "";

    /**
     * ??????
     **/
    private String  lowestAdministZoneNm = "";

    /**
     * ????
     **/
    private String  ctprvnCode = "";

    /**
     * ?????
     **/
    private String  signguCode = "";

    /**
     * ??????
     **/
    private String  emdCode = "";

    /**
     * ???
     **/
    private String  liCode = "";

    /**
     * ????
     **/
    private String  creatDe = "";

    /**
     * ????
     **/
    private String  ablDe = "";

    /**
     * ????
     **/
    private String  ablEnnc = "";

	/*
	 * ??????
	 */
    private String upperAdministZoneCode = "";

	/*
	 * ?????
	 */
    private String upperAdministZoneNm = "";

    /*
	 * ??????
	 */
    private String useAt = "";

    /**
     * ???
     **/
    private String frstRegisterId = "" ;

    /**
     * ???
     **/
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
	 * administZoneSe attribute ?????.
	 * @return String
	 **/
	public String getAdministZoneSe() {
		return administZoneSe;
	}

	/**
	 * administZoneSe attribute ???????.
	 * @param administZoneSe String
	 **/
	public void setAdministZoneSe(String administZoneSe) {
		this.administZoneSe = administZoneSe;
	}

	/**
	 * administZoneCode attribute ?????.
	 * @return String
	 **/
	public String getAdministZoneCode() {
		return administZoneCode;
	}

	/**
	 * administZoneCode attribute ???????.
	 * @param administZoneCode String
	 **/
	public void setAdministZoneCode(String administZoneCode) {
		this.administZoneCode = administZoneCode;
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
	 * administZoneNm attribute ?????.
	 * @return String
	 **/
	public String getAdministZoneNm() {
		return administZoneNm;
	}

	/**
	 * administZoneNm attribute ???????.
	 * @param administZoneNm String
	 **/
	public void setAdministZoneNm(String administZoneNm) {
		this.administZoneNm = administZoneNm;
	}

	/**
	 * lowestAdministZoneNm attribute ?????.
	 * @return String
	 **/
	public String getLowestAdministZoneNm() {
		return lowestAdministZoneNm;
	}

	/**
	 * lowestAdministZoneNm attribute ???????.
	 * @param lowestAdministZoneNm String
	 **/
	public void setLowestAdministZoneNm(String lowestAdministZoneNm) {
		this.lowestAdministZoneNm = lowestAdministZoneNm;
	}

	/**
	 * ctprvnCode attribute ?????.
	 * @return String
	 **/
	public String getCtprvnCode() {
		return ctprvnCode;
	}

	/**
	 * ctprvnCode attribute ???????.
	 * @param ctprvnCode String
	 **/
	public void setCtprvnCode(String ctprvnCode) {
		this.ctprvnCode = ctprvnCode;
	}

	/**
	 * signguCode attribute ?????.
	 * @return String
	 **/
	public String getSignguCode() {
		return signguCode;
	}

	/**
	 * signguCode attribute ???????.
	 * @param signguCode String
	 **/
	public void setSignguCode(String signguCode) {
		this.signguCode = signguCode;
	}

	/**
	 * emdCode attribute ?????.
	 * @return String
	 **/
	public String getEmdCode() {
		return emdCode;
	}

	/**
	 * emdCode attribute ???????.
	 * @param emdCode String
	 **/
	public void setEmdCode(String emdCode) {
		this.emdCode = emdCode;
	}

	/**
	 * liCode attribute ?????.
	 * @return String
	 **/
	public String getLiCode() {
		return liCode;
	}

	/**
	 * liCode attribute ???????.
	 * @param liCode String
	 **/
	public void setLiCode(String liCode) {
		this.liCode = liCode;
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
	 * upperAdministZoneCode attribute ?????.
	 * @return String
	 **/
	public String getUpperAdministZoneCode() {
		return upperAdministZoneCode;
	}

	/**
	 * upperAdministZoneCode attribute ???????.
	 * @param upperAdministZoneCode String
	 **/
	public void setUpperAdministZoneCode(String upperAdministZoneCode) {
		this.upperAdministZoneCode = upperAdministZoneCode;
	}

	/**
	 * upperAdministZoneNm attribute ?????.
	 * @return String
	 **/
	public String getUpperAdministZoneNm() {
		return upperAdministZoneNm;
	}

	/**
	 * upperAdministZoneNm attribute ???????.
	 * @param upperAdministZoneNm String
	 **/
	public void setUpperAdministZoneNm(String upperAdministZoneNm) {
		this.upperAdministZoneNm = upperAdministZoneNm;
	}

	/**
	 * useAt attribute ?????.
	 * @return String
	 **/
	public String getUseAt() {
		return useAt;
	}

	/**
	 * useAt attribute ???????.
	 * @param useAt String
	 **/
	public void setUseAt(String useAt) {
		this.useAt = useAt;
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
