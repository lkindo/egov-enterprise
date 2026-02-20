package egovframework.com.cop.ncm.service;

import java.io.Serializable;

import org.apache.commons.lang3.builder.ToStringBuilder;


/**
 * 紐낇븿?뺣낫 愿由щ? ?꾪븳 紐⑤뜽 ?대옒??
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
 *   2009.3.28  ?댁궪??         理쒖큹 ?앹꽦
 *
 * </pre>
 */
@SuppressWarnings("serial")
public class NameCard implements Serializable {

    /** 二쇱냼 */
    private String adres = "";
    
    /** 吏??쾲??*/
    private String areaNo = "";
    
    /** 吏곴툒紐?*/
    private String clsfNm = "";
    
    /** ?뚯궗紐?*/
    private String cmpnyNm = "";
    
    /** 遺?쒕챸 */
    private String deptNm = "";
    
    /** ?대찓?쇱＜??*/
    private String emailAdres = "";
    
    /** ?앺쑕??곕쾲??*/
    private String endMbtlNum = "";
    
    /** ?앹쟾?붾쾲??*/
    private String endTelNo = "";
    
    /** ?몃??ъ슜?먯뿬遺 */
    private String extrlUserAt = "";
    
    /** 理쒖큹?깅줉???꾩씠??*/
    private String frstRegisterId = "";
    
    /** 理쒖큹?깅줉?쒖젏 */
    private String frstRegisterPnttm = "";
    
    /** ?앸퀎踰덊샇 */
    private String idntfcNo = "";
    
    /** 理쒖쥌?섏젙???꾩씠??*/
    private String lastUpdusrId = "";
    
    /** 理쒖쥌?섏젙?쒖젏 */
    private String lastUpdusrPnttm = "";
    
    /** ?대??곕쾲??*/
    private String mbtlNum = "";
    
    /** 以묎컙?대??곕쾲??*/
    private String middleMbtlNum = "";
    
    /** 以묎컙?꾪솕踰덊샇 */
    private String middleTelNo = "";
    
    /** 援??踰덊샇 */
    private String nationNo = "";
    
    /** 紐낇븿?꾩씠??*/
    private String ncrdId = "";
    
    /** 紐낇븿??곸옄 ?꾩씠??*/
    private String ncrdTrgterId = "";
    
    /** ?대쫫 */
    private String ncrdNm = "";
    
    /** 吏곸쐞紐?*/
    private String ofcpsNm = "";
    
    /** 怨듦컻?щ? */
    private String othbcAt = "";
    
    /** 鍮꾧퀬 */
    private String remark = "";
    
    /** ?꾪솕踰덊샇 */
    private String telNo = "";

    /** ?곸꽭二쇱냼 */
    private String detailAdres = "";
    
    /** ?고렪踰덊샇 */
    private String zipCode = "";

    /**
     * adres attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the adres
     */
    public String getAdres() {
	return adres;
    }

    /**
     * adres attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param adres
     *            the adres to set
     */
    public void setAdres(String adres) {
	this.adres = adres;
    }

    /**
     * areaNo attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the areaNo
     */
    public String getAreaNo() {
	return areaNo;
    }

    /**
     * areaNo attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param areaNo
     *            the areaNo to set
     */
    public void setAreaNo(String areaNo) {
	this.areaNo = areaNo;
    }

    /**
     * clsfNm attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the clsfNm
     */
    public String getClsfNm() {
	return clsfNm;
    }

    /**
     * clsfNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param clsfNm
     *            the clsfNm to set
     */
    public void setClsfNm(String clsfNm) {
	this.clsfNm = clsfNm;
    }

    /**
     * cmpnyNm attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the cmpnyNm
     */
    public String getCmpnyNm() {
	return cmpnyNm;
    }

    /**
     * cmpnyNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param cmpnyNm
     *            the cmpnyNm to set
     */
    public void setCmpnyNm(String cmpnyNm) {
	this.cmpnyNm = cmpnyNm;
    }

    /**
     * deptNm attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the deptNm
     */
    public String getDeptNm() {
	return deptNm;
    }

    /**
     * deptNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param deptNm
     *            the deptNm to set
     */
    public void setDeptNm(String deptNm) {
	this.deptNm = deptNm;
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
     * endMbtlNum attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the endMbtlNum
     */
    public String getEndMbtlNum() {
	return endMbtlNum;
    }

    /**
     * endMbtlNum attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param endMbtlNum
     *            the endMbtlNum to set
     */
    public void setEndMbtlNum(String endMbtlNum) {
	this.endMbtlNum = endMbtlNum;
    }

    /**
     * endTelNo attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the endTelNo
     */
    public String getEndTelNo() {
	return endTelNo;
    }

    /**
     * endTelNo attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param endTelNo
     *            the endTelNo to set
     */
    public void setEndTelNo(String endTelNo) {
	this.endTelNo = endTelNo;
    }

    /**
     * extrlUserAt attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the extrlUserAt
     */
    public String getExtrlUserAt() {
	return extrlUserAt;
    }

    /**
     * extrlUserAt attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param extrlUserAt
     *            the extrlUserAt to set
     */
    public void setExtrlUserAt(String extrlUserAt) {
	this.extrlUserAt = extrlUserAt;
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
     * idntfcNo attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the idntfcNo
     */
    public String getIdntfcNo() {
	return idntfcNo;
    }

    /**
     * idntfcNo attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param idntfcNo
     *            the idntfcNo to set
     */
    public void setIdntfcNo(String idntfcNo) {
	this.idntfcNo = idntfcNo;
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
     * mbtlNum attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the mbtlNum
     */
    public String getMbtlNum() {
	return mbtlNum;
    }

    /**
     * mbtlNum attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param mbtlNum
     *            the mbtlNum to set
     */
    public void setMbtlNum(String mbtlNum) {
	this.mbtlNum = mbtlNum;
    }

    /**
     * middleMbtlNum attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the middleMbtlNum
     */
    public String getMiddleMbtlNum() {
	return middleMbtlNum;
    }

    /**
     * middleMbtlNum attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param middleMbtlNum
     *            the middleMbtlNum to set
     */
    public void setMiddleMbtlNum(String middleMbtlNum) {
	this.middleMbtlNum = middleMbtlNum;
    }

    /**
     * middleTelNo attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the middleTelNo
     */
    public String getMiddleTelNo() {
	return middleTelNo;
    }

    /**
     * middleTelNo attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param middleTelNo
     *            the middleTelNo to set
     */
    public void setMiddleTelNo(String middleTelNo) {
	this.middleTelNo = middleTelNo;
    }

    /**
     * nationNo attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the nationNo
     */
    public String getNationNo() {
	return nationNo;
    }

    /**
     * nationNo attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param nationNo
     *            the nationNo to set
     */
    public void setNationNo(String nationNo) {
	this.nationNo = nationNo;
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
     * ncrdTrgterId attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the ncrdTrgterId
     */
    public String getNcrdTrgterId() {
	return ncrdTrgterId;
    }

    /**
     * ncrdTrgterId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param ncrdTrgterId
     *            the ncrdTrgterId to set
     */
    public void setNcrdTrgterId(String ncrdTrgterId) {
	this.ncrdTrgterId = ncrdTrgterId;
    }

    /**
     * ncrdNm attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the ncrdNm
     */
    public String getNcrdNm() {
	return ncrdNm;
    }

    /**
     * ncrdNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param ncrdNm
     *            the ncrdNm to set
     */
    public void setNcrdNm(String ncrdNm) {
	this.ncrdNm = ncrdNm;
    }

    /**
     * ofcpsNm attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the ofcpsNm
     */
    public String getOfcpsNm() {
	return ofcpsNm;
    }

    /**
     * ofcpsNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param ofcpsNm
     *            the ofcpsNm to set
     */
    public void setOfcpsNm(String ofcpsNm) {
	this.ofcpsNm = ofcpsNm;
    }

    /**
     * othbcAt attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the othbcAt
     */
    public String getOthbcAt() {
	return othbcAt;
    }

    /**
     * othbcAt attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param othbcAt
     *            the othbcAt to set
     */
    public void setOthbcAt(String othbcAt) {
	this.othbcAt = othbcAt;
    }

    /**
     * remark attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the remark
     */
    public String getRemark() {
	return remark;
    }

    /**
     * remark attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param remark
     *            the remark to set
     */
    public void setRemark(String remark) {
	this.remark = remark;
    }

    /**
     * telNo attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the telNo
     */
    public String getTelNo() {
	return telNo;
    }

    /**
     * telNo attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param telNo
     *            the telNo to set
     */
    public void setTelNo(String telNo) {
	this.telNo = telNo;
    }

    /**
     * detailAdres attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the detailAdres
     */
    public String getDetailAdres() {
	return detailAdres;
    }

    /**
     * detailAdres attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param detailAdres
     *            the detailAdres to set
     */
    public void setDetailAdres(String detailAdres) {
	this.detailAdres = detailAdres;
    }

    /**
     * zipCode attribute瑜?由ы꽩?쒕떎.
     * 
     * @return the zipCode
     */
    public String getZipCode() {
	return zipCode;
    }

    /**
     * zipCode attribute 媛믪쓣 ?ㅼ젙?쒕떎.
     * 
     * @param zipCode
     *            the zipCode to set
     */
    public void setZipCode(String zipCode) {
	this.zipCode = zipCode;
    }

    /**
     * toString 硫붿냼?쒕? ?移섑븳??
     */
    public String toString() {
	return ToStringBuilder.reflectionToString(this);
    }
}
