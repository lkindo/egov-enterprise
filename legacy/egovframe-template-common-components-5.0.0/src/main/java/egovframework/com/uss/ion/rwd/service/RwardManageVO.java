package egovframework.com.uss.ion.rwd.service;

import java.io.Serializable;
import java.util.List;

/**
 * 媛쒖슂
 * - ?ъ긽愿由ъ뿉 ???Vo ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?ъ긽愿由ъ쓽 紐⑸줉 ??ぉ??愿由ы븳??
 * @author ?댁슜
 * @version 1.0
 * @created 06-15-2010 ?ㅽ썑 2:08:56
 */

public class RwardManageVO extends RwardManage implements Serializable {

	/**
	 * serialVersionUID
	 */
	private static final long serialVersionUID = 1L;
	/**
	 * ?ъ긽??紐⑸줉
	 */
	List<RwardManageVO> rwardManageList;

	/**
	 * @return the rwardManageList
	 */
	public List<RwardManageVO> getRwardManageList() {
		return rwardManageList;
	}
	/**
	 * @param RwardManage the rwardManage to set
	 */
	public void setRwardManageList(List<RwardManageVO> rwardManageList) {
		this.rwardManageList = rwardManageList;
	}

	/**
	*  ?ъ긽?먮챸
	*/
	private String rwardManNm;

	/**
	*  ?뱀씤?먮챸
	*/
	private String sanctnerNm;

	/**
	*  ?ъ긽肄붾뱶紐?
	*/
	private String rwardCdNm;

	/**
	*  ?ъ슜???뚯냽紐?
	*/
	private String orgnztNm;

	/**
	*  ?뱀씤???뚯냽紐?
	*/
	private String sanctnerOrgnztNm;

	/**
	*  寃?됱떆?묒씪??
	*/
	private String searchFromDate;

	/**
	*  寃?됱쥌猷뚯씪??
	*/
	private String searchToDate;

	/**
	*  寃???깅챸
	*/
	private String searchNm;

	/**
	*  寃??吏꾪뻾援щ텇
	*/
	private String searchConfmAt;

	/**
	*  searchToDateView
	*/
	private String searchToDateView;

	/**
	*  searchFromDateView
	*/
	private String searchFromDateView;


	/**
	 * @return the searchToDateView
	 */
	public String getSearchToDateView() {
		return searchToDateView;
	}
	/**
	 * @param searchToDateView the searchToDateView to set
	 */
	public void setSearchToDateView(String searchToDateView) {
		this.searchToDateView = searchToDateView;
	}
	/**
	 * @return the searchFromDateView
	 */
	public String getSearchFromDateView() {
		return searchFromDateView;
	}
	/**
	 * @param searchFromDateView the searchFromDateView to set
	 */
	public void setSearchFromDateView(String searchFromDateView) {
		this.searchFromDateView = searchFromDateView;
	}


	/**
	 * @return the rwardManNm
	 */
	public String getRwardManNm() {
		return rwardManNm;
	}
	/**
	 * @param rwardManNm the rwardManNm to set
	 */
	public void setRwardManNm(String rwardManNm) {
		this.rwardManNm = rwardManNm;
	}
	/**
	 * @return the sanctnerNm
	 */
	public String getSanctnerNm() {
		return sanctnerNm;
	}
	/**
	 * @param sanctnerNm the sanctnerNm to set
	 */
	public void setSanctnerNm(String sanctnerNm) {
		this.sanctnerNm = sanctnerNm;
	}
	/**
	 * @return the rwardCdNm
	 */
	public String getRwardCdNm() {
		return rwardCdNm;
	}
	/**
	 * @param rwardCdNm the rwardCdNm to set
	 */
	public void setRwardCdNm(String rwardCdNm) {
		this.rwardCdNm = rwardCdNm;
	}
	/**
	 * @return the orgnztNm
	 */
	public String getOrgnztNm() {
		return orgnztNm;
	}
	/**
	 * @param orgnztNm the orgnztNm to set
	 */
	public void setOrgnztNm(String orgnztNm) {
		this.orgnztNm = orgnztNm;
	}
	/**
	 * @return the sanctnerOrgnztNm
	 */
	public String getSanctnerOrgnztNm() {
		return sanctnerOrgnztNm;
	}
	/**
	 * @param sanctnerOrgnztNm the sanctnerOrgnztNm to set
	 */
	public void setSanctnerOrgnztNm(String sanctnerOrgnztNm) {
		this.sanctnerOrgnztNm = sanctnerOrgnztNm;
	}
	/**
	 * @return the searchFromDate
	 */
	public String getSearchFromDate() {
		return searchFromDate;
	}
	/**
	 * @param searchFromDate the searchFromDate to set
	 */
	public void setSearchFromDate(String searchFromDate) {
		this.searchFromDate = searchFromDate;
	}
	/**
	 * @return the searchToDate
	 */
	public String getSearchToDate() {
		return searchToDate;
	}
	/**
	 * @param searchToDate the searchToDate to set
	 */
	public void setSearchToDate(String searchToDate) {
		this.searchToDate = searchToDate;
	}
	/**
	 * @return the searchNm
	 */
	public String getSearchNm() {
		return searchNm;
	}
	/**
	 * @param searchNm the searchNm to set
	 */
	public void setSearchNm(String searchNm) {
		this.searchNm = searchNm;
	}
	/**
	 * @return the searchConfmAt
	 */
	public String getSearchConfmAt() {
		return searchConfmAt;
	}
	/**
	 * @param searchConfmAt the searchConfmAt to set
	 */
	public void setSearchConfmAt(String searchConfmAt) {
		this.searchConfmAt = searchConfmAt;
	}
}
