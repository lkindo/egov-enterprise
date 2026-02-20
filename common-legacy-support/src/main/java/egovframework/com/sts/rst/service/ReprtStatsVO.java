/**
 *  <pre>
 * << ?????Modification Information) >>
 *
 *   ????     ????         ????
 *  -------    --------    ---------------------------

 *
 *  </pre>
 **/

package egovframework.com.sts.rst.service;

import java.util.List;

import lombok.Getter;
import lombok.Setter;

/**
 * <pre>
 * ??
 * - ?????????Vo ?????? ???.
 * 
 * ???
 * - ?????? ??????????
 * </pre>
 * 
 * @author lee.m.j
 * @since 2009.08.03
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == ?????Modification Information) ==
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.08.03  lee.m.j       ????
 *   2011.08.26  ???         IncludedInfo annotation ??
 *   2025.07.02  ????         ??????PMD???????? ????????-MethodReturnsInternalArray(Private ??Public ????)
 *   2025.07.02  ????         ??????PMD???????? ????????-ArrayIsStoredDirectly(Public ?????????Private ?
 *
 *      </pre>
 **/
public class ReprtStatsVO extends ReprtStats {

	/** serialVersionUID **/
	private static final long serialVersionUID = 1L;
	/** ??????**/
	private String pmReprtTy;
	/** ???**/
	private String pmDateTy;
	/** ????????? **/
	private String pmFromDate;
	/** ???????? **/
	private String pmToDate;
	/** ??????**/
	List<ReprtStatsVO> reprtStatsList;
	/** ?????? ?**/
	List<ReprtStatsVO> reprtStatsDetailList;
	/** ????????????**/
	List<ReprtStatsVO> reprtStatsBarList;
	/** ??????????????**/
	List<ReprtStatsVO> reprtStatsByReprtTyList;
	/** ??????????**/
	private List<ReprtStatsVO> reprtStatsByReprtSttusList;
	/** ?? ? ???**/
	private String grpReprtSttusCnt;

	/**
	 * @return the grpReprtSttusCnt
	 **/
	public String getGrpReprtSttusCnt() {
		return grpReprtSttusCnt;
	}

	/**
	 * @param grpReprtSttusCnt the grpReprtSttusCnt to set
	 **/
	public void setGrpReprtSttusCnt(String grpReprtSttusCnt) {
		this.grpReprtSttusCnt = grpReprtSttusCnt;
	}

	/** ?????? **/
	@Getter
	@Setter
	String[] delYn;

	/** ?????????????? **/
	float maxUnit = 50.0f;

	/**
	 * @return the pmReprtTy
	 **/
	public String getPmReprtTy() {
		return pmReprtTy;
	}

	/**
	 * @param pmReprtTy the pmReprtTy to set
	 **/
	public void setPmReprtTy(String pmReprtTy) {
		this.pmReprtTy = pmReprtTy;
	}

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
	 * @return the reprtStatsList
	 **/
	public List<ReprtStatsVO> getReprtStatsList() {
		return reprtStatsList;
	}

	/**
	 * @param reprtStatsList the reprtStatsList to set
	 **/
	public void setReprtStatsList(List<ReprtStatsVO> reprtStatsList) {
		this.reprtStatsList = reprtStatsList;
	}

	/**
	 * @return the reprtStatsDetailList
	 **/
	public List<ReprtStatsVO> getReprtStatsDetailList() {
		return reprtStatsDetailList;
	}

	/**
	 * @param reprtStatsDetailList the reprtStatsDetailList to set
	 **/
	public void setReprtStatsDetailList(List<ReprtStatsVO> reprtStatsDetailList) {
		this.reprtStatsDetailList = reprtStatsDetailList;
	}

	/**
	 * @return the reprtStatsBarList
	 **/
	public List<ReprtStatsVO> getReprtStatsBarList() {
		return reprtStatsBarList;
	}

	/**
	 * @param reprtStatsBarList the reprtStatsBarList to set
	 **/
	public void setReprtStatsBarList(List<ReprtStatsVO> reprtStatsBarList) {
		this.reprtStatsBarList = reprtStatsBarList;
	}

	/**
	 * @return the reprtStatsByReprtTyList
	 **/
	public List<ReprtStatsVO> getReprtStatsByReprtTyList() {
		return reprtStatsByReprtTyList;
	}

	/**
	 * @param reprtStatsByReprtTyList the reprtStatsByReprtTyList to set
	 **/
	public void setReprtStatsByReprtTyList(List<ReprtStatsVO> reprtStatsByReprtTyList) {
		this.reprtStatsByReprtTyList = reprtStatsByReprtTyList;
	}

	/**
	 * @return the reprtStatsByReprtSttusList
	 **/
	public List<ReprtStatsVO> getReprtStatsByReprtSttusList() {
		return reprtStatsByReprtSttusList;
	}

	/**
	 * @param reprtStatsByReprtSttusList the reprtStatsByReprtSttusList to set
	 **/
	public void setReprtStatsByReprtSttusList(List<ReprtStatsVO> reprtStatsByReprtSttusList) {
		this.reprtStatsByReprtSttusList = reprtStatsByReprtSttusList;
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
