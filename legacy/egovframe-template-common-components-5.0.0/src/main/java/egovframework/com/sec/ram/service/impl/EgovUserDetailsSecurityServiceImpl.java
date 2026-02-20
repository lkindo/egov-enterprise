package egovframework.com.sec.ram.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.security.userdetails.util.EgovUserDetailsHelper;

import egovframework.com.cmm.service.EgovUserDetailsService;

/**
 *沅뚰븳愿由??몄쬆?????ServiceImpl ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * @author 怨듯넻?쒕퉬??媛쒕컻? ?대Ц以
 * @since 2009.06.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.03.11  ?대Ц以          理쒖큹 ?앹꽦
 *
 * </pre>
 */

public class EgovUserDetailsSecurityServiceImpl extends EgovAbstractServiceImpl implements EgovUserDetailsService {


	/**
	 * ?몄쬆???ъ슜?먭컼泥대? VO?뺤떇?쇰줈 媛?몄삩??
	 * @return Object - ?ъ슜??ValueObject
	 */
	@Override
	public Object getAuthenticatedUser() {

		// ??硫붿냼?쒖쓽 寃쎌슦 ?몄쬆???섏? ?딅뜑?쇨퀬 null??由ы꽩?섏? ?딄린 ?뚮Ц??
		// 紐낆떆?곸쑝濡??몄쬆?섏? ?딆? 寃쎌슦 null??由ы꽩?섎룄濡??섏젙??

		if (EgovUserDetailsHelper.isAuthenticated()) {
			return EgovUserDetailsHelper.getAuthenticatedUser();
		}

		return null;
	}


	/**
	 * ?몄쬆???ъ슜?먯쓽 沅뚰븳 ?뺣낫瑜?媛?몄삩??
	 * ?? [ROLE_ADMIN, ROLE_USER, ROLE_A, ROLE_B, ROLE_RESTRICTED, IS_AUTHENTICATED_FULLY, IS_AUTHENTICATED_REMEMBERED, IS_AUTHENTICATED_ANONYMOUSLY]
	 * @return List - ?ъ슜??沅뚰븳?뺣낫 紐⑸줉
	 */
	@Override
	public List<String> getAuthorities() {
		return EgovUserDetailsHelper.getAuthorities();
	}

	/**
	 * ?몄쬆???ъ슜???щ?瑜?泥댄겕?쒕떎.
	 * @return Boolean - ?몄쬆???ъ슜???щ?(TRUE / FALSE)
	 */

	@Override
	public Boolean isAuthenticated() {
		return EgovUserDetailsHelper.isAuthenticated();
	}

}
