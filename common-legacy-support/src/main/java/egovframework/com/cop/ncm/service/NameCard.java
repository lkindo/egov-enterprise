package egovframework.com.cop.ncm.service;

import java.io.Serializable;

import org.apache.commons.lang3.builder.ToStringBuilder;

/**
 * ? ??? ? ???????
 * 
 * @author ??????? ????
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 *      <pre>
 * << ?????Modification Information) >>
 *   
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.3.28  ????         ????
 *
 *      </pre>
 **/
public class NameCard implements Serializable {
    private static final long serialVersionUID = 1L;

    /** ??**/
    private String adres = "";

    /** ????**/
    private String areaNo = "";

    /** ??**/
    private String clsfNm = "";

    /** ????**/
    private String cmpnyNm = "";

    /** ??? **/
    private String deptNm = "";

    /** ??????**/
    private String emailAdres = "";

    /** ???????**/
    private String endMbtlNum = "";

    /** ?????**/
    private String endTelNo = "";

    /** ???????? **/
    private String extrlUserAt = "";

    /** ???????**/
    private String frstRegisterId = "";

    /** ???? **/
    private String frstRegisterPnttm = "";

    /** ??? **/
    private String idntfcNo = "";

    /** ???????**/
    private String lastUpdusrId = "";

    /** ???? **/
    private String lastUpdusrPnttm = "";

    /** ??????**/
    private String mbtlNum = "";

    /** ??????**/
    private String middleMbtlNum = "";

    /** ???**/
    private String middleTelNo = "";

    /** ?????**/
    private String nationNo = "";

    /** ???**/
    private String ncrdId = "";

    /** ??? ???**/
    private String ncrdTrgterId = "";

    /** ???**/
    private String ncrdNm = "";

    /** ??**/
    private String ofcpsNm = "";

    /** ???? **/
    private String othbcAt = "";

    /** ????**/
    private String remark = "";

    /** ???**/
    private String telNo = "";

    /** ???**/
    private String detailAdres = "";

    /** ???**/
    private String zipCode = "";

    /**
     * adres attribute?????.
     * 
     * @return the adres
     **/
    public String getAdres() {
        return adres;
    }

    /**
     * adres attribute ???????.
     * 
     * @param adres
     *              the adres to set
     **/
    public void setAdres(String adres) {
        this.adres = adres;
    }

    /**
     * areaNo attribute?????.
     * 
     * @return the areaNo
     **/
    public String getAreaNo() {
        return areaNo;
    }

    /**
     * areaNo attribute ???????.
     * 
     * @param areaNo
     *               the areaNo to set
     **/
    public void setAreaNo(String areaNo) {
        this.areaNo = areaNo;
    }

    /**
     * clsfNm attribute?????.
     * 
     * @return the clsfNm
     **/
    public String getClsfNm() {
        return clsfNm;
    }

    /**
     * clsfNm attribute ???????.
     * 
     * @param clsfNm
     *               the clsfNm to set
     **/
    public void setClsfNm(String clsfNm) {
        this.clsfNm = clsfNm;
    }

    /**
     * cmpnyNm attribute?????.
     * 
     * @return the cmpnyNm
     **/
    public String getCmpnyNm() {
        return cmpnyNm;
    }

    /**
     * cmpnyNm attribute ???????.
     * 
     * @param cmpnyNm
     *                the cmpnyNm to set
     **/
    public void setCmpnyNm(String cmpnyNm) {
        this.cmpnyNm = cmpnyNm;
    }

    /**
     * deptNm attribute?????.
     * 
     * @return the deptNm
     **/
    public String getDeptNm() {
        return deptNm;
    }

    /**
     * deptNm attribute ???????.
     * 
     * @param deptNm
     *               the deptNm to set
     **/
    public void setDeptNm(String deptNm) {
        this.deptNm = deptNm;
    }

    /**
     * emailAdres attribute?????.
     * 
     * @return the emailAdres
     **/
    public String getEmailAdres() {
        return emailAdres;
    }

    /**
     * emailAdres attribute ???????.
     * 
     * @param emailAdres
     *                   the emailAdres to set
     **/
    public void setEmailAdres(String emailAdres) {
        this.emailAdres = emailAdres;
    }

    /**
     * endMbtlNum attribute?????.
     * 
     * @return the endMbtlNum
     **/
    public String getEndMbtlNum() {
        return endMbtlNum;
    }

    /**
     * endMbtlNum attribute ???????.
     * 
     * @param endMbtlNum
     *                   the endMbtlNum to set
     **/
    public void setEndMbtlNum(String endMbtlNum) {
        this.endMbtlNum = endMbtlNum;
    }

    /**
     * endTelNo attribute?????.
     * 
     * @return the endTelNo
     **/
    public String getEndTelNo() {
        return endTelNo;
    }

    /**
     * endTelNo attribute ???????.
     * 
     * @param endTelNo
     *                 the endTelNo to set
     **/
    public void setEndTelNo(String endTelNo) {
        this.endTelNo = endTelNo;
    }

    /**
     * extrlUserAt attribute?????.
     * 
     * @return the extrlUserAt
     **/
    public String getExtrlUserAt() {
        return extrlUserAt;
    }

    /**
     * extrlUserAt attribute ???????.
     * 
     * @param extrlUserAt
     *                    the extrlUserAt to set
     **/
    public void setExtrlUserAt(String extrlUserAt) {
        this.extrlUserAt = extrlUserAt;
    }

    /**
     * frstRegisterId attribute?????.
     * 
     * @return the frstRegisterId
     **/
    public String getFrstRegisterId() {
        return frstRegisterId;
    }

    /**
     * frstRegisterId attribute ???????.
     * 
     * @param frstRegisterId
     *                       the frstRegisterId to set
     **/
    public void setFrstRegisterId(String frstRegisterId) {
        this.frstRegisterId = frstRegisterId;
    }

    /**
     * frstRegisterPnttm attribute?????.
     * 
     * @return the frstRegisterPnttm
     **/
    public String getFrstRegisterPnttm() {
        return frstRegisterPnttm;
    }

    /**
     * frstRegisterPnttm attribute ???????.
     * 
     * @param frstRegisterPnttm
     *                          the frstRegisterPnttm to set
     **/
    public void setFrstRegisterPnttm(String frstRegisterPnttm) {
        this.frstRegisterPnttm = frstRegisterPnttm;
    }

    /**
     * idntfcNo attribute?????.
     * 
     * @return the idntfcNo
     **/
    public String getIdntfcNo() {
        return idntfcNo;
    }

    /**
     * idntfcNo attribute ???????.
     * 
     * @param idntfcNo
     *                 the idntfcNo to set
     **/
    public void setIdntfcNo(String idntfcNo) {
        this.idntfcNo = idntfcNo;
    }

    /**
     * lastUpdusrId attribute?????.
     * 
     * @return the lastUpdusrId
     **/
    public String getLastUpdusrId() {
        return lastUpdusrId;
    }

    /**
     * lastUpdusrId attribute ???????.
     * 
     * @param lastUpdusrId
     *                     the lastUpdusrId to set
     **/
    public void setLastUpdusrId(String lastUpdusrId) {
        this.lastUpdusrId = lastUpdusrId;
    }

    /**
     * lastUpdusrPnttm attribute?????.
     * 
     * @return the lastUpdusrPnttm
     **/
    public String getLastUpdusrPnttm() {
        return lastUpdusrPnttm;
    }

    /**
     * lastUpdusrPnttm attribute ???????.
     * 
     * @param lastUpdusrPnttm
     *                        the lastUpdusrPnttm to set
     **/
    public void setLastUpdusrPnttm(String lastUpdusrPnttm) {
        this.lastUpdusrPnttm = lastUpdusrPnttm;
    }

    /**
     * mbtlNum attribute?????.
     * 
     * @return the mbtlNum
     **/
    public String getMbtlNum() {
        return mbtlNum;
    }

    /**
     * mbtlNum attribute ???????.
     * 
     * @param mbtlNum
     *                the mbtlNum to set
     **/
    public void setMbtlNum(String mbtlNum) {
        this.mbtlNum = mbtlNum;
    }

    /**
     * middleMbtlNum attribute?????.
     * 
     * @return the middleMbtlNum
     **/
    public String getMiddleMbtlNum() {
        return middleMbtlNum;
    }

    /**
     * middleMbtlNum attribute ???????.
     * 
     * @param middleMbtlNum
     *                      the middleMbtlNum to set
     **/
    public void setMiddleMbtlNum(String middleMbtlNum) {
        this.middleMbtlNum = middleMbtlNum;
    }

    /**
     * middleTelNo attribute?????.
     * 
     * @return the middleTelNo
     **/
    public String getMiddleTelNo() {
        return middleTelNo;
    }

    /**
     * middleTelNo attribute ???????.
     * 
     * @param middleTelNo
     *                    the middleTelNo to set
     **/
    public void setMiddleTelNo(String middleTelNo) {
        this.middleTelNo = middleTelNo;
    }

    /**
     * nationNo attribute?????.
     * 
     * @return the nationNo
     **/
    public String getNationNo() {
        return nationNo;
    }

    /**
     * nationNo attribute ???????.
     * 
     * @param nationNo
     *                 the nationNo to set
     **/
    public void setNationNo(String nationNo) {
        this.nationNo = nationNo;
    }

    /**
     * ncrdId attribute?????.
     * 
     * @return the ncrdId
     **/
    public String getNcrdId() {
        return ncrdId;
    }

    /**
     * ncrdId attribute ???????.
     * 
     * @param ncrdId
     *               the ncrdId to set
     **/
    public void setNcrdId(String ncrdId) {
        this.ncrdId = ncrdId;
    }

    /**
     * ncrdTrgterId attribute?????.
     * 
     * @return the ncrdTrgterId
     **/
    public String getNcrdTrgterId() {
        return ncrdTrgterId;
    }

    /**
     * ncrdTrgterId attribute ???????.
     * 
     * @param ncrdTrgterId
     *                     the ncrdTrgterId to set
     **/
    public void setNcrdTrgterId(String ncrdTrgterId) {
        this.ncrdTrgterId = ncrdTrgterId;
    }

    /**
     * ncrdNm attribute?????.
     * 
     * @return the ncrdNm
     **/
    public String getNcrdNm() {
        return ncrdNm;
    }

    /**
     * ncrdNm attribute ???????.
     * 
     * @param ncrdNm
     *               the ncrdNm to set
     **/
    public void setNcrdNm(String ncrdNm) {
        this.ncrdNm = ncrdNm;
    }

    /**
     * ofcpsNm attribute?????.
     * 
     * @return the ofcpsNm
     **/
    public String getOfcpsNm() {
        return ofcpsNm;
    }

    /**
     * ofcpsNm attribute ???????.
     * 
     * @param ofcpsNm
     *                the ofcpsNm to set
     **/
    public void setOfcpsNm(String ofcpsNm) {
        this.ofcpsNm = ofcpsNm;
    }

    /**
     * othbcAt attribute?????.
     * 
     * @return the othbcAt
     **/
    public String getOthbcAt() {
        return othbcAt;
    }

    /**
     * othbcAt attribute ???????.
     * 
     * @param othbcAt
     *                the othbcAt to set
     **/
    public void setOthbcAt(String othbcAt) {
        this.othbcAt = othbcAt;
    }

    /**
     * remark attribute?????.
     * 
     * @return the remark
     **/
    public String getRemark() {
        return remark;
    }

    /**
     * remark attribute ???????.
     * 
     * @param remark
     *               the remark to set
     **/
    public void setRemark(String remark) {
        this.remark = remark;
    }

    /**
     * telNo attribute?????.
     * 
     * @return the telNo
     **/
    public String getTelNo() {
        return telNo;
    }

    /**
     * telNo attribute ???????.
     * 
     * @param telNo
     *              the telNo to set
     **/
    public void setTelNo(String telNo) {
        this.telNo = telNo;
    }

    /**
     * detailAdres attribute?????.
     * 
     * @return the detailAdres
     **/
    public String getDetailAdres() {
        return detailAdres;
    }

    /**
     * detailAdres attribute ???????.
     * 
     * @param detailAdres
     *                    the detailAdres to set
     **/
    public void setDetailAdres(String detailAdres) {
        this.detailAdres = detailAdres;
    }

    /**
     * zipCode attribute?????.
     * 
     * @return the zipCode
     **/
    public String getZipCode() {
        return zipCode;
    }

    /**
     * zipCode attribute ???????.
     * 
     * @param zipCode
     *                the zipCode to set
     **/
    public void setZipCode(String zipCode) {
        this.zipCode = zipCode;
    }

    /**
     * toString ???? ????
     **/
    public String toString() {
        return ToStringBuilder.reflectionToString(this);
    }
}
