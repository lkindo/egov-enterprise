/**
 * ??
 * -????? ?????????Vo ?????? ???.
 * 
 * ???
 * - ????? ????????????????
 * @author lee.m.j
 * @version 1.0
 * @created 08-9-2009 ?? 1:40:19
 **/

package egovframework.com.sts.dst.service;

import java.util.List;

public class DtaUseStatsVO extends DtaUseStats {
	
	/**
	 * serialVersionUID
	 **/
	private static final long serialVersionUID = 1L;	
	/**
	 * ???
	 **/	
	private String pmDateTy;
	/**
	 * ????? ????????
	 **/	
	private String pmFromDate;
	/**
	 * ????? ???????
	 **/	
	private String pmToDate;
	/**
	 * ????? ????
	 **/
	List<DtaUseStatsVO> dtaUseStatsList;
	/**
	 * ????????????
	 **/	
	List <DtaUseStatsVO> dtaUseStatsBarList;
	/**
	 * ?????????????????
	 **/		
	float maxUnit = 50.0f;

	/**
	 * @return the pmDateTy
	 **/
	public String getPmDateTy() {
		return pmDateTy;
	}
	/**
	 * @param pmDateTy the pmDateTy to set
	 **/
	public void setPmDateTy(String pmDateTy) {
		this.pmDateTy = pmDateTy;
	}
	/**
	 * @return the pmFromDate
	 **/
	public String getPmFromDate() {
		return pmFromDate;
	}
	/**
	 * @param pmFromDate the pmFromDate to set
	 **/
	public void setPmFromDate(String pmFromDate) {
		this.pmFromDate = pmFromDate;
	}
	/**
	 * @return the pmToDate
	 **/
	public String getPmToDate() {
		return pmToDate;
	}
	/**
	 * @param pmToDate the pmToDate to set
	 **/
	public void setPmToDate(String pmToDate) {
		this.pmToDate = pmToDate;
	}
	/**
	 * @return the dtaUseStatsList
	 **/
	public List<DtaUseStatsVO> getDtaUseStatsList() {
		return dtaUseStatsList;
	}
	/**
	 * @param dtaUseStatsList the dtaUseStatsList to set
	 **/
	public void setDtaUseStatsList(List<DtaUseStatsVO> dtaUseStatsList) {
		this.dtaUseStatsList = dtaUseStatsList;
	}
	/**
	 * @return the dtaUseStatsBarList
	 **/
	public List<DtaUseStatsVO> getDtaUseStatsBarList() {
		return dtaUseStatsBarList;
	}
	/**
	 * @param dtaUseStatsBarList the dtaUseStatsBarList to set
	 **/
	public void setDtaUseStatsBarList(List<DtaUseStatsVO> dtaUseStatsBarList) {
		this.dtaUseStatsBarList = dtaUseStatsBarList;
	}
	/**
	 * @return the maxUnit
	 **/
	public float getMaxUnit() {
		return maxUnit;
	}
	/**
	 * @param maxUnit the maxUnit to set
	 **/
	public void setMaxUnit(float maxUnit) {
		this.maxUnit = maxUnit;
	}
}
