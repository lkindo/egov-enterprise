/**
 * 媛쒖슂
 * - ?ㅽ듃?뚰겕?뺣낫?????model ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - ?μ븷愿由ъ쓽 ?ㅽ듃?뚰겕ID, ?ㅽ듃?뚰겕IP, 寃뚯씠?몄썾?? SUBNET, ?꾨찓?몄씠由꾩꽌踰? 愿由ы빆紐? ?ъ슜?먮챸, ?ъ슜?щ?, 
 *   理쒖쥌?섏젙?륤D, 理쒖쥌?섏젙?쒖젏 ??ぉ??愿由ы븳??
 * @author lee.m.j
 * @version 1.0
 * @created 01-7-2010 ?ㅼ쟾 10:44:57
 */

package egovframework.com.sym.sym.nwk.service;

import egovframework.com.cmm.ComDefaultVO;

public class Ntwrk extends ComDefaultVO {

    private static final long serialVersionUID = 1L;
	/**
	 * ?ㅽ듃?뚰겕ID
	 */
    private String ntwrkId;
	/**
	 * ?ㅽ듃?뚰겕IP
	 */
    private String ntwrkIp;
    /**
	 * 寃뚯씠?몄썾??
	 */    
    private String gtwy;
    /**
	 * SUBNET
	 */    
    private String subnet;
    /**
	 * ?꾨찓?몄씠由꾩꽌踰?
	 */    
    private String domnServer;
    /**
	 * 愿由ы빆紐?
	 */    
    private String manageIem;
    /**
	 * ?ъ슜?먮챸
	 */        
    private String userNm;
    /**
	 * ?ъ슜?щ?
	 */    
    private String useAt;
    /**
	 * ?깅줉?쇱옄
	 */    
    private String regstYmd;    
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
	 * @return the ntwrkId
	 */
	public String getNtwrkId() {
		return ntwrkId;
	}
	/**
	 * @param ntwrkId the ntwrkId to set
	 */
	public void setNtwrkId(String ntwrkId) {
		this.ntwrkId = ntwrkId;
	}
	/**
	 * @return the ntwrkIp
	 */
	public String getNtwrkIp() {
		return ntwrkIp;
	}
	/**
	 * @param ntwrkIp the ntwrkIp to set
	 */
	public void setNtwrkIp(String ntwrkIp) {
		this.ntwrkIp = ntwrkIp;
	}
	/**
	 * @return the gtwy
	 */
	public String getGtwy() {
		return gtwy;
	}
	/**
	 * @param gtwy the gtwy to set
	 */
	public void setGtwy(String gtwy) {
		this.gtwy = gtwy;
	}
	/**
	 * @return the subnet
	 */
	public String getSubnet() {
		return subnet;
	}
	/**
	 * @param subnet the subnet to set
	 */
	public void setSubnet(String subnet) {
		this.subnet = subnet;
	}
	/**
	 * @return the domnServer
	 */
	public String getDomnServer() {
		return domnServer;
	}
	/**
	 * @param domnServer the domnServer to set
	 */
	public void setDomnServer(String domnServer) {
		this.domnServer = domnServer;
	}
	/**
	 * @return the manageIem
	 */
	public String getManageIem() {
		return manageIem;
	}
	/**
	 * @param manageIem the manageIem to set
	 */
	public void setManageIem(String manageIem) {
		this.manageIem = manageIem;
	}
	/**
	 * @return the userNm
	 */
	public String getUserNm() {
		return userNm;
	}
	/**
	 * @param userNm the userNm to set
	 */
	public void setUserNm(String userNm) {
		this.userNm = userNm;
	}
	/**
	 * @return the useAt
	 */
	public String getUseAt() {
		return useAt;
	}
	/**
	 * @param useAt the useAt to set
	 */
	public void setUseAt(String useAt) {
		this.useAt = useAt;
	}
	/**
	 * @return the regstYmd
	 */
	public String getRegstYmd() {
		return regstYmd;
	}
	/**
	 * @param regstYmd the regstYmd to set
	 */
	public void setRegstYmd(String regstYmd) {
		this.regstYmd = regstYmd;
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
