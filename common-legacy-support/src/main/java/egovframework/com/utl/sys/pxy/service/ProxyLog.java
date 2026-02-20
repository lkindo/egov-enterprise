package egovframework.com.utl.sys.pxy.service;

import egovframework.com.cmm.ComDefaultVO;

/**
 * ??- ????? ????model ?????? ???.
 *
 * ??? - ????? ???ID, ??ID, ???????IP, ??????????? ? ?? ? ?????????
 *
 * @author lee.m.j
 * @version 1.0
 * @created 28-6-2010 ?? 10:44:49
 **/
public class ProxyLog extends ComDefaultVO {
	private static final long serialVersionUID = 1L;

    /**
     * ???ID
     **/
    private String proxyId;

    /**
     * ????
     **/
    private String proxyNm;

    /**
     * ??ID
     **/
    private String logId;

    /**
     * ???????IP
     **/
    private String clntIp;

    /**
     * ???????????
     **/
    private String clntPort;

    /**
     * ???
     **/
    private String conectTime;

    /**
     * ????
     **/
    private String frstRegisterPnttm;

    /**
     * ???
     **/
    private String frstRegisterId;

    /**
     * ????
     **/
    private String lastUpdusrPnttm;

    /**
     * ???
     **/
    private String lastUpdusrId;


    /**
     * @return the proxyId
     **/
    public String getProxyId() {
        return proxyId;
    }

    /**
     * @param proxyId the proxyId to set
     **/
    public void setProxyId(String proxyId) {
        this.proxyId = proxyId;
    }

    /**
     * @return the proxyNm
     **/
    public String getProxyNm() {
        return proxyNm;
    }

    /**
     * @param proxyNm the proxyNm to set
     **/
    public void setProxyNm(String proxyNm) {
        this.proxyNm = proxyNm;
    }

    /**
     * @return the logId
     **/
    public String getLogId() {
        return logId;
    }

    /**
     * @param logId the logId to set
     **/
    public void setLogId(String logId) {
        this.logId = logId;
    }

    /**
     * @return the clntIp
     **/
    public String getClntIp() {
        return clntIp;
    }

    /**
     * @param clntIp the clntIp to set
     **/
    public void setClntIp(String clntIp) {
        this.clntIp = clntIp;
    }

    /**
     * @return the clntPort
     **/
    public String getClntPort() {
        return clntPort;
    }

    /**
     * @param clntPort the clntPort to set
     **/
    public void setClntPort(String clntPort) {
        this.clntPort = clntPort;
    }

    /**
     * @return the conectTime
     **/
    public String getConectTime() {
        return conectTime;
    }

    /**
     * @param conectTime the conectTime to set
     **/
    public void setConectTime(String conectTime) {
        this.conectTime = conectTime;
    }

    /**
     * @return the frstRegisterPnttm
     **/
    public String getFrstRegisterPnttm() {
        return frstRegisterPnttm;
    }

    /**
     * @param frstRegisterPnttm the frstRegisterPnttm to set
     **/
    public void setFrstRegisterPnttm(String frstRegisterPnttm) {
        this.frstRegisterPnttm = frstRegisterPnttm;
    }

    /**
     * @return the frstRegisterId
     **/
    public String getFrstRegisterId() {
        return frstRegisterId;
    }

    /**
     * @param frstRegisterId the frstRegisterId to set
     **/
    public void setFrstRegisterId(String frstRegisterId) {
        this.frstRegisterId = frstRegisterId;
    }

    /**
     * @return the lastUpdusrPnttm
     **/
    public String getLastUpdusrPnttm() {
        return lastUpdusrPnttm;
    }

    /**
     * @param lastUpdusrPnttm the lastUpdusrPnttm to set
     **/
    public void setLastUpdusrPnttm(String lastUpdusrPnttm) {
        this.lastUpdusrPnttm = lastUpdusrPnttm;
    }

    /**
     * @return the lastUpdusrId
     **/
    public String getLastUpdusrId() {
        return lastUpdusrId;
    }

    /**
     * @param lastUpdusrId the lastUpdusrId to set
     **/
    public void setLastUpdusrId(String lastUpdusrId) {
        this.lastUpdusrId = lastUpdusrId;
    }
}
