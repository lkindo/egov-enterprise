package egovframework.com.sym.sym.nwk.service;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/**
 * <pre>
 * 媛쒖슂
 * - ?ㅽ듃?뚰겕?????Vo ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?ㅽ듃?뚰겕??紐⑸줉 ??ぉ, 議고쉶議곌굔 ?깆쓣 愿由ы븳??
 * </pre>
 * 
 * @author lee.m.j
 * @since 2010.08.19
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.08.19  lee.m.j       理쒖큹 ?앹꽦
 *   2025.07.22  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-AvoidArrayLoops(諛곗뿴??媛믪쓣 猷⑦봽臾몄쓣 ?댁슜?섏뿬 蹂듭궗?섎뒗 寃?蹂대떎, System.arraycopy() 硫붿냼?쒕? ?댁슜?섏뿬 蹂듭궗?섎뒗 寃껋씠 ?⑥쑉?곸씠硫??섑뻾 ?띾룄媛 鍮좊쫫)
 *
 *      </pre>
 */
public class NtwrkVO extends Ntwrk {

	private static final long serialVersionUID = 1L;

	/**
	 * 愿由ы빆紐?
	 */
	private String strManageIem;
	/**
	 * ?ъ슜?먮챸
	 */
	private String strUserNm;
	/**
	 * ?ㅽ듃?뚰겕紐⑸줉
	 */
	private List<NtwrkVO> ntwrkList;
	/**
	 * ??젣?щ?
	 */
	private String delYn[];

	/**
	 * @return the strManageIem
	 */

	public String getStrManageIem() {
		return strManageIem;
	}

	/**
	 * @param strManageIem the strManageIem to set
	 */
	public void setStrManageIem(String strManageIem) {
		this.strManageIem = strManageIem;
	}

	/**
	 * @return the strUserNm
	 */
	public String getStrUserNm() {
		return strUserNm;
	}

	/**
	 * @param strUserNm the strUserNm to set
	 */
	public void setStrUserNm(String strUserNm) {
		this.strUserNm = strUserNm;
	}

	/**
	 * @return the ntwrkList
	 */
	public List<NtwrkVO> getNtwrkList() {
		return ntwrkList;
	}

	/**
	 * @param ntwrkList the ntwrkList to set
	 */
	public void setNtwrkList(List<NtwrkVO> ntwrkList) {
		this.ntwrkList = Collections.unmodifiableList(ntwrkList);
	}

	/**
	 * @return the delYn
	 */
	public String[] getDelYn() {
		if (delYn == null) {
			return null;
		}
		return Arrays.copyOf(delYn, delYn.length);  // System.arraycopy ????ъ슜
	}
	
	/**
	 * @param delYn the delYn to set
	 */
	public void setDelYn(String[] delYn) {
		if (delYn == null) {
			this.delYn = null;
		} else {
			this.delYn = Arrays.copyOf(delYn, delYn.length);
		}
	}

}
