package egovframework.com.uss.ion.bnt.service;

import java.util.List;

/**
 * ??
 * - ???? ????Vo ?????? ???.
 *
 * ???
 * - ???? ??????????
 * 
 * @author ??
 * @version 1.0
 * @created 06-15-2010 ?? 2:08:56
 **/

public class BndtCeckManageVO extends BndtCeckManage {

	private static final long serialVersionUID = -9114350207789216858L;

	/**
	 * ????????
	 **/
	List<BndtCeckManageVO> bndtCeckManageList;

	/**
	 * ?????Temp??1
	 **/
	private String bndtCeckTemp1;

	/**
	 * ???????? ?? ??
	 **/
	private String searchBndtCeckSe;

	/**
	 * ??????????? ??
	 **/
	private String searchBndtCeckCd;

	/**
	 * ???????? ?? ??
	 **/
	private String searchUseAt;

	/**
	 * @return the searchUseAt
	 **/
	public String getSearchUseAt() {
		return searchUseAt;
	}

	/**
	 * @param searchUseAt the searchUseAt to set
	 **/
	public void setSearchUseAt(String searchUseAt) {
		this.searchUseAt = searchUseAt;
	}

	/**
	 * @return the bndtCeckManageList
	 **/
	public List<BndtCeckManageVO> getBndtCeckManageList() {
		return bndtCeckManageList;
	}

	/**
	 * @param bndtCeckManageList the bndtCeckManageList to set
	 **/
	public void setBndtCeckManageList(List<BndtCeckManageVO> bndtCeckManageList) {
		this.bndtCeckManageList = bndtCeckManageList;
	}

	/**
	 * @return the bndtCeckTemp1
	 **/
	public String getBndtCeckTemp1() {
		return bndtCeckTemp1;
	}

	/**
	 * @param bndtCeckTemp1 the bndtCeckTemp1 to set
	 **/
	public void setBndtCeckTemp1(String bndtCeckTemp1) {
		this.bndtCeckTemp1 = bndtCeckTemp1;
	}

	/**
	 * @return the searchBndtCeckSe
	 **/
	public String getSearchBndtCeckSe() {
		return searchBndtCeckSe;
	}

	/**
	 * @param searchBndtCeckSe the searchBndtCeckSe to set
	 **/
	public void setSearchBndtCeckSe(String searchBndtCeckSe) {
		this.searchBndtCeckSe = searchBndtCeckSe;
	}

	/**
	 * @return the searchBndtCeckCd
	 **/
	public String getSearchBndtCeckCd() {
		return searchBndtCeckCd;
	}

	/**
	 * @param searchBndtCeckCd the searchBndtCeckCd to set
	 **/
	public void setSearchBndtCeckCd(String searchBndtCeckCd) {
		this.searchBndtCeckCd = searchBndtCeckCd;
	}

}
