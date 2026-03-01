package egovframework.com.sym.tbm.tbr.service;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/**
 * <pre>
 * 媛쒖슂
 * - ?μ븷?뺣낫?????Vo ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?μ븷?뺣낫??紐⑸줉 ??ぉ, 議고쉶議곌굔, ??젣??곸쓣 愿由ы븳??
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
 *   2025.07.28  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-AvoidArrayLoops(諛곗뿴??媛믪쓣 猷⑦봽臾몄쓣 ?댁슜?섏뿬 蹂듭궗?섎뒗 寃?蹂대떎, System.arraycopy() 硫붿냼?쒕? ?댁슜?섏뿬 蹂듭궗?섎뒗 寃껋씠 ?⑥쑉?곸씠硫??섑뻾 ?띾룄媛 鍮좊쫫)
 *
 *      </pre>
 */
public class TroblReqstVO extends TroblReqst {

	private static final long serialVersionUID = 1L;
	/**
	 * ?μ븷?뺣낫 紐⑸줉
	 */
	private List<TroblReqstVO> troblReqstList;
	/**
	 * ?μ븷紐?議고쉶議곌굔
	 */
	private String strTroblNm;
	/**
	 * ?μ븷醫낅쪟 議고쉶議곌굔
	 */
	private String strTroblKnd;
	/**
	 * 泥섎━?곹깭 議고쉶議곌굔
	 */
	private String strProcessSttus;

	/**
	 * ??젣???紐⑸줉
	 */
	private String delYn[];

	/**
	 * @return the troblReqstList
	 */
	public List<TroblReqstVO> getTroblReqstList() {
		return troblReqstList;
	}

	/**
	 * @param troblReqstList the troblReqstList to set
	 */
	public void setTroblReqstList(List<TroblReqstVO> troblReqstList) {
		this.troblReqstList = Collections.unmodifiableList(troblReqstList);
	}

	/**
	 * @return the strTroblNm
	 */
	public String getStrTroblNm() {
		return strTroblNm;
	}

	/**
	 * @param strTroblNm the strTroblNm to set
	 */
	public void setStrTroblNm(String strTroblNm) {
		this.strTroblNm = strTroblNm;
	}

	/**
	 * @return the strTroblKnd
	 */
	public String getStrTroblKnd() {
		return strTroblKnd;
	}

	/**
	 * @param strTroblKnd the strTroblKnd to set
	 */
	public void setStrTroblKnd(String strTroblKnd) {
		this.strTroblKnd = strTroblKnd;
	}

	/**
	 * @return the strProcessSttus
	 */
	public String getStrProcessSttus() {
		return strProcessSttus;
	}

	/**
	 * @param strProcessSttus the strProcessSttus to set
	 */
	public void setStrProcessSttus(String strProcessSttus) {
		this.strProcessSttus = strProcessSttus;
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

}
