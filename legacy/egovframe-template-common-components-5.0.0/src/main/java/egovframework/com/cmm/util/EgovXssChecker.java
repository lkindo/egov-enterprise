package egovframework.com.cmm.util;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.exception.EgovXssException;
import jakarta.servlet.http.HttpServletRequest;

/**
 * EgovXssChecker ?대옒??
 *
 * @author ?λ룞??
 * @since 2016.10.27
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??       ?섏젙??          ?섏젙?댁슜
 *  -------      -------------  ----------------------
 *   2016.10.17  ?λ룞??          理쒖큹 ?앹꽦
 *   2017.03.03     議곗꽦??	  ?쒗걧?댁퐫??ES)-?ㅻ쪟 硫붿떆吏瑜??듯븳 ?뺣낫?몄텧[CWE-209]
 * </pre>
 */

public class EgovXssChecker {

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovXssChecker.class);

	/**
	 * ?ъ슜?먯뿉 ????щ줈?ㅼ궗?댄듃?ㅽ겕由쏀듃(Xss) ?뺤씤?쒕떎.
	 * ?섏젙, ?곸꽭議고쉶, ??젣???ъ슜
	 * @param uniqId Stirng
	 * @return boolean
	 * @exception IllegalArgumentException
	 */
	public static boolean checkerUserXss(HttpServletRequest request, String sUniqId) throws Exception {

		//@ 怨듯넻紐⑤뱢???댁슜??沅뚰븳泥댄겕
		LoginVO loginVO = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();

		if (loginVO != null) {
			// 221116	源?쒖?	2022 ?쒗걧?댁퐫??議곗튂
			LOGGER.debug("@Step1. XSS Check uniqId  : {}", sUniqId);
			LOGGER.debug("Step2. XSS Session uniqId  : {}", loginVO.getId());
			LOGGER.debug("Step3. XSS Session getUniqId  : {}", loginVO.getUniqId());
			LOGGER.debug("Step4. XSS Session getAuthorities  : {}", EgovUserDetailsHelper.getAuthorities());

			//泥댄겕 媛믪뿉 ???臾닿껐??泥댄겕
			//			if(sUniqId == null || (loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId())) == null){
			//				throw new EgovXssException("XSS00001", "errors.xss.checkerUser");
			//			
                    } else if (loginVO.getUniqId().equals("")) { // KISA 蹂댁븞?쎌젏 議곗튂 (2018-12-11, ?좎슜??
			//				throw new EgovXssException("XSS00001", "errors.xss.checkerUser");
			//			
                    }
			//
			//			//?ъ슜?먯뿉?????Xss 泥댄겕
			//			if(!sUniqId.equals(loginVO.getUniqId())){
			//				throw new EgovXssException("XSS00002", "errors.xss.checkerUser");
			//			
                    }

			if (sUniqId == null || loginVO.getUniqId() == null || loginVO.getUniqId().equals("")) {
				throw new EgovXssException("XSS00001", "errors.xss.checkerUser");
			}

			//?ъ슜?먯뿉?????Xss 泥댄겕
			if (!sUniqId.equals(loginVO.getUniqId())) {
				throw new EgovXssException("XSS00002", "errors.xss.checkerUser");
			}
		} else {
			throw new EgovXssException("XSS00001", "errors.xss.checkerUser");
		}

		return true;
	}

}
