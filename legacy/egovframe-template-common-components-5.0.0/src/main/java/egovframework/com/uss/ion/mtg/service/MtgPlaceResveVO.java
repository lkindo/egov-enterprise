package egovframework.com.uss.ion.mtg.service;

import java.io.Serializable;
import java.util.List;

/**
 * 媛쒖슂
 * - ?뚯쓽?ㅼ삁?쎌뿉 ???Vo ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?뚯쓽?ㅼ삁?쎌쓽 紐⑸줉 ??ぉ??愿由ы븳??
 * @author ?댁슜
 * @version 1.0
 * @created 06-15-2010 ?ㅽ썑 2:08:56
 */

public class MtgPlaceResveVO extends MtgPlaceResve implements Serializable {

	/**
	 * serialVersionUID
	 */
	private static final long serialVersionUID = 1L;
	/**
	 * ?덉빟 紐⑸줉
	 */
	List<MtgPlaceResveVO> mtgPlaceResveList;

	/**
	 * @return the mtgPlaceResveList
	 */
	public List<MtgPlaceResveVO> getMtgPlaceResveList() {
		return mtgPlaceResveList;
	}
	/**
	 * @param MtgPlaceResve the mtgPlaceResve to set
	 */
	public void setMtgPlaceResveList(List<MtgPlaceResveVO> mtgPlaceResveList) {
		this.mtgPlaceResveList = mtgPlaceResveList;
	}



}
