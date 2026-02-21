package egovframework.com.cop.scp.service;

import java.io.Serializable;

import org.apache.commons.lang3.builder.ToStringBuilder;

/**
 * ???????????????
 * 
 * @author ?????? ????
 * @since 2009.07.10
 * @version 1.0
 * @see
 *
 *      <pre>
 * << ?????Modification Information) >>
 *   
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.07.10  ????         ????
 *
 *      </pre>
 **/
public class Scrap implements Serializable {
    private static final long serialVersionUID = 1L;
    /** ????ID **/
    private String scrapId = "";

    /** ???ID **/
    private String bbsId = "";

    /** ????**/
    private long nttId = 0L;

    /** ???? **/
    private String scrapNm = "";

    /** ??????? **/
    private String useAt = "";

    /** ? ???**/
    private String uniqId = "";

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

    /**
     * scrapId attribute?????.
     * 
     * @return the scrapId
     **/
    public String getScrapId() {
        return scrapId;
    }

    /**
     * scrapId attribute ???????.
     * 
     * @param scrapId the scrapId to set
     **/
    public void setScrapId(String scrapId) {
        this.scrapId = scrapId;
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
     * scrapNm attribute?????.
     * 
     * @return the scrapNm
     **/
    public String getScrapNm() {
        return scrapNm;
    }

    /**
     * scrapNm attribute ???????.
     * 
     * @param scrapNm the scrapNm to set
     **/
    public void setScrapNm(String scrapNm) {
        this.scrapNm = scrapNm;
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
     * toString ???? ????
     **/
    public String toString() {
        return ToStringBuilder.reflectionToString(this);
    }
}
