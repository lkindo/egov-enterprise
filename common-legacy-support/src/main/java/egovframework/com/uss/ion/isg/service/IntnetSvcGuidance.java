/**
 * ??
 * - ?????????????model ?????? ???.
 * 
 * ???
 * - ????????????? ?????? ???????, ???? ?????????
 * @author lee.m.j
 * @version 1.0
 * @created 03-8-2009 ?? 2:08:51
 **/

package egovframework.com.uss.ion.isg.service;

import egovframework.com.cmm.ComDefaultVO;

public class IntnetSvcGuidance extends ComDefaultVO {

	/**
	 * serialVersionUID
	 **/
	private static final long serialVersionUID = 1L;
	/**
	 * ?????D
	 **/	
	private String intnetSvcId;
	/**
	 * ??????
	 **/		
	private String intnetSvcNm;
	/**
	 * ???????
	 **/	
	private String intnetSvcDc;
	/**
	 * ????
	 **/		
	private String reflctAt;
	/**
	 * ?????ID
	 **/
	private String userId;
	/**
	 * ???
	 **/
	private String regDate;
	
	/**
	 * @return the intnetSvcId
	 **/
	public String getIntnetSvcId() {
		return intnetSvcId;
	}
	/**
	 * @param intnetSvcId the intnetSvcId to set
	 **/
	public void setIntnetSvcId(String intnetSvcId) {
		this.intnetSvcId = intnetSvcId;
	}
	/**
	 * @return the intnetSvcNm
	 **/
	public String getIntnetSvcNm() {
		return intnetSvcNm;
	}
	/**
	 * @param intnetSvcNm the intnetSvcNm to set
	 **/
	public void setIntnetSvcNm(String intnetSvcNm) {
		this.intnetSvcNm = intnetSvcNm;
	}
	/**
	 * @return the intnetSvcDc
	 **/
	public String getIntnetSvcDc() {
		return intnetSvcDc;
	}
	/**
	 * @param intnetSvcDc the intnetSvcDc to set
	 **/
	public void setIntnetSvcDc(String intnetSvcDc) {
		this.intnetSvcDc = intnetSvcDc;
	}
	/**
	 * @return the reflctAt
	 **/
	public String getReflctAt() {
		return reflctAt;
	}
	/**
	 * @param reflctAt the reflctAt to set
	 **/
	public void setReflctAt(String reflctAt) {
		this.reflctAt = reflctAt;
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
	
}
