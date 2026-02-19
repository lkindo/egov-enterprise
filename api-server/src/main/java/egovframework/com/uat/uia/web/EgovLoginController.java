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
 * ?¼ë°˜ ë¡œê·¸?? ?¸ì¦??ë¡œê·¸?¸ì„ ì²˜ë¦¬?˜ëŠ” ì»¨íŠ¸ë¡¤ëŸ¬ ?´ë˜??
 * 
 * @author ê³µí†µ?œë¹„??ê°œë°œ?€ ë°•ì???
 * @since 2009.03.06
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == ê°œì •?´ë ¥(Modification Information) ==
 *
 *   ?˜ì •??     ?˜ì •??          ?˜ì •?´ìš©
 *  -------    --------    ---------------------------
 *   2009.03.06  ë°•ì???         ìµœì´ˆ ?ì„±
 *   2011.08.26  ?•ì§„??         IncludedInfo annotation ì¶”ê?
 *   2011.09.07  ?œì???         ?¤í”„ë§??œíë¦¬í‹° ë¡œê·¸??ë°?SSO ?¸ì¦ ë¡œì§???„í„°ë¡?ë¶„ë¦¬
 *   2011.09.25  ?œì???         ?¬ìš©??ê´€ë¦?ì»´í¬?ŒíŠ¸ ë¯¸í¬?¨ì— ?€???ê? ë¡œì§ ì¶”ê?
 *   2011.09.27  ?œì???         ?¸ì¦??ë¡œê·¸?¸ì‹œ ?¤í”„ë§??œíë¦¬í‹° ?¬ìš©???€??ì²´í¬ ë¡œì§ ì¶”ê?
 *   2011.10.27  ?œì???         ?„ì´??ì°¾ê¸° ê¸°ëŠ¥?ì„œ ?¬ìš©??ë¦¬ë¦„ ê³µë°± ?œê±° ê¸°ëŠ¥ ì¶”ê?
 *   2017.07.21  ?¥ë™??         ë¡œê·¸?¸ì¸ì¦ì œ???‘ì—…
 *   2018.10.26  ? ìš©??         ë¡œê·¸???”ë©´??message ?Œë¼ë¯¸í„° ?„ë‹¬ ?˜ì •
 *   2019.10.01  ?•ì§„??         ë¡œê·¸???¸ì¦?¸ì…˜ ì¶”ê?
 *   2020.06.25  ? ìš©??         ë¡œê·¸??ë©”ì‹œì§€ ì²˜ë¦¬ ?˜ì •
 *   2021.01.15  ? ìš©??         ë¡œê·¸?„ì›ƒ??ê¶Œí•œ ì´ˆê¸°??ì¶”ê? : session ëª¨ë“œ actionLogout()
 *   2021.05.30  ?•ì§„??         ?”ì??¸ì›?¨ìŠ¤ ì²˜ë¦¬?˜ê¸° ?„í•´ ë¡œê·¸???”ë©´???¸ì¦ë°©ì‹ ?„ë‹¬
 *   2022.11.11  ê¹€?œì?          ?œí?´ì½”??ì²˜ë¦¬
 *   2023.06.09  ê¹€? í•´          NSR ë³´ì•ˆì¡°ì¹˜ (GPKI ?¸ì¦???±ë¡ OOB ë°©ì?)
 *   2024.10.29  ?´ë°±??         ë¶ˆí•„???•ë????œê±° (request.getParameter("loginMessage"); loginService.selectLoginIncorrect(loginVO);)
 *   2025.07.31  ?´ë°±??         2025??ì»¨íŠ¸ë¦¬ë·°??PMDë¡??Œí”„?¸ì›¨??ë³´ì•ˆ?½ì  ì§„ë‹¨?˜ê³  ?œê±°?˜ê¸°-LocalVariableNamingConventions(final???„ë‹Œ ë³€?˜ëŠ” ë°‘ì¤„???¬í•¨?????†ìŒ)
 *
 *      </pre>
 */
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

	/** EgovMessageSource */
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

	/** log */
	private static final Logger LOGGER = LoggerFactory.getLogger(EgovLoginController.class);

	/**
	 * ë¡œê·¸???”ë©´?¼ë¡œ ?¤ì–´ê°„ë‹¤
	 * 
	 * @param vo - ë¡œê·¸?¸í›„ ?´ë™??URL???´ê¸´ LoginVO
	 * @return ë¡œê·¸???˜ì´ì§€
	 * @exception Exception
	 */
	@IncludedInfo(name = "ë¡œê·¸??, listUrl = "/uat/uia/egovLoginUsr.do", order = 10, gid = 10)
	@RequestMapping(value = { "/uat/uia/egovLoginUsr.do", "/uat/uia/EgovLoginUsr.do" })
	public String loginUsrView(@ModelAttribute("loginVO") LoginVO loginVO, HttpServletRequest request,
			HttpServletResponse response, ModelMap model) throws Exception {
		if (EgovComponentChecker.hasComponent("mberManageService")) {
			model.addAttribute("useMemberManage", "true");
		}

		// ê¶Œí•œì²´í¬???ëŸ¬ ?˜ì´ì§€ ?´ë™
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

		// 2021.05.30, ?•ì§„?? ?”ì??¸ì›?¨ìŠ¤ ì²˜ë¦¬?˜ê¸° ?„í•´ ë¡œê·¸???”ë©´???¸ì¦ë°©ì‹ ?„ë‹¬
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
	 * ?¼ë°˜(?¸ì…˜) ë¡œê·¸?¸ì„ ì²˜ë¦¬?œë‹¤
	 * 
	 * @param vo      - ?„ì´?? ë¹„ë?ë²ˆí˜¸ê°€ ?´ê¸´ LoginVO
	 * @param request - ?¸ì…˜ì²˜ë¦¬ë¥??„í•œ HttpServletRequest
	 * @return result - ë¡œê·¸?¸ê²°ê³??¸ì…˜?•ë³´)
	 * @exception Exception
	 */
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
		// 1. ?¸ì¦ ? í° êµ¬ì„±
		UsernamePasswordAuthenticationToken token = UsernamePasswordAuthenticationToken
				.unauthenticated(resultVO.getUserSe().concat(resultVO.getId()), resultVO.getUniqId());

		// 2. ?¸ì¦ ?˜í–‰
		Authentication authResult = authenticationManager.authenticate(token);

		// 3. SecurityContext ?€??
		SecurityContext context = SecurityContextHolder.createEmptyContext();
		context.setAuthentication(authResult);
		SecurityContextHolder.setContext(context);
		securityContextRepository.saveContext(context, request, response);
	}

	/**
	 * ?¸ì¦??ë¡œê·¸?¸ì„ ì²˜ë¦¬?œë‹¤
	 * 
	 * @param vo - ì£¼ë?ë²ˆí˜¸ê°€ ?´ê¸´ LoginVO
	 * @return result - ë¡œê·¸?¸ê²°ê³??¸ì…˜?•ë³´)
	 * @exception Exception
	 */
	@RequestMapping(value = "/uat/uia/actionCrtfctLogin.do", method = RequestMethod.POST)
	public String actionCrtfctLogin(@ModelAttribute("loginVO") LoginVO loginVO, HttpServletRequest request,
			HttpServletResponse response, ModelMap model) throws Exception {

		// ?‘ì†IP
		String userIp = EgovClntInfo.getClntIP(request);
		loginVO.setIp(userIp);
		LOGGER.debug("User IP : {}", EgovWebUtil.removeCRLF(EgovStringUtil.isNullToString(userIp)));

		/*
		 * // 1. GPKI ?¸ì¦ GPKIHttpServletResponse gpkiresponse = null;
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
		 * // 2. ?…ë¬´?¬ìš©???Œì´ë¸”ì—??dnê°’ìœ¼ë¡??¬ìš©?ì˜ ID, PWë¥?ì¡°íšŒ?˜ì—¬ ?´ë? ?¼ë°˜ë¡œê·¸???•íƒœë¡??¸ì¦?˜ë„ë¡???if (dn != null
		 * && !dn.equals("")) {
		 * 
		 * loginVO.setDn(dn); LoginVO resultVO =
		 * loginService.actionCrtfctLogin(loginVO); if (resultVO != null &&
		 * resultVO.getId() != null && !resultVO.getId().equals("")) {
		 * 
		 * //?¤í”„ë§??œíë¦¬í‹°?¨í‚¤ì§€ë¥??¬ìš©?˜ëŠ”ì§€ ì²´í¬?˜ëŠ” ë¡œì§
		 * if(EgovComponentChecker.hasComponent("egovAuthorManageService")){ // 3-1.
		 * spring security ?°ë™ return "redirect:/j_spring_security_check?j_username=" +
		 * resultVO.getUserSe() + resultVO.getId() + "&j_password=" +
		 * resultVO.getUniqId();
		 * 
		 * }else{ // 3-2. ë¡œê·¸???•ë³´ë¥??¸ì…˜???€??request.getSession().setAttribute("loginVO",
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
	 * ë¡œê·¸????ë©”ì¸?”ë©´?¼ë¡œ ?¤ì–´ê°„ë‹¤
	 * 
	 * @param
	 * @return ë¡œê·¸???˜ì´ì§€
	 * @exception Exception
	 */
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

		// 221116 ê¹€?œì? 2022 ?œí?´ì½”??ì¡°ì¹˜
		LOGGER.debug("User Id : {}", EgovStringUtil.isNullToString(user.getId()));

		/*
		 * // 2. ë©”ë‰´ì¡°íšŒ MenuManageVO menuManageVO = new MenuManageVO();
		 * menuManageVO.setTmp_Id(user.getId());
		 * menuManageVO.setTmp_UserSe(user.getUserSe());
		 * menuManageVO.setTmp_Name(user.getName());
		 * menuManageVO.setTmp_Email(user.getEmail());
		 * menuManageVO.setTmp_OrgnztId(user.getOrgnztId());
		 * menuManageVO.setTmp_UniqId(user.getUniqId()); List list_headmenu =
		 * menuManageService.selectMainMenuHead(menuManageVO);
		 * model.addAttribute("list_headmenu", list_headmenu);
		 */

		// 3. ë©”ì¸ ?˜ì´ì§€ ?´ë™
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
		 * // 3-1. ?¤ì •??ë©”ì¸?”ë©´???ˆëŠ” ê²½ìš° return main_page;
		 * 
		 * } else {
		 * 
		 * // 3-2. ?¤ì •??ë©”ì¸?”ë©´???†ëŠ” ê²½ìš° if (user.getUserSe().equals("USR")) { return
		 * "egovframework/com/EgovMainView"; } else { return
		 * "egovframework/com/EgovMainViewG"; } }
		 */
	}

	/**
	 * ë¡œê·¸?„ì›ƒ?œë‹¤.
	 * 
	 * @return String
	 * @exception Exception
	 */
	@RequestMapping(value = "/uat/uia/actionLogout.do")
	public String actionLogout(HttpServletRequest request, ModelMap model) throws Exception {

		/*
		 * String userIp = EgovClntInfo.getClntIP(request);
		 * 
		 * // 1. Security ?°ë™
		 * return "redirect:/j_spring_security_logout";
		 */

		request.getSession().setAttribute("loginVO", null);
		// ?¸ì…˜ëª¨ë“œ?¸ê²½??Authority ì´ˆê¸°??
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
	 * ?„ì´??ë¹„ë?ë²ˆí˜¸ ì°¾ê¸° ?”ë©´?¼ë¡œ ?¤ì–´ê°„ë‹¤
	 * 
	 * @param
	 * @return ?„ì´??ë¹„ë?ë²ˆí˜¸ ì°¾ê¸° ?˜ì´ì§€
	 * @exception Exception
	 */
	@RequestMapping(value = "/uat/uia/egovIdPasswordSearch.do")
	public String idPasswordSearchView(ModelMap model) throws Exception {

		// 1. ë¹„ë?ë²ˆí˜¸ ?ŒíŠ¸ ê³µí†µì½”ë“œ ì¡°íšŒ
		ComDefaultCodeVO vo = new ComDefaultCodeVO();
		vo.setCodeId("COM022");
		List<CmmnDetailCode> code = cmmUseService.selectCmmCodeDetail(vo);
		model.addAttribute("pwhtCdList", code);

		return "egovframework/com/uat/uia/EgovIdPasswordSearch";
	}

	/**
	 * ?¸ì¦?œì•ˆ???”ë©´?¼ë¡œ ?¤ì–´ê°„ë‹¤
	 * 
	 * @return ?¸ì¦?œì•ˆ???˜ì´ì§€
	 * @exception Exception
	 */
	@RequestMapping(value = "/uat/uia/egovGpkiIssu.do")
	public String gpkiIssuView(ModelMap model) throws Exception {
		return "egovframework/com/uat/uia/EgovGpkiIssu";
	}

	/**
	 * ?„ì´?”ë? ì°¾ëŠ”??
	 * 
	 * @param vo - ?´ë¦„, ?´ë©”?¼ì£¼?? ?¬ìš©?êµ¬ë¶„ì´ ?´ê¸´ LoginVO
	 * @return result - ?„ì´??
	 * @exception Exception
	 */
	@RequestMapping(value = "/uat/uia/searchId.do", method = RequestMethod.POST)
	public String searchId(@ModelAttribute("loginVO") LoginVO loginVO, ModelMap model) throws Exception {

		if (loginVO == null || loginVO.getName() == null || loginVO.getName().equals("") && loginVO.getEmail() == null
				|| loginVO.getEmail().equals("") && loginVO.getUserSe() == null || loginVO.getUserSe().equals("")) {
			return "egovframework/com/cmm/egovError";
		}

		// 1. ?„ì´??ì°¾ê¸°
		loginVO.setName(loginVO.getName().replaceAll(" ", ""));
		LoginVO resultVO = loginService.searchId(loginVO);

		if (resultVO != null && resultVO.getId() != null && !resultVO.getId().equals("")) {

			model.addAttribute("resultInfo", "?„ì´?”ëŠ” " + resultVO.getId() + " ?…ë‹ˆ??");
			return "egovframework/com/uat/uia/EgovIdPasswordResult";
		} else {
			model.addAttribute("resultInfo", egovMessageSource.getMessage("fail.common.idsearch"));
			return "egovframework/com/uat/uia/EgovIdPasswordResult";
		}
	}

	/**
	 * ë¹„ë?ë²ˆí˜¸ë¥?ì°¾ëŠ”??
	 * 
	 * @param vo - ?„ì´?? ?´ë¦„, ?´ë©”?¼ì£¼?? ë¹„ë?ë²ˆí˜¸ ?ŒíŠ¸, ë¹„ë?ë²ˆí˜¸ ?•ë‹µ, ?¬ìš©?êµ¬ë¶„ì´ ?´ê¸´ LoginVO
	 * @return result - ?„ì‹œë¹„ë?ë²ˆí˜¸?„ì†¡ê²°ê³¼
	 * @exception Exception
	 */
	@RequestMapping(value = "/uat/uia/searchPassword.do", method = RequestMethod.POST)
	public String searchPassword(@ModelAttribute("loginVO") LoginVO loginVO, ModelMap model) throws Exception {

		// KISA ë³´ì•ˆ?½ì  ì¡°ì¹˜ (2018-10-29, ?¤ì°½??
		if (loginVO == null || loginVO.getId() == null || loginVO.getId().equals("") && loginVO.getName() == null
				|| "".equals(loginVO.getName()) && loginVO.getEmail() == null
				|| loginVO.getEmail().equals("") && loginVO.getPasswordHint() == null
				|| "".equals(loginVO.getPasswordHint()) && loginVO.getPasswordCnsr() == null
				|| "".equals(loginVO.getPasswordCnsr()) && loginVO.getUserSe() == null
				|| "".equals(loginVO.getUserSe())) {
			return "egovframework/com/cmm/egovError";
		}

		// 1. ë¹„ë?ë²ˆí˜¸ ì°¾ê¸°
		boolean result = loginService.searchPassword(loginVO);

		// 2. ê²°ê³¼ ë¦¬í„´
		if (result) {
			model.addAttribute("resultInfo", "?„ì‹œ ë¹„ë?ë²ˆí˜¸ë¥?ë°œì†¡?˜ì??µë‹ˆ??");
			return "egovframework/com/uat/uia/EgovIdPasswordResult";
		} else {
			model.addAttribute("resultInfo", egovMessageSource.getMessage("fail.common.pwsearch"));
			return "egovframework/com/uat/uia/EgovIdPasswordResult";
		}
	}

	/**
	 * ê°œë°œ ?œìŠ¤??êµ¬ì¶• ??ë°œê¸‰??GPKI ?œë²„?©ì¸ì¦ì„œ???€???”í˜¸?”ë°?´í„°ë¥?êµ¬í•œ??
	 * ìµœì´ˆ ?œë²ˆë§??¤í–‰?˜ì—¬, ?”í˜¸?”ë°?´í„°ë¥?EgovGpkiVariables.js??ServerCert???£ëŠ”??
	 * 
	 * @return String
	 * @exception Exception
	 */
	@RequestMapping(value = "/uat/uia/getEncodingData.do")
	public void getEncodingData() throws Exception {

		/*
		 * X509Certificate x509Cert = null; byte[] cert = null; String base64cert =
		 * null; try { x509Cert = Disk.readCert(
		 * "/product/jeus/egovProps/gpkisecureweb/certs/SVR1311000011_env.cer"); cert =
		 * x509Cert.getCert(); Base64 base64 = new Base64(); base64cert =
		 * base64.encode(cert); log.info("+++ Base64ë¡?ë³€?˜ëœ ?¸ì¦?œëŠ” : " + base64cert);
		 * 
		 * } catch (GpkiApiException e) { e.printStackTrace(); }
		 */
	}

	/**
	 * ?¸ì¦??DNì¶”ì¶œ ?ì—…???¸ì¶œ?œë‹¤.
	 * 
	 * @return ?¸ì¦???±ë¡ ?˜ì´ì§€
	 * @exception Exception
	 */
	@RequestMapping(value = "/uat/uia/EgovGpkiRegist.do")
	public String gpkiRegistView(HttpServletRequest request, HttpServletResponse response, ModelMap model)
			throws Exception {

		/** GPKI ?¸ì¦ ë¶€ë¶?*/
		// OS???°ë¼ (local NT(ë¡œì»¬) / server Unix(?œë²„)) êµ¬ë¶„
		String os = System.getProperty("os.arch");
		LOGGER.debug("OS : {}", os);

		// String virusReturn = null;

		/*
		 * // ë¸Œë¼?°ì? ?´ë¦„??ë°›ê¸°?„í•œ ì²˜ë¦¬ String webKind = EgovClntInfo.getClntWebKind(request);
		 * String[] ss = webKind.split(" "); String browser = ss[1];
		 * model.addAttribute("browser",browser); // -- ?¬ê¸°ê¹Œì? if
		 * (os.equalsIgnoreCase("x86")) { //Local Host TEST ì§„í–‰ì¤?} else { if
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
	 * ?¸ì¦??DNê°’ì„ ì¶”ì¶œ?œë‹¤
	 * 
	 * @return result - dnê°?
	 * @exception Exception
	 */
	@RequestMapping(value = "/uat/uia/actionGpkiRegist.do", method = RequestMethod.POST)
	public String actionGpkiRegist(HttpServletRequest request, HttpServletResponse response, ModelMap model)
			throws Exception {

		/** GPKI ?¸ì¦ ë¶€ë¶?*/
		// OS???°ë¼ (local NT(ë¡œì»¬) / server Unix(?œë²„)) êµ¬ë¶„
		String os = System.getProperty("os.arch");
		LOGGER.debug("OS : {}", os);

		// String virusReturn = null;
		@SuppressWarnings("unused")
		String dn = "";

		// ë¸Œë¼?°ì? ?´ë¦„??ë°›ê¸°?„í•œ ì²˜ë¦¬
		String browser = EgovClntInfo.getClntWebKind(request);
		model.addAttribute("browser", browser);
		/*
		 * // -- ?¬ê¸°ê¹Œì? if (os.equalsIgnoreCase("x86")) { // Local Host TEST ì§„í–‰ì¤?} else {
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
	 * ?¸ì…˜?€?„ì•„???œê°„???°ì¥?œë‹¤.
	 * Cookie??egovLatestServerTime, egovExpireSessionTime ê¸°ë¡?˜ë„ë¡??œë‹¤.
	 * 
	 * @return result - String
	 * @exception Exception
	 */
	@RequestMapping(value = "/uat/uia/refreshSessionTimeout.do")
	public ModelAndView refreshSessionTimeout(@RequestParam Map<String, Object> commandMap) throws Exception {
		ModelAndView modelAndView = new ModelAndView();
		modelAndView.setViewName("jsonView");

		modelAndView.addObject("result", "ok");

		return modelAndView;
	}

	/**
	 * ë¹„ë?ë²ˆí˜¸ ? íš¨ê¸°ê°„ ?ì—…??ì¶œë ¥?œë‹¤.
	 * Cookie??egovLatestServerTime, egovExpireSessionTime ê¸°ë¡?˜ë„ë¡??œë‹¤.
	 * 
	 * @return result - String
	 * @exception Exception
	 */
	@RequestMapping(value = "/uat/uia/noticeExpirePwd.do")
	public String noticeExpirePwd(@RequestParam Map<String, Object> commandMap, ModelMap model) throws Exception {

		// ?¤ì •??ë¹„ë?ë²ˆí˜¸ ? íš¨ê¸°ê°„??ê°€?¸ì˜¨?? ex) 180?´ë©´ ë¹„ë?ë²ˆí˜¸ ë³€ê²½í›„ ë§Œë£Œ?¼ì´ ?ìœ¼ë¡?180??
		String propertyExpirePwdDay = EgovProperties.getProperty("Globals.ExpirePwdDay");
		int expirePwdDay = 0;
		try {
			expirePwdDay = Integer.parseInt(propertyExpirePwdDay);
		} catch (NumberFormatException e) {
			LOGGER.debug("convert expirePwdDay Err : " + e.getMessage());
		}

		model.addAttribute("expirePwdDay", expirePwdDay);

		// ë¹„ë?ë²ˆí˜¸ ?¤ì •?¼ë¡œë¶€??ëª‡ì¼??ì§€?¬ëŠ”ì§€ ?•ì¸?œë‹¤. ex) 3?´ë©´ ë¹„ë¹Œë²ˆí˜¸ ?¤ì •??3??ê²½ê³¼
		LoginVO loginVO = (LoginVO) egovUserDetailsService.getAuthenticatedUser();
		model.addAttribute("loginVO", loginVO);
		int passedDayChangePWD = 0;
		if (loginVO != null) {
			LOGGER.debug("===>>> loginVO.getId() = " + loginVO.getId());
			LOGGER.debug("===>>> loginVO.getUniqId() = " + loginVO.getUniqId());
			LOGGER.debug("===>>> loginVO.getUserSe() = " + loginVO.getUserSe());
			// ë¹„ë?ë²ˆí˜¸ ë³€ê²½í›„ ê²½ê³¼???¼ìˆ˜
			passedDayChangePWD = loginService.selectPassedDayChangePWD(loginVO);
			LOGGER.debug("===>>> passedDayChangePWD = " + passedDayChangePWD);
			model.addAttribute("passedDay", passedDayChangePWD);
		}

		// ë§Œë£Œ?¼ìë¡œë???ê²½ê³¼???¼ìˆ˜ => ex)1?´ë©´ ë§Œë£Œ?¼ì—??1??ê²½ê³¼
		model.addAttribute("elapsedTimeExpiration", passedDayChangePWD - expirePwdDay);

		return "egovframework/com/uat/uia/EgovExpirePwd";
	}
}
