package egovframework.com.ssi.syi.ims.service;

import java.io.Serializable;

/**
 * ?곌퀎硫붿떆吏??ぉ 紐⑤뜽 ?대옒??
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
public class CntcMessageItem implements Serializable {
	private static final long serialVersionUID = -7407577168160335040L;

	/*
	 * ?곌퀎硫붿떆吏ID
	 */
	private String cntcMessageId     = "";

	/*
	 * ??ぉID
	 */
	private String itemId            = "";

	/*
	 * ??ぉ紐?
	 */
	private String itemNm            = "";

	/*
	 * ??ぉ???
	 */
	private String itemType          = "";

	/*
	 * ??ぉ湲몄씠
	 */
	private int    itemLt            = 0 ;

	/*
	 * 理쒖큹?깅줉?륤D
	 */
	private String frstRegisterId    = "";

	/*
	 * 理쒖쥌?섏젙?륤D
	 */
	private String lastUpdusrId      = "";

	/**
	 * cntcMessageId attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getCntcMessageId() {
		return cntcMessageId;
	}

	/**
	 * cntcMessageId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param cntcMessageId String
	 */
	public void setCntcMessageId(String cntcMessageId) {
		this.cntcMessageId = cntcMessageId;
	}

	/**
	 * itemId attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getItemId() {
		return itemId;
	}

	/**
	 * itemId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param itemId String
	 */
	public void setItemId(String itemId) {
		this.itemId = itemId;
	}

	/**
	 * itemNm attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getItemNm() {
		return itemNm;
	}

	/**
	 * itemNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param itemNm String
	 */
	public void setItemNm(String itemNm) {
		this.itemNm = itemNm;
	}

	/**
	 * itemType attribute 瑜?由ы꽩?쒕떎.
	 * @return String
	 */
	public String getItemType() {
		return itemType;
	}

	/**
	 * itemType attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param itemType String
	 */
	public void setItemType(String itemType) {
		this.itemType = itemType;
	}

	/**
	 * itemLt attribute 瑜?由ы꽩?쒕떎.
	 * @return int
	 */
	public int getItemLt() {
		return itemLt;
	}

	/**
	 * itemLt attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 * @param itemLt int
	 */
	public void setItemLt(int itemLt) {
		this.itemLt = itemLt;
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
