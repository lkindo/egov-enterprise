package egovframework.com.cmm.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.access.service.EgovUserDetailsHelper;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;

import egovframework.com.cmm.service.EgovUserDetailsService;

/**
 *
 * @author 怨듯넻?쒕퉬??媛쒕컻? ?쒖???
 * @since 2011. 6. 25.
 * @version 1.0
 * @see
 *
 * <pre>
 * 媛쒖젙?대젰(Modification Information)
 *
 *   ?섏젙??     ?섏젙??         ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *  2011. 8. 12.    ?쒖???       理쒖큹?앹꽦
 *
 *  </pre>
 */

public class EgovUserDetailsSessionServiceImpl extends EgovAbstractServiceImpl implements EgovUserDetailsService {

	/**
	 * ?몄쬆???ъ슜?먭컼泥대? VO?뺤떇?쇰줈 媛?몄삩??
	 * @return Object - ?ъ슜??ValueObject
	 */
	@Override
	public Object getAuthenticatedUser() {
		if (EgovUserDetailsHelper.isAuthenticated()) {
			return EgovUserDetailsHelper.getAuthenticatedUser();
		}
		return null;
	}

	@Override
	public List<String> getAuthorities() {
		// 沅뚰븳 ?ㅼ젙??由ы꽩?쒕떎.
		return EgovUserDetailsHelper.getAuthorities();
	}

	@Override
	public Boolean isAuthenticated() {
		// ?몄쬆???좎??몄? ?뺤씤?쒕떎.
		return EgovUserDetailsHelper.isAuthenticated();
	}

}
