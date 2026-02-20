package egovframework.com.uat.uia.web;

import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.ModelAndView;

import egovframework.com.cmm.ComDefaultCodeVO;
import egovframework.com.cmm.EgovComponentChecker;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.EgovWebUtil;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.config.EgovLoginConfig;
import egovframework.com.cmm.service.CmmnDetailCode;
import egovframework.com.cmm.service.EgovCmmUseService;
import egovframework.com.cmm.service.EgovProperties;
import egovframework.com.cmm.service.Globals;
import egovframework.com.uat.uia.service.EgovLoginService;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import egovframework.com.utl.sim.service.EgovClntInfo;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/*
import com.gpki.gpkiapi.cert.X509Certificate;
import com.gpki.servlet.GPKIHttpServletRequest;
import com.gpki.servlet.GPKIHttpServletResponse;
import com.gpki.servlet.GPKIHttpServletResponse;
*/

import com.company.project.domain.user.entity.User;
import com.company.project.security.service.CustomUserDetails;
import org.springframework.security.core.AuthenticationException;

/**
 * ?? ??? ????? ??? ??? ?????
 * 
 * @author ???????? ???
 * @since 2009.03.06
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == ?????Modification Information) ==
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.03.06  ???         ????
 *   2011.08.26  ???         IncludedInfo annotation ??
 *   2011.09.07  ?????         ?????? ????SSO ? ???????
 *   2011.09.25  ?????         ??????????? ?? ?????? ???
 *   2011.09.27  ?????         ????? ?????? ?????????????
 *   2011.10.27  ?????         ??????? ?????? ???? ????
 *   2017.07.21  ???         ??????
 *   2018.10.26  ???         ??????message ????? ??
 *   2019.10.01  ???         ????????
 *   2020.06.25  ???         ????? ????
 *   2021.01.15  ???         ?????????? : session ?actionLogout()
 *   2021.05.30  ???         ????? ??? ? ??????????
 *   2022.11.11  ???          ????????
 *   2023.06.09  ?          NSR ? (GPKI ???? OOB ?)
 *   2024.10.29  ????         ????????? (request.getParameter("loginMessage"); loginService.selectLoginIncorrect(loginVO);)
 *   2025.07.31  ????         2025????????PMD???????? ????????-LocalVariableNamingConventions(final??? ?? ??????????)
 *
 *      </pre>
 **/
@org.springframework.stereotype.Controller
public class EgovLoginController {

	// @Resource(name = "loginService")
	@org.springframework.beans.factory.annotation.Autowired
	@org.springframework.beans.factory.annotation.Qualifier("loginService")
	@org.springframework.context.annotation.Lazy
	private EgovLoginService loginService;

	// @Resource(name = "EgovCmmUseService")
	@org.springframework.beans.factory.annotation.Autowired
	@org.springframework.beans.factory.annotation.Qualifier("EgovCmmUseService")
	@org.springframework.context.annotation.Lazy
	private EgovCmmUseService cmmUseService;

	@Resource(name = "egovUserDetailsService")
	private egovframework.com.cmm.service.EgovUserDetailsService egovUserDetailsService;

	/** EgovMessageSource **/
	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	@Resource(name = "egovLoginConfig")
	EgovLoginConfig egovLoginConfig;

	@org.springframework.beans.factory.annotation.Autowired(required = false)
	private AuthenticationManager authenticationManager;

	@org.springframework.beans.factory.annotation.Autowired(required = false)
	private SecurityContextRepository securityContextRepository;

	/*
	 * public EgovLoginController(ApplicationContext act, AuthenticationManager
	 * authenticationManager, SecurityContextRepository securityContextRepository) {
	 * this.act = act;
	 * this.authenticationManager = authenticationManager;
	 * this.securityContextRepository = securityContextRepository;
	 * }
	 */

	/** log **/
	private static final Logger LOGGER = LoggerFactory.getLogger(EgovLoginController.class);

	/**
	 * ?????? ????
	 * 
	 * @param vo - ?? ????URL???? LoginVO
	 * @return ?????
	 * @exception Exception
	 **/
@IncludedInfo(name="Dummy", listUrl="", order=1, gid=50)
	@RequestMapping(value = { "/uat/uia/egovLoginUsr.do", "/uat/uia/EgovLoginUsr.do" })
	public String loginUsrView(@ModelAttribute("loginVO") LoginVO loginVO, HttpServletRequest request,
			HttpServletResponse response, ModelMap model) throws Exception {
		if (EgovComponentChecker.hasComponent("mberManageService")) {
			model.addAttribute("useMemberManage", "true");
		}

		// ????? ?? ???
		String authError = request.getParameter("auth_error") == null ? ""
				: (String) request.getParameter("auth_error");
		if (authError != null && authError.equals("1")) {
			return "sec/accessDenied";
		}

		/*
		 * GPKIHttpServletResponse gpkiresponse = null; GPKIHttpServletRequest
		 * gpkirequest = null;
		 * 
		 * try{
		 * 
		 * gpkiresponse=new GPKIHttpServletResponse(response); gpkirequest= new
		 * GPKIHttpServletRequest(request); gpkiresponse.setRequest(gpkirequest);
		 * model.addAttribute("challenge", gpkiresponse.getChallenge()); return
		 * "egovframework/com/uat/uia/EgovLoginUsr";
		 * 
		 * }catch(Exception e){ return "cmm/error/egovError"; }
		 */

		// 2021.05.30, ??? ????? ??? ? ??????????
		String authType = EgovProperties.getProperty("Globals.Auth").trim();
		model.addAttribute("authType", authType);

		String message = request.getParameter("loginMessage");
		if (message != null) {
			// 2025.01.30 Sentinel: XSS Vulnerability fix using clearXSSMinimum
			model.addAttribute("loginMessage", EgovWebUtil.clearXSSMinimum(message));
		}

		return "uat/uia/EgovLoginUsr";
	}

	/**
	 * ??(?? ?? ???
	 * 
	 * @param vo      - ??? ????? ?? LoginVO
	 * @param request - ????? HttpServletRequest
	 * @return result - ??????)
	 * @exception Exception
	 **/
	@RequestMapping(value = "/uat/uia/actionPing.do")
	public void actionPing(HttpServletResponse response) throws Exception {
		LOGGER.debug(">>> PING RECEIVED");
		response.getWriter().write("PONG");
		response.flushBuffer();
	}

	@RequestMapping(value = "/uat/uia/actionLogin.do", method = RequestMethod.POST)
	public String actionLogin(HttpServletRequest request, HttpServletResponse response, ModelMap model)
			throws Exception {

		LOGGER.debug(">>> EgovLoginController.actionLogin() STARTED (Manual Binding)");

		LoginVO loginVO = new LoginVO();
		loginVO.setId(request.getParameter("id"));
		loginVO.setPassword(request.getParameter("password"));
		loginVO.setUserSe(request.getParameter("userSe"));
		LOGGER.debug(">>> Manual Binding: id={}, userSe={}",
				EgovWebUtil.removeCRLF(EgovStringUtil.isNullToString(loginVO.getId())),
				EgovWebUtil.removeCRLF(EgovStringUtil.isNullToString(loginVO.getUserSe())));

		// 0. AuthenticationManager Check
		if (authenticationManager == null) {
			LOGGER.debug(">>> EgovLoginController: AuthenticationManager is NULL!");
			LOGGER.error("AuthenticationManager is null. Check SecurityConfig.");
			model.addAttribute("loginMessage", "Authentication Configuration Error");
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// 1. Spring Security Authentication
		UsernamePasswordAuthenticationToken token = new UsernamePasswordAuthenticationToken(loginVO.getId(),
				loginVO.getPassword());
		Authentication authResult;

		try {
			authResult = authenticationManager.authenticate(token);
			LOGGER.debug(">>> EgovLoginController: Authentication SUCCESS");
		} catch (AuthenticationException e) {
			LOGGER.warn("Login failed for user: {}",
					EgovWebUtil.removeCRLF(EgovStringUtil.isNullToString(loginVO.getId())));
			LOGGER.debug(">>> EgovLoginController: Authentication FAILED. Exception: {}", e.getMessage());
			LOGGER.error("Login failed", e);
			model.addAttribute("loginMessage", egovMessageSource.getMessage("fail.common.login", request.getLocale()));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// 2. Security Context Handling
		SecurityContext sc = SecurityContextHolder.createEmptyContext();
		sc.setAuthentication(authResult);
		SecurityContextHolder.setContext(sc);
		if (securityContextRepository != null) {
			securityContextRepository.saveContext(sc, request, response);
			LOGGER.debug(">>> EgovLoginController: SecurityContext saved via Repository");
		} else {
			LOGGER.debug(">>> EgovLoginController: SecurityContextRepository is NULL! Context might not persist.");
		}

		// 3. Map to LoginVO for Legacy Session Compatibility
		CustomUserDetails details = (CustomUserDetails) authResult.getPrincipal();
		User user = details.getUser();
		LoginVO resultVO = new LoginVO();

		resultVO.setId(user.getUserId());
		resultVO.setUniqId(user.getEsntlId());
		resultVO.setName(user.getUserNm());
		resultVO.setIhidNum(user.getIhidnum());
		resultVO.setEmail(user.getEmailAdres());
		resultVO.setUserSe("USR"); // Map all JPA users to USR (Employee/Official) type for legacy compatibility
		resultVO.setOrgnztId(user.getOrgnztId());
		resultVO.setIp(EgovClntInfo.getClntIP(request));

		LOGGER.debug(">>> EgovLoginController: Setting Session 'LoginVO' = {}", resultVO);
		request.getSession().setAttribute("LoginVO", resultVO);
		request.getSession().setAttribute("accessUser", resultVO.getUserSe().concat(resultVO.getId()));

		LOGGER.debug(">>> EgovLoginController: Redirecting to /cmm/main/mainPage.do");
		return "redirect:/cmm/main/mainPage.do";
	}

	@RequestMapping(value = "/uat/uia/actionSecurityProcess.do", method = RequestMethod.POST)
	public void actionSecurityProcess(LoginVO resultVO, HttpServletRequest request, HttpServletResponse response) {
		// 1. ? ? ?
		UsernamePasswordAuthenticationToken token = UsernamePasswordAuthenticationToken
				.unauthenticated(resultVO.getUserSe().concat(resultVO.getId()), resultVO.getUniqId());

		// 2. ? ??
		Authentication authResult = authenticationManager.authenticate(token);

		// 3. SecurityContext ????
		SecurityContext context = SecurityContextHolder.createEmptyContext();
		context.setAuthentication(authResult);
		SecurityContextHolder.setContext(context);
		securityContextRepository.saveContext(context, request, response);
	}

	/**
	 * ????? ???
	 * 
	 * @param vo - ??? ?? LoginVO
	 * @return result - ??????)
	 * @exception Exception
	 **/
	@RequestMapping(value = "/uat/uia/actionCrtfctLogin.do", method = RequestMethod.POST)
	public String actionCrtfctLogin(@ModelAttribute("loginVO") LoginVO loginVO, HttpServletRequest request,
			HttpServletResponse response, ModelMap model) throws Exception {

		// ?IP
		String userIp = EgovClntInfo.getClntIP(request);
		loginVO.setIp(userIp);
		LOGGER.debug("User IP : {}", EgovWebUtil.removeCRLF(EgovStringUtil.isNullToString(userIp)));

		/*
		 * // 1. GPKI ? GPKIHttpServletResponse gpkiresponse = null;
		 * GPKIHttpServletRequest gpkirequest = null; String dn = ""; try{ gpkiresponse
		 * = new GPKIHttpServletResponse(response); gpkirequest = new
		 * GPKIHttpServletRequest(request); gpkiresponse.setRequest(gpkirequest);
		 * X509Certificate cert = null;
		 * 
		 * byte[] signData = null; byte[] privatekey_random = null; String signType =
		 * ""; String queryString = "";
		 * 
		 * cert = gpkirequest.getSignerCert(); dn = cert.getSubjectDN();
		 * 
		 * java.math.BigInteger b = cert.getSerialNumber(); b.toString(); int
		 * message_type = gpkirequest.getRequestMessageType(); if( message_type ==
		 * gpkirequest.ENCRYPTED_SIGNDATA || message_type ==
		 * gpkirequest.LOGIN_ENVELOP_SIGN_DATA || message_type ==
		 * gpkirequest.ENVELOP_SIGNDATA || message_type == gpkirequest.SIGNED_DATA){
		 * signData = gpkirequest.getSignedData(); if(privatekey_random != null) {
		 * privatekey_random = gpkirequest.getSignerRValue(); } signType =
		 * gpkirequest.getSignType(); } queryString = gpkirequest.getQueryString();
		 * }catch(Exception e){ return "cmm/egovError"; }
		 * 
		 * // 2. ?????????????dn???????? ID, PW????? ??? ?????????????if (dn != null
		 * && !dn.equals("")) {
		 * 
		 * loginVO.setDn(dn); LoginVO resultVO =
		 * loginService.actionCrtfctLogin(loginVO); if (resultVO != null &&
		 * resultVO.getId() != null && !resultVO.getId().equals("")) {
		 * 
		 * //???????????????? ?? ?
		 * if(EgovComponentChecker.hasComponent("egovAuthorManageService")){ // 3-1.
		 * spring security ? return "redirect:/j_spring_security_check?j_username=" +
		 * resultVO.getUserSe() + resultVO.getId() + "&j_password=" +
		 * resultVO.getUniqId();
		 * 
		 * }else{ // 3-2. ?????????????request.getSession().setAttribute("loginVO",
		 * resultVO); return "redirect:/uat/uia/actionMain.do"; }
		 * 
		 * 
		 * } else { model.addAttribute("message",
		 * egovMessageSource.getMessage("fail.common.login")); return
		 * "redirect:/uat/uia/egovLoginUsr.do"; } } else { model.addAttribute("message",
		 * egovMessageSource.getMessage("fail.common.login")); return
		 * "redirect:/uat/uia/egovLoginUsr.do"; }
		 */
		return "redirect:/uat/uia/egovLoginUsr.do";
	}

	/**
	 * ????????? ????
	 * 
	 * @param
	 * @return ?????
	 * @exception Exception
	 **/
	@RequestMapping(value = "/uat/uia/actionMain.do")
	public String actionMain(HttpServletRequest request, ModelMap model) throws Exception {

		// 1. Spring Security Authentication Check
		Boolean isAuthenticated = egovUserDetailsService.isAuthenticated();
		LOGGER.debug(">>> EgovLoginController.actionMain: isAuthenticated() = {}", isAuthenticated);

		if (!isAuthenticated) {
			LOGGER.debug(">>> EgovLoginController.actionMain: Authentication Failed! Redirecting to Login.");
			model.addAttribute("loginMessage", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}
		LoginVO user = (LoginVO) egovUserDetailsService.getAuthenticatedUser();

		if (user.getIp().equals("")) {
			user.setIp(EgovClntInfo.getClntIP(request));
		}

		// 221116 ??? 2022 ????????
		LOGGER.debug("User Id : {}", EgovStringUtil.isNullToString(user.getId()));

		/*
		 * // 2. ?? MenuManageVO menuManageVO = new MenuManageVO();
		 * menuManageVO.setTmp_Id(user.getId());
		 * menuManageVO.setTmp_UserSe(user.getUserSe());
		 * menuManageVO.setTmp_Name(user.getName());
		 * menuManageVO.setTmp_Email(user.getEmail());
		 * menuManageVO.setTmp_OrgnztId(user.getOrgnztId());
		 * menuManageVO.setTmp_UniqId(user.getUniqId()); List list_headmenu =
		 * menuManageService.selectMainMenuHead(menuManageVO);
		 * model.addAttribute("list_headmenu", list_headmenu);
		 */

		// 3. ???? ???
		String mainPage = Globals.MAIN_PAGE;

		LOGGER.debug("Globals.MAIN_PAGE > " + Globals.MAIN_PAGE);
		LOGGER.debug("mainPage > {}", mainPage);

		if (mainPage.startsWith("/")) {
			return "forward:" + mainPage;
		} else {
			return mainPage;
		}

		/*
		 * if (main_page != null && !main_page.equals("")) {
		 * 
		 * // 3-1. ?????????? ??return main_page;
		 * 
		 * } else {
		 * 
		 * // 3-2. ?????????? ??if (user.getUserSe().equals("USR")) { return
		 * "egovframework/com/EgovMainView"; } else { return
		 * "egovframework/com/EgovMainViewG"; } }
		 */
	}

	/**
	 * ????.
	 * 
	 * @return String
	 * @exception Exception
	 **/
	@RequestMapping(value = "/uat/uia/actionLogout.do")
	public String actionLogout(HttpServletRequest request, ModelMap model) throws Exception {

		/*
		 * String userIp = EgovClntInfo.getClntIP(request);
		 * 
		 * // 1. Security ?
		 * return "redirect:/j_spring_security_logout";
		 */

		request.getSession().setAttribute("loginVO", null);
		// ?????Authority ???
		// List<String> authList =
		// (List<String>)egovUserDetailsService.getAuthorities();
		request.getSession().setAttribute("accessUser", null);

		if ("security".equals(EgovProperties.getProperty("Globals.Auth").trim())) {
			SecurityContextHolder.clearContext();
		}

		// return "redirect:/egovDevIndex.jsp";
		return "redirect:/EgovContent.do";
	}

	/**
	 * ???????????? ????
	 * 
	 * @param
	 * @return ???????????
	 * @exception Exception
	 **/
	@RequestMapping(value = "/uat/uia/egovIdPasswordSearch.do")
	public String idPasswordSearchView(ModelMap model) throws Exception {

		// 1. ??????? ?? ??
		ComDefaultCodeVO vo = new ComDefaultCodeVO();
		vo.setCodeId("COM022");
		List<CmmnDetailCode> code = cmmUseService.selectCmmCodeDetail(vo);
		model.addAttribute("pwhtCdList", code);

		return "egovframework/com/uat/uia/EgovIdPasswordSearch";
	}

	/**
	 * ???????? ????
	 * 
	 * @return ???????
	 * @exception Exception
	 **/
	@RequestMapping(value = "/uat/uia/egovGpkiIssu.do")
	public String gpkiIssuView(ModelMap model) throws Exception {
		return "egovframework/com/uat/uia/EgovGpkiIssu";
	}

	/**
	 * ??? ???
	 * 
	 * @param vo - ??? ?????? ?????????? LoginVO
	 * @return result - ???
	 * @exception Exception
	 **/
	@RequestMapping(value = "/uat/uia/searchId.do", method = RequestMethod.POST)
	public String searchId(@ModelAttribute("loginVO") LoginVO loginVO, ModelMap model) throws Exception {

		if (loginVO == null || loginVO.getName() == null || loginVO.getName().equals("") && loginVO.getEmail() == null
				|| loginVO.getEmail().equals("") && loginVO.getUserSe() == null || loginVO.getUserSe().equals("")) {
			return "egovframework/com/cmm/egovError";
		}

		// 1. ????
		loginVO.setName(loginVO.getName().replaceAll(" ", ""));
		LoginVO resultVO = loginService.searchId(loginVO);

		if (resultVO != null && resultVO.getId() != null && !resultVO.getId().equals("")) {

			model.addAttribute("resultInfo", "?         ?          " + resultVO.getId() + " ??      ??");
			return "egovframework/com/uat/uia/EgovIdPasswordResult";
		} else {
			model.addAttribute("resultInfo", egovMessageSource.getMessage("fail.common.idsearch"));
			return "egovframework/com/uat/uia/EgovIdPasswordResult";
		}
	}

	/**
	 * ????????
	 * 
	 * @param vo - ??? ??? ?????? ???????, ??????, ?????????? LoginVO
	 * @return result - ????????
	 * @exception Exception
	 **/
	@RequestMapping(value = "/uat/uia/searchPassword.do", method = RequestMethod.POST)
	public String searchPassword(@ModelAttribute("loginVO") LoginVO loginVO, ModelMap model) throws Exception {

		// KISA ?? ??(2018-10-29, ????
		if (loginVO == null || loginVO.getId() == null || loginVO.getId().equals("") && loginVO.getName() == null
				|| "".equals(loginVO.getName()) && loginVO.getEmail() == null
				|| loginVO.getEmail().equals("") && loginVO.getPasswordHint() == null
				|| "".equals(loginVO.getPasswordHint()) && loginVO.getPasswordCnsr() == null
				|| "".equals(loginVO.getPasswordCnsr()) && loginVO.getUserSe() == null
				|| "".equals(loginVO.getUserSe())) {
			return "egovframework/com/cmm/egovError";
		}

		// 1. ??????
		boolean result = loginService.searchPassword(loginVO);

		// 2. ???
		if (result) {
			model.addAttribute("resultInfo", "?          ??   ?         ?      ?         ??????     ??");
			return "egovframework/com/uat/uia/EgovIdPasswordResult";
		} else {
			model.addAttribute("resultInfo", egovMessageSource.getMessage("fail.common.pwsearch"));
			return "egovframework/com/uat/uia/EgovIdPasswordResult";
		}
	}

	/**
	 * ?????? ?????GPKI ????????????????????
	 * ?????????, ???????EgovGpkiVariables.js??ServerCert?????
	 * 
	 * @return String
	 * @exception Exception
	 **/
	@RequestMapping(value = "/uat/uia/getEncodingData.do")
	public void getEncodingData() throws Exception {

		/*
		 * X509Certificate x509Cert = null; byte[] cert = null; String base64cert =
		 * null; try { x509Cert = Disk.readCert(
		 * "/product/jeus/egovProps/gpkisecureweb/certs/SVR1311000011_env.cer"); cert =
		 * x509Cert.getCert(); Base64 base64 = new Base64(); base64cert =
		 * base64.encode(cert); log.info("+++ Base64??? ??? : " + base64cert);
		 * 
		 * } catch (GpkiApiException e) { e.printStackTrace(); }
		 */
	}

	/**
	 * ???DN??????????.
	 * 
	 * @return ???? ??
	 * @exception Exception
	 **/
	@RequestMapping(value = "/uat/uia/EgovGpkiRegist.do")
	public String gpkiRegistView(HttpServletRequest request, HttpServletResponse response, ModelMap model)
			throws Exception {

		/** GPKI ? ???**/
		// OS??? (local NT(? / server Unix(??)) ?
		String os = System.getProperty("os.arch");
		LOGGER.debug("OS : {}", os);

		// String virusReturn = null;

		/*
		 * // ???? ????? ??String webKind = EgovClntInfo.getClntWebKind(request);
		 * String[] ss = webKind.split(" "); String browser = ss[1];
		 * model.addAttribute("browser",browser); // -- ???? if
		 * (os.equalsIgnoreCase("x86")) { //Local Host TEST ?} else { if
		 * (browser.equalsIgnoreCase("Explorer")) { GPKIHttpServletResponse gpkiresponse
		 * = null; GPKIHttpServletRequest gpkirequest = null;
		 * 
		 * try { gpkiresponse = new GPKIHttpServletResponse(response); gpkirequest = new
		 * GPKIHttpServletRequest(request);
		 * 
		 * gpkiresponse.setRequest(gpkirequest); model.addAttribute("challenge",
		 * gpkiresponse.getChallenge());
		 * 
		 * return "egovframework/com/uat/uia/EgovGpkiRegist";
		 * 
		 * } catch (Exception e) { return "egovframework/com/cmm/egovError"; } } }
		 */
		return "egovframework/com/uat/uia/EgovGpkiRegist";
	}

	/**
	 * ???DN???????
	 * 
	 * @return result - dn?
	 * @exception Exception
	 **/
	@RequestMapping(value = "/uat/uia/actionGpkiRegist.do", method = RequestMethod.POST)
	public String actionGpkiRegist(HttpServletRequest request, HttpServletResponse response, ModelMap model)
			throws Exception {

		/** GPKI ? ???**/
		// OS??? (local NT(? / server Unix(??)) ?
		String os = System.getProperty("os.arch");
		LOGGER.debug("OS : {}", os);

		// String virusReturn = null;
		@SuppressWarnings("unused")
		String dn = "";

		// ???? ????? ??
		String browser = EgovClntInfo.getClntWebKind(request);
		model.addAttribute("browser", browser);
		/*
		 * // -- ???? if (os.equalsIgnoreCase("x86")) { // Local Host TEST ?} else {
		 * if (browser.equalsIgnoreCase("Explorer")) { GPKIHttpServletResponse
		 * gpkiresponse = null; GPKIHttpServletRequest gpkirequest = null; try {
		 * gpkiresponse = new GPKIHttpServletResponse(response); gpkirequest = new
		 * GPKIHttpServletRequest(request); gpkiresponse.setRequest(gpkirequest);
		 * X509Certificate cert = null;
		 * 
		 * // byte[] signData = null; // byte[] privatekey_random = null; // String
		 * signType = ""; // String queryString = "";
		 * 
		 * cert = gpkirequest.getSignerCert(); dn = cert.getSubjectDN();
		 * 
		 * model.addAttribute("dn", dn); model.addAttribute("challenge",
		 * gpkiresponse.getChallenge());
		 * 
		 * return "egovframework/com/uat/uia/EgovGpkiRegist"; } catch (Exception e) {
		 * return "egovframework/com/cmm/egovError"; } } }
		 */
		return "egovframework/com/uat/uia/EgovGpkiRegist";
	}

	/**
	 * ?????????????.
	 * Cookie??egovLatestServerTime, egovExpireSessionTime ?????.
	 * 
	 * @return result - String
	 * @exception Exception
	 **/
	@RequestMapping(value = "/uat/uia/refreshSessionTimeout.do")
	public ModelAndView refreshSessionTimeout(@RequestParam Map<String, Object> commandMap) throws Exception {
		ModelAndView modelAndView = new ModelAndView();
		modelAndView.setViewName("jsonView");

		modelAndView.addObject("result", "ok");

		return modelAndView;
	}

	/**
	 * ???????????????.
	 * Cookie??egovLatestServerTime, egovExpireSessionTime ?????.
	 * 
	 * @return result - String
	 * @exception Exception
	 **/
	@RequestMapping(value = "/uat/uia/noticeExpirePwd.do")
	public String noticeExpirePwd(@RequestParam Map<String, Object> commandMap, ModelMap model) throws Exception {

		// ??????????????? ex) 180?????????????? ???180??
		String propertyExpirePwdDay = EgovProperties.getProperty("Globals.ExpirePwdDay");
		int expirePwdDay = 0;
		try {
			expirePwdDay = Integer.parseInt(propertyExpirePwdDay);
		} catch (NumberFormatException e) {
			LOGGER.debug("convert expirePwdDay Err : " + e.getMessage());
		}

		model.addAttribute("expirePwdDay", expirePwdDay);

		// ??????????????????? ???. ex) 3???????? ????3????
		LoginVO loginVO = (LoginVO) egovUserDetailsService.getAuthenticatedUser();
		model.addAttribute("loginVO", loginVO);
		int passedDayChangePWD = 0;
		if (loginVO != null) {
			LOGGER.debug("===>>> loginVO.getId() = " + loginVO.getId());
			LOGGER.debug("===>>> loginVO.getUniqId() = " + loginVO.getUniqId());
			LOGGER.debug("===>>> loginVO.getUserSe() = " + loginVO.getUserSe());
			// ?????????????
			passedDayChangePWD = loginService.selectPassedDayChangePWD(loginVO);
			LOGGER.debug("===>>> passedDayChangePWD = " + passedDayChangePWD);
			model.addAttribute("passedDay", passedDayChangePWD);
		}

		// ?????????? => ex)1????????1????
		model.addAttribute("elapsedTimeExpiration", passedDayChangePWD - expirePwdDay);

		return "egovframework/com/uat/uia/EgovExpirePwd";
	}
}
