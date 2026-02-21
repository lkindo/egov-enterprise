/**
 * ??
 * - ???????????model ?????? ???.
 * 
 * ???
 * - ??? ????ID, ????IP, ???? SUBNET, ???? ??? ?????, ??????, 
 *   ???, ???? ?????????
 * @author lee.m.j
 * @version 1.0
 * @created 01-7-2010 ?? 10:44:57
 **/

package egovframework.com.sym.sym.nwk.service;

import egovframework.com.cmm.ComDefaultVO;

public class Ntwrk extends ComDefaultVO {

    private static final long serialVersionUID = 1L;
	/**
	 * ????ID
	 **/
    private String ntwrkId;
	/**
	 * ????IP
	 **/
    private String ntwrkIp;
    /**
	 * ????
	 **/    
    private String gtwy;
    /**
	 * SUBNET
	 **/    
    private String subnet;
    /**
	 * ????
	 **/    
    private String domnServer;
    /**
	 * ???
	 **/    
    private String manageIem;
    /**
	 * ?????
	 **/        
    private String userNm;
    /**
	 * ??????
	 **/    
    private String useAt;
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
	 * @return the ntwrkId
	 **/
	public String getNtwrkId() {
		return ntwrkId;
	}
	/**
	 * @param ntwrkId the ntwrkId to set
	 **/
	public void setNtwrkId(String ntwrkId) {
		this.ntwrkId = ntwrkId;
	}
	/**
	 * @return the ntwrkIp
	 **/
	public String getNtwrkIp() {
		return ntwrkIp;
	}
	/**
	 * @param ntwrkIp the ntwrkIp to set
	 **/
	public void setNtwrkIp(String ntwrkIp) {
		this.ntwrkIp = ntwrkIp;
	}
	/**
	 * @return the gtwy
	 **/
	public String getGtwy() {
		return gtwy;
	}
	/**
	 * @param gtwy the gtwy to set
	 **/
	public void setGtwy(String gtwy) {
		this.gtwy = gtwy;
	}
	/**
	 * @return the subnet
	 **/
	public String getSubnet() {
		return subnet;
	}
	/**
	 * @param subnet the subnet to set
	 **/
	public void setSubnet(String subnet) {
		this.subnet = subnet;
	}
	/**
	 * @return the domnServer
	 **/
	public String getDomnServer() {
		return domnServer;
	}
	/**
	 * @param domnServer the domnServer to set
	 **/
	public void setDomnServer(String domnServer) {
		this.domnServer = domnServer;
	}
	/**
	 * @return the manageIem
	 **/
	public String getManageIem() {
		return manageIem;
	}
	/**
	 * @param manageIem the manageIem to set
	 **/
	public void setManageIem(String manageIem) {
		this.manageIem = manageIem;
	}
	/**
	 * @return the userNm
	 **/
	public String getUserNm() {
		return userNm;
	}
	/**
	 * @param userNm the userNm to set
	 **/
	public void setUserNm(String userNm) {
		this.userNm = userNm;
	}
	/**
	 * @return the useAt
	 **/
	public String getUseAt() {
		return useAt;
	}
	/**
	 * @param useAt the useAt to set
	 **/
	public void setUseAt(String useAt) {
		this.useAt = useAt;
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
