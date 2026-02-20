package egovframework.com.uss.ion.msi.service;

import java.util.List;

import lombok.Getter;
import lombok.Setter;

/**
 * <pre>
 * 媛쒖슂
 * - 硫붿씤?붾㈃?대?吏?????Vo ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - 硫붿씤?붾㈃?대?吏??紐⑸줉 ??ぉ??愿由ы븳??
 * </pre>
 * 
 * @author ?대Ц以
 * @since 2010.08.03
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.08.03  ?대Ц以          理쒖큹 ?앹꽦
 *   2025.08.07  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-MethodReturnsInternalArray(Private 諛곗뿴??Public ?곗씠???좊떦)
 *   2025.08.07  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-ArrayIsStoredDirectly(Public 硫붿냼?쒕???諛섑솚??Private 諛곗뿴)
 *
 *      </pre>
 */
public class MainImageVO extends MainImage {

	/**
	 * serialVersionUID
	 */
	private static final long serialVersionUID = 1L;

	/**
	 * 硫붿씤?붾㈃?대?吏 紐⑸줉
	 */
	private List<MainImageVO> mainImageList;

	/**
	 * ??젣???紐⑸줉
	 */
	@Getter
	@Setter
	private String[] delYn;

	/**
	 * @return the mainImageList
	 */
	public List<MainImageVO> getMainImageList() {
		return mainImageList;
	}

	/**
	 * @param mainImageList the mainImageList to set
	 */
	public void setMainImageList(List<MainImageVO> mainImageList) {
		this.mainImageList = mainImageList;
	}

}
