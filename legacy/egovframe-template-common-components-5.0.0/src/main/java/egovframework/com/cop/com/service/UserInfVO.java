package egovframework.com.cop.com.service;

import java.io.Serializable;

import org.apache.commons.lang3.builder.ToStringBuilder;

/**
 * ?ъ슜???뺣낫 議고쉶瑜??꾪븳 VO  ?대옒??
 * @author 怨듯넻?쒕퉬?ㅺ컻諛쒗? ?댁궪??
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.4.6  ?댁궪??         理쒖큹 ?앹꽦
 *
 * </pre>
 */
@SuppressWarnings("serial")
public class UserInfVO implements Serializable {

	/** ?좎씪 ?꾩씠??*/
	private String uniqId = "";

	/** ?ъ슜???꾩씠??*/
	private String userId = "";

	/** ?ъ슜??紐?*/
	private String userNm = "";

	/** ?ъ슜???고렪踰덊샇 */
	private String userZip = "";

	/** ?ъ슜??二쇱냼 */
	private String userAdres = "";

	/** ?ъ슜???대찓??*/
	private String userEmail = "";

	/** 寃?됱떆?묒씪 */
	private String searchBgnDe = "";

	/** 寃?됱“嫄?*/
	private String searchCnd = "";

	/** 寃?됱쥌猷뚯씪 */
	private String searchEndDe = "";

	/** 寃?됰떒??*/
	private String searchWrd = "";

	/** ?뺣젹?쒖꽌(DESC,ASC) */
	private String sortOrdr = "";

	/** 寃?됱궗?⑹뿬遺 */
	private String searchUseYn = "";

	/** ?꾩옱?섏씠吏 */
	private int pageIndex = 1;

	/** ?섏씠吏媛쒖닔 */
	private int pageUnit = 10;

	/** ?섏씠吏?ъ씠利?*/
	private int pageSize = 10;

	/** 泥ロ럹?댁? ?몃뜳??*/
	private int firstIndex = 1;

	/** 留덉?留됲럹?댁? ?몃뜳??*/
	private int lastIndex = 1;

	/** ?섏씠吏???덉퐫??媛쒖닔 */
	private int recordCountPerPage = 10;

	/** ?덉퐫??踰덊샇 */
	private int rowNo = 0;

	/** ????꾩씠??*/
	private String trgetId = "";

	/** ?ъ슜?щ? */
	private String useAt = "Y";

	/** 而ㅻ??덊떚 ?꾩씠??*/
	private String cmmntyId = "";

	/** ?숉샇???꾩씠??*/
	private String clubId = "";

	/** ???以묒? ?щ? (而ㅻ??덊떚 ?먮뒗 ?숉샇?? */
	private String deletedAt = "N";

	/**
	 * uniqId attribute瑜?由ы꽩?쒕떎.
	 *
	 * @return the uniqId
	 */
	public String getUniqId() {
		return uniqId;
	}

	/**
	 * uniqId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 *
	 * @param uniqId
	 *            the uniqId to set
	 */
	public void setUniqId(String uniqId) {
		this.uniqId = uniqId;
	}

	/**
	 * userId attribute瑜?由ы꽩?쒕떎.
	 *
	 * @return the userId
	 */
	public String getUserId() {
		return userId;
	}

	/**
	 * userId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 *
	 * @param userId
	 *            the userId to set
	 */
	public void setUserId(String userId) {
		this.userId = userId;
	}

	/**
	 * userNm attribute瑜?由ы꽩?쒕떎.
	 *
	 * @return the userNm
	 */
	public String getUserNm() {
		return userNm;
	}

	/**
	 * userNm attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 *
	 * @param userNm
	 *            the userNm to set
	 */
	public void setUserNm(String userNm) {
		this.userNm = userNm;
	}

	/**
	 * userZip attribute瑜?由ы꽩?쒕떎.
	 *
	 * @return the userZip
	 */
	public String getUserZip() {
		return userZip;
	}

	/**
	 * userZip attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 *
	 * @param userZip
	 *            the userZip to set
	 */
	public void setUserZip(String userZip) {
		this.userZip = userZip;
	}

	/**
	 * userAdres attribute瑜?由ы꽩?쒕떎.
	 *
	 * @return the userAdres
	 */
	public String getUserAdres() {
		return userAdres;
	}

	/**
	 * userAdres attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 *
	 * @param userAdres
	 *            the userAdres to set
	 */
	public void setUserAdres(String userAdres) {
		this.userAdres = userAdres;
	}

	/**
	 * userEmail attribute瑜?由ы꽩?쒕떎.
	 *
	 * @return the userEmail
	 */
	public String getUserEmail() {
		return userEmail;
	}

	/**
	 * userEmail attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 *
	 * @param userEmail
	 *            the userEmail to set
	 */
	public void setUserEmail(String userEmail) {
		this.userEmail = userEmail;
	}

	/**
	 * searchBgnDe attribute瑜?由ы꽩?쒕떎.
	 *
	 * @return the searchBgnDe
	 */
	public String getSearchBgnDe() {
		return searchBgnDe;
	}

	/**
	 * searchBgnDe attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 *
	 * @param searchBgnDe
	 *            the searchBgnDe to set
	 */
	public void setSearchBgnDe(String searchBgnDe) {
		this.searchBgnDe = searchBgnDe;
	}

	/**
	 * searchCnd attribute瑜?由ы꽩?쒕떎.
	 *
	 * @return the searchCnd
	 */
	public String getSearchCnd() {
		return searchCnd;
	}

	/**
	 * searchCnd attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 *
	 * @param searchCnd
	 *            the searchCnd to set
	 */
	public void setSearchCnd(String searchCnd) {
		this.searchCnd = searchCnd;
	}

	/**
	 * searchEndDe attribute瑜?由ы꽩?쒕떎.
	 *
	 * @return the searchEndDe
	 */
	public String getSearchEndDe() {
		return searchEndDe;
	}

	/**
	 * searchEndDe attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 *
	 * @param searchEndDe
	 *            the searchEndDe to set
	 */
	public void setSearchEndDe(String searchEndDe) {
		this.searchEndDe = searchEndDe;
	}

	/**
	 * searchWrd attribute瑜?由ы꽩?쒕떎.
	 *
	 * @return the searchWrd
	 */
	public String getSearchWrd() {
		return searchWrd;
	}

	/**
	 * searchWrd attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 *
	 * @param searchWrd
	 *            the searchWrd to set
	 */
	public void setSearchWrd(String searchWrd) {
		this.searchWrd = searchWrd;
	}

	/**
	 * sortOrdr attribute瑜?由ы꽩?쒕떎.
	 *
	 * @return the sortOrdr
	 */
	public String getSortOrdr() {
		return sortOrdr;
	}

	/**
	 * sortOrdr attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 *
	 * @param sortOrdr
	 *            the sortOrdr to set
	 */
	public void setSortOrdr(String sortOrdr) {
		this.sortOrdr = sortOrdr;
	}

	/**
	 * searchUseYn attribute瑜?由ы꽩?쒕떎.
	 *
	 * @return the searchUseYn
	 */
	public String getSearchUseYn() {
		return searchUseYn;
	}

	/**
	 * searchUseYn attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 *
	 * @param searchUseYn
	 *            the searchUseYn to set
	 */
	public void setSearchUseYn(String searchUseYn) {
		this.searchUseYn = searchUseYn;
	}

	/**
	 * pageIndex attribute瑜?由ы꽩?쒕떎.
	 *
	 * @return the pageIndex
	 */
	public int getPageIndex() {
		return pageIndex;
	}

	/**
	 * pageIndex attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 *
	 * @param pageIndex
	 *            the pageIndex to set
	 */
	public void setPageIndex(int pageIndex) {
		this.pageIndex = pageIndex;
	}

	/**
	 * pageUnit attribute瑜?由ы꽩?쒕떎.
	 *
	 * @return the pageUnit
	 */
	public int getPageUnit() {
		return pageUnit;
	}

	/**
	 * pageUnit attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 *
	 * @param pageUnit
	 *            the pageUnit to set
	 */
	public void setPageUnit(int pageUnit) {
		this.pageUnit = pageUnit;
	}

	/**
	 * pageSize attribute瑜?由ы꽩?쒕떎.
	 *
	 * @return the pageSize
	 */
	public int getPageSize() {
		return pageSize;
	}

	/**
	 * pageSize attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 *
	 * @param pageSize
	 *            the pageSize to set
	 */
	public void setPageSize(int pageSize) {
		this.pageSize = pageSize;
	}

	/**
	 * firstIndex attribute瑜?由ы꽩?쒕떎.
	 *
	 * @return the firstIndex
	 */
	public int getFirstIndex() {
		return firstIndex;
	}

	/**
	 * firstIndex attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 *
	 * @param firstIndex
	 *            the firstIndex to set
	 */
	public void setFirstIndex(int firstIndex) {
		this.firstIndex = firstIndex;
	}

	/**
	 * lastIndex attribute瑜?由ы꽩?쒕떎.
	 *
	 * @return the lastIndex
	 */
	public int getLastIndex() {
		return lastIndex;
	}

	/**
	 * lastIndex attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 *
	 * @param lastIndex
	 *            the lastIndex to set
	 */
	public void setLastIndex(int lastIndex) {
		this.lastIndex = lastIndex;
	}

	/**
	 * recordCountPerPage attribute瑜?由ы꽩?쒕떎.
	 *
	 * @return the recordCountPerPage
	 */
	public int getRecordCountPerPage() {
		return recordCountPerPage;
	}

	/**
	 * recordCountPerPage attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 *
	 * @param recordCountPerPage
	 *            the recordCountPerPage to set
	 */
	public void setRecordCountPerPage(int recordCountPerPage) {
		this.recordCountPerPage = recordCountPerPage;
	}

	/**
	 * rowNo attribute瑜?由ы꽩?쒕떎.
	 *
	 * @return the rowNo
	 */
	public int getRowNo() {
		return rowNo;
	}

	/**
	 * rowNo attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 *
	 * @param rowNo
	 *            the rowNo to set
	 */
	public void setRowNo(int rowNo) {
		this.rowNo = rowNo;
	}

	/**
	 * trgetId attribute瑜?由ы꽩?쒕떎.
	 *
	 * @return the trgetId
	 */
	public String getTrgetId() {
		return trgetId;
	}

	/**
	 * trgetId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 *
	 * @param trgetId
	 *            the trgetId to set
	 */
	public void setTrgetId(String trgetId) {
		this.trgetId = trgetId;
	}

	/**
	 * useAt attribute瑜?由ы꽩?쒕떎.
	 *
	 * @return the useAt
	 */
	public String getUseAt() {
		return useAt;
	}

	/**
	 * useAt attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 *
	 * @param useAt
	 *            the useAt to set
	 */
	public void setUseAt(String useAt) {
		this.useAt = useAt;
	}

	/**
	 * cmmntyId attribute瑜?由ы꽩?쒕떎.
	 *
	 * @return the cmmntyId
	 */
	public String getCmmntyId() {
		return cmmntyId;
	}

	/**
	 * cmmntyId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 *
	 * @param cmmntyId
	 *            the cmmntyId to set
	 */
	public void setCmmntyId(String cmmntyId) {
		this.cmmntyId = cmmntyId;
	}

	/**
	 * clubId attribute瑜?由ы꽩?쒕떎.
	 *
	 * @return the clubId
	 */
	public String getClubId() {
		return clubId;
	}

	/**
	 * clubId attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 *
	 * @param clubId
	 *            the clubId to set
	 */
	public void setClubId(String clubId) {
		this.clubId = clubId;
	}

	/**
	 * deletedAt attribute瑜?由ы꽩?쒕떎.
	 *
	 * @return the deletedAt
	 */
	public String getDeletedAt() {
		return deletedAt;
	}

	/**
	 * deletedAt attribute 媛믪쓣 ?ㅼ젙?쒕떎.
	 *
	 * @param deletedAt
	 *            the deletedAt to set
	 */
	public void setDeletedAt(String deletedAt) {
		this.deletedAt = deletedAt;
	}

	/**
	 * toString 硫붿냼?쒕? ?移섑븳??
	 */
	@Override
	public String toString() {
		return ToStringBuilder.reflectionToString(this);
	}
}
