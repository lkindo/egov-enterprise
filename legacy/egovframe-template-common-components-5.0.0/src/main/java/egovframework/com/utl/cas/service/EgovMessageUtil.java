package egovframework.com.utl.cas.service;

import egovframework.com.cmm.service.EgovProperties;
import egovframework.com.utl.fcc.service.EgovStringUtil;

/**
 * 硫붿떆吏 泥섎━ 愿???좏떥由ы떚
 * 
 * @author 怨듯넻 ?쒕퉬??媛쒕컻? ?댁궪??
 * @since 2009.02.13
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.02.13  ?댁궪??         理쒖큹 ?앹꽦
 *   2025.08.29  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-UselessParentheses(遺덊븘?뷀븳 愿꾪샇?ъ슜)
 *
 *      </pre>
 */
public class EgovMessageUtil {

	private static final String PATH_SEP = System.getProperty("file.separator");

	/**
	 * ?대떦?섎뒗 ?띿꽦?ㅻ줈遺???먮윭 硫붿떆吏瑜??삳뒗??
	 *
	 * @param strCode
	 * @return
	 */
	public static String getErrorMsg(String strCode) {

		return getMessage("error", strCode, null);
	}

	/**
	 * ?대떦?섎뒗 ?띿꽦?ㅻ줈遺???먮윭 硫붿떆吏(?뚮씪誘명꽣 蹂???ы븿)瑜??삳뒗??
	 *
	 * @param strCode
	 * @param arrParam
	 * @return
	 */
	public static String getErrorMsg(String strCode, String[] arrParam) {

		return getMessage("error", strCode, arrParam);
	}

	/**
	 * ?대떦?섎뒗 ?띿꽦?ㅻ줈遺???뺣낫 硫붿떆吏瑜??삳뒗??
	 *
	 * @param strCode
	 * @return
	 */
	public static String getInfoMsg(String strCode) {

		return getMessage("info", strCode, null);
	}

	/**
	 * ?대떦?섎뒗 ?띿꽦?ㅻ줈遺???뺣낫 硫붿떆吏(?뚮씪誘명꽣 蹂???ы븿)瑜??삳뒗??
	 *
	 * @param strCode
	 * @param arrParam
	 * @return
	 */
	public static String getInfoMsg(String strCode, String[] arrParam) {

		return getMessage("info", strCode, arrParam);
	}

	/**
	 * ?대떦?섎뒗 ?띿꽦?ㅻ줈遺??寃쎄퀬 硫붿떆吏瑜??삳뒗??
	 *
	 * @param strCode
	 * @return
	 */
	public static String getWarnMsg(String strCode) {

		return getMessage("warn", strCode, null);
	}

	/**
	 * ?대떦?섎뒗 ?띿꽦?ㅻ줈遺??寃쎄퀬 硫붿떆吏(?뚮씪誘명꽣 蹂???ы븿)瑜??삳뒗??
	 *
	 * @param strCode
	 * @param arrParam
	 * @return
	 */
	public static String getWarnMsg(String strCode, String[] arrParam) {

		return getMessage("warn", strCode, arrParam);
	}

	/**
	 * ?대떦?섎뒗 ?띿꽦?ㅻ줈遺???뺤씤 硫붿떆吏瑜??삳뒗??
	 *
	 * @param strCode
	 * @return
	 */
	public static String getConfirmMsg(String strCode) {

		return getMessage("confirm", strCode, null);
	}

	/**
	 * ?대떦?섎뒗 ?띿꽦?ㅻ줈遺???뺤씤 硫붿떆吏(?뚮씪誘명꽣 蹂???ы븿)瑜??삳뒗??
	 *
	 * @param strCode
	 * @param arrParam
	 * @return
	 */
	public static String getConfirmMsg(String strCode, String[] arrParam) {

		return getMessage("confirm", strCode, arrParam);
	}

	/**
	 * 二쇱뼱吏??묒뾽 肄붾뱶, 臾몄옄??肄붾뱶, 洹몃━怨??뚮씪誘명꽣 諛곗뿴???ъ슜?섏뿬 硫붿떆吏瑜?諛섑솚?⑸땲?? 臾몄옄??肄붾뱶瑜??ъ슜?섏뿬 硫붿떆吏 ?띿꽦 ?뚯씪?먯꽌
	 * 硫붿떆吏瑜?媛?몄샃?덈떎. ?뚮씪誘명꽣 諛곗뿴???쒓났?섎㈃ ?대떦 ?뚮씪誘명꽣濡?硫붿떆吏瑜?援먯껜?⑸땲??
	 *
	 * @param wrkCode  ?묒뾽??吏?뺥븯??肄붾뱶
	 * @param strCode  硫붿떆吏 ?띿꽦 ?뚯씪?먯꽌 硫붿떆吏瑜?李얜뒗???ъ슜?섎뒗 肄붾뱶
	 * @param arrParam 硫붿떆吏 ?댁쓽 ?뚮씪誘명꽣瑜?援먯껜?섎뒗???ъ슜?섎뒗 諛곗뿴
	 * @return 援먯껜??硫붿떆吏 ?먮뒗 湲곕낯 硫붿떆吏瑜?諛섑솚
	 */
	private static String getMessage(String wrkCode, String strCode, String[] arrParam) {

		String message = null;

		String strMsg = "";
		if (!"".equals(EgovStringUtil.isNullToString(strCode.trim()))) {

			strMsg = EgovProperties.getProperty(EgovProperties.RELATIVE_PATH_PREFIX + "egovProps" + PATH_SEP + "conf"
					+ PATH_SEP + wrkCode + "message.properties", strCode);

			if (arrParam != null) {
				for (int i = arrParam.length > 0 ? arrParam.length - 1 : -1; i >= 0; i--) {
					// KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
					strMsg = EgovStringUtil.replace(EgovStringUtil.isNullToString(strMsg), "{" + i + "}", arrParam[i]);
				}
			}
			message = strMsg;
		} else {
			message = "";
		}

		return message;
	}
}
