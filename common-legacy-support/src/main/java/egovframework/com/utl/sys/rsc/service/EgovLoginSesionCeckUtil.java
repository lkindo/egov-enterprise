package egovframework.com.utl.sys.rsc.service;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.util.EgovUserDetailsHelper;

/**
 * ??
 * - ???????????????util ?????? ???.
 *
 * ???
 * - ??????????????????.
 * @author lee.m.j
 * @version 1.0
 * @created 28-6-2010 ?? 10:44:26
 **/

@Service("egovLoginSesionCeckUtil")
public class EgovLoginSesionCeckUtil extends EgovAbstractServiceImpl {

	/**
	 * ???????????????????.
	 * @param url - String
	 * @return String
	 **/
	public void setLoginSession(String url) throws Exception {
		LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
		// KISA ?????(2018-12-10, ????)
		if ( user != null ) {
			user.setUrl("");
			user.setUrl(url);
		}
		//new EgovUserDetails(user.getId(), user.getPassword(), true, user);
	}

	/**
	 * ??????? ???
	 * @return String - ?RL
	 **/
	public String checkLoginSessionView() throws Exception {
		LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
		// KISA ?????(2018-12-10, ????)
		if ( user == null ) {
			return "";
		} else {
			return user.getUrl();
		}
	}

}
