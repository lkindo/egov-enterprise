package egovframework.com.sym.ccm.icr.service;

import java.io.Serializable;

/**
 * 湲곌?肄붾뱶?섏떊濡쒓렇 紐⑤뜽 ?대옒??
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
public class InsttCodeRecptn implements Serializable {

	private static final long serialVersionUID = 1370791089416059647L;

	/*
	 * 諛쒖깮?쇱옄
	 */
	private String occrrDe = "" ;

	/*
	 * 湲곌?肄붾뱶
	 */
	private String insttCode = "" ;

    /**
     * ?묒뾽?쇰젴踰덊샇
     */
    int	opertSn = 0;

	/*
	 * 蹂寃쎄뎄遺꾩퐫??
	 */
	private String changeSeCode = "" ;

	/*
	 * 泥섎━援щ텇
	 */
	private String processSe = "" ;

	/*
	 * 湲고?肄붾뱶
	 */
	private String etcCode = "" ;

	/*
	 * ?꾩껜湲곌?紐?
	 */
	private String allInsttNm = "" ;

	/*
	 * 理쒗븯?꾧린愿紐?
	 */
	private String lowestInsttNm = "" ;

	/*
	 * 湲곌??쎌묶紐?
	 */
	private String insttAbrvNm = "" ;

	/*
	 * 李⑥닔
	 */
	private String odr = "" ;

	/*
	 * ?쒖뿴
	 */
	private String ord = "" ;

	/*
	 * 湲곌?李⑥닔
	 */
	private String insttOdr = "" ;

	/*
	 * 理쒖긽?꾧린愿肄붾뱶
	 */
	private String bestInsttCode = "" ;

	/*
	 * ?곸쐞湲곌?肄붾뱶
	 */
	private String upperInsttCode = "" ;

	/*
	 * ??쒓린愿肄붾뱶
	 */
	private String reprsntInsttCode = "" ;

	/*
	 * 湲곌??좏삎?遺꾨쪟
	 */
	private String insttTyLclas = "" ;

	/*
	 * 湲곌??좏삎以묐텇瑜?
	 */
	private String insttTyMclas = "" ;

	/*
	 * 湲곌??좏삎?뚮텇瑜?
	 */
	private String insttTySclas = "" ;

	/*
	 * ?꾪솕踰덊샇
	 */
	private String telno = "" ;

	/*
	 * ?⑹뒪踰덊샇
	 */
	private String fxnum = "" ;

	/*
	 * ?앹꽦?쇱옄
	 */
	private String creatDe = "" ;

	/*
	 * ?먯??쇱옄
	 */
	private String ablDe = "" ;

	/*
	 * ?먯??좊Т
	 */
	private String ablEnnc = "" ;

	/*
	 * 蹂寃쎌씪??
	 */
	private String changede = "" ;

	/*
	 * 蹂寃쎌떆媛?
	 */
	private String changeTime = "" ;

	/*
	 * 湲곗큹?쇱옄
	 */
	private String bsisDe = "" ;

	/*
	 * ?뺣젹?쒖꽌
	 */
	private int sortOrdr = 0 ;

	/*
	 * 理쒖큹?깅줉?륤D
	 */
	private String frstRegisterId = "" ;

	/*
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
	 * insttCode attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getInsttCode() {
		return insttCode;
	}

	/**
	 * insttCode attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param insttCode String
	 */
	public void setInsttCode(String insttCode) {
		this.insttCode = insttCode;
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
	 * etcCode attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getEtcCode() {
		return etcCode;
	}

	/**
	 * etcCode attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param etcCode String
	 */
	public void setEtcCode(String etcCode) {
		this.etcCode = etcCode;
	}

	/**
	 * allInsttNm attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getAllInsttNm() {
		return allInsttNm;
	}

	/**
	 * allInsttNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param allInsttNm String
	 */
	public void setAllInsttNm(String allInsttNm) {
		this.allInsttNm = allInsttNm;
	}

	/**
	 * lowestInsttNm attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getLowestInsttNm() {
		return lowestInsttNm;
	}

	/**
	 * lowestInsttNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param lowestInsttNm String
	 */
	public void setLowestInsttNm(String lowestInsttNm) {
		this.lowestInsttNm = lowestInsttNm;
	}

	/**
	 * insttAbrvNm attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getInsttAbrvNm() {
		return insttAbrvNm;
	}

	/**
	 * insttAbrvNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param insttAbrvNm String
	 */
	public void setInsttAbrvNm(String insttAbrvNm) {
		this.insttAbrvNm = insttAbrvNm;
	}

	/**
	 * odr attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getOdr() {
		return odr;
	}

	/**
	 * odr attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param odr String
	 */
	public void setOdr(String odr) {
		this.odr = odr;
	}

	/**
	 * ord attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getOrd() {
		return ord;
	}

	/**
	 * ord attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param ord String
	 */
	public void setOrd(String ord) {
		this.ord = ord;
	}

	/**
	 * insttOdr attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getInsttOdr() {
		return insttOdr;
	}

	/**
	 * insttOdr attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param insttOdr String
	 */
	public void setInsttOdr(String insttOdr) {
		this.insttOdr = insttOdr;
	}

	/**
	 * bestInsttCode attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getBestInsttCode() {
		return bestInsttCode;
	}

	/**
	 * bestInsttCode attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param bestInsttCode String
	 */
	public void setBestInsttCode(String bestInsttCode) {
		this.bestInsttCode = bestInsttCode;
	}

	/**
	 * upperInsttCode attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getUpperInsttCode() {
		return upperInsttCode;
	}

	/**
	 * upperInsttCode attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param upperInsttCode String
	 */
	public void setUpperInsttCode(String upperInsttCode) {
		this.upperInsttCode = upperInsttCode;
	}

	/**
	 * reprsntInsttCode attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getReprsntInsttCode() {
		return reprsntInsttCode;
	}

	/**
	 * reprsntInsttCode attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param reprsntInsttCode String
	 */
	public void setReprsntInsttCode(String reprsntInsttCode) {
		this.reprsntInsttCode = reprsntInsttCode;
	}

	/**
	 * insttTyLclas attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getInsttTyLclas() {
		return insttTyLclas;
	}

	/**
	 * insttTyLclas attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param insttTyLclas String
	 */
	public void setInsttTyLclas(String insttTyLclas) {
		this.insttTyLclas = insttTyLclas;
	}

	/**
	 * insttTyMclas attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getInsttTyMclas() {
		return insttTyMclas;
	}

	/**
	 * insttTyMclas attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param insttTyMclas String
	 */
	public void setInsttTyMclas(String insttTyMclas) {
		this.insttTyMclas = insttTyMclas;
	}

	/**
	 * insttTySclas attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getInsttTySclas() {
		return insttTySclas;
	}

	/**
	 * insttTySclas attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param insttTySclas String
	 */
	public void setInsttTySclas(String insttTySclas) {
		this.insttTySclas = insttTySclas;
	}

	/**
	 * telno attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getTelno() {
		return telno;
	}

	/**
	 * telno attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param telno String
	 */
	public void setTelno(String telno) {
		this.telno = telno;
	}

	/**
	 * fxnum attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getFxnum() {
		return fxnum;
	}

	/**
	 * fxnum attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param fxnum String
	 */
	public void setFxnum(String fxnum) {
		this.fxnum = fxnum;
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
	 * changede attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getChangede() {
		return changede;
	}

	/**
	 * changede attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param changede String
	 */
	public void setChangede(String changede) {
		this.changede = changede;
	}

	/**
	 * changeTime attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getChangeTime() {
		return changeTime;
	}

	/**
	 * changeTime attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param changeTime String
	 */
	public void setChangeTime(String changeTime) {
		this.changeTime = changeTime;
	}

	/**
	 * bsisDe attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getBsisDe() {
		return bsisDe;
	}

	/**
	 * bsisDe attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param bsisDe String
	 */
	public void setBsisDe(String bsisDe) {
		this.bsisDe = bsisDe;
	}

	/**
	 * sortOrdr attribute 瑜?由ы꽩?쒕떎.
	 * @return int
	 */
	public int getSortOrdr() {
		return sortOrdr;
	}

	/**
	 * sortOrdr attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param sortOrdr int
	 */
	public void setSortOrdr(int sortOrdr) {
		this.sortOrdr = sortOrdr;
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
