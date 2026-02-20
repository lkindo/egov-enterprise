package egovframework.com.sym.sym.srv.service;

import egovframework.com.cmm.ComDefaultVO;

/**
 * ??
 * - ?????????model ?????? ???.
 * 
 * ???
 * - ???????ID, ??? ????? ?????????
 * @author ??
 * @version 1.0
 * @created 28-6-2010 ?? 10:44:54
 **/
public class Server extends ComDefaultVO {

	private static final long serialVersionUID = 1L;
	/**
	 * ?? ID
	 **/
	private String serverId;
	/**
	 * ?? ?
	 **/
	private String serverNm;
	/**
	 * ?? ??
	 **/
	private String serverKnd;
	/**
	 * ?? ??
	 **/
	private String serverKndNm;
    /**
	 * ???
	 **/    
    private String regstYmd;    
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
	 * @return the serverNm
	 **/
	public String getServerNm() {
		return serverNm;
	}
	/**
	 * @param serverNm the serverNm to set
	 **/
	public void setServerNm(String serverNm) {
		this.serverNm = serverNm;
	}
	/**
	 * @return the serverKnd
	 **/
	public String getServerKnd() {
		return serverKnd;
	}
	/**
	 * @param serverKnd the serverKnd to set
	 **/
	public void setServerKnd(String serverKnd) {
		this.serverKnd = serverKnd;
	}
	/**
	 * @return the serverKndNm
	 **/
	public String getServerKndNm() {
		return serverKndNm;
	}
	/**
	 * @param serverKndNm the serverKndNm to set
	 **/
	public void setServerKndNm(String serverKndNm) {
		this.serverKndNm = serverKndNm;
	}
	/**
	 * @return the regstYmd
	 **/
	public String getRegstYmd() {
		return regstYmd;
	}
	/**
	 * @param regstYmd the regstYmd to set
	 **/
	public void setRegstYmd(String regstYmd) {
		this.regstYmd = regstYmd;
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
