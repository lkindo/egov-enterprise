package egovframework.com.utl.sys.rsc.service;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.util.EgovUserDetailsHelper;

/**
 * 媛쒖슂
 * - 濡쒓렇???몄뀡?뺣낫泥댄겕 而댄룷?뚰듃?????util ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - 濡쒓렇???몄뀡?뺣낫泥댄겕?????湲곕뒫???쒓났?쒕떎.
 * @author lee.m.j
 * @version 1.0
 * @created 28-6-2010 ?ㅼ쟾 10:44:26
 */

@Service("egovLoginSesionCeckUtil")
public class EgovLoginSesionCeckUtil extends EgovAbstractServiceImpl {

	/**
	 * 濡쒓렇?????대룞??泥섎━?붾㈃???몄뀡???깅줉?쒕떎.
	 * @param url - String
	 * @return String
	 */
	public void setLoginSession(String url) throws Exception {
		LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
		// KISA 蹂댁븞痍⑥빟??議곗튂 (2018-12-10, ?댁젙?)
		if ( user != null ) {
			user.setUrl("");
			user.setUrl(url);
		}
		//new EgovUserDetails(user.getId(), user.getPassword(), true, user);
	}

	/**
	 * 濡쒓렇???몄뀡?뺣낫泥댄겕 ?붾㈃ ?대룞
	 * @return String - ?몄뀡URL
	 */
	public String checkLoginSessionView() throws Exception {
		LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
		// KISA 蹂댁븞痍⑥빟??議곗튂 (2018-12-10, ?댁젙?)
		if ( user == null ) {
			return "";
		} else {
			return user.getUrl();
		}
	}

}
