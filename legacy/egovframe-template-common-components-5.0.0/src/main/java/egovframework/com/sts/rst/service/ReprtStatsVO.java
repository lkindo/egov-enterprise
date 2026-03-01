**
 *  <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??         ?섏젙?댁슜
 *  -------    --------    ---------------------------

 *
 *  </pre>
 */

package egovframework.com.sts.rst.service;

import java.util.List;

import lombok.Getter;
import lombok.Setter;

/**
 * <pre>
 * 媛쒖슂
 * - 蹂닿퀬?쒗넻怨꾩뿉 ???Vo ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - 蹂닿퀬?쒗넻怨꾩젙蹂댁쓽 紐⑸줉 ??ぉ??愿由ы븳??
 * </pre>
 * 
 * @author lee.m.j
 * @since 2009.08.03
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.08.03  lee.m.j       理쒖큹 ?앹꽦
 *   2011.08.26  ?뺤쭊??         IncludedInfo annotation 異붽?
 *   2025.07.02  ?대갚??         而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-MethodReturnsInternalArray(Private 諛곗뿴??Public ?곗씠???좊떦)
 *   2025.07.02  ?대갚??         而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-ArrayIsStoredDirectly(Public 硫붿냼?쒕???諛섑솚??Private 諛곗뿴)
 *
 *      </pre>
 */
public class ReprtStatsVO extends ReprtStats {

	/** serialVersionUID */
	private static final long serialVersionUID = 1L;
	/** 蹂닿퀬?쒖쑀??*/
	private String pmReprtTy;
	/** 湲곌컙援щ텇 */
	private String pmDateTy;
	/** 蹂닿퀬?쒗넻怨??쒖옉?쇱옄 */
	private String pmFromDate;
	/** 蹂닿퀬?쒗넻怨?醫낅즺?쇱옄 */
	private String pmToDate;
	/** 蹂닿퀬?쒗넻怨?紐⑸줉 */
	List<ReprtStatsVO> reprtStatsList;
	/** 蹂닿퀬?쒗넻怨??곸꽭 紐⑸줉 */
	List<ReprtStatsVO> reprtStatsDetailList;
	/** ?깅줉?쇱옄蹂??듦퀎 洹몃옒??紐⑸줉 */
	List<ReprtStatsVO> reprtStatsBarList;
	/** 蹂닿퀬?쒖쑀?뺣퀎 ?듦퀎 洹몃옒??紐⑸줉 */
	List<ReprtStatsVO> reprtStatsByReprtTyList;
	/** 吏꾪뻾?곹깭蹂??듦퀎 洹몃옒??紐⑸줉 */
	List<ReprtStatsVO> reprtStatsByReprtSttusList;

	/** ??젣?щ? */
	@Getter
	@Setter
	String[] delYn;

	/** 蹂닿퀬?쒗넻怨?洹몃옒???ъ씠利??⑥쐞 */
	float maxUnit = 50.0f;

	/**
	 * @return the pmReprtTy
	 */
	public String getPmReprtTy() {
		return pmReprtTy;
	}

	/**
	 * @param pmReprtTy the pmReprtTy to set
	 */
	public void setPmReprtTy(String pmReprtTy) {
		this.pmReprtTy = pmReprtTy;
	}

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
	 * @return the reprtStatsList
	 */
	public List<ReprtStatsVO> getReprtStatsList() {
		return reprtStatsList;
	}

	/**
	 * @param reprtStatsList the reprtStatsList to set
	 */
	public void setReprtStatsList(List<ReprtStatsVO> reprtStatsList) {
		this.reprtStatsList = reprtStatsList;
	}

	/**
	 * @return the reprtStatsDetailList
	 */
	public List<ReprtStatsVO> getReprtStatsDetailList() {
		return reprtStatsDetailList;
	}

	/**
	 * @param reprtStatsDetailList the reprtStatsDetailList to set
	 */
	public void setReprtStatsDetailList(List<ReprtStatsVO> reprtStatsDetailList) {
		this.reprtStatsDetailList = reprtStatsDetailList;
	}

	/**
	 * @return the reprtStatsBarList
	 */
	public List<ReprtStatsVO> getReprtStatsBarList() {
		return reprtStatsBarList;
	}

	/**
	 * @param reprtStatsBarList the reprtStatsBarList to set
	 */
	public void setReprtStatsBarList(List<ReprtStatsVO> reprtStatsBarList) {
		this.reprtStatsBarList = reprtStatsBarList;
	}

	/**
	 * @return the reprtStatsByReprtTyList
	 */
	public List<ReprtStatsVO> getReprtStatsByReprtTyList() {
		return reprtStatsByReprtTyList;
	}

	/**
	 * @param reprtStatsByReprtTyList the reprtStatsByReprtTyList to set
	 */
	public void setReprtStatsByReprtTyList(List<ReprtStatsVO> reprtStatsByReprtTyList) {
		this.reprtStatsByReprtTyList = reprtStatsByReprtTyList;
	}

	/**
	 * @return the reprtStatsByReprtSttusList
	 */
	public List<ReprtStatsVO> getReprtStatsByReprtSttusList() {
		return reprtStatsByReprtSttusList;
	}

	/**
	 * @param reprtStatsByReprtSttusList the reprtStatsByReprtSttusList to set
	 */
	public void setReprtStatsByReprtSttusList(List<ReprtStatsVO> reprtStatsByReprtSttusList) {
		this.reprtStatsByReprtSttusList = reprtStatsByReprtSttusList;
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
