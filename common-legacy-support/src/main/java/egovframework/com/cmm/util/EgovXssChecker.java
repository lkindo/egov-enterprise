package egovframework.com.cmm.util;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.exception.EgovXssException;
import jakarta.servlet.http.HttpServletRequest;

/**
 * EgovXssChecker ?????
 *
 * @author ???
 * @since 2016.10.27
 * @version 1.0
 * @see
 *
 * <pre>
 * << ?????Modification Information) >>
 *
 *   ????       ????          ????
 *  -------      -------------  ----------------------
 *   2016.10.17  ???          ????
 *   2017.03.03     ??	  ??????ES)-?? ??????? ??[CWE-209]
 * </pre>
 **/

public class EgovXssChecker {

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovXssChecker.class);

	/**
	 * ????? ????????????????Xss) ???.
	 * ??, ??? ?????????
	 * @param uniqId Stirng
	 * @return boolean
	 * @exception IllegalArgumentException
	 **/
	public static boolean checkerUserXss(HttpServletRequest request, String sUniqId) throws Exception {

		//@ ??????????
		LoginVO loginVO = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();

		if (loginVO != null) {
			// 221116	???	2022 ????????
			LOGGER.debug("@Step1. XSS Check uniqId  : {}", sUniqId);
			LOGGER.debug("Step2. XSS Session uniqId  : {}", loginVO.getId());
			LOGGER.debug("Step3. XSS Session getUniqId  : {}", loginVO.getUniqId());
			LOGGER.debug("Step4. XSS Session getAuthorities  : {}", EgovUserDetailsHelper.getAuthorities());

			//???????????
			//			if(sUniqId == null || (loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId())) == null){
			//				throw new EgovXssException("XSS00001", "errors.xss.checkerUser");
			//			} else if (loginVO.getUniqId().equals("")) { // KISA ?? ??(2018-12-11, ???
			//				throw new EgovXssException("XSS00001", "errors.xss.checkerUser");
			//			}
			//
			//			//???????????Xss ?
			//			if(!sUniqId.equals(loginVO.getUniqId())){
			//				throw new EgovXssException("XSS00002", "errors.xss.checkerUser");
			//			}

			if (sUniqId == null || loginVO.getUniqId() == null || loginVO.getUniqId().equals("")) {
				throw new EgovXssException("XSS00001", "errors.xss.checkerUser");
			}

			//???????????Xss ?
			if (!sUniqId.equals(loginVO.getUniqId())) {
				throw new EgovXssException("XSS00002", "errors.xss.checkerUser");
			}
		} else {
			throw new EgovXssException("XSS00001", "errors.xss.checkerUser");
		}

		return true;
	}

}
