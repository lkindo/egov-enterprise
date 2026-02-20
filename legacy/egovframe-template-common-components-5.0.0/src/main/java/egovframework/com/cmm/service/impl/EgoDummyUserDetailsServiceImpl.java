package egovframework.com.cmm.service.impl;

import java.util.ArrayList;
import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.service.EgovUserDetailsService;

/**
 *
 * @author 怨듯넻?쒕퉬??媛쒕컻? ?쒖???
 * @since 2011. 8. 12.
 * @version 1.0
 * @see
 *
 * <pre>
 * 媛쒖젙?대젰(Modification Information)
 *
 *   ?섏젙??     ?섏젙??         ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *  2011. 8. 12.    ?쒖???       理쒖큹?앹꽦
 *  2017. 9. 04.    ?λ룞??       ?대옒???대쫫 蹂寃?EgovTestUserDetailsServiceImpl > EgovUserDetailsService)
 *
 *
 *  </pre>
 */

public class EgoDummyUserDetailsServiceImpl extends EgovAbstractServiceImpl implements
		EgovUserDetailsService {

	//濡쒓렇??媛앹껜
	LoginVO loginVO = new LoginVO();
	//沅뚰븳紐⑸줉 媛앹껜
	List<String> listAuth = new ArrayList<>();

	@Override
	public Object getAuthenticatedUser() {
		loginVO.setId("TEST1");
		loginVO.setPassword("raHLBnHFcunwNzcDcfad4PhD11hHgXSUr7fc1Jk9uoQ=");
		loginVO.setUserSe("USR");
		loginVO.setEmail("egovframe@nia.or.kr");
		loginVO.setIhidNum("");
		loginVO.setName("?붾??ъ슜??);
		loginVO.setOrgnztId("ORGNZT_0000000000000");
		loginVO.setUniqId("USRCNFRM_00000000000");
		return loginVO;
	}

	@Override
	public List<String> getAuthorities() {
		// 沅뚰븳 ?ㅼ젙??由ы꽩?쒕떎.
		listAuth.add("IS_AUTHENTICATED_ANONYMOUSLY");
		listAuth.add("IS_AUTHENTICATED_FULLY");
		listAuth.add("IS_AUTHENTICATED_REMEMBERED");
		listAuth.add("ROLE_ADMIN");
		listAuth.add("ROLE_ANONYMOUS");
		listAuth.add("ROLE_RESTRICTED");
		listAuth.add("ROLE_USER");
		return listAuth;
	}

	@Override
	public Boolean isAuthenticated() {
		// ?몄쬆???좎??몄? ?뺤씤?쒕떎.
		return true;
	}

}
