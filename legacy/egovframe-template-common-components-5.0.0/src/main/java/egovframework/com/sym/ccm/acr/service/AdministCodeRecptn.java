package egovframework.com.sym.ccm.acr.service;

import java.io.Serializable;

/**
 * 踰뺤젙?숈퐫?쒖닔?좊줈洹?紐⑤뜽 ?대옒??
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
public class AdministCodeRecptn implements Serializable {

	private static final long serialVersionUID = -8112169445756353554L;

	/**
     * 諛쒖깮?쇱옄
     */
    private String  occrrDe = "";

    /**
     * ?됱젙援ъ뿭援щ텇
     */
    private String  administZoneSe = "";

    /**
     * ?됱젙援ъ뿭肄붾뱶
     */
    private String  administZoneCode = "";

    /**
     * ?묒뾽?쇰젴踰덊샇
     */
    int	opertSn = 0;

    /**
     * 蹂寃쎄뎄遺꾩퐫??
     */
    private String  changeSeCode = "";

    /**
     * 泥섎━援щ텇
     */
    private String  processSe = "";

    /**
     * ?됱젙援ъ뿭紐?
     */
    private String  administZoneNm = "";

    /**
     * 理쒗븯?꾪뻾?뺢뎄??챸
     */
    private String  lowestAdministZoneNm = "";

    /**
     * ?쒕룄肄붾뱶
     */
    private String  ctprvnCode = "";

    /**
     * ?쒓뎔援ъ퐫??
     */
    private String  signguCode = "";

    /**
     * ?띾㈃?숈퐫??
     */
    private String  emdCode = "";

    /**
     * 由ъ퐫??
     */
    private String  liCode = "";

    /**
     * ?앹꽦?쇱옄
     */
    private String  creatDe = "";

    /**
     * ?먯??쇱옄
     */
    private String  ablDe = "";

    /**
     * ?먯??좊Т
     */
    private String  ablEnnc = "";

	/*
	 * ?곸쐞?됱젙援ъ뿭肄붾뱶
	 */
    private String upperAdministZoneCode = "";

	/*
	 * ?곸쐞?됱젙援ъ뿭紐?
	 */
    private String upperAdministZoneNm = "";

    /*
	 * ?ъ슜?щ?
	 */
    private String useAt = "";

    /**
     * 理쒖큹?깅줉?륤D
     */
    private String frstRegisterId = "" ;

    /**
     * 理쒖쥌?섏젙?륤D
     */
    private String lastUpdusrId = "" ;

	/**
	 * occrrDe attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getOccrrDe() {
		return occrrDe;
	}

	/**
	 * occrrDe attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param occrrDe String
	 */
	public void setOccrrDe(String occrrDe) {
		this.occrrDe = occrrDe;
	}

	/**
	 * administZoneSe attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getAdministZoneSe() {
		return administZoneSe;
	}

	/**
	 * administZoneSe attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param administZoneSe String
	 */
	public void setAdministZoneSe(String administZoneSe) {
		this.administZoneSe = administZoneSe;
	}

	/**
	 * administZoneCode attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getAdministZoneCode() {
		return administZoneCode;
	}

	/**
	 * administZoneCode attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param administZoneCode String
	 */
	public void setAdministZoneCode(String administZoneCode) {
		this.administZoneCode = administZoneCode;
	}

	/**
	 * opertSn attribute 瑜?由ы꽩?쒕떎.
	 * @return int
	 */
	public int getOpertSn() {
		return opertSn;
	}

	/**
	 * opertSn attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param opertSn int
	 */
	public void setOpertSn(int opertSn) {
		this.opertSn = opertSn;
	}

	/**
	 * changeSeCode attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getChangeSeCode() {
		return changeSeCode;
	}

	/**
	 * changeSeCode attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param changeSeCode String
	 */
	public void setChangeSeCode(String changeSeCode) {
		this.changeSeCode = changeSeCode;
	}

	/**
	 * processSe attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getProcessSe() {
		return processSe;
	}

	/**
	 * processSe attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param processSe String
	 */
	public void setProcessSe(String processSe) {
		this.processSe = processSe;
	}

	/**
	 * administZoneNm attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getAdministZoneNm() {
		return administZoneNm;
	}

	/**
	 * administZoneNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param administZoneNm String
	 */
	public void setAdministZoneNm(String administZoneNm) {
		this.administZoneNm = administZoneNm;
	}

	/**
	 * lowestAdministZoneNm attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getLowestAdministZoneNm() {
		return lowestAdministZoneNm;
	}

	/**
	 * lowestAdministZoneNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param lowestAdministZoneNm String
	 */
	public void setLowestAdministZoneNm(String lowestAdministZoneNm) {
		this.lowestAdministZoneNm = lowestAdministZoneNm;
	}

	/**
	 * ctprvnCode attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getCtprvnCode() {
		return ctprvnCode;
	}

	/**
	 * ctprvnCode attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param ctprvnCode String
	 */
	public void setCtprvnCode(String ctprvnCode) {
		this.ctprvnCode = ctprvnCode;
	}

	/**
	 * signguCode attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getSignguCode() {
		return signguCode;
	}

	/**
	 * signguCode attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param signguCode String
	 */
	public void setSignguCode(String signguCode) {
		this.signguCode = signguCode;
	}

	/**
	 * emdCode attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getEmdCode() {
		return emdCode;
	}

	/**
	 * emdCode attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param emdCode String
	 */
	public void setEmdCode(String emdCode) {
		this.emdCode = emdCode;
	}

	/**
	 * liCode attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getLiCode() {
		return liCode;
	}

	/**
	 * liCode attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param liCode String
	 */
	public void setLiCode(String liCode) {
		this.liCode = liCode;
	}

	/**
	 * creatDe attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getCreatDe() {
		return creatDe;
	}

	/**
	 * creatDe attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param creatDe String
	 */
	public void setCreatDe(String creatDe) {
		this.creatDe = creatDe;
	}

	/**
	 * ablDe attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getAblDe() {
		return ablDe;
	}

	/**
	 * ablDe attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param ablDe String
	 */
	public void setAblDe(String ablDe) {
		this.ablDe = ablDe;
	}

	/**
	 * ablEnnc attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getAblEnnc() {
		return ablEnnc;
	}

	/**
	 * ablEnnc attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param ablEnnc String
	 */
	public void setAblEnnc(String ablEnnc) {
		this.ablEnnc = ablEnnc;
	}

	/**
	 * upperAdministZoneCode attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getUpperAdministZoneCode() {
		return upperAdministZoneCode;
	}

	/**
	 * upperAdministZoneCode attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param upperAdministZoneCode String
	 */
	public void setUpperAdministZoneCode(String upperAdministZoneCode) {
		this.upperAdministZoneCode = upperAdministZoneCode;
	}

	/**
	 * upperAdministZoneNm attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getUpperAdministZoneNm() {
		return upperAdministZoneNm;
	}

	/**
	 * upperAdministZoneNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param upperAdministZoneNm String
	 */
	public void setUpperAdministZoneNm(String upperAdministZoneNm) {
		this.upperAdministZoneNm = upperAdministZoneNm;
	}

	/**
	 * useAt attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getUseAt() {
		return useAt;
	}

	/**
	 * useAt attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param useAt String
	 */
	public void setUseAt(String useAt) {
		this.useAt = useAt;
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
