package egovframework.com.uss.ion.noi.service;

import java.io.Serializable;

import org.apache.commons.lang3.builder.ToStringBuilder;

/**
 * ?????????????????
 * 
 * @author ?????? ????
 * @since 2009.06.08
 * @version 1.0
 * @see
 *
 *      <pre>
 * << ?????Modification Information) >>
 *
 *   ????     ????          ????
 *   -------    --------    ---------------------------
 *   2009.6.8  	 ????         ????
 *	 2011.10.07	 ????	?????(private ???
 *
 *      </pre>
 **/
public class Notification implements Serializable {

    private static final long serialVersionUID = 1L;
    /** ??? ??**/
    private String ntfcNo = "";

    /** ??? ?? **/
    private String ntfcSj = "";

    /** ??? ?? **/
    private String ntfcCn = "";

    /** ??? ?? **/
    private String ntfcDate = "";

    /** ??? ?? **/
    private String ntfcTime = "";

    /** ??????? ?**/
    private String[] bhNtfcIntrvl = new String[0];

    /** ??????? ?????**/
    private String bhNtfcIntrvlString = "";

    /** ???????**/
    private String frstRegisterId = "";

    /** ????? **/
    private String frstRegisterNm = "";

    /** ???? **/
    private String frstRegisterPnttm = "";

    /** ???????**/
    public String lastUpdusrId = "";

    /** ???? **/
    private String lastUpdusrPnttm = "";

    /** ? ???**/
    private String uniqId = "";

    /** ??? ?? **/
    private String ntfcHH = "";

    /** ??? ?? **/
    private String ntfcMM = "";

    /**
     * ntfcNo attribute?????.
     * 
     * @return the ntfcNo
     **/
    public String getNtfcNo() {
        return ntfcNo;
    }

    /**
     * ntfcNo attribute ???????.
     * 
     * @param ntfcNo the ntfcNo to set
     **/
    public void setNtfcNo(String ntfcNo) {
        this.ntfcNo = ntfcNo;
    }

    /**
     * ntfcSj attribute?????.
     * 
     * @return the ntfcSj
     **/
    public String getNtfcSj() {
        return ntfcSj;
    }

    /**
     * ntfcSj attribute ???????.
     * 
     * @param ntfcSj the ntfcSj to set
     **/
    public void setNtfcSj(String ntfcSj) {
        this.ntfcSj = ntfcSj;
    }

    /**
     * ntfcCn attribute?????.
     * 
     * @return the ntfcCn
     **/
    public String getNtfcCn() {
        return ntfcCn;
    }

    /**
     * ntfcCn attribute ???????.
     * 
     * @param ntfcCn the ntfcCn to set
     **/
    public void setNtfcCn(String ntfcCn) {
        this.ntfcCn = ntfcCn;
    }

    /**
     * ntfcTime attribute?????.
     * 
     * @return the ntfcTime
     **/
    public String getNtfcTime() {
        return ntfcTime;
    }

    /**
     * ntfcTime attribute ???????.
     * 
     * @param ntfcTime the ntfcTime to set
     **/
    public void setNtfcTime(String ntfcTime) {
        this.ntfcTime = ntfcTime;
    }

    /**
     * bhNtfcIntrvl attribute?????.
     * 
     * @return the bhNtfcIntrvl
     **/
    // public String[] getBhNtfcIntrvl() {
    // return bhNtfcIntrvl;
    // }
    // 2011.10.07 private ??public ?? ???? ?????
    public String[] getBhNtfcIntrvl() {
        // ???? private?? ???? ? ?????
        // ???????? public???? ???
        String[] ret = null;
        if (this.bhNtfcIntrvl != null) {
            ret = new String[bhNtfcIntrvl.length];
            for (int i = 0; i < bhNtfcIntrvl.length; i++) {
                ret[i] = this.bhNtfcIntrvl[i];
            }
        }
        return ret;
    }

    /**
     * bhNtfcIntrvl attribute ???????.
     * 
     * @param bhNtfcIntrvl the bhNtfcIntrvl to set
     **/
    // public void setBhNtfcIntrvl(String[] bhNtfcIntrvl) {
    // this.bhNtfcIntrvl = bhNtfcIntrvl;
    // }
    // 2011.10.07 private ?? ????????????? ?????
    public void setBhNtfcIntrvl(String[] bhNtfcIntrvl) {
        this.bhNtfcIntrvl = new String[bhNtfcIntrvl.length];
        for (int i = 0; i < bhNtfcIntrvl.length; ++i) {
            this.bhNtfcIntrvl[i] = bhNtfcIntrvl[i];
        }
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
     * @param frstRegisterId the frstRegisterId to set
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
     * @param frstRegisterPnttm the frstRegisterPnttm to set
     **/
    public void setFrstRegisterPnttm(String frstRegisterPnttm) {
        this.frstRegisterPnttm = frstRegisterPnttm;
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
     * @param lastUpdusrId the lastUpdusrId to set
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
     * @param lastUpdusrPnttm the lastUpdusrPnttm to set
     **/
    public void setLastUpdusrPnttm(String lastUpdusrPnttm) {
        this.lastUpdusrPnttm = lastUpdusrPnttm;
    }

    /**
     * uniqId attribute?????.
     * 
     * @return the uniqId
     **/
    public String getUniqId() {
        return uniqId;
    }

    /**
     * uniqId attribute ???????.
     * 
     * @param uniqId the uniqId to set
     **/
    public void setUniqId(String uniqId) {
        this.uniqId = uniqId;
    }

    /**
     * ntfcDate attribute?????.
     * 
     * @return the ntfcDate
     **/
    public String getNtfcDate() {
        return ntfcDate;
    }

    /**
     * ntfcDate attribute ???????.
     * 
     * @param ntfcDate the ntfcDate to set
     **/
    public void setNtfcDate(String ntfcDate) {
        this.ntfcDate = ntfcDate;
    }

    /**
     * ntfcHH attribute?????.
     * 
     * @return the ntfcHH
     **/
    public String getNtfcHH() {
        return ntfcHH;
    }

    /**
     * ntfcHH attribute ???????.
     * 
     * @param ntfcHH the ntfcHH to set
     **/
    public void setNtfcHH(String ntfcHH) {
        this.ntfcHH = ntfcHH;
    }

    /**
     * ntfcMM attribute?????.
     * 
     * @return the ntfcMM
     **/
    public String getNtfcMM() {
        return ntfcMM;
    }

    /**
     * ntfcMM attribute ???????.
     * 
     * @param ntfcMM the ntfcMM to set
     **/
    public void setNtfcMM(String ntfcMM) {
        this.ntfcMM = ntfcMM;
    }

    /**
     * bhNtfcIntrvlString attribute?????.
     * 
     * @return the bhNtfcIntrvlString
     **/
    public String getBhNtfcIntrvlString() {
        return bhNtfcIntrvlString;
    }

    /**
     * bhNtfcIntrvlString attribute ???????.
     * 
     * @param bhNtfcIntrvlString the bhNtfcIntrvlString to set
     **/
    public void setBhNtfcIntrvlString(String bhNtfcIntrvlString) {
        this.bhNtfcIntrvlString = bhNtfcIntrvlString;
    }

    /**
     * frstRegisterNm attribute?????.
     * 
     * @return the frstRegisterNm
     **/
    public String getFrstRegisterNm() {
        return frstRegisterNm;
    }

    /**
     * frstRegisterNm attribute ???????.
     * 
     * @param frstRegisterNm the frstRegisterNm to set
     **/
    public void setFrstRegisterNm(String frstRegisterNm) {
        this.frstRegisterNm = frstRegisterNm;
    }

    /**
     * toString ???? ????
     **/
    public String toString() {
        return ToStringBuilder.reflectionToString(this);
    }
}
