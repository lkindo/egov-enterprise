package egovframework.com.uss.ion.bnt.service;

import egovframework.com.cmm.ComDefaultVO;

/**
 * ??
 * - ??????????model ?????? ???.
 * 
 * ???
 * - ??? ?D,???,???????,????,???,???? ?????????
 * @author ??
 * @version 1.0
 * @created 06-15-2010 ?? 2:08:56
 **/

public class BndtManage extends ComDefaultVO {

	/**
	* serialVersionUID
	**/
	private static final long serialVersionUID = 1L;
	
	/**
	*  ?D	      
	**/ 
	private String bndtId;

	/**
	*  ???	      
	**/ 
	private String bndtDe;

	/**
	*  ????         
	**/ 
	private String remark;

	/**
	*  ???	
	**/ 
	private String frstRegisterId;

	/**
	*  ????	
	**/ 
	private String frstRegisterPnttm;

	/**
	*  ???	
	**/ 
	private String lastUpdusrId;

	/**
	*  ????	
	**/ 
	private String lastUpdusrPnttm;

	/**
	 * @return the bndtId
	 **/
	public String getBndtId() {
		return bndtId;
	}

	/**
	 * @param bndtId the bndtId to set
	 **/
	public void setBndtId(String bndtId) {
		this.bndtId = bndtId;
	}

	/**
	 * @return the bndtDe
	 **/
	public String getBndtDe() {
		return bndtDe;
	}

	/**
	 * @param bndtDe the bndtDe to set
	 **/
	public void setBndtDe(String bndtDe) {
		this.bndtDe = bndtDe;
	}

	/**
	 * @return the remark
	 **/
	public String getRemark() {
		return remark;
	}

	/**
	 * @param remark the remark to set
	 **/
	public void setRemark(String remark) {
		this.remark = remark;
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
	
	
}
