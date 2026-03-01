package egovframework.com.sym.sym.srv.service;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/**
 * <pre>
 * 媛쒖슂
 * - ?쒕쾭?뺣낫?????Vo ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?쒕쾭?뺣낫??紐⑸줉 ??ぉ 諛?議고쉶議곌굔??愿由ы븳??
 * </pre>
 * 
 * @author ?대Ц以
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
 *   2025.07.25  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-MethodReturnsInternalArray(Private 諛곗뿴??Public ?곗씠???좊떦)
 *
 *      </pre>
 */
public class ServerVO extends Server {

	private static final long serialVersionUID = 1L;

	/**
	 * ?쒕쾭 紐⑸줉
	 */
	private List<?> serverList;

	/**
	 * ??젣???紐⑸줉
	 */
	private String delYn[];

	/**
	 * ?쒕쾭紐?議고쉶議곌굔
	 */
	private String strServerNm;

	/**
	 * @return the serverList
	 */
	public List<?> getServerList() {
		return serverList;
	}

	/**
	 * @param serverList the serverList to set
	 */
	public void setServerList(List<?> serverList) {
		this.serverList = Collections.unmodifiableList(serverList);
	}

	/**
	 * @return the delYn
	 */
	public String[] getDelYn() {
		return delYn == null ? new String[0] : Arrays.copyOf(delYn, delYn.length);
	}

	/**
	 * @param delYn the delYn to set
	 */
	public void setDelYn(String[] delYn) {
		if (delYn == null) {
			this.delYn = new String[0];
		} else {
			this.delYn = Arrays.copyOf(delYn, delYn.length);
		}
	}

	/**
	 * @return the strServerNm
	 */
	public String getStrServerNm() {
		return strServerNm;
	}

	/**
	 * @param strServerNm the strServerNm to set
	 */
	public void setStrServerNm(String strServerNm) {
		this.strServerNm = strServerNm;
	}
}
