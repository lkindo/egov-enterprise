**
 * 媛쒖슂
 * -?먮즺?댁슜?꾪솴 ?듦퀎?????Vo ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - ?먮즺?댁슜?꾪솴 ?듦퀎?뺣낫??紐⑸줉 ??ぉ??愿由ы븳??
 * @author lee.m.j
 * @version 1.0
 * @created 08-9-2009 ?ㅽ썑 1:40:19
 */

package egovframework.com.sts.dst.service;

import java.util.List;

public class DtaUseStatsVO extends DtaUseStats {
	
	/**
	 * serialVersionUID
	 */
	private static final long serialVersionUID = 1L;	
	/**
	 * 湲곌컙援щ텇
	 */	
	private String pmDateTy;
	/**
	 * ?먮즺?댁슜?꾪솴 ?듦퀎 ?쒖옉?쇱옄
	 */	
	private String pmFromDate;
	/**
	 * ?먮즺?댁슜?꾪솴 ?듦퀎 醫낅즺?쇱옄
	 */	
	private String pmToDate;
	/**
	 * ?먮즺?댁슜?꾪솴 ?듦퀎
	 */
	List<DtaUseStatsVO> dtaUseStatsList;
	/**
	 * ?깅줉?쇱옄蹂??듦퀎 洹몃옒??紐⑸줉
	 */	
	List <DtaUseStatsVO> dtaUseStatsBarList;
	/**
	 * ?깅줉?쇱옄蹂??듦퀎 洹몃옒???ъ씠利??⑥쐞
	 */		
	float maxUnit = 50.0f;

	/**
	 * @return the pmDateTy
	 */
	public String getPmDateTy() {
		return pmDateTy;
	}
	/**
	 * @param pmDateTy the pmDateTy to set
	 */
	public void setPmDateTy(String pmDateTy) {
		this.pmDateTy = pmDateTy;
	}
	/**
	 * @return the pmFromDate
	 */
	public String getPmFromDate() {
		return pmFromDate;
	}
	/**
	 * @param pmFromDate the pmFromDate to set
	 */
	public void setPmFromDate(String pmFromDate) {
		this.pmFromDate = pmFromDate;
	}
	/**
	 * @return the pmToDate
	 */
	public String getPmToDate() {
		return pmToDate;
	}
	/**
	 * @param pmToDate the pmToDate to set
	 */
	public void setPmToDate(String pmToDate) {
		this.pmToDate = pmToDate;
	}
	/**
	 * @return the dtaUseStatsList
	 */
	public List<DtaUseStatsVO> getDtaUseStatsList() {
		return dtaUseStatsList;
	}
	/**
	 * @param dtaUseStatsList the dtaUseStatsList to set
	 */
	public void setDtaUseStatsList(List<DtaUseStatsVO> dtaUseStatsList) {
		this.dtaUseStatsList = dtaUseStatsList;
	}
	/**
	 * @return the dtaUseStatsBarList
	 */
	public List<DtaUseStatsVO> getDtaUseStatsBarList() {
		return dtaUseStatsBarList;
	}
	/**
	 * @param dtaUseStatsBarList the dtaUseStatsBarList to set
	 */
	public void setDtaUseStatsBarList(List<DtaUseStatsVO> dtaUseStatsBarList) {
		this.dtaUseStatsBarList = dtaUseStatsBarList;
	}
	/**
	 * @return the maxUnit
	 */
	public float getMaxUnit() {
		return maxUnit;
	}
	/**
	 * @param maxUnit the maxUnit to set
	 */
	public void setMaxUnit(float maxUnit) {
		this.maxUnit = maxUnit;
	}
}
