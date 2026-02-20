package egovframework.com.cop.adb.service;

import java.io.Serializable;
/**
 * 二쇱냼濡?愿由щ? ?꾪븳 紐⑤뜽 ?대옒??
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
 *   2009.9.25  ?ㅼ꽦濡?         理쒖큹 ?앹꽦
 *   2016.12.13 理쒕몢??         ?대옒?ㅻ챸 蹂寃?
 *
 * </pre>
 */
@SuppressWarnings("serial")
public class AddressBook implements Serializable{
  
    /** 二쇱냼濡??꾩씠??*/
    private String adbkId = "";
    
    /** 二쇱냼濡?紐?*/
    private String adbkNm = "";
    
    /** 二쇱냼濡?怨듦컻踰붿쐞 */
    private String othbcScope = "";
    
    /** 理쒖큹?깅줉??遺??*/
    private String trgetOrgnztId = "";
    
    /** 二쇱냼濡??ъ슜?щ? */
    private String useAt = "";
    
    /** 二쇱냼濡??깅줉???꾩씠??/
    private String wrterId = "";
    
    /** 理쒖큹?깅줉???꾩씠??*/
    private String frstRegisterId = "";
    
    /** 理쒖큹?깅줉?쒖젏 */
    private String frstRegisterPnttm = "";
    
    /** 理쒖쥌?섏젙???꾩씠??*/
    private String lastUpdusrId = "";
    
    /** 理쒖쥌?섏젙?쒖젏 */
    private String lastUpdusrPnttm = "";
    
    
    /**
     * AdbkId attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the AdbkId
     */
    public String getAdbkId() {
        return adbkId;
    }

    /**
     * AdbkId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param AdbkId
     *            the AdbkId to set
     */
    public void setAdbkId(String adbkId) {
        this.adbkId = adbkId;
    }   
    
    /**
     * adbkNm attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the adbkNm
     */
    public String getAdbkNm() {
        return adbkNm;
    }

    /**
     * AdbkNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param AdbkNm
     *            the AdbkNm to set
     */
    public void setAdbkNm(String adbkNm) {
        this.adbkNm = adbkNm;
    }

    /**
     * othbcScope attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the othbcScope
     */
    public String getOthbcScope() {
        return othbcScope;
    }

    /**
     * othbcScope attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param othbcScope
     *            the othbcScope to set
     */
    public void setOthbcScope(String othbcScope) {
        this.othbcScope = othbcScope;
    }

    /**
     * trgetOrgnztId attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the trgetOrgnztId
     */
    public String getTrgetOrgnztId() {
        return trgetOrgnztId;
    }

    /**
     * trgetOrgnztId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param trgetOrgnztId
     *            the trgetOrgnztId to set
     */
    public void setTrgetOrgnztId(String trgetOrgnztId) {
        this.trgetOrgnztId = trgetOrgnztId;
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
     * wrterId attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the wrterId
     */
    public String getWrterId() {
        return wrterId;
    }

    /**
     * wrterId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param wrterId
     *            the wrterId to set
     */
    public void setWrterId(String wrterId) {
        this.wrterId = wrterId;
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
     * @param AdbkNm
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

  
    
}
