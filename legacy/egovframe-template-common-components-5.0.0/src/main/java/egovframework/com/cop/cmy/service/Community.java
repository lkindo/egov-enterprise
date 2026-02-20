package egovframework.com.cop.cmy.service;

import java.io.Serializable;

import org.apache.commons.lang3.builder.ToStringBuilder;

/**
 * 而ㅻ??덊떚 愿由щ? ?꾪븳 紐⑤뜽 ?대옒??
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
public class Community implements Serializable {

    /** 而ㅻ??덊떚 ?꾩씠??*/
    private String cmmntyId = "";
    
    /** 而ㅻ??덊떚 ?뚭컻 */
    private String cmmntyIntrcn = "";
    
    /** 而ㅻ??덊떚 紐?*/
    private String cmmntyNm = "";
    
    /** 理쒖큹?깅줉???꾩씠??*/
    private String frstRegisterId = "";
    
    /** 理쒖큹?깅줉?쒖젏 */
    private String frstRegisterPnttm = "";
    
    /** 理쒖쥌?섏젙???꾩씠??*/
    private String lastUpdusrId = "";
    
    /** 理쒖쥌?섏젙?쒖젏 */
    private String lastUpdusrPnttm = "";
    
    /** ?깅줉援щ텇肄붾뱶 */
    private String registSeCode = "";
    
    /** ?쒗뵆由??꾩씠??*/
    private String tmplatId = "";
    
    /** ?쒗뵆由??꾩씠??*/
    private String useAt = "";

    /** ?ъ슜???꾩씠??*/
    private String emplyrId = "";

    /** ?ъ슜?먮챸 */
    private String userNm = "";

    /** ?쒗뵆由?紐?*/
    private String tmplatNm = "";

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
     * cmmntyIntrcn attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the cmmntyIntrcn
     */
    public String getCmmntyIntrcn() {
	return cmmntyIntrcn;
    }

    /**
     * cmmntyIntrcn attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param cmmntyIntrcn
     *            the cmmntyIntrcn to set
     */
    public void setCmmntyIntrcn(String cmmntyIntrcn) {
	this.cmmntyIntrcn = cmmntyIntrcn;
    }

    /**
     * cmmntyNm attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the cmmntyNm
     */
    public String getCmmntyNm() {
	return cmmntyNm;
    }

    /**
     * cmmntyNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param cmmntyNm
     *            the cmmntyNm to set
     */
    public void setCmmntyNm(String cmmntyNm) {
	this.cmmntyNm = cmmntyNm;
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
     * registSeCode attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the registSeCode
     */
    public String getRegistSeCode() {
	return registSeCode;
    }

    /**
     * registSeCode attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param registSeCode
     *            the registSeCode to set
     */
    public void setRegistSeCode(String registSeCode) {
	this.registSeCode = registSeCode;
    }

    /**
     * tmplatId attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the tmplatId
     */
    public String getTmplatId() {
	return tmplatId;
    }

    /**
     * tmplatId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param tmplatId
     *            the tmplatId to set
     */
    public void setTmplatId(String tmplatId) {
	this.tmplatId = tmplatId;
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
     * userNm attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the userNm
     */
    public String getUserNm() {
	return userNm;
    }

    /**
     * userNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param userNm
     *            the userNm to set
     */
    public void setUserNm(String userNm) {
	this.userNm = userNm;
    }

    /**
     * tmplatNm attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the tmplatNm
     */
    public String getTmplatNm() {
	return tmplatNm;
    }

    /**
     * tmplatNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param tmplatNm
     *            the tmplatNm to set
     */
    public void setTmplatNm(String tmplatNm) {
	this.tmplatNm = tmplatNm;
    }

    /**
     * toString 硫붿냼?쒕? ?移섑븳??
     */
    public String toString() {
	return ToStringBuilder.reflectionToString(this);
    }
	
}
