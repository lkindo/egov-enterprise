package egovframework.com.uss.ion.bnr.service;

import java.util.List;

import lombok.Getter;
import lombok.Setter;

/**
 * <pre>
 * 媛쒖슂
 * - 諛곕꼫?????Vo ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - 諛곕꼫??紐⑸줉 ??ぉ??愿由ы븳??
 * </pre>
 * 
 * @author ?대Ц以
 * @since 2009.08.03
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.08.03  ?대Ц以          理쒖큹 ?앹꽦
 *   2025.08.04  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-MethodReturnsInternalArray(Private 諛곗뿴??Public ?곗씠???좊떦)
 *   2025.08.04  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-ArrayIsStoredDirectly(Public 硫붿냼?쒕???諛섑솚??Private 諛곗뿴)
 *
 *      </pre>
 */
public class BannerVO extends Banner {

	/**
	 * serialVersionUID
	 */
	private static final long serialVersionUID = 1L;

	/**
	 * 諛곕꼫 紐⑸줉
	 */
	private List<BannerVO> bannerList;

	/**
	 * ??젣???紐⑸줉
	 */
	@Getter
	@Setter
	private String[] delYn;

	/**
	 * 寃곌낵 諛섏쁺 ???vertical : ?몃줈 horizontal : 媛濡?
	 */
	private String resultType = "horizontal";

	/**
	 * @return the bannerList
	 */
	public List<BannerVO> getBannerList() {
		return bannerList;
	}

	/**
	 * @param bannerList the bannerList to set
	 */
	public void setBannerList(List<BannerVO> bannerList) {
		this.bannerList = bannerList;
	}

	/**
	 * @return the resultType
	 */
	public String getResultType() {
		return resultType;
	}

	/**
	 * @param resultType the resultType to set
	 */
	public void setResultType(String resultType) {
		this.resultType = resultType;
	}

}
