package egovframework.com.uss.ion.bnt.service;

import java.io.Serializable;
import java.util.List;

/**
 * 媛쒖슂
 * - ?뱀쭅?쇱??????Vo ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?뱀쭅?쇱???紐⑸줉 ??ぉ??愿由ы븳??
 * @author ?댁슜
 * @version 1.0
 * @created 06-15-2010 ?ㅽ썑 2:08:56
 */

public class BndtDiaryVO extends BndtDiary implements Serializable {

	private static final long serialVersionUID = 1767342530176012296L;
	/**
	 * 諛곕꼫 紐⑸줉
	 */
	List<BndtDiaryVO> bndtDiaryList;

	/**
	 * @return the bndtDiaryList
	 */
	public List<BndtDiaryVO> getBndtDiaryList() {
		return bndtDiaryList;
	}
	/**
	 * @param bannerList the bannerList to set
	 */
	public void setBndtDiaryList(List<BndtDiaryVO> bndtDiaryList) {
		this.bndtDiaryList = bndtDiaryList;
	}

	/**
	*  ?뱀쭅泥댄겕肄붾뱶紐?
	*/
	private String bndtCeckCdNm;

	/**
	 * @return the bndtCeckCdNm
	 */
	public String getBndtCeckCdNm() {
		return bndtCeckCdNm;
	}
	/**
	 * @param bndtCeckCdNm the bndtCeckCdNm to set
	 */
	public void setBndtCeckCdNm(String bndtCeckCdNm) {
		this.bndtCeckCdNm = bndtCeckCdNm;
	}

}
