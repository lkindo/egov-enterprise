package egovframework.com.uss.ion.isg.service;

import java.util.List;

import lombok.Getter;
import lombok.Setter;

/**
 * <pre>
 * 媛쒖슂
 * - ?명꽣?룹꽌鍮꾩뒪?덈궡?????VO ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - ?명꽣?룹꽌鍮꾩뒪?덈궡??紐⑸줉 ??ぉ??愿由ы븳??
 * </pre>
 * 
 * @author 怨듯넻而댄룷?뚰듃 媛쒕컻? ?띻만??
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
 *   2025.08.06  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-MethodReturnsInternalArray(Private 諛곗뿴??Public ?곗씠???좊떦)
 *   2025.08.06  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-ArrayIsStoredDirectly(Public 硫붿냼?쒕???諛섑솚??Private 諛곗뿴)
 *
 *      </pre>
 */
public class IntnetSvcGuidanceVO extends IntnetSvcGuidance {

	/**
	 * serialVersionUID
	 */
	private static final long serialVersionUID = 1L;

	/**
	 * ?명꽣?룹꽌鍮꾩뒪 紐⑸줉
	 */
	private List<IntnetSvcGuidanceVO> intnetSvcGuidanceList;

	/**
	 * ??젣?щ?
	 */
	@Getter
	@Setter
	private String[] delYn;

	/**
	 * @return the intnetSvcGuidanceList
	 */
	public List<IntnetSvcGuidanceVO> getIntnetSvcGuidanceList() {
		return intnetSvcGuidanceList;
	}

	/**
	 * @param intnetSvcGuidanceList the intnetSvcGuidanceList to set
	 */
	public void setIntnetSvcGuidanceList(List<IntnetSvcGuidanceVO> intnetSvcGuidanceList) {
		this.intnetSvcGuidanceList = intnetSvcGuidanceList;
	}

}
