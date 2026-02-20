package egovframework.com.utl.sys.rsc.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.utl.sys.rsc.service.EgovLoginSesionCeckUtil;
import jakarta.annotation.Resource;


/**
 * ??
 * - ???????????????controller ?????? ???.
 *
 * ???
 * - ??????????????????.
 * @author lee.m.j
 * @version 1.0
 * @created 28-6-2010 ?? 10:44:26
 * <pre>
 * == ?????Modification Information) ==
 *
 *   ????      ????          ????
 *  -------     --------    ---------------------------
 *  2010.06.28   lee.m.j    ????
 *  2011.8.26	???		IncludedInfo annotation ??
 * </pre>
 **/

@Controller
public class EgovLoginSesionController {

	@Resource(name="egovLoginSesionCeckUtil")
	private EgovLoginSesionCeckUtil egovLoginSesionCeckUtil;

	@Resource(name="egovMessageSource")
    EgovMessageSource egovMessageSource;

	/**
	 * ??????? ???
	 * @return String
	 **/
	@RequestMapping(value="/utl/sys/rsc/loginSessionView.do")
	public String checkLoginSessionView() throws Exception {
		return "egovframework/com/utl/sys/rsc/EgovLoginSesionCheck";
	}

	/**
	 * ???????????????????.
	 * @param url - String
	 * @return String
	 **/
	@RequestMapping(value="/utl/sys/rsc/setLoginSession.do")
	public String setLoginSession(@RequestParam("url") String url) throws Exception {
		egovLoginSesionCeckUtil.setLoginSession(url);
		return "forward:/utl/sys/rsc/loginSessionView.do";
	}

	/**
	 * ??????
	 * @return String
	 **/
	@RequestMapping(value="/utl/sys/rsc/checkLloginSession.do")
	public String checkLoginSession() throws Exception {
		egovLoginSesionCeckUtil.checkLoginSessionView();
		return "egovframework/com/utl/sys/rsc/EgovLoginSesionCheck";
	}


}
