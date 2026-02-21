package egovframework.com.cmm.service.impl;

import java.util.ArrayList;
import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.service.EgovUserDetailsService;

/**
 *
 * @author ???????? ?????
 * @since 2011. 8. 12.
 * @version 1.0
 * @see
 *
 * <pre>
 * ?????Modification Information)
 *
 *   ????     ????         ????
 *  -------    --------    ---------------------------
 *  2011. 8. 12.    ?????       ???
 *  2017. 9. 04.    ???       ?????????EgovTestUserDetailsServiceImpl > EgovUserDetailsService)
 *
 *
 *  </pre>
 **/

public class EgoDummyUserDetailsServiceImpl extends EgovAbstractServiceImpl implements
		EgovUserDetailsService {

	//????
	LoginVO loginVO = new LoginVO();
	//? ?
	List<String> listAuth = new ArrayList<>();

	@Override
	public Object getAuthenticatedUser() {
		loginVO.setId("TEST1");
		loginVO.setPassword("raHLBnHFcunwNzcDcfad4PhD11hHgXSUr7fc1Jk9uoQ=");
		loginVO.setUserSe("USR");
		loginVO.setEmail("egovframe@nia.or.kr");
		loginVO.setIhidNum("");
// 		loginVO.setName("???????);
		loginVO.setOrgnztId("ORGNZT_0000000000000");
		loginVO.setUniqId("USRCNFRM_00000000000");
		return loginVO;
	}

	@Override
	public List<String> getAuthorities() {
		// ????????.
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
		// ??????? ???.
		return true;
	}

}
