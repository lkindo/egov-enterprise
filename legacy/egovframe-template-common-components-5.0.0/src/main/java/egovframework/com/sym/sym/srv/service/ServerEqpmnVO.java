package egovframework.com.sym.sym.srv.service;

import java.util.Collections;
import java.util.List;

import lombok.Getter;
import lombok.Setter;

/**
 * <pre>
 * 媛쒖슂
 * - ?쒕쾭?λ퉬?????Vo ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?쒕쾭?λ퉬??紐⑸줉 ??ぉ 諛?議고쉶議곌굔??愿由ы븳??
 * </pre>
 * 
 * @author ?대Ц以
 * 
 * @since 2010.06.28
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.06.28  ?대Ц以          理쒖큹 ?앹꽦
 *   2020-08-28  ?좎슜??         蹂댁븞?쎌젏 議곗튂 (Private 諛곗뿴??Public ?곗씠???좊떦[CWE-496])
 *   2025.07.24  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-MethodReturnsInternalArray(Private 諛곗뿴??Public ?곗씠???좊떦)
 *
 *      </pre>
 */
public class ServerEqpmnVO extends ServerEqpmn {

	private static final long serialVersionUID = 1L;

	/**
	 * ?쒕쾭 ?λ퉬 紐⑸줉
	 */
	private List<?> serverEqpmnList;

	/**
	 * ??젣???紐⑸줉
	 */
	@Getter
	@Setter
	private String delYn[];

	/**
	 * ?쒕쾭?λ퉬紐?議고쉶議곌굔
	 */
	private String strServerEqpmnNm;

	/**
	 * @return the serverEqpmnList
	 */
	public List<?> getServerEqpmnList() {
		return serverEqpmnList;
	}

	/**
	 * @param serverEqpmnList the serverEqpmnList to set
	 */
	public void setServerEqpmnList(List<?> serverEqpmnList) {
		this.serverEqpmnList = Collections.unmodifiableList(serverEqpmnList);
	}

	/**
	 * @return the strServerEqpmnNm
	 */
	public String getStrServerEqpmnNm() {
		return strServerEqpmnNm;
	}

	/**
	 * @param strServerEqpmnNm the strServerEqpmnNm to set
	 */
	public void setStrServerEqpmnNm(String strServerEqpmnNm) {
		this.strServerEqpmnNm = strServerEqpmnNm;
	}
}