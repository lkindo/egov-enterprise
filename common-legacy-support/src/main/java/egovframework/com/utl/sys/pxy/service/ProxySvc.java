package egovframework.com.utl.sys.pxy.service;

import egovframework.com.cmm.ComDefaultVO;

/**
 * ??- ?????????????model ?????? ???.
 *
 * ??? - ?????????ID, ???? ???IP, ??????? ????? ??????, ????IP, ????????
 * ????? ? ?????????
 *
 * @author lee.m.j
 * @version 1.0
 * @created 28-6-2010 ?? 10:44:50
 **/
public class ProxySvc extends ComDefaultVO {

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
     * ???IP
     **/
    private String proxyIp;

    /**
     * ???????
     **/
    private String proxyPort;

    /**
     * ?????
     **/
    private String trgetSvcNm;

    /**
     * ??????
     **/
    private String svcDc;

    /**
     * ????IP
     **/
    private String svcIp;

    /**
     * ????????
     **/
    private String svcPort;

    /**
     * ?????
     **/
    private String svcSttus;

    /**
     * ?????
     **/
    private String svcSttusNm;

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
     * @return the proxyIp
     **/
    public String getProxyIp() {
        return proxyIp;
    }

    /**
     * @param proxyIp the proxyIp to set
     **/
    public void setProxyIp(String proxyIp) {
        this.proxyIp = proxyIp;
    }

    /**
     * @return the proxyPort
     **/
    public String getProxyPort() {
        return proxyPort;
    }

    /**
     * @param proxyPort the proxyPort to set
     **/
    public void setProxyPort(String proxyPort) {
        this.proxyPort = proxyPort;
    }

    /**
     * @return the trgetSvcNm
     **/
    public String getTrgetSvcNm() {
        return trgetSvcNm;
    }

    /**
     * @param trgetSvcNm the trgetSvcNm to set
     **/
    public void setTrgetSvcNm(String trgetSvcNm) {
        this.trgetSvcNm = trgetSvcNm;
    }

    /**
     * @return the svcDc
     **/
    public String getSvcDc() {
        return svcDc;
    }

    /**
     * @param svcDc the svcDc to set
     **/
    public void setSvcDc(String svcDc) {
        this.svcDc = svcDc;
    }

    /**
     * @return the svcIp
     **/
    public String getSvcIp() {
        return svcIp;
    }

    /**
     * @param svcIp the svcIp to set
     **/
    public void setSvcIp(String svcIp) {
        this.svcIp = svcIp;
    }

    /**
     * @return the svcPort
     **/
    public String getSvcPort() {
        return svcPort;
    }

    /**
     * @param svcPort the svcPort to set
     **/
    public void setSvcPort(String svcPort) {
        this.svcPort = svcPort;
    }

    /**
     * @return the svcSttus
     **/
    public String getSvcSttus() {
        return svcSttus;
    }

    /**
     * @param svcSttus the svcSttus to set
     **/
    public void setSvcSttus(String svcSttus) {
        this.svcSttus = svcSttus;
    }

    /**
     * @return the svcSttusNm
     **/
    public String getSvcSttusNm() {
        return svcSttusNm;
    }

    /**
     * @param svcSttusNm the svcSttusNm to set
     **/
    public void setSvcSttusNm(String svcSttusNm) {
        this.svcSttusNm = svcSttusNm;
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
