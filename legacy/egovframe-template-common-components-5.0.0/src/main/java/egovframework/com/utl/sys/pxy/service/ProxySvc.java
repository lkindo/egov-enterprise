package egovframework.com.utl.sys.pxy.service;

import egovframework.com.cmm.ComDefaultVO;

/**
 * 媛쒖슂 - ?꾨줉?쒖꽌鍮꾩뒪?뺣낫?????model ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜 - ?꾨줉?쒖꽌鍮꾩뒪?뺣낫??ID, ?꾨줉??紐? ?꾨줉??IP, ?꾨줉???ы듃, ?쒕퉬??紐? ?쒕퉬???ㅻ챸, ?쒕퉬??IP, ?쒕퉬???ы듃,
 * ?쒕퉬???곹깭 ?깆쓽 ??ぉ??愿由ы븳??
 *
 * @author lee.m.j
 * @version 1.0
 * @created 28-6-2010 ?ㅼ쟾 10:44:50
 */
public class ProxySvc extends ComDefaultVO {

	private static final long serialVersionUID = 1L;

    /**
     * ?꾨줉??ID
     */
    private String proxyId;

    /**
     * ?꾨줉??紐?
     */
    private String proxyNm;

    /**
     * ?꾨줉??IP
     */
    private String proxyIp;

    /**
     * ?꾨줉???ы듃
     */
    private String proxyPort;

    /**
     * ?쒕퉬??紐?
     */
    private String trgetSvcNm;

    /**
     * ?쒕퉬???ㅻ챸
     */
    private String svcDc;

    /**
     * ?쒕퉬??IP
     */
    private String svcIp;

    /**
     * ?쒕퉬???ы듃
     */
    private String svcPort;

    /**
     * ?쒕퉬???곹깭
     */
    private String svcSttus;

    /**
     * ?쒕퉬???곹깭
     */
    private String svcSttusNm;

    /**
     * 理쒖큹?깅줉?쒖젏
     */
    private String frstRegisterPnttm;

    /**
     * 理쒖큹?깅줉?륤D
     */
    private String frstRegisterId;

    /**
     * 理쒖쥌?섏젙?쒖젏
     */
    private String lastUpdusrPnttm;

    /**
     * 理쒖쥌?섏젙?륤D
     */
    private String lastUpdusrId;

    /**
     * @return the proxyId
     */
    public String getProxyId() {
        return proxyId;
    }

    /**
     * @param proxyId the proxyId to set
     */
    public void setProxyId(String proxyId) {
        this.proxyId = proxyId;
    }

    /**
     * @return the proxyNm
     */
    public String getProxyNm() {
        return proxyNm;
    }

    /**
     * @param proxyNm the proxyNm to set
     */
    public void setProxyNm(String proxyNm) {
        this.proxyNm = proxyNm;
    }

    /**
     * @return the proxyIp
     */
    public String getProxyIp() {
        return proxyIp;
    }

    /**
     * @param proxyIp the proxyIp to set
     */
    public void setProxyIp(String proxyIp) {
        this.proxyIp = proxyIp;
    }

    /**
     * @return the proxyPort
     */
    public String getProxyPort() {
        return proxyPort;
    }

    /**
     * @param proxyPort the proxyPort to set
     */
    public void setProxyPort(String proxyPort) {
        this.proxyPort = proxyPort;
    }

    /**
     * @return the trgetSvcNm
     */
    public String getTrgetSvcNm() {
        return trgetSvcNm;
    }

    /**
     * @param trgetSvcNm the trgetSvcNm to set
     */
    public void setTrgetSvcNm(String trgetSvcNm) {
        this.trgetSvcNm = trgetSvcNm;
    }

    /**
     * @return the svcDc
     */
    public String getSvcDc() {
        return svcDc;
    }

    /**
     * @param svcDc the svcDc to set
     */
    public void setSvcDc(String svcDc) {
        this.svcDc = svcDc;
    }

    /**
     * @return the svcIp
     */
    public String getSvcIp() {
        return svcIp;
    }

    /**
     * @param svcIp the svcIp to set
     */
    public void setSvcIp(String svcIp) {
        this.svcIp = svcIp;
    }

    /**
     * @return the svcPort
     */
    public String getSvcPort() {
        return svcPort;
    }

    /**
     * @param svcPort the svcPort to set
     */
    public void setSvcPort(String svcPort) {
        this.svcPort = svcPort;
    }

    /**
     * @return the svcSttus
     */
    public String getSvcSttus() {
        return svcSttus;
    }

    /**
     * @param svcSttus the svcSttus to set
     */
    public void setSvcSttus(String svcSttus) {
        this.svcSttus = svcSttus;
    }

    /**
     * @return the svcSttusNm
     */
    public String getSvcSttusNm() {
        return svcSttusNm;
    }

    /**
     * @param svcSttusNm the svcSttusNm to set
     */
    public void setSvcSttusNm(String svcSttusNm) {
        this.svcSttusNm = svcSttusNm;
    }

    /**
     * @return the frstRegisterPnttm
     */
    public String getFrstRegisterPnttm() {
        return frstRegisterPnttm;
    }

    /**
     * @param frstRegisterPnttm the frstRegisterPnttm to set
     */
    public void setFrstRegisterPnttm(String frstRegisterPnttm) {
        this.frstRegisterPnttm = frstRegisterPnttm;
    }

    /**
     * @return the frstRegisterId
     */
    public String getFrstRegisterId() {
        return frstRegisterId;
    }

    /**
     * @param frstRegisterId the frstRegisterId to set
     */
    public void setFrstRegisterId(String frstRegisterId) {
        this.frstRegisterId = frstRegisterId;
    }

    /**
     * @return the lastUpdusrPnttm
     */
    public String getLastUpdusrPnttm() {
        return lastUpdusrPnttm;
    }

    /**
     * @param lastUpdusrPnttm the lastUpdusrPnttm to set
     */
    public void setLastUpdusrPnttm(String lastUpdusrPnttm) {
        this.lastUpdusrPnttm = lastUpdusrPnttm;
    }

    /**
     * @return the lastUpdusrId
     */
    public String getLastUpdusrId() {
        return lastUpdusrId;
    }

    /**
     * @param lastUpdusrId the lastUpdusrId to set
     */
    public void setLastUpdusrId(String lastUpdusrId) {
        this.lastUpdusrId = lastUpdusrId;
    }

}