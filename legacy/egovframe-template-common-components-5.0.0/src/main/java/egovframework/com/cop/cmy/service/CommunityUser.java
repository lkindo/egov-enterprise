package egovframework.com.cop.cmy.service;

import java.io.Serializable;

import org.apache.commons.lang3.builder.ToStringBuilder;

/**
 * 而ㅻ??곕땲 ?ъ슜??愿由щ? ?꾪븳 紐⑤뜽  ?대옒??
 * @author 怨듯넻?쒕퉬?ㅺ컻諛쒗? ?댁궪??
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *   
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.4.2  ?댁궪??         理쒖큹 ?앹꽦
 *
 * </pre>
 */
@SuppressWarnings("serial")
public class CommunityUser implements Serializable {

    /** 而ㅻ??덊떚?꾩씠??*/
    private String cmmntyId = "";
    
    /** 理쒖큹?깅줉???꾩씠??*/
    private String frstRegisterId = "";
    
    /** 理쒖큹?깅줉?쒖젏 */
    private String frstRegisterPnttm = "";
    
    /** 理쒖쥌?섏젙???꾩씠??*/
    private String lastUpdusrId = "";
    
    /** 理쒖쥌?섏젙?쒖젏 */
    private String lastUpdusrPnttm = "";
    
    /** 愿由ъ옄?щ? */
    private String mngrAt = "";
    
    /** ?덊눜??*/
    private String secsnDe = "";
    
    /** 媛?낆씪 */
    private String sbscrbDe = "";
    
    /** ?ъ슜?щ? */
    private String useAt = "";
    
    /** ?ъ슜???꾩씠??*/
    private String emplyrId = "";
    
    /** ?ъ슜?먮챸 */
    private String emplyrNm = "";
    
    /** ?뚯썝 ID */
    private String userId = "";
   
    /** ?뚯썝 ?대찓??*/
    private String userEmail = "";
    
    /** ?뚯썝 ?곹깭 */
    private String mberSttus = "";

    /** ?뚯썝 ?곹깭 肄붾뱶紐?*/
    private String mberSttusNm = "";

    /**
     * cmmntyId attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the cmmntyId
     */
    public String getCmmntyId() {
	return cmmntyId;
    }

    /**
     * cmmntyId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param cmmntyId
     *            the cmmntyId to set
     */
    public void setCmmntyId(String cmmntyId) {
	this.cmmntyId = cmmntyId;
    }

    /**
     * frstRegisterId attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the frstRegisterId
     */
    public String getFrstRegisterId() {
	return frstRegisterId;
    }

    /**
     * frstRegisterId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param frstRegisterId
     *            the frstRegisterId to set
     */
    public void setFrstRegisterId(String frstRegisterId) {
	this.frstRegisterId = frstRegisterId;
    }

    /**
     * frstRegisterPnttm attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the frstRegisterPnttm
     */
    public String getFrstRegisterPnttm() {
	return frstRegisterPnttm;
    }

    /**
     * frstRegisterPnttm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param frstRegisterPnttm
     *            the frstRegisterPnttm to set
     */
    public void setFrstRegisterPnttm(String frstRegisterPnttm) {
	this.frstRegisterPnttm = frstRegisterPnttm;
    }

    /**
     * lastUpdusrId attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the lastUpdusrId
     */
    public String getLastUpdusrId() {
	return lastUpdusrId;
    }

    /**
     * lastUpdusrId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param lastUpdusrId
     *            the lastUpdusrId to set
     */
    public void setLastUpdusrId(String lastUpdusrId) {
	this.lastUpdusrId = lastUpdusrId;
    }

    /**
     * lastUpdusrPnttm attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the lastUpdusrPnttm
     */
    public String getLastUpdusrPnttm() {
	return lastUpdusrPnttm;
    }

    /**
     * lastUpdusrPnttm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param lastUpdusrPnttm
     *            the lastUpdusrPnttm to set
     */
    public void setLastUpdusrPnttm(String lastUpdusrPnttm) {
	this.lastUpdusrPnttm = lastUpdusrPnttm;
    }

    /**
     * mngrAt attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the mngrAt
     */
    public String getMngrAt() {
	return mngrAt;
    }

    /**
     * mngrAt attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param mngrAt
     *            the mngrAt to set
     */
    public void setMngrAt(String mngrAt) {
	this.mngrAt = mngrAt;
    }

    /**
     * secsnDe attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the secsnDe
     */
    public String getSecsnDe() {
	return secsnDe;
    }

    /**
     * secsnDe attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param secsnDe
     *            the secsnDe to set
     */
    public void setSecsnDe(String secsnDe) {
	this.secsnDe = secsnDe;
    }

    /**
     * sbscrbDe attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the sbscrbDe
     */
    public String getSbscrbDe() {
	return sbscrbDe;
    }

    /**
     * sbscrbDe attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param sbscrbDe
     *            the sbscrbDe to set
     */
    public void setSbscrbDe(String sbscrbDe) {
	this.sbscrbDe = sbscrbDe;
    }

    /**
     * useAt attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the useAt
     */
    public String getUseAt() {
	return useAt;
    }

    /**
     * useAt attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param useAt
     *            the useAt to set
     */
    public void setUseAt(String useAt) {
	this.useAt = useAt;
    }

    /**
     * emplyrId attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the emplyrId
     */
    public String getEmplyrId() {
	return emplyrId;
    }

    /**
     * emplyrId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param emplyrId
     *            the emplyrId to set
     */
    public void setEmplyrId(String emplyrId) {
	this.emplyrId = emplyrId;
    }

    /**
     * emplyrNm attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the emplyrNm
     */
    public String getEmplyrNm() {
	return emplyrNm;
    }

    /**
     * emplyrNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param emplyrNm
     *            the emplyrNm to set
     */
    public void setEmplyrNm(String emplyrNm) {
	this.emplyrNm = emplyrNm;
    }
    
    /**
     * userId attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the userId
     */
    public String getUserId() {
    	return userId;
    }
    
    /**
     * userId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param userId
     *            the userId to set
     */
    public void setUserId(String userId) {
    	this.userId = userId;
    }
    
    /**
     * userEmail attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the userEmail
     */
    public String getUserEmail() {
    	return userEmail;
    }
    
    /**
     * userEmail attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param userEmail
     *            the userEmail to set
     */
    public void setUserEmail(String userEmail) {
    	this.userEmail = userEmail;
    }
    
    /**
     * mberSttus attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the mberSttus
     */
    public String getMberSttus() {
    	return mberSttus;
    }
    
    /**
     * mberSttus attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param mberSttus
     *            the mberSttus to set
     */
    public void setMberSttus(String mberSttus) {
    	this.mberSttus = mberSttus;
    }
    
    /**
     * mberSttusNm attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the mberSttusNm
     */
    public String getMberSttusNm() {
    	return mberSttusNm;
    }
    
    /**
     * mberSttusNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param mberSttusNm
     *            the mberSttusNm to set
     */
    public void setMberSttusNm(String mberSttusNm) {
    	this.mberSttusNm = mberSttusNm;
    }

    /**
     * toString 硫붿냼?쒕? ?移섑븳??
     */
    public String toString() {
	return ToStringBuilder.reflectionToString(this);
    }
}
