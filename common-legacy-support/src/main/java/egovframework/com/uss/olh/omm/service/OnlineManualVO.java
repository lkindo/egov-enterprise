package egovframework.com.uss.olh.omm.service;

import org.apache.commons.lang3.builder.ToStringBuilder;

import egovframework.com.cmm.ComDefaultVO;

/**
 * ????? VO Class ?
 * 
 * @author ?????????
 * @since 2009.07.03
 * @version 1.0
 * @see
 * 
 *      <pre>
 * &lt;&lt; ?????Modification Information) &gt;&gt;
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.07.03  ???         ????
 *
 *      </pre>
 **/
public class OnlineManualVO extends ComDefaultVO {

    private static final long serialVersionUID = -7024282928339275971L;

    /** ????? ???**/
    private String onlineMnlId;

    /** ????? ?**/
    private String onlineMnlNm;

    /** ????? ???**/
    private String onlineMnlSeCode;

    /** ????? ???**/
    private String onlineMnlSeCodeNm;

    /** ????? ? **/
    private String onlineMnlDf;

    /** ????? ?? **/
    private String onlineMnlDc;

    /** ???? **/
    private String frstRegisterPnttm;

    /** ?????**/
    private String frstRegisterId;

    /** ????**/
    private String frstRegisterNm;

    /** ????**/
    private String lastUpdusrPnttm;

    /** ???????**/
    private String lastUpdusrId;

    /** ?????**/
    private String cmd;

    /**
     * onlineMnlId ?
     *
     * @return the onlineMnlId
     **/
    public String getOnlineMnlId() {
        return onlineMnlId;
    }

    /**
     * onlineMnlId ??
     *
     * @param onlineMnlId the onlineMnlId to set
     **/
    public void setOnlineMnlId(String onlineMnlId) {
        this.onlineMnlId = onlineMnlId;
    }

    /**
     * onlineMnlNm ?
     *
     * @return the onlineMnlNm
     **/
    public String getOnlineMnlNm() {
        return onlineMnlNm;
    }

    /**
     * onlineMnlNm ??
     *
     * @param onlineMnlNm the onlineMnlNm to set
     **/
    public void setOnlineMnlNm(String onlineMnlNm) {
        this.onlineMnlNm = onlineMnlNm;
    }

    /**
     * onlineMnlSeCode ?
     *
     * @return the onlineMnlSeCode
     **/
    public String getOnlineMnlSeCode() {
        return onlineMnlSeCode;
    }

    /**
     * onlineMnlSeCode ??
     *
     * @param onlineMnlSeCode the onlineMnlSeCode to set
     **/
    public void setOnlineMnlSeCode(String onlineMnlSeCode) {
        this.onlineMnlSeCode = onlineMnlSeCode;
    }

    /**
     * onlineMnlSeCodeNm ?
     *
     * @return the onlineMnlSeCode
     **/
    public String getOnlineMnlSeCodeNm() {
        return onlineMnlSeCodeNm;
    }

    /**
     * onlineMnlSeCodeNm ??
     *
     * @param onlineMnlSeCodeNm the onlineMnlSeCodeNm to set
     **/
    public void setOnlineMnlSeCodeNm(String onlineMnlSeCodeNm) {
        this.onlineMnlSeCodeNm = onlineMnlSeCodeNm;
    }

    /**
     * onlineMnlDf ?
     *
     * @return the onlineMnlDf
     **/
    public String getOnlineMnlDf() {
        return onlineMnlDf;
    }

    /**
     * onlineMnlDf ??
     *
     * @param onlineMnlDf the onlineMnlDf to set
     **/
    public void setOnlineMnlDf(String onlineMnlDf) {
        this.onlineMnlDf = onlineMnlDf;
    }

    /**
     * onlineMnlDc ?
     *
     * @return the onlineMnlDc
     **/
    public String getOnlineMnlDc() {
        return onlineMnlDc;
    }

    /**
     * onlineMnlDc ??
     *
     * @param onlineMnlDc the onlineMnlDc to set
     **/
    public void setOnlineMnlDc(String onlineMnlDc) {
        this.onlineMnlDc = onlineMnlDc;
    }

    /**
     * frstRegisterPnttm ?
     *
     * @return the frstRegisterPnttm
     **/
    public String getFrstRegisterPnttm() {
        return frstRegisterPnttm;
    }

    /**
     * frstRegisterPnttm ??
     *
     * @param frstRegisterPnttm the frstRegisterPnttm to set
     **/
    public void setFrstRegisterPnttm(String frstRegisterPnttm) {
        this.frstRegisterPnttm = frstRegisterPnttm;
    }

    /**
     * frstRegisterId ?
     *
     * @return the frstRegisterId
     **/
    public String getFrstRegisterId() {
        return frstRegisterId;
    }

    /**
     * frstRegisterId ??
     *
     * @param frstRegisterId the frstRegisterId to set
     **/
    public void setFrstRegisterId(String frstRegisterId) {
        this.frstRegisterId = frstRegisterId;
    }

    /**
     * frstRegisterNm ?
     *
     * @return the frstRegisterNm
     **/
    public String getFrstRegisterNm() {
        return frstRegisterNm;
    }

    /**
     * frstRegisterNm ??
     *
     * @param frstRegisterNm the frstRegisterNm to set
     **/
    public void setFrstRegisterNm(String frstRegisterNm) {
        this.frstRegisterNm = frstRegisterNm;
    }

    /**
     * lastUpdusrPnttm ?
     *
     * @return the lastUpdusrPnttm
     **/
    public String getLastUpdusrPnttm() {
        return lastUpdusrPnttm;
    }

    /**
     * lastUpdusrPnttm ??
     *
     * @param lastUpdusrPnttm the lastUpdusrPnttm to set
     **/
    public void setLastUpdusrPnttm(String lastUpdusrPnttm) {
        this.lastUpdusrPnttm = lastUpdusrPnttm;
    }

    /**
     * lastUpdusrId ?
     *
     * @return the lastUpdusrId
     **/
    public String getLastUpdusrId() {
        return lastUpdusrId;
    }

    /**
     * lastUpdusrId ??
     *
     * @param lastUpdusrId the lastUpdusrId to set
     **/
    public void setLastUpdusrId(String lastUpdusrId) {
        this.lastUpdusrId = lastUpdusrId;
    }

    /**
     * cmd ?
     *
     * @return the cmd
     **/
    public String getCmd() {
        return cmd;
    }

    /**
     * cmd ??
     *
     * @param cmd the cmd to set
     **/
    public void setCmd(String cmd) {
        this.cmd = cmd;
    }

    /**
     * toString ???? ????
     **/
    public String toString() {
        return ToStringBuilder.reflectionToString(this);
    }

}
