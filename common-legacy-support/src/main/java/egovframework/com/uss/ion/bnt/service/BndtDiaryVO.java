package egovframework.com.uss.ion.bnt.service;

import java.util.List;

/**
 * ??
 * - ??????????Vo ?????? ???.
 *
 * ???
 * - ????????????????
 * 
 * @author ??
 * @version 1.0
 * @created 06-15-2010 ?? 2:08:56
 **/

public class BndtDiaryVO extends BndtDiary {

	private static final long serialVersionUID = 1767342530176012296L;
	/**
	 * ??
	 **/
	List<BndtDiaryVO> bndtDiaryList;

	/**
	 * @return the bndtDiaryList
	 **/
	public List<BndtDiaryVO> getBndtDiaryList() {
		return bndtDiaryList;
	}

	/**
	 * @param bannerList the bannerList to set
	 **/
	public void setBndtDiaryList(List<BndtDiaryVO> bndtDiaryList) {
		this.bndtDiaryList = bndtDiaryList;
	}

	/**
	 * ????
	 **/
	private String bndtCeckCdNm;

	/**
	 * @return the bndtCeckCdNm
	 **/
	public String getBndtCeckCdNm() {
		return bndtCeckCdNm;
	}

	/**
	 * @param bndtCeckCdNm the bndtCeckCdNm to set
	 **/
	public void setBndtCeckCdNm(String bndtCeckCdNm) {
		this.bndtCeckCdNm = bndtCeckCdNm;
	}

}
