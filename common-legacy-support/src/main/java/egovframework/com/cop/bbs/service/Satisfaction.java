package egovframework.com.cop.bbs.service;

import java.io.Serializable;

import org.apache.commons.lang3.builder.ToStringBuilder;

/**
 * ???????????????
 * 
 * @author ?????? ????
 * @since 2009.06.29
 * @version 1.0
 * @see
 *
 *      <pre>
 * << ?????Modification Information) >>
 *   
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.06.29  ????         ????
 *
 *      </pre>
 **/
public class Satisfaction implements Serializable {

    private static final long serialVersionUID = 1L;
    /** ?????**/
    private String stsfdgNo = "";

    /** ???ID **/
    private String bbsId = "";

    /** ????**/
    private long nttId = 0L;

    /** ???ID **/
    private String wrterId = "";

    /** ??? **/
    private String wrterNm = "";

    /** ????? **/
    private String stsfdgPassword = "";

    /** ????? **/
    private String stsfdgCn = "";

    /** ???**/
    private int stsfdg = 0;

    /** ??????? **/
    private String useAt = "";

    /** ???????**/
    private String frstRegisterId = "";

    /** ????? **/
    private String frstRegisterNm = "";

    /** ???? **/
    private String frstRegisterPnttm = "";

    /** ???????**/
    private String lastUpdusrId = "";

    /** ???? **/
    private String lastUpdusrPnttm = "";

    /** ? ????? **/
    private String confirmPassword = "";

    /**
     * stsfdgNo attribute?????.
     * 
     * @return the stsfdgNo
     **/
    public String getStsfdgNo() {
        return stsfdgNo;
    }

    /**
     * stsfdgNo attribute ???????.
     * 
     * @param stsfdgNo the stsfdgNo to set
     **/
    public void setStsfdgNo(String stsfdgNo) {
        this.stsfdgNo = stsfdgNo;
    }

    /**
     * bbsId attribute?????.
     * 
     * @return the bbsId
     **/
    public String getBbsId() {
        return bbsId;
    }

    /**
     * bbsId attribute ???????.
     * 
     * @param bbsId the bbsId to set
     **/
    public void setBbsId(String bbsId) {
        this.bbsId = bbsId;
    }

    /**
     * nttId attribute?????.
     * 
     * @return the nttId
     **/
    public long getNttId() {
        return nttId;
    }

    /**
     * nttId attribute ???????.
     * 
     * @param nttId the nttId to set
     **/
    public void setNttId(long nttId) {
        this.nttId = nttId;
    }

    /**
     * wrterId attribute?????.
     * 
     * @return the wrterId
     **/
    public String getWrterId() {
        return wrterId;
    }

    /**
     * wrterId attribute ???????.
     * 
     * @param wrterId the wrterId to set
     **/
    public void setWrterId(String wrterId) {
        this.wrterId = wrterId;
    }

    /**
     * wrterNm attribute?????.
     * 
     * @return the wrterNm
     **/
    public String getWrterNm() {
        return wrterNm;
    }

    /**
     * wrterNm attribute ???????.
     * 
     * @param wrterNm the wrterNm to set
     **/
    public void setWrterNm(String wrterNm) {
        this.wrterNm = wrterNm;
    }

    /**
     * stsfdgPassword attribute?????.
     * 
     * @return the stsfdgPassword
     **/
    public String getStsfdgPassword() {
        return stsfdgPassword;
    }

    /**
     * stsfdgPassword attribute ???????.
     * 
     * @param stsfdgPassword the stsfdgPassword to set
     **/
    public void setStsfdgPassword(String stsfdgPassword) {
        this.stsfdgPassword = stsfdgPassword;
    }

    /**
     * stsfdgCn attribute?????.
     * 
     * @return the stsfdgCn
     **/
    public String getStsfdgCn() {
        return stsfdgCn;
    }

    /**
     * stsfdgCn attribute ???????.
     * 
     * @param stsfdgCn the stsfdgCn to set
     **/
    public void setStsfdgCn(String stsfdgCn) {
        this.stsfdgCn = stsfdgCn;
    }

    /**
     * stsfdg attribute?????.
     * 
     * @return the stsfdg
     **/
    public int getStsfdg() {
        return stsfdg;
    }

    /**
     * stsfdg attribute ???????.
     * 
     * @param stsfdg the stsfdg to set
     **/
    public void setStsfdg(int stsfdg) {
        this.stsfdg = stsfdg;
    }

    /**
     * useAt attribute?????.
     * 
     * @return the useAt
     **/
    public String getUseAt() {
        return useAt;
    }

    /**
     * useAt attribute ???????.
     * 
     * @param useAt the useAt to set
     **/
    public void setUseAt(String useAt) {
        this.useAt = useAt;
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
     * confirmPassword attribute?????.
     * 
     * @return the confirmPassword
     **/
    public String getConfirmPassword() {
        return confirmPassword;
    }

    /**
     * confirmPassword attribute ???????.
     * 
     * @param confirmPassword the confirmPassword to set
     **/
    public void setConfirmPassword(String confirmPassword) {
        this.confirmPassword = confirmPassword;
    }

    /**
     * toString ???? ????
     **/
    public String toString() {
        return ToStringBuilder.reflectionToString(this);
    }
}
