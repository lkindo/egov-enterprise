package egovframework.com.ssi.syi.ims.service;

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
public class CntcMessageItem implements Serializable {
	private static final long serialVersionUID = -7407577168160335040L;

	/*
	 * ?ID
	 */
	private String cntcMessageId     = "";

	/*
	 * ???D
	 */
	private String itemId            = "";

	/*
	 * ????
	 */
	private String itemNm            = "";

	/*
	 * ???????
	 */
	private String itemType          = "";

	/*
	 * ???
	 */
	private int    itemLt            = 0 ;

	/*
	 * ???
	 */
	private String frstRegisterId    = "";

	/*
	 * ???
	 */
	private String lastUpdusrId      = "";

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
	 * itemId attribute ?????.
	 * @return String
	 **/
	public String getItemId() {
		return itemId;
	}

	/**
	 * itemId attribute ???????.
	 * @param itemId String
	 **/
	public void setItemId(String itemId) {
		this.itemId = itemId;
	}

	/**
	 * itemNm attribute ?????.
	 * @return String
	 **/
	public String getItemNm() {
		return itemNm;
	}

	/**
	 * itemNm attribute ???????.
	 * @param itemNm String
	 **/
	public void setItemNm(String itemNm) {
		this.itemNm = itemNm;
	}

	/**
	 * itemType attribute ?????.
	 * @return String
	 **/
	public String getItemType() {
		return itemType;
	}

	/**
	 * itemType attribute ???????.
	 * @param itemType String
	 **/
	public void setItemType(String itemType) {
		this.itemType = itemType;
	}

	/**
	 * itemLt attribute ?????.
	 * @return int
	 **/
	public int getItemLt() {
		return itemLt;
	}

	/**
	 * itemLt attribute ???????.
	 * @param itemLt int
	 **/
	public void setItemLt(int itemLt) {
		this.itemLt = itemLt;
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
