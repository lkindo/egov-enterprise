package egovframework.com.uss.ion.wik.bmk.service;

import java.io.Serializable;

import egovframework.com.cmm.ComDefaultVO;

/**
 * ?꾪궎遺곷쭏??Model and VO Class 援ы쁽
 * @author 怨듯넻肄ㅽ룷?뚰듃 ?λ룞??
 * @since 2010.10.20
 * @version 1.0
 * @see <pre>
 * &lt;&lt; 媛쒖젙?대젰(Modification Information) &gt;&gt;
 *   
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.10.20  ?λ룞??         理쒖큹 ?앹꽦
 * 
 * </pre>
 */
@SuppressWarnings("serial")
public class WikiBookmark extends ComDefaultVO implements Serializable{
    	
	/** ?꾪궎 遺곷쭏???꾩씠??*/
	private String wikiBkmkId;	
	
	/** ?ъ슜?륤D */
	private String usid;
	
	/** 遺곷쭏?щ챸 */
	private String wikiBkmkNm;
	
    /** 理쒖큹?깅줉?쒖젏 */
    private String frstRegisterPnttm;

    /** 理쒖큹?깅줉?꾩씠??*/
    private String frstRegisterId;

    /** 理쒖쥌?섏젙??*/
    private String lastUpdusrPnttm;

    /** 理쒖쥌?섏젙???꾩씠??*/
    private String lastUpdusrId;

	/**
	 * @return the wikiBookMarkId
	 */
	public String getWikiBkmkId() {
		return wikiBkmkId;
	}

	/**
	 * @param wikiBookMarkId the wikiBookMarkId to set
	 */
	public void setWikiBkmkId(String wikiBookmarkId) {
		this.wikiBkmkId = wikiBookmarkId;
	}

	/**
	 * @return the usid
	 */
	public String getUsid() {
		return usid;
	}

	/**
	 * @param usid the usid to set
	 */
	public void setUsid(String usid) {
		this.usid = usid;
	}

	/**
	 * @return the bookMark
	 */
	public String getWikiBkmkNm() {
		return wikiBkmkNm;
	}

	/**
	 * @param bookMark the bookMark to set
	 */
	public void setWikiBkmkNm(String bookMark) {
		this.wikiBkmkNm = bookMark;
	}

	/**
	 * @return the frstRegisterPnttm
	 */
	public String getFrstRegisterPnttm() {
		return frstRegisterPnttm;
	}

	/**
	 * @param frstRegisterPnttm the frstRegisterPnttm to set
	 */
	public void setFrstRegisterPnttm(String frstRegisterPnttm) {
		this.frstRegisterPnttm = frstRegisterPnttm;
	}

	/**
	 * @return the frstRegisterId
	 */
	public String getFrstRegisterId() {
		return frstRegisterId;
	}

	/**
	 * @param frstRegisterId the frstRegisterId to set
	 */
	public void setFrstRegisterId(String frstRegisterId) {
		this.frstRegisterId = frstRegisterId;
	}

	/**
	 * @return the lastUpdusrPnttm
	 */
	public String getLastUpdusrPnttm() {
		return lastUpdusrPnttm;
	}

	/**
	 * @param lastUpdusrPnttm the lastUpdusrPnttm to set
	 */
	public void setLastUpdusrPnttm(String lastUpdusrPnttm) {
		this.lastUpdusrPnttm = lastUpdusrPnttm;
	}

	/**
	 * @return the lastUpdusrId
	 */
	public String getLastUpdusrId() {
		return lastUpdusrId;
	}

	/**
	 * @param lastUpdusrId the lastUpdusrId to set
	 */
	public void setLastUpdusrId(String lastUpdusrId) {
		this.lastUpdusrId = lastUpdusrId;
	}

	
    
    
}
