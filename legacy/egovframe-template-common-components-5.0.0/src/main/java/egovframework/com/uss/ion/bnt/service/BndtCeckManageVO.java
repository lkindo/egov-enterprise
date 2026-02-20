package egovframework.com.uss.ion.bnt.service;

import java.io.Serializable;
import java.util.List;

/**
 * 媛쒖슂
 * - ?뱀쭅泥댄겕愿由ъ뿉 ???Vo ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?뱀쭅泥댄겕愿由ъ쓽 紐⑸줉 ??ぉ??愿由ы븳??
 * @author ?댁슜
 * @version 1.0
 * @created 06-15-2010 ?ㅽ썑 2:08:56
 */

public class BndtCeckManageVO extends BndtCeckManage implements Serializable {

	private static final long serialVersionUID = -9114350207789216858L;

	/**
	 * ?뱀쭅泥댄겕由ъ뒪?멸?由?紐⑸줉
	 */
	List<BndtCeckManageVO> bndtCeckManageList;

	/**
	 * ?뱀쭅泥댄겕由ъ뒪??Temp蹂??1
	 */
	private String bndtCeckTemp1;

	/**
	 * ?뱀쭅泥댄겕由ъ뒪???뱀쭅泥댄겕援щ텇 議고쉶議곌굔 蹂??
	 */
	private String searchBndtCeckSe;

	/**
	 * ?뱀쭅泥댄겕由ъ뒪???뱀쭅泥댄겕肄붾뱶 議고쉶議곌굔 蹂??
	 */
	private String searchBndtCeckCd;

	/**
	 * ?뱀쭅泥댄겕由ъ뒪???뱀쭅泥댄겕援щ텇 議고쉶議곌굔 蹂??
	 */
	private String searchUseAt;

	/**
	 * @return the searchUseAt
	 */
	public String getSearchUseAt() {
		return searchUseAt;
	}
	/**
	 * @param searchUseAt the searchUseAt to set
	 */
	public void setSearchUseAt(String searchUseAt) {
		this.searchUseAt = searchUseAt;
	}
	/**
	 * @return the bndtCeckManageList
	 */
	public List<BndtCeckManageVO> getBndtCeckManageList() {
		return bndtCeckManageList;
	}
	/**
	 * @param bndtCeckManageList the bndtCeckManageList to set
	 */
	public void setBndtCeckManageList(List<BndtCeckManageVO> bndtCeckManageList) {
		this.bndtCeckManageList = bndtCeckManageList;
	}

	/**
	 * @return the bndtCeckTemp1
	 */
	public String getBndtCeckTemp1() {
		return bndtCeckTemp1;
	}
	/**
	 * @param bndtCeckTemp1 the bndtCeckTemp1 to set
	 */
	public void setBndtCeckTemp1(String bndtCeckTemp1) {
		this.bndtCeckTemp1 = bndtCeckTemp1;
	}
	/**
	 * @return the searchBndtCeckSe
	 */
	public String getSearchBndtCeckSe() {
		return searchBndtCeckSe;
	}
	/**
	 * @param searchBndtCeckSe the searchBndtCeckSe to set
	 */
	public void setSearchBndtCeckSe(String searchBndtCeckSe) {
		this.searchBndtCeckSe = searchBndtCeckSe;
	}
	/**
	 * @return the searchBndtCeckCd
	 */
	public String getSearchBndtCeckCd() {
		return searchBndtCeckCd;
	}
	/**
	 * @param searchBndtCeckCd the searchBndtCeckCd to set
	 */
	public void setSearchBndtCeckCd(String searchBndtCeckCd) {
		this.searchBndtCeckCd = searchBndtCeckCd;
	}



}
