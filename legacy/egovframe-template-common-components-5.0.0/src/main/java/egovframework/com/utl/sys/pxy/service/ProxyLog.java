package egovframework.com.utl.sys.pxy.service;

import egovframework.com.cmm.ComDefaultVO;

/**
 * 媛쒖슂 - ?꾨줉?쒕줈洹몄젙蹂댁뿉 ???model ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜 - ?꾨줉?쒕줈洹몄젙蹂댁쓽 ?꾨줉??ID, 濡쒓렇 ID, ?대씪?댁뼵??IP, ?대씪?댁뼵???ы듃, ?묒냽 ?쒓컙 ?깆쓽 ??ぉ??愿由ы븳??
 *
 * @author lee.m.j
 * @version 1.0
 * @created 28-6-2010 ?ㅼ쟾 10:44:49
 */
public class ProxyLog extends ComDefaultVO {
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
     * 濡쒓렇 ID
     */
    private String logId;

    /**
     * ?대씪?댁뼵??IP
     */
    private String clntIp;

    /**
     * ?대씪?댁뼵???ы듃
     */
    private String clntPort;

    /**
     * ?묒냽?쒓컙
     */
    private String conectTime;

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
     * @return the logId
     */
    public String getLogId() {
        return logId;
    }

    /**
     * @param logId the logId to set
     */
    public void setLogId(String logId) {
        this.logId = logId;
    }

    /**
     * @return the clntIp
     */
    public String getClntIp() {
        return clntIp;
    }

    /**
     * @param clntIp the clntIp to set
     */
    public void setClntIp(String clntIp) {
        this.clntIp = clntIp;
    }

    /**
     * @return the clntPort
     */
    public String getClntPort() {
        return clntPort;
    }

    /**
     * @param clntPort the clntPort to set
     */
    public void setClntPort(String clntPort) {
        this.clntPort = clntPort;
    }

    /**
     * @return the conectTime
     */
    public String getConectTime() {
        return conectTime;
    }

    /**
     * @param conectTime the conectTime to set
     */
    public void setConectTime(String conectTime) {
        this.conectTime = conectTime;
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
