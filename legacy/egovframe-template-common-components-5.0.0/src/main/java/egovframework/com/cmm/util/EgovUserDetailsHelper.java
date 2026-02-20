package egovframework.com.cmm.util;

import java.util.List;

import egovframework.com.cmm.service.EgovUserDetailsService;

/**
 * EgovUserDetails Helper ?대옒??
 *
 * @since 2009.06.01
 * @version 1.0
 * @author sjyoon
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    -------------    ----------------------
 *   2009.03.10  sjyoon         理쒖큹 ?앹꽦
 *   2011.07.01	 ?쒖???         interface ?앹꽦???곸꽭 濡쒖쭅??遺꾨━
 * </pre>
 */

public class EgovUserDetailsHelper {

	static EgovUserDetailsService egovUserDetailsService;

	public EgovUserDetailsService getEgovUserDetailsService() {
		return egovUserDetailsService;
	}

	public void setEgovUserDetailsService(EgovUserDetailsService egovUserDetailsService) {
		EgovUserDetailsHelper.egovUserDetailsService = egovUserDetailsService;
	}

	/**
	 * ?몄쬆???ъ슜?먭컼泥대? VO?뺤떇?쇰줈 媛?몄삩??
	 * @return Object - ?ъ슜??ValueObject
	 */
	public static Object getAuthenticatedUser() {
		return egovUserDetailsService.getAuthenticatedUser();
	}

	/**
	 * ?몄쬆???ъ슜?먯쓽 沅뚰븳 ?뺣낫瑜?媛?몄삩??
	 *
	 * @return List - ?ъ슜??沅뚰븳?뺣낫 紐⑸줉
	 */
	public static List<String> getAuthorities() {
		return egovUserDetailsService.getAuthorities();
	}

	/**
	 * ?몄쬆???ъ슜???щ?瑜?泥댄겕?쒕떎.
	 * @return Boolean - ?몄쬆???ъ슜???щ?(TRUE / FALSE)
	 */
	public static Boolean isAuthenticated() {
		return egovUserDetailsService.isAuthenticated();
	}
}
