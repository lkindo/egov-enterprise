package egovframework.com.uss.ion.rsn.service;

import java.io.Serializable;

import egovframework.com.cmm.ComDefaultVO;

/**
 * RSS?쒕퉬??Model and VO Class 援ы쁽
 * @author 怨듯넻?쒕퉬???λ룞??
 * @since 2010.06.16
 * @version 1.0
 * @see <pre>
 * &lt;&lt; 媛쒖젙?대젰(Modification Information) &gt;&gt;
 *   
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.07.03  ?λ룞??         理쒖큹 ?앹꽦
 * 
 * </pre>
 */
@SuppressWarnings("serial")
public class RssInfo extends ComDefaultVO implements Serializable{
	
	/** RSS?쒓렇愿由??꾩씠??*/
	private String rssId;
	
	/** ?쒕퉬?ㅻ챸 */
	private String trgetSvcNm;
	
	/** ?쒕퉬?짽ABLE */
	private String trgetSvcTable;
	
	/** ?ㅻ뜑 TITLE */
	private String hderTitle;
	
	/** ?ㅻ뜑	LINK */
	private String hderLink;
	
	/** ?ㅻ뜑 DESCRIPTION */
	private String hderDescription;
	
	/** ?ㅻ뜑 TAG */
	private String hderTag;
	
	/** ?ㅻ뜑 ETC */
	private String hderEtc;
	
	/** 蹂몃Ц TITLE */
	private String bdtTitle;
	
	/** 蹂몃Ц LINK */
	private String bdtLink;
	
	/** 蹂몃Ц DESCRIPTION */
	private String bdtDescription;
	
	/** 蹂몃Ц TAG */
	private String bdtTag;
	
	/** 蹂몃Ц ETC */
	private String bdtEtc;
	
    /** 理쒖큹?깅줉?쒖젏 */
    private String frstRegisterPnttm;

    /** 理쒖큹?깅줉?꾩씠??*/
    private String frstRegisterId;

    /** 理쒖쥌?섏젙??*/
    private String lastUpdusrPnttm;

    /** 理쒖쥌?섏젙???꾩씠??*/
    private String lastUpdusrId;

	/**
	 * @return the rssId
	 */
	public String getRssId() {
		return rssId;
	}

	/**
	 * @param rssId the rssId to set
	 */
	public void setRssId(String rssId) {
		this.rssId = rssId;
	}

	/**
	 * @return the trgetSvcNm
	 */
	public String getTrgetSvcNm() {
		return trgetSvcNm;
	}

	/**
	 * @param trgetSvcNm the trgetSvcNm to set
	 */
	public void setTrgetSvcNm(String trgetSvcNm) {
		this.trgetSvcNm = trgetSvcNm;
	}

	/**
	 * @return the trgetSvcTable
	 */
	public String getTrgetSvcTable() {
		return trgetSvcTable;
	}

	/**
	 * @param trgetSvcTable the trgetSvcTable to set
	 */
	public void setTrgetSvcTable(String trgetSvcTable) {
		this.trgetSvcTable = trgetSvcTable;
	}

	/**
	 * @return the hderTitle
	 */
	public String getHderTitle() {
		return hderTitle;
	}

	/**
	 * @param hderTitle the hderTitle to set
	 */
	public void setHderTitle(String hderTitle) {
		this.hderTitle = hderTitle;
	}

	/**
	 * @return the hderLink
	 */
	public String getHderLink() {
		return hderLink;
	}

	/**
	 * @param hderLink the hderLink to set
	 */
	public void setHderLink(String hderLink) {
		this.hderLink = hderLink;
	}

	/**
	 * @return the hderDescription
	 */
	public String getHderDescription() {
		return hderDescription;
	}

	/**
	 * @param hderDescription the hderDescription to set
	 */
	public void setHderDescription(String hderDescription) {
		this.hderDescription = hderDescription;
	}

	/**
	 * @return the hderTag
	 */
	public String getHderTag() {
		return hderTag;
	}

	/**
	 * @param hderTag the hderTag to set
	 */
	public void setHderTag(String hderTag) {
		this.hderTag = hderTag;
	}

	/**
	 * @return the hderEtc
	 */
	public String getHderEtc() {
		return hderEtc;
	}

	/**
	 * @param hderEtc the hderEtc to set
	 */
	public void setHderEtc(String hderEtc) {
		this.hderEtc = hderEtc;
	}

	/**
	 * @return the bdtTitle
	 */
	public String getBdtTitle() {
		return bdtTitle;
	}

	/**
	 * @param bdtTitle the bdtTitle to set
	 */
	public void setBdtTitle(String bdtTitle) {
		this.bdtTitle = bdtTitle;
	}

	/**
	 * @return the bdtLink
	 */
	public String getBdtLink() {
		return bdtLink;
	}

	/**
	 * @param bdtLink the bdtLink to set
	 */
	public void setBdtLink(String bdtLink) {
		this.bdtLink = bdtLink;
	}

	/**
	 * @return the bdtDescription
	 */
	public String getBdtDescription() {
		return bdtDescription;
	}

	/**
	 * @param bdtDescription the bdtDescription to set
	 */
	public void setBdtDescription(String bdtDescription) {
		this.bdtDescription = bdtDescription;
	}

	/**
	 * @return the bdtTag
	 */
	public String getBdtTag() {
		return bdtTag;
	}

	/**
	 * @param bdtTag the bdtTag to set
	 */
	public void setBdtTag(String bdtTag) {
		this.bdtTag = bdtTag;
	}

	/**
	 * @return the bdtEtc
	 */
	public String getBdtEtc() {
		return bdtEtc;
	}

	/**
	 * @param bdtEtc the bdtEtc to set
	 */
	public void setBdtEtc(String bdtEtc) {
		this.bdtEtc = bdtEtc;
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
