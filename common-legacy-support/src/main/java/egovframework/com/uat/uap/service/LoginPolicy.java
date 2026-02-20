/**
 * ??
 * - ????????model ?????? ???.
 * 
 * ???
 * - ????? ????, IP?, ??????, ????? ?????????
 * @author lee.m.j
 * @version 1.0
 * @created 03-8-2009 ?? 2:08:53
 *   <pre>
 * == ?????Modification Information) ==
 * 
 *   ????      ????          ????
 *  -------     --------    ---------------------------
 *  2009.8.3    ??     ????
 *  2024.10.29	LeeBaekHaeng	??????????PK ??????
 * </pre>
 **/

package egovframework.com.uat.uap.service;

import egovframework.com.cmm.ComDefaultVO;

public class LoginPolicy extends ComDefaultVO {

    /**
	 * serialVersionUID
	 **/
	private static final long serialVersionUID = 1L;
    /**
	 * ?????ID
	 **/	
	private String emplyrId;
	/**
	 * ?????ID ????
	 **/
	private String emplyrIdEncrypt;
	/**
	 * ??????
	 **/	
	private String emplyrNm;	
    /**
	 * ??????
	 **/	
	private String emplyrSe;		
    /**
	 * IP?
	 **/	
    private String ipInfo;
    /**
	 * ??????
	 **/	
    private String dplctPermAt;
    /**
	 * ?????
	 **/	
    private String lmttAt;
    /**
	 * ???ID
	 **/	
    private String userId;
    /**
	 * ???
	 **/	
    private String regDate;
    /**
	 * ????
	 **/	
    private String regYn;
    
	/**
	 * @return the emplyrId
	 **/
	public String getEmplyrId() {
		return emplyrId;
	}
	/**
	 * @param emplyrId the emplyrId to set
	 **/
	public void setEmplyrId(String emplyrId) {
		this.emplyrId = emplyrId;
	}

	public String getEmplyrIdEncrypt() {
		return emplyrIdEncrypt;
	}

	public void setEmplyrIdEncrypt(String emplyrIdEncrypt) {
		this.emplyrIdEncrypt = emplyrIdEncrypt;
	}

	/**
	 * @return the emplyrNm
	 **/
	public String getEmplyrNm() {
		return emplyrNm;
	}
	/**
	 * @param emplyrNm the emplyrNm to set
	 **/
	public void setEmplyrNm(String emplyrNm) {
		this.emplyrNm = emplyrNm;
	}
	/**
	 * @return the emplyrSe
	 **/
	public String getEmplyrSe() {
		return emplyrSe;
	}
	/**
	 * @param emplyrSe the emplyrSe to set
	 **/
	public void setEmplyrSe(String emplyrSe) {
		this.emplyrSe = emplyrSe;
	}
	/**
	 * @return the ipInfo
	 **/
	public String getIpInfo() {
		return ipInfo;
	}
	/**
	 * @param ipInfo the ipInfo to set
	 **/
	public void setIpInfo(String ipInfo) {
		this.ipInfo = ipInfo;
	}
	/**
	 * @return the dplctPermAt
	 **/
	public String getDplctPermAt() {
		return dplctPermAt;
	}
	/**
	 * @param dplctPermAt the dplctPermAt to set
	 **/
	public void setDplctPermAt(String dplctPermAt) {
		this.dplctPermAt = dplctPermAt;
	}
	/**
	 * @return the lmttAt
	 **/
	public String getLmttAt() {
		return lmttAt;
	}
	/**
	 * @param lmttAt the lmttAt to set
	 **/
	public void setLmttAt(String lmttAt) {
		this.lmttAt = lmttAt;
	}
	/**
	 * @return the userId
	 **/
	public String getUserId() {
		return userId;
	}
	/**
	 * @param userId the userId to set
	 **/
	public void setUserId(String userId) {
		this.userId = userId;
	}
	/**
	 * @return the regDate
	 **/
	public String getRegDate() {
		return regDate;
	}
	/**
	 * @param regDate the regDate to set
	 **/
	public void setRegDate(String regDate) {
		this.regDate = regDate;
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
}
