package egovframework.com.utl.sys.rsc.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.utl.sys.rsc.service.EgovLoginSesionCeckUtil;
import jakarta.annotation.Resource;


/**
 * 媛쒖슂
 * - 濡쒓렇???몄뀡?뺣낫泥댄겕 而댄룷?뚰듃?????controller ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - 濡쒓렇???몄뀡?뺣낫泥댄겕?????湲곕뒫???쒓났?쒕떎.
 * @author lee.m.j
 * @version 1.0
 * @created 28-6-2010 ?ㅼ쟾 10:44:26
 * <pre>
 * == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??      ?섏젙??          ?섏젙?댁슜
 *  -------     --------    ---------------------------
 *  2010.06.28   lee.m.j    理쒖큹 ?앹꽦
 *  2011.8.26	?뺤쭊??		IncludedInfo annotation 異붽?
 * </pre>
 */

@Controller
public class EgovLoginSesionController {

	@Resource(name="egovLoginSesionCeckUtil")
	private EgovLoginSesionCeckUtil egovLoginSesionCeckUtil;

	@Resource(name="egovMessageSource")
    EgovMessageSource egovMessageSource;

	/**
	 * 濡쒓렇???몄뀡?뺣낫泥댄겕 ?붾㈃ ?대룞
	 * @return String
	 */
	@IncludedInfo(name="濡쒓렇?몄꽭?섏젙蹂댁껜??, order = 2160 ,gid = 90)
	@RequestMapping(value="/utl/sys/rsc/loginSessionView.do")
	public String checkLoginSessionView() throws Exception {
		return "egovframework/com/utl/sys/rsc/EgovLoginSesionCheck";
	}

	/**
	 * 濡쒓렇?????대룞??泥섎━?붾㈃???몄뀡???깅줉?쒕떎.
	 * @param url - String
	 * @return String
	 */
	@RequestMapping(value="/utl/sys/rsc/setLoginSession.do")
	public String setLoginSession(@RequestParam("url") String url) throws Exception {
		egovLoginSesionCeckUtil.setLoginSession(url);
		return "forward:/utl/sys/rsc/loginSessionView.do";
	}

	/**
	 * 濡쒓렇???몄뀡?뺣낫泥댄겕
	 * @return String
	 */
	@RequestMapping(value="/utl/sys/rsc/checkLloginSession.do")
	public String checkLoginSession() throws Exception {
		egovLoginSesionCeckUtil.checkLoginSessionView();
		return "egovframework/com/utl/sys/rsc/EgovLoginSesionCheck";
	}


}