package egovframework.com.uat.uia.web;

import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationContext;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.ModelAndView;

import egovframework.com.cmm.ComDefaultCodeVO;
import egovframework.com.cmm.EgovComponentChecker;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.config.EgovLoginConfig;
import egovframework.com.cmm.service.CmmnDetailCode;
import egovframework.com.cmm.service.EgovCmmUseService;
import egovframework.com.cmm.service.EgovProperties;
import egovframework.com.cmm.service.Globals;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
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
*/

/**
 * ?쇰컲 濡쒓렇?? ?몄쬆??濡쒓렇?몄쓣 泥섎━?섎뒗 而⑦듃濡ㅻ윭 ?대옒??
 * 
 * @author 怨듯넻?쒕퉬??媛쒕컻? 諛뺤???
 * @since 2009.03.06
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.03.06  諛뺤???         理쒖큹 ?앹꽦
 *   2011.08.26  ?뺤쭊??         IncludedInfo annotation 異붽?
 *   2011.09.07  ?쒖???         ?ㅽ봽留??쒗걧由ы떚 濡쒓렇??諛?SSO ?몄쬆 濡쒖쭅???꾪꽣濡?遺꾨━
 *   2011.09.25  ?쒖???         ?ъ슜??愿由?而댄룷?뚰듃 誘명룷?⑥뿉 ????먭? 濡쒖쭅 異붽?
 *   2011.09.27  ?쒖???         ?몄쬆??濡쒓렇?몄떆 ?ㅽ봽留??쒗걧由ы떚 ?ъ슜?????泥댄겕 濡쒖쭅 異붽?
 *   2011.10.27  ?쒖???         ?꾩씠??李얘린 湲곕뒫?먯꽌 ?ъ슜??由щ쫫 怨듬갚 ?쒓굅 湲곕뒫 異붽?
 *   2017.07.21  ?λ룞??         濡쒓렇?몄씤利앹젣???묒뾽
 *   2018.10.26  ?좎슜??         濡쒓렇???붾㈃??message ?뚮씪誘명꽣 ?꾨떖 ?섏젙
 *   2019.10.01  ?뺤쭊??         濡쒓렇???몄쬆?몄뀡 異붽?
 *   2020.06.25  ?좎슜??         濡쒓렇??硫붿떆吏 泥섎━ ?섏젙
 *   2021.01.15  ?좎슜??         濡쒓렇?꾩썐??沅뚰븳 珥덇린??異붽? : session 紐⑤뱶 actionLogout()
 *   2021.05.30  ?뺤쭊??         ?붿??몄썝?⑥뒪 泥섎━?섍린 ?꾪빐 濡쒓렇???붾㈃???몄쬆諛⑹떇 ?꾨떖
 *   2022.11.11  源?쒖?          ?쒗걧?댁퐫??泥섎━
 *   2023.06.09  源?좏빐          NSR 蹂댁븞議곗튂 (GPKI ?몄쬆???깅줉 OOB 諛⑹?)
 *   2024.10.29  ?대갚??         遺덊븘???뺣????쒓굅 (request.getParameter("loginMessage"); loginService.selectLoginIncorrect(loginVO);)
 *   2025.07.31  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(final???꾨땶 蹂?섎뒗 諛묒쨪???ы븿?????놁쓬)
 *
 *      </pre>
 */
@Controller
public class EgovLoginController {

	/** EgovLoginService */
	@Resource(name = "loginService")
	private EgovLoginService loginService;

	/** EgovCmmUseService */
	@Resource(name = "EgovCmmUseService")
	private EgovCmmUseService cmmUseService;

	/** EgovMessageSource */
	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	@Resource(name = "egovLoginConfig")
	EgovLoginConfig egovLoginConfig;

	private final ApplicationContext act;
	private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository securityContextRepository;
	
    public EgovLoginController(ApplicationContext act, AuthenticationManager authenticationManager, SecurityContextRepository securityContextRepository) {
    	this.act = act;
    	this.authenticationManager = authenticationManager;
    	this.securityContextRepository = securityContextRepository;
    }

    /** log */
	private static final Logger LOGGER = LoggerFactory.getLogger(EgovLoginController.class);

	/**
	 * 濡쒓렇???붾㈃?쇰줈 ?ㅼ뼱媛꾨떎
	 * 
	 * @param vo - 濡쒓렇?명썑 ?대룞??URL???닿릿 LoginVO
	 * @return 濡쒓렇???섏씠吏
	 * @exception Exception
	 */
	@IncludedInfo(name = "濡쒓렇??, listUrl = "/uat/uia/egovLoginUsr.do", order = 10, gid = 10)
	@RequestMapping(value = "/uat/uia/egovLoginUsr.do")
	public String loginUsrView(@ModelAttribute("loginVO") LoginVO loginVO, HttpServletRequest request, HttpServletResponse response, ModelMap model) throws Exception {
		if (EgovComponentChecker.hasComponent("mberManageService")) {
			model.addAttribute("useMemberManage", "true");
		}

		// 沅뚰븳泥댄겕???먮윭 ?섏씠吏 ?대룞
		String authError = request.getParameter("auth_error") == null ? ""
				: (String) request.getParameter("auth_error");
		if (authError != null && authError.equals("1")) {
			return "egovframework/com/cmm/error/accessDenied";
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
		 * }catch(Exception e){ return "egovframework/com/cmm/egovError"; }
		 */

		// 2021.05.30, ?뺤쭊?? ?붿??몄썝?⑥뒪 泥섎━?섍린 ?꾪빐 濡쒓렇???붾㈃???몄쬆諛⑹떇 ?꾨떖
		String authType = EgovProperties.getProperty("Globals.Auth").trim();
		model.addAttribute("authType", authType);

		String message = request.getParameter("loginMessage");
		if (message != null) {
			model.addAttribute("loginMessage", message);
		}

		return "egovframework/com/uat/uia/EgovLoginUsr";
	}

	/**
	 * ?쇰컲(?몄뀡) 濡쒓렇?몄쓣 泥섎━?쒕떎
	 * 
	 * @param vo - ?꾩씠?? 鍮꾨?踰덊샇媛 ?닿릿 LoginVO
	 * @param request - ?몄뀡泥섎━瑜??꾪븳 HttpServletRequest
	 * @return result - 濡쒓렇?멸껐怨??몄뀡?뺣낫)
	 * @exception Exception
	 */
	@RequestMapping(value = "/uat/uia/actionLogin.do")
	public String actionLogin(@ModelAttribute("loginVO") LoginVO loginVO, HttpServletRequest request, HttpServletResponse response, ModelMap model) throws Exception {

		// 1. 濡쒓렇?몄씤利앹젣???쒖꽦?붿떆 
		if( egovLoginConfig.isLock()){
		    Map<?,?> mapLockUserInfo = loginService.selectLoginIncorrect(loginVO);
		    if(mapLockUserInfo != null){			
				//2.1 濡쒓렇?몄씤利앹젣??泥섎━
				String sLoginIncorrectCode = loginService.processLoginIncorrect(loginVO, mapLockUserInfo);
				if(!sLoginIncorrectCode.equals("E")){
					if(sLoginIncorrectCode.equals("L")){
						model.addAttribute("loginMessage", egovMessageSource.getMessageArgs("fail.common.loginIncorrect", new Object[] {egovLoginConfig.getLockCount(),request.getLocale()}));
					}else if(sLoginIncorrectCode.equals("C")){
						model.addAttribute("loginMessage", egovMessageSource.getMessage("fail.common.login",request.getLocale()));
					}
					return "redirect:/uat/uia/egovLoginUsr.do";
				}
		    }else{
		    	model.addAttribute("loginMessage", egovMessageSource.getMessage("fail.common.login",request.getLocale()));
		    	return "redirect:/uat/uia/egovLoginUsr.do";
		    }
		}
		
		// 2. 濡쒓렇??泥섎━
		LoginVO resultVO = loginService.actionLogin(loginVO);
		String userIp = EgovClntInfo.getClntIP(request);
		resultVO.setIp(userIp);
		
		// 3. ?쇰컲 濡쒓렇??泥섎━
		// 2022.11.11 ?쒗걧?댁퐫??泥섎━
		if (resultVO.getId() != null && !resultVO.getId().equals("")) {

			// 3-1. 濡쒓렇???뺣낫瑜??몄뀡?????
			request.getSession().setAttribute("loginVO", resultVO);

			if("security".equals(EgovProperties.getProperty("Globals.Auth").trim())) {
				actionSecurityProcess(resultVO, request, response);
				Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
				if (isAuthenticated ) {
					return "forward:/EgovContent.do";	// ?깃났 ???섏씠吏.. (redirect 遺덇?)
				} else {
					model.addAttribute("loginMessage", egovMessageSource.getMessage("fail.common.login"));
					return "redirect:/uat/uia/egovLoginUsr.do";
				}
			} else {
				// 2019.10.01 濡쒓렇???몄쬆?몄뀡 異붽?
				request.getSession().setAttribute("accessUser", resultVO.getUserSe().concat(resultVO.getId()));
				return "redirect:/uat/uia/actionMain.do";
			}

		} else {
			model.addAttribute("loginMessage", egovMessageSource.getMessage("fail.common.login",request.getLocale()));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}
	}

	@RequestMapping(value="/uat/uia/actionSecurityProcess.do")
	public void actionSecurityProcess(LoginVO resultVO, HttpServletRequest request, HttpServletResponse response) {
		// 1. ?몄쬆 ?좏겙 援ъ꽦
		UsernamePasswordAuthenticationToken token = UsernamePasswordAuthenticationToken.unauthenticated(resultVO.getUserSe().concat(resultVO.getId()), resultVO.getUniqId());

		// 2. ?몄쬆 ?섑뻾
		Authentication authResult = authenticationManager.authenticate(token);

		// 3. SecurityContext ???
		SecurityContext context = SecurityContextHolder.createEmptyContext();
		context.setAuthentication(authResult);
		SecurityContextHolder.setContext(context);
		securityContextRepository.saveContext(context, request, response);
	}

	/**
	 * ?몄쬆??濡쒓렇?몄쓣 泥섎━?쒕떎
	 * 
	 * @param vo - 二쇰?踰덊샇媛 ?닿릿 LoginVO
	 * @return result - 濡쒓렇?멸껐怨??몄뀡?뺣낫)
	 * @exception Exception
	 */
	@RequestMapping(value = "/uat/uia/actionCrtfctLogin.do")
	public String actionCrtfctLogin(@ModelAttribute("loginVO") LoginVO loginVO, HttpServletRequest request, HttpServletResponse response, ModelMap model) throws Exception {

		// ?묒냽IP
		String userIp = EgovClntInfo.getClntIP(request);
		loginVO.setIp(userIp);
		LOGGER.debug("User IP : {}", userIp);

		/*
		 * // 1. GPKI ?몄쬆 GPKIHttpServletResponse gpkiresponse = null;
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
		 * // 2. ?낅Т?ъ슜???뚯씠釉붿뿉??dn媛믪쑝濡??ъ슜?먯쓽 ID, PW瑜?議고쉶?섏뿬 ?대? ?쇰컲濡쒓렇???뺥깭濡??몄쬆?섎룄濡???if (dn != null
		 * && !dn.equals("")) {
		 * 
		 * loginVO.setDn(dn); LoginVO resultVO =
		 * loginService.actionCrtfctLogin(loginVO); if (resultVO != null &&
		 * resultVO.getId() != null && !resultVO.getId().equals("")) {
		 * 
		 * //?ㅽ봽留??쒗걧由ы떚?⑦궎吏瑜??ъ슜?섎뒗吏 泥댄겕?섎뒗 濡쒖쭅
		 * if(EgovComponentChecker.hasComponent("egovAuthorManageService")){ // 3-1.
		 * spring security ?곕룞 return "redirect:/j_spring_security_check?j_username=" +
		 * resultVO.getUserSe() + resultVO.getId() + "&j_password=" +
		 * resultVO.getUniqId();
		 * 
		 * }else{ // 3-2. 濡쒓렇???뺣낫瑜??몄뀡?????request.getSession().setAttribute("loginVO",
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
	 * 濡쒓렇????硫붿씤?붾㈃?쇰줈 ?ㅼ뼱媛꾨떎
	 * 
	 * @param
	 * @return 濡쒓렇???섏씠吏
	 * @exception Exception
	 */
	@RequestMapping(value = "/uat/uia/actionMain.do")
	public String actionMain(HttpServletRequest request, ModelMap model) throws Exception {

		// 1. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("loginMessage", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}
		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		if (user.getIp().equals("")) {
			user.setIp(EgovClntInfo.getClntIP(request));
		}

		// 221116 源?쒖? 2022 ?쒗걧?댁퐫??議곗튂
		LOGGER.debug("User Id : {}", EgovStringUtil.isNullToString(user.getId()));

		/*
		 * // 2. 硫붾돱議고쉶 MenuManageVO menuManageVO = new MenuManageVO();
		 * menuManageVO.setTmp_Id(user.getId());
		 * menuManageVO.setTmp_UserSe(user.getUserSe());
		 * menuManageVO.setTmp_Name(user.getName());
		 * menuManageVO.setTmp_Email(user.getEmail());
		 * menuManageVO.setTmp_OrgnztId(user.getOrgnztId());
		 * menuManageVO.setTmp_UniqId(user.getUniqId()); List list_headmenu =
		 * menuManageService.selectMainMenuHead(menuManageVO);
		 * model.addAttribute("list_headmenu", list_headmenu);
		 */

		// 3. 硫붿씤 ?섏씠吏 ?대룞
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
		 * // 3-1. ?ㅼ젙??硫붿씤?붾㈃???덈뒗 寃쎌슦 return main_page;
		 * 
		 * } else {
		 * 
		 * // 3-2. ?ㅼ젙??硫붿씤?붾㈃???녿뒗 寃쎌슦 if (user.getUserSe().equals("USR")) { return
		 * "egovframework/com/EgovMainView"; } else { return
		 * "egovframework/com/EgovMainViewG"; } }
		 */
	}

	/**
	 * 濡쒓렇?꾩썐?쒕떎.
	 * 
	 * @return String
	 * @exception Exception
	 */
	@RequestMapping(value = "/uat/uia/actionLogout.do")
	public String actionLogout(HttpServletRequest request, ModelMap model) throws Exception {

		/*String userIp = EgovClntInfo.getClntIP(request);

		// 1. Security ?곕룞
		return "redirect:/j_spring_security_logout";*/

		request.getSession().setAttribute("loginVO", null);
		// ?몄뀡紐⑤뱶?멸꼍??Authority 珥덇린??
		// List<String> authList = (List<String>)EgovUserDetailsHelper.getAuthorities();
		request.getSession().setAttribute("accessUser", null);

		if("security".equals(EgovProperties.getProperty("Globals.Auth").trim())) {
			SecurityContextHolder.clearContext();
		}

		//return "redirect:/egovDevIndex.jsp";
		return "redirect:/EgovContent.do";
	}

	/**
	 * ?꾩씠??鍮꾨?踰덊샇 李얘린 ?붾㈃?쇰줈 ?ㅼ뼱媛꾨떎
	 * 
	 * @param
	 * @return ?꾩씠??鍮꾨?踰덊샇 李얘린 ?섏씠吏
	 * @exception Exception
	 */
	@RequestMapping(value = "/uat/uia/egovIdPasswordSearch.do")
	public String idPasswordSearchView(ModelMap model) throws Exception {

		// 1. 鍮꾨?踰덊샇 ?뚰듃 怨듯넻肄붾뱶 議고쉶
		ComDefaultCodeVO vo = new ComDefaultCodeVO();
		vo.setCodeId("COM022");
		List<CmmnDetailCode> code = cmmUseService.selectCmmCodeDetail(vo);
		model.addAttribute("pwhtCdList", code);

		return "egovframework/com/uat/uia/EgovIdPasswordSearch";
	}

	/**
	 * ?몄쬆?쒖븞???붾㈃?쇰줈 ?ㅼ뼱媛꾨떎
	 * 
	 * @return ?몄쬆?쒖븞???섏씠吏
	 * @exception Exception
	 */
	@RequestMapping(value = "/uat/uia/egovGpkiIssu.do")
	public String gpkiIssuView(ModelMap model) throws Exception {
		return "egovframework/com/uat/uia/EgovGpkiIssu";
	}

	/**
	 * ?꾩씠?붾? 李얜뒗??
	 * 
	 * @param vo - ?대쫫, ?대찓?쇱＜?? ?ъ슜?먭뎄遺꾩씠 ?닿릿 LoginVO
	 * @return result - ?꾩씠??
	 * @exception Exception
	 */
	@RequestMapping(value = "/uat/uia/searchId.do")
	public String searchId(@ModelAttribute("loginVO") LoginVO loginVO, ModelMap model) throws Exception {

		if (loginVO == null || loginVO.getName() == null || loginVO.getName().equals("") && loginVO.getEmail() == null
				|| loginVO.getEmail().equals("") && loginVO.getUserSe() == null || loginVO.getUserSe().equals("")) {
			return "egovframework/com/cmm/egovError";
		}

		// 1. ?꾩씠??李얘린
		loginVO.setName(loginVO.getName().replaceAll(" ", ""));
		LoginVO resultVO = loginService.searchId(loginVO);

		if (resultVO != null && resultVO.getId() != null && !resultVO.getId().equals("")) {

			model.addAttribute("resultInfo", "?꾩씠?붾뒗 " + resultVO.getId() + " ?낅땲??");
			return "egovframework/com/uat/uia/EgovIdPasswordResult";
		} else {
			model.addAttribute("resultInfo", egovMessageSource.getMessage("fail.common.idsearch"));
			return "egovframework/com/uat/uia/EgovIdPasswordResult";
		}
	}

	/**
	 * 鍮꾨?踰덊샇瑜?李얜뒗??
	 * 
	 * @param vo - ?꾩씠?? ?대쫫, ?대찓?쇱＜?? 鍮꾨?踰덊샇 ?뚰듃, 鍮꾨?踰덊샇 ?뺣떟, ?ъ슜?먭뎄遺꾩씠 ?닿릿 LoginVO
	 * @return result - ?꾩떆鍮꾨?踰덊샇?꾩넚寃곌낵
	 * @exception Exception
	 */
	@RequestMapping(value = "/uat/uia/searchPassword.do")
	public String searchPassword(@ModelAttribute("loginVO") LoginVO loginVO, ModelMap model) throws Exception {

		// KISA 蹂댁븞?쎌젏 議곗튂 (2018-10-29, ?ㅼ갹??
		if (loginVO == null || loginVO.getId() == null || loginVO.getId().equals("") && loginVO.getName() == null
				|| "".equals(loginVO.getName()) && loginVO.getEmail() == null
				|| loginVO.getEmail().equals("") && loginVO.getPasswordHint() == null
				|| "".equals(loginVO.getPasswordHint()) && loginVO.getPasswordCnsr() == null
				|| "".equals(loginVO.getPasswordCnsr()) && loginVO.getUserSe() == null
				|| "".equals(loginVO.getUserSe())) {
			return "egovframework/com/cmm/egovError";
		}

		// 1. 鍮꾨?踰덊샇 李얘린
		boolean result = loginService.searchPassword(loginVO);

		// 2. 寃곌낵 由ы꽩
		if (result) {
			model.addAttribute("resultInfo", "?꾩떆 鍮꾨?踰덊샇瑜?諛쒖넚?섏??듬땲??");
			return "egovframework/com/uat/uia/EgovIdPasswordResult";
		} else {
			model.addAttribute("resultInfo", egovMessageSource.getMessage("fail.common.pwsearch"));
			return "egovframework/com/uat/uia/EgovIdPasswordResult";
		}
	}

	/**
	 * 媛쒕컻 ?쒖뒪??援ъ텞 ??諛쒓툒??GPKI ?쒕쾭?⑹씤利앹꽌??????뷀샇?붾뜲?댄꽣瑜?援ы븳??
	 * 理쒖큹 ?쒕쾲留??ㅽ뻾?섏뿬, ?뷀샇?붾뜲?댄꽣瑜?EgovGpkiVariables.js??ServerCert???ｋ뒗??
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
		 * base64.encode(cert); log.info("+++ Base64濡?蹂?섎맂 ?몄쬆?쒕뒗 : " + base64cert);
		 * 
		 * } catch (GpkiApiException e) { e.printStackTrace(); }
		 */
	}

	/**
	 * ?몄쬆??DN異붿텧 ?앹뾽???몄텧?쒕떎.
	 * 
	 * @return ?몄쬆???깅줉 ?섏씠吏
	 * @exception Exception
	 */
	@RequestMapping(value = "/uat/uia/EgovGpkiRegist.do")
	public String gpkiRegistView(HttpServletRequest request, HttpServletResponse response, ModelMap model) throws Exception {

		/** GPKI ?몄쬆 遺遺?*/
		// OS???곕씪 (local NT(濡쒖뺄) / server Unix(?쒕쾭)) 援щ텇
		String os = System.getProperty("os.arch");
		LOGGER.debug("OS : {}", os);

		// String virusReturn = null;

		/*
		 * // 釉뚮씪?곗? ?대쫫??諛쏄린?꾪븳 泥섎━ String webKind = EgovClntInfo.getClntWebKind(request);
		 * String[] ss = webKind.split(" "); String browser = ss[1];
		 * model.addAttribute("browser",browser); // -- ?ш린源뚯? if
		 * (os.equalsIgnoreCase("x86")) { //Local Host TEST 吏꾪뻾以?} else { if
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
	 * ?몄쬆??DN媛믪쓣 異붿텧?쒕떎
	 * 
	 * @return result - dn媛?
	 * @exception Exception
	 */
	@RequestMapping(value = "/uat/uia/actionGpkiRegist.do")
	public String actionGpkiRegist(HttpServletRequest request, HttpServletResponse response, ModelMap model) throws Exception {

		/** GPKI ?몄쬆 遺遺?*/
		// OS???곕씪 (local NT(濡쒖뺄) / server Unix(?쒕쾭)) 援щ텇
		String os = System.getProperty("os.arch");
		LOGGER.debug("OS : {}", os);

		// String virusReturn = null;
		@SuppressWarnings("unused")
		String dn = "";

		// 釉뚮씪?곗? ?대쫫??諛쏄린?꾪븳 泥섎━
		String browser = EgovClntInfo.getClntWebKind(request);
		model.addAttribute("browser", browser);
		/*
		 * // -- ?ш린源뚯? if (os.equalsIgnoreCase("x86")) { // Local Host TEST 吏꾪뻾以?} else {
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
	 * ?몄뀡??꾩븘???쒓컙???곗옣?쒕떎.
	 * Cookie??egovLatestServerTime, egovExpireSessionTime 湲곕줉?섎룄濡??쒕떎.
	 * @return result - String
	 * @exception Exception
	 */
	@RequestMapping(value="/uat/uia/refreshSessionTimeout.do")
	public ModelAndView refreshSessionTimeout(@RequestParam Map<String, Object> commandMap) throws Exception {
		ModelAndView modelAndView = new ModelAndView();
		modelAndView.setViewName("jsonView");

		modelAndView.addObject("result", "ok");

		return modelAndView;
	}

	/**
	 * 鍮꾨?踰덊샇 ?좏슚湲곌컙 ?앹뾽??異쒕젰?쒕떎.
	 * Cookie??egovLatestServerTime, egovExpireSessionTime 湲곕줉?섎룄濡??쒕떎.
	 * @return result - String
	 * @exception Exception
	 */
	@RequestMapping(value="/uat/uia/noticeExpirePwd.do")
	public String noticeExpirePwd(@RequestParam Map<String, Object> commandMap, ModelMap model) throws Exception {

		// ?ㅼ젙??鍮꾨?踰덊샇 ?좏슚湲곌컙??媛?몄삩?? ex) 180?대㈃ 鍮꾨?踰덊샇 蹂寃쏀썑 留뚮즺?쇱씠 ?욎쑝濡?180??
		String propertyExpirePwdDay = EgovProperties.getProperty("Globals.ExpirePwdDay");
		int expirePwdDay = 0 ;
		try {
			expirePwdDay =  Integer.parseInt(propertyExpirePwdDay);
		} catch (NumberFormatException e) {
			LOGGER.debug("convert expirePwdDay Err : "+e.getMessage());
		}

		model.addAttribute("expirePwdDay", expirePwdDay);

		// 鍮꾨?踰덊샇 ?ㅼ젙?쇰줈遺??紐뉗씪??吏?щ뒗吏 ?뺤씤?쒕떎. ex) 3?대㈃ 鍮꾨퉴踰덊샇 ?ㅼ젙??3??寃쎄낵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		model.addAttribute("loginVO", loginVO);
		int passedDayChangePWD = 0;
		if ( loginVO != null ) {
			LOGGER.debug("===>>> loginVO.getId() = "+loginVO.getId());
			LOGGER.debug("===>>> loginVO.getUniqId() = "+loginVO.getUniqId());
			LOGGER.debug("===>>> loginVO.getUserSe() = "+loginVO.getUserSe());
			// 鍮꾨?踰덊샇 蹂寃쏀썑 寃쎄낵???쇱닔
			passedDayChangePWD = loginService.selectPassedDayChangePWD(loginVO);
			LOGGER.debug("===>>> passedDayChangePWD = "+passedDayChangePWD);
			model.addAttribute("passedDay", passedDayChangePWD);
		}

		// 留뚮즺?쇱옄濡쒕???寃쎄낵???쇱닔 => ex)1?대㈃ 留뚮즺?쇱뿉??1??寃쎄낵
		model.addAttribute("elapsedTimeExpiration", passedDayChangePWD - expirePwdDay);

		return "egovframework/com/uat/uia/EgovExpirePwd";
	}

}