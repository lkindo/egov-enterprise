package egovframework.com.uss.ion.wik.bmk.service;

import egovframework.com.cmm.ComDefaultVO;

/**
 * ????Model and VO Class ?
 * 
 * @author ????? ???
 * @since 2010.10.20
 * @version 1.0
 * @see
 * 
 *      <pre>
 * &lt;&lt; ?????Modification Information) &gt;&gt;
 *   
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2010.10.20  ???         ????
 * 
 *      </pre>
 **/
public class WikiBookmark extends ComDefaultVO {

	private static final long serialVersionUID = 1L;

	/** ? ??????**/
	private String wikiBkmkId;

	/** ???? **/
	private String usid;

	/** ????**/
	private String wikiBkmkNm;

	/** ???? **/
	private String frstRegisterPnttm;

	/** ?????**/
	private String frstRegisterId;

	/** ????**/
	private String lastUpdusrPnttm;

	/** ???????**/
	private String lastUpdusrId;

	/**
	 * @return the wikiBookMarkId
	 **/
	public String getWikiBkmkId() {
		return wikiBkmkId;
	}

	/**
	 * @param wikiBookMarkId the wikiBookMarkId to set
	 **/
	public void setWikiBkmkId(String wikiBookmarkId) {
		this.wikiBkmkId = wikiBookmarkId;
	}

	/**
	 * @return the usid
	 **/
	public String getUsid() {
		return usid;
	}

	/**
	 * @param usid the usid to set
	 **/
	public void setUsid(String usid) {
		this.usid = usid;
	}

	/**
	 * @return the bookMark
	 **/
	public String getWikiBkmkNm() {
		return wikiBkmkNm;
	}

	/**
	 * @param bookMark the bookMark to set
	 **/
	public void setWikiBkmkNm(String bookMark) {
		this.wikiBkmkNm = bookMark;
	}

	/**
	 * @return the frstRegisterPnttm
	 **/
	public String getFrstRegisterPnttm() {
		return frstRegisterPnttm;
	}

	/**
	 * @param frstRegisterPnttm the frstRegisterPnttm to set
	 **/
	public void setFrstRegisterPnttm(String frstRegisterPnttm) {
		this.frstRegisterPnttm = frstRegisterPnttm;
	}

	/**
	 * @return the frstRegisterId
	 **/
	public String getFrstRegisterId() {
		return frstRegisterId;
	}

	/**
	 * @param frstRegisterId the frstRegisterId to set
	 **/
	public void setFrstRegisterId(String frstRegisterId) {
		this.frstRegisterId = frstRegisterId;
	}

	/**
	 * @return the lastUpdusrPnttm
	 **/
	public String getLastUpdusrPnttm() {
		return lastUpdusrPnttm;
	}

	/**
	 * @param lastUpdusrPnttm the lastUpdusrPnttm to set
	 **/
	public void setLastUpdusrPnttm(String lastUpdusrPnttm) {
		this.lastUpdusrPnttm = lastUpdusrPnttm;
	}

	/**
	 * @return the lastUpdusrId
	 **/
	public String getLastUpdusrId() {
		return lastUpdusrId;
	}

	/**
	 * @param lastUpdusrId the lastUpdusrId to set
	 **/
	public void setLastUpdusrId(String lastUpdusrId) {
		this.lastUpdusrId = lastUpdusrId;
	}

}
