package egovframework.com.uss.ion.ctn.service;

import java.io.Serializable;
import java.util.List;

/**
 * 媛쒖슂
 * - 寃쎌“愿由ъ뿉 ???Vo ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - 寃쎌“愿由ъ쓽 紐⑸줉 ??ぉ??愿由ы븳??
 * @author ?댁슜
 * @version 1.0
 * @created 06-15-2010 ?ㅽ썑 2:08:56
 */

public class CtsnnManageVO extends CtsnnManage implements Serializable {

	/**
	 * serialVersionUID
	 */
	private static final long serialVersionUID = 1L;	
	/**
	 * 諛곕꼫 紐⑸줉
	 */	
	List<CtsnnManageVO> ctsnnManageList;

	/**
	 * @return the annvrsryManageList
	 */
	public List<CtsnnManageVO> getCtsnnManageList() {
		return ctsnnManageList;
	}
	/**
	 * @param bannerList the bannerList to set
	 */
	public void setCtsnnManageList(List<CtsnnManageVO> ctsnnManageList) {
		this.ctsnnManageList = ctsnnManageList;
	}

	/**
	*  ?좎껌?먮챸	      
	*/ 
	private String usNm;
	
	/**
	*  ?뱀씤?먮챸     
	*/ 
	private String sanctnerNm;
	
	/**
	*  寃쎌“肄붾뱶紐?  
	*/ 
	private String ctsnnCdNm;

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
	*  媛議깃?怨꾨챸
	*/ 
	private String relateNm;

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
	 * @return the usNm
	 */
	public String getUsNm() {
		return usNm;
	}
	/**
	 * @param usNm the usNm to set
	 */
	public void setUsNm(String usNm) {
		this.usNm = usNm;
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
	 * @return the ctsnnCdNm
	 */
	public String getCtsnnCdNm() {
		return ctsnnCdNm;
	}
	/**
	 * @param ctsnnCdNm the ctsnnCdNm to set
	 */
	public void setCtsnnCdNm(String ctsnnCdNm) {
		this.ctsnnCdNm = ctsnnCdNm;
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
	/**
	 * @return the relateNm
	 */
	public String getRelateNm() {
		return relateNm;
	}
	/**
	 * @param relateNm the relateNm to set
	 */
	public void setRelateNm(String relateNm) {
		this.relateNm = relateNm;
	}    
}
