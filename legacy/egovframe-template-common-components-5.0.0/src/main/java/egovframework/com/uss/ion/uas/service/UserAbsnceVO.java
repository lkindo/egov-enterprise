package egovframework.com.uss.ion.uas.service;

import java.util.List;

import lombok.Getter;
import lombok.Setter;

/**
 * <pre>
 * 媛쒖슂
 * - ?ъ슜?먮??ъ뿉 ???Vo ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - ?ъ슜?먮??ъ쓽 紐⑸줉 ??ぉ??愿由ы븳??
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
 *   2025.08.16  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-MethodReturnsInternalArray(Private 諛곗뿴??Public ?곗씠???좊떦)
 *   2025.08.16  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-ArrayIsStoredDirectly(Public 硫붿냼?쒕???諛섑솚??Private 諛곗뿴)
 *
 *      </pre>
 */
public class UserAbsnceVO extends UserAbsnce {

	/**
	 * serialVersionUID
	 */
	private static final long serialVersionUID = 1L;

	/**
	 * ?ъ슜?먮???紐⑸줉
	 */
	private List<UserAbsnceVO> userAbsnceList;

	/**
	 * ??젣???紐⑸줉
	 */
	@Getter
	@Setter
	private String[] delYn;

	/**
	 * 遺?ъ뿬遺 議고쉶議곌굔
	 */
	private String selAbsnceAt;

	/**
	 * @return the userAbsnceList
	 */
	public List<UserAbsnceVO> getUserAbsnceList() {
		return userAbsnceList;
	}

	/**
	 * @param userAbsnceList the userAbsnceList to set
	 */
	public void setUserAbsnceList(List<UserAbsnceVO> userAbsnceList) {
		this.userAbsnceList = userAbsnceList;
	}

	/**
	 * @return the selAbsnceAt
	 */
	public String getSelAbsnceAt() {
		return selAbsnceAt;
	}

	/**
	 * @param selAbsnceAt the selAbsnceAt to set
	 */
	public void setSelAbsnceAt(String selAbsnceAt) {
		this.selAbsnceAt = selAbsnceAt;
	}

}
