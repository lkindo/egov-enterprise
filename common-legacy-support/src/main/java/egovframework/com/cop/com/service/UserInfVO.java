package egovframework.com.cop.com.service;

import java.io.Serializable;

import org.apache.commons.lang3.builder.ToStringBuilder;

/**
 * ?????? ??? VO ?????
 * 
 * @author ??????? ????
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 *      <pre>
 * << ?????Modification Information) >>
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.4.6  ????         ????
 *
 *      </pre>
 **/
public class UserInfVO implements Serializable {
	private static final long serialVersionUID = 1L;

	/** ? ???**/
	private String uniqId = "";

	/** ????????**/
	private String userId = "";

	/** ??????**/
	private String userNm = "";

	/** ????????**/
	private String userZip = "";

	/** ???????**/
	private String userAdres = "";

	/** ?????????**/
	private String userEmail = "";

	/** ??? **/
	private String searchBgnDe = "";

	/** ???**/
	private String searchCnd = "";

	/** ?????**/
	private String searchEndDe = "";

	/** ????**/
	private String searchWrd = "";

	/** ???(DESC,ASC) **/
	private String sortOrdr = "";

	/** ????? **/
	private String searchUseYn = "";

	/** ??? **/
	private int pageIndex = 1;

	/** ????**/
	private int pageUnit = 10;

	/** ??????**/
	private int pageSize = 10;

	/** ???? ???**/
	private int firstIndex = 1;

	/** ????? ???**/
	private int lastIndex = 1;

	/** ??????????**/
	private int recordCountPerPage = 10;

	/** ??????**/
	private int rowNo = 0;

	/** ???????**/
	private String trgetId = "";

	/** ?????? **/
	private String useAt = "Y";

	/** ???? ???**/
	private String cmmntyId = "";

	/** ???????**/
	private String clubId = "";

	/** ????? ??? (???? ?? ???? **/
	private String deletedAt = "N";

	/**
	 * uniqId attribute?????.
	 *
	 * @return the uniqId
	 **/
	public String getUniqId() {
		return uniqId;
	}

	/**
	 * uniqId attribute ???????.
	 *
	 * @param uniqId
	 *               the uniqId to set
	 **/
	public void setUniqId(String uniqId) {
		this.uniqId = uniqId;
	}

	/**
	 * userId attribute?????.
	 *
	 * @return the userId
	 **/
	public String getUserId() {
		return userId;
	}

	/**
	 * userId attribute ???????.
	 *
	 * @param userId
	 *               the userId to set
	 **/
	public void setUserId(String userId) {
		this.userId = userId;
	}

	/**
	 * userNm attribute?????.
	 *
	 * @return the userNm
	 **/
	public String getUserNm() {
		return userNm;
	}

	/**
	 * userNm attribute ???????.
	 *
	 * @param userNm
	 *               the userNm to set
	 **/
	public void setUserNm(String userNm) {
		this.userNm = userNm;
	}

	/**
	 * userZip attribute?????.
	 *
	 * @return the userZip
	 **/
	public String getUserZip() {
		return userZip;
	}

	/**
	 * userZip attribute ???????.
	 *
	 * @param userZip
	 *                the userZip to set
	 **/
	public void setUserZip(String userZip) {
		this.userZip = userZip;
	}

	/**
	 * userAdres attribute?????.
	 *
	 * @return the userAdres
	 **/
	public String getUserAdres() {
		return userAdres;
	}

	/**
	 * userAdres attribute ???????.
	 *
	 * @param userAdres
	 *                  the userAdres to set
	 **/
	public void setUserAdres(String userAdres) {
		this.userAdres = userAdres;
	}

	/**
	 * userEmail attribute?????.
	 *
	 * @return the userEmail
	 **/
	public String getUserEmail() {
		return userEmail;
	}

	/**
	 * userEmail attribute ???????.
	 *
	 * @param userEmail
	 *                  the userEmail to set
	 **/
	public void setUserEmail(String userEmail) {
		this.userEmail = userEmail;
	}

	/**
	 * searchBgnDe attribute?????.
	 *
	 * @return the searchBgnDe
	 **/
	public String getSearchBgnDe() {
		return searchBgnDe;
	}

	/**
	 * searchBgnDe attribute ???????.
	 *
	 * @param searchBgnDe
	 *                    the searchBgnDe to set
	 **/
	public void setSearchBgnDe(String searchBgnDe) {
		this.searchBgnDe = searchBgnDe;
	}

	/**
	 * searchCnd attribute?????.
	 *
	 * @return the searchCnd
	 **/
	public String getSearchCnd() {
		return searchCnd;
	}

	/**
	 * searchCnd attribute ???????.
	 *
	 * @param searchCnd
	 *                  the searchCnd to set
	 **/
	public void setSearchCnd(String searchCnd) {
		this.searchCnd = searchCnd;
	}

	/**
	 * searchEndDe attribute?????.
	 *
	 * @return the searchEndDe
	 **/
	public String getSearchEndDe() {
		return searchEndDe;
	}

	/**
	 * searchEndDe attribute ???????.
	 *
	 * @param searchEndDe
	 *                    the searchEndDe to set
	 **/
	public void setSearchEndDe(String searchEndDe) {
		this.searchEndDe = searchEndDe;
	}

	/**
	 * searchWrd attribute?????.
	 *
	 * @return the searchWrd
	 **/
	public String getSearchWrd() {
		return searchWrd;
	}

	/**
	 * searchWrd attribute ???????.
	 *
	 * @param searchWrd
	 *                  the searchWrd to set
	 **/
	public void setSearchWrd(String searchWrd) {
		this.searchWrd = searchWrd;
	}

	/**
	 * sortOrdr attribute?????.
	 *
	 * @return the sortOrdr
	 **/
	public String getSortOrdr() {
		return sortOrdr;
	}

	/**
	 * sortOrdr attribute ???????.
	 *
	 * @param sortOrdr
	 *                 the sortOrdr to set
	 **/
	public void setSortOrdr(String sortOrdr) {
		this.sortOrdr = sortOrdr;
	}

	/**
	 * searchUseYn attribute?????.
	 *
	 * @return the searchUseYn
	 **/
	public String getSearchUseYn() {
		return searchUseYn;
	}

	/**
	 * searchUseYn attribute ???????.
	 *
	 * @param searchUseYn
	 *                    the searchUseYn to set
	 **/
	public void setSearchUseYn(String searchUseYn) {
		this.searchUseYn = searchUseYn;
	}

	/**
	 * pageIndex attribute?????.
	 *
	 * @return the pageIndex
	 **/
	public int getPageIndex() {
		return pageIndex;
	}

	/**
	 * pageIndex attribute ???????.
	 *
	 * @param pageIndex
	 *                  the pageIndex to set
	 **/
	public void setPageIndex(int pageIndex) {
		this.pageIndex = pageIndex;
	}

	/**
	 * pageUnit attribute?????.
	 *
	 * @return the pageUnit
	 **/
	public int getPageUnit() {
		return pageUnit;
	}

	/**
	 * pageUnit attribute ???????.
	 *
	 * @param pageUnit
	 *                 the pageUnit to set
	 **/
	public void setPageUnit(int pageUnit) {
		this.pageUnit = pageUnit;
	}

	/**
	 * pageSize attribute?????.
	 *
	 * @return the pageSize
	 **/
	public int getPageSize() {
		return pageSize;
	}

	/**
	 * pageSize attribute ???????.
	 *
	 * @param pageSize
	 *                 the pageSize to set
	 **/
	public void setPageSize(int pageSize) {
		this.pageSize = pageSize;
	}

	/**
	 * firstIndex attribute?????.
	 *
	 * @return the firstIndex
	 **/
	public int getFirstIndex() {
		return firstIndex;
	}

	/**
	 * firstIndex attribute ???????.
	 *
	 * @param firstIndex
	 *                   the firstIndex to set
	 **/
	public void setFirstIndex(int firstIndex) {
		this.firstIndex = firstIndex;
	}

	/**
	 * lastIndex attribute?????.
	 *
	 * @return the lastIndex
	 **/
	public int getLastIndex() {
		return lastIndex;
	}

	/**
	 * lastIndex attribute ???????.
	 *
	 * @param lastIndex
	 *                  the lastIndex to set
	 **/
	public void setLastIndex(int lastIndex) {
		this.lastIndex = lastIndex;
	}

	/**
	 * recordCountPerPage attribute?????.
	 *
	 * @return the recordCountPerPage
	 **/
	public int getRecordCountPerPage() {
		return recordCountPerPage;
	}

	/**
	 * recordCountPerPage attribute ???????.
	 *
	 * @param recordCountPerPage
	 *                           the recordCountPerPage to set
	 **/
	public void setRecordCountPerPage(int recordCountPerPage) {
		this.recordCountPerPage = recordCountPerPage;
	}

	/**
	 * rowNo attribute?????.
	 *
	 * @return the rowNo
	 **/
	public int getRowNo() {
		return rowNo;
	}

	/**
	 * rowNo attribute ???????.
	 *
	 * @param rowNo
	 *              the rowNo to set
	 **/
	public void setRowNo(int rowNo) {
		this.rowNo = rowNo;
	}

	/**
	 * trgetId attribute?????.
	 *
	 * @return the trgetId
	 **/
	public String getTrgetId() {
		return trgetId;
	}

	/**
	 * trgetId attribute ???????.
	 *
	 * @param trgetId
	 *                the trgetId to set
	 **/
	public void setTrgetId(String trgetId) {
		this.trgetId = trgetId;
	}

	/**
	 * useAt attribute?????.
	 *
	 * @return the useAt
	 **/
	public String getUseAt() {
		return useAt;
	}

	/**
	 * useAt attribute ???????.
	 *
	 * @param useAt
	 *              the useAt to set
	 **/
	public void setUseAt(String useAt) {
		this.useAt = useAt;
	}

	/**
	 * cmmntyId attribute?????.
	 *
	 * @return the cmmntyId
	 **/
	public String getCmmntyId() {
		return cmmntyId;
	}

	/**
	 * cmmntyId attribute ???????.
	 *
	 * @param cmmntyId
	 *                 the cmmntyId to set
	 **/
	public void setCmmntyId(String cmmntyId) {
		this.cmmntyId = cmmntyId;
	}

	/**
	 * clubId attribute?????.
	 *
	 * @return the clubId
	 **/
	public String getClubId() {
		return clubId;
	}

	/**
	 * clubId attribute ???????.
	 *
	 * @param clubId
	 *               the clubId to set
	 **/
	public void setClubId(String clubId) {
		this.clubId = clubId;
	}

	/**
	 * deletedAt attribute?????.
	 *
	 * @return the deletedAt
	 **/
	public String getDeletedAt() {
		return deletedAt;
	}

	/**
	 * deletedAt attribute ???????.
	 *
	 * @param deletedAt
	 *                  the deletedAt to set
	 **/
	public void setDeletedAt(String deletedAt) {
		this.deletedAt = deletedAt;
	}

	/**
	 * toString ???? ????
	 **/
	@Override
	public String toString() {
		return ToStringBuilder.reflectionToString(this);
	}
}
