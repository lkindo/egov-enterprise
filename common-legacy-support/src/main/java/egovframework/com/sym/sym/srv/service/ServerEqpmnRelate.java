package egovframework.com.sym.sym.srv.service;

import egovframework.com.cmm.ComDefaultVO;

/**
 * ??
 * - ???????????model ?????? ???.
 * 
 * ???
 * - ????????????D, ?? ID ? ?????????
 * @author ??
 * @version 1.0
 * @created 28-6-2010 ?? 10:44:55
 **/
public class ServerEqpmnRelate extends ComDefaultVO {

	private static final long serialVersionUID = 1L;
	/**
	 * ??ID
	 **/
	private String serverId;
	/**
	 * ????D
	 **/
	private String serverEqpmnId;
	/**
	 * ?????
	 **/
	private String serverEqpmnNm;
	/**
	 * ????P
	 **/
	private String serverEqpmnIp;
	/**
	 * ??????
	 **/
	private String serverEqpmnMngrNm;
	/**
	 * ????
	 **/
	private String regYn;
	/**
	 * ????
	 **/
	private String lastUpdusrPnttm;
	/**
	 * ???
	 **/
	private String lastUpdusrId;
	/**
	 * @return the serverId
	 **/
	public String getServerId() {
		return serverId;
	}
	/**
	 * @param serverId the serverId to set
	 **/
	public void setServerId(String serverId) {
		this.serverId = serverId;
	}
	/**
	 * @return the serverEqpmnId
	 **/
	public String getServerEqpmnId() {
		return serverEqpmnId;
	}
	/**
	 * @param serverEqpmnId the serverEqpmnId to set
	 **/
	public void setServerEqpmnId(String serverEqpmnId) {
		this.serverEqpmnId = serverEqpmnId;
	}
	/**
	 * @return the serverEqpmnNm
	 **/
	public String getServerEqpmnNm() {
		return serverEqpmnNm;
	}
	/**
	 * @param serverEqpmnNm the serverEqpmnNm to set
	 **/
	public void setServerEqpmnNm(String serverEqpmnNm) {
		this.serverEqpmnNm = serverEqpmnNm;
	}
	/**
	 * @return the serverEqpmnIp
	 **/
	public String getServerEqpmnIp() {
		return serverEqpmnIp;
	}
	/**
	 * @param serverEqpmnIp the serverEqpmnIp to set
	 **/
	public void setServerEqpmnIp(String serverEqpmnIp) {
		this.serverEqpmnIp = serverEqpmnIp;
	}
	/**
	 * @return the serverEqpmnMngrNm
	 **/
	public String getServerEqpmnMngrNm() {
		return serverEqpmnMngrNm;
	}
	/**
	 * @param serverEqpmnMngrNm the serverEqpmnMngrNm to set
	 **/
	public void setServerEqpmnMngrNm(String serverEqpmnMngrNm) {
		this.serverEqpmnMngrNm = serverEqpmnMngrNm;
	}
	/**
	 * @return the regYn
	 **/
	public String getRegYn() {
		return regYn;
	}
	/**
	 * @param regYn the regYn to set
	 **/
	public void setRegYn(String regYn) {
		this.regYn = regYn;
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
