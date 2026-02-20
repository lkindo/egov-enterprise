package egovframework.com.cop.adb.service;

import java.io.Serializable;

/**
 * 二쇱냼濡앷뎄?깆썝 愿由щ? ?꾪븳 紐⑤뜽 ?대옒??
 * @author 怨듯넻而댄룷?뚰듃媛쒕컻? ?ㅼ꽦濡?
 * @since 2009.09.25
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *   
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *	2016.12.13 理쒕몢??         ?대옒?ㅻ챸 蹂寃?
 * </pre>
 */
@SuppressWarnings("serial")
public class AddressBookUser implements Serializable{

    /** 二쇱냼濡앷뎄?깆썝 ?꾩씠??*/
    private String adbkUserId = "";  
    
    /** 二쇱냼濡??꾩씠??*/
    private String adbkId = "";
    
    /** ?ъ슜???꾩씠??*/
    private String emplyrId = "";
    
    /** 紐낇븿 ?꾩씠??*/
    private String ncrdId = "";
    
    /** 二쇱냼濡앷뎄?깆썝 ?대쫫 */
    private String nm = "";    

    /** ?대찓??二쇱냼  */
    private String emailAdres = "";
    
    /** 吏??꾪솕踰덊샇  */
    private String homeTelno = "";
    
    /** ??踰덊샇  */
    private String moblphonNo = "";
    
    /** ?뚯궗 踰덊샇  */
    private String offmTelno = "";
    
    /** ?⑹뒪 踰덊샇  */
    private String fxnum = "";
        
    /**
     * adbkUserId attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the adbkUserId
     */
    public String getAdbkUserId() {
        return adbkUserId;
    }
    
    /**
     * adbkUserId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param adbkUserId
     *            the adbkUserId to set
     */
    public void setAdbkUserId(String adbkUserId) {
        this.adbkUserId = adbkUserId;
    }
    
    /**
     * adbkId attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the adbkId
     */
    public String getAdbkId() {
        return adbkId;
    }
    
    /**
     * adbkId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param adbkId
     *            the adbkId to set
     */
    public void setAdbkId(String adbkId) {
        this.adbkId = adbkId;
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
     * ncrdId attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the ncrdId
     */
    public String getNcrdId() {
        return ncrdId;
    }
    
    /**
     * ncrdId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param ncrdId
     *            the ncrdId to set
     */
    public void setNcrdId(String ncrdId) {
        this.ncrdId = ncrdId;
    }
    
    /**
     * nm attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the nm
     */
    public String getNm() {
        return nm;
    }
    
    /**
     * nm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param nm
     *            the nm to set
     */
    public void setNm(String nm) {
        this.nm = nm;
    }
    
    /**
     * emailAdres attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the emailAdres
     */
    public String getEmailAdres() {
        return emailAdres;
    }
    
    /**
     * emailAdres attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param emailAdres
     *            the emailAdres to set
     */
    public void setEmailAdres(String emailAdres) {
        this.emailAdres = emailAdres;
    }    
    
    /**
     * homeTelno attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the homeTelno
     */
    public String getHomeTelno() {
        return homeTelno;
    }

    /**
     * homeTelno attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param homeTelno
     *            the homeTelno to set
     */
    public void setHomeTelno(String homeTelno) {
        this.homeTelno = homeTelno;
    }

    /**
     * moblphonNo attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the moblphonNo
     */
    public String getMoblphonNo() {
        return moblphonNo;
    }

    /**
     * moblphonNo attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param moblphonNo
     *            the moblphonNo to set
     */
    public void setMoblphonNo(String moblphonNo) {
        this.moblphonNo = moblphonNo;
    }

    /**
     * offmTelno attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the offmTelno
     */
    public String getOffmTelno() {
        return offmTelno;
    }

    /**
     * offmTelno attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param offmTelno
     *            the offmTelno to set
     */
    public void setOffmTelno(String offmTelno) {
        this.offmTelno = offmTelno;
    }

    /**
     * fxnum attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the fxnum
     */
    public String getFxnum() {
        return fxnum;
    }

    /**
     * fxnum attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param fxnum
     *            the fxnum to set
     */
    public void setFxnum(String fxnum) {
        this.fxnum = fxnum;
    }
}
