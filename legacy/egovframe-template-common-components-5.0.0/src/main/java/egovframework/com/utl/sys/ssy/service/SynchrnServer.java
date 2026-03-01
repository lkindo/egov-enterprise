package egovframework.com.utl.sys.ssy.service;

import egovframework.com.cmm.ComDefaultVO;

/**
 * 媛쒖슂
 * - ?숆린?붾????쒕쾭?????model ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?숆린?붾????쒕쾭??ID, ?쒕쾭 紐? ?쒕쾭 IP, FTP ID, FTP 鍮꾨?踰덊샇, ?숆린?붿쐞移??깆쓽 ??ぉ??愿由ы븳??
 * @author lee.m.j
 * @version 1.0
 * @created 28-6-2010 ?ㅼ쟾 10:44:57
 */
public class SynchrnServer extends ComDefaultVO {

	private static final long serialVersionUID = 1L;
	/**
	 * ?쒕쾭 ID
	 */
	private String serverId;
	/**
	 * ?쒕쾭 紐?
	 */
	private String serverNm;
	/**
	 * ?쒕쾭 IP
	 */
	private String serverIp;
	/**
	 * ?쒕쾭 Port
	 */
	private String serverPort;
	/**
	 * FTP ID
	 */
	private String ftpId;
	/**
	 * FTP 鍮꾨?踰덊샇
	 */
	private String ftpPassword;
	/**
	 * ?숆린???꾩튂
	 */
	private String synchrnLc;
	/**
	 * 諛섏쁺 ?щ?
	 */
	private String reflctAt;
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
	 * @return the serverId
	 */
	public String getServerId() {
		return serverId;
	}
	/**
	 * @param serverId the serverId to set
	 */
	public void setServerId(String serverId) {
		this.serverId = serverId;
	}
	/**
	 * @return the serverNm
	 */
	public String getServerNm() {
		return serverNm;
	}
	/**
	 * @param serverNm the serverNm to set
	 */
	public void setServerNm(String serverNm) {
		this.serverNm = serverNm;
	}
	/**
	 * @return the serverIp
	 */
	public String getServerIp() {
		return serverIp;
	}
	/**
	 * @param serverIp the serverIp to set
	 */
	public void setServerIp(String serverIp) {
		this.serverIp = serverIp;
	}
	/**
	 * @return the serverPort
	 */
	public String getServerPort() {
		return serverPort;
	}
	/**
	 * @param serverPort the serverPort to set
	 */
	public void setServerPort(String serverPort) {
		this.serverPort = serverPort;
	}
	/**
	 * @return the ftpId
	 */
	public String getFtpId() {
		return ftpId;
	}
	/**
	 * @param ftpId the ftpId to set
	 */
	public void setFtpId(String ftpId) {
		this.ftpId = ftpId;
	}
	/**
	 * @return the ftpPassword
	 */
	public String getFtpPassword() {
		return ftpPassword;
	}
	/**
	 * @param ftpPassword the ftpPassword to set
	 */
	public void setFtpPassword(String ftpPassword) {
		this.ftpPassword = ftpPassword;
	}
	/**
	 * @return the synchrnLc
	 */
	public String getSynchrnLc() {
		return synchrnLc;
	}
	/**
	 * @param synchrnLc the synchrnLc to set
	 */
	public void setSynchrnLc(String synchrnLc) {
		this.synchrnLc = synchrnLc;
	}
	/**
	 * @return the reflctAt
	 */
	public String getReflctAt() {
		return reflctAt;
	}
	/**
	 * @param reflctAt the reflctAt to set
	 */
	public void setReflctAt(String reflctAt) {
		this.reflctAt = reflctAt;
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
