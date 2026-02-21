package egovframework.com.cmm.web;

import java.lang.reflect.Method;
import java.util.Map;
import java.util.TreeMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.RequestMapping;

import egovframework.com.cmm.IncludedCompInfoVO;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.service.EgovProperties;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.uat.uia.service.EgovLoginService;
import jakarta.annotation.Resource;

/**
 * <pre>
 * ??? ?? ??????????? IncludedInfo annotation????? ????
 * ????????????? Controller ?????
 * <Notice>
 * 		?????? ???? ????? ???????????? ?????
 * 		URL?????? ?? ????????? ? ?????
 * 		?? ???? ?????? ?????????
 *      ???? ????????? ??????
 * <Disclaimer>
 * 		???? ???? ????? ????? ??? ?????????
 * 		?????????????????????
 * </pre>
 * 
 * @author ???? ???
 * @since 2011.08.26
 * @version 2.0.0
 * @see
 * 
 *      <pre>
 *  == ?????Modification Information) ==
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2011.08.26  ???         ????
 *   2011.09.16  ?????         ????? ??
 *   2011.09.26  ????         header, footer ?? ??
 *   2019.12.04  ???         KISA  ?? : Map<Integer, IncludedCompInfoVO> map??????? ??
 *   2020.07.08  ???         ????????? ????? ??
 *   2020.08.28  ???         ???????v3.10 ?
 *   2025.05.30  ????         PMD???????? ????????-LocalVariableNamingConventions(???????
 *
 *      </pre>
 **/

@Controller
public class EgovComIndexController {

	@Autowired
	private ApplicationContext applicationContext;

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovComIndexController.class);

	/** EgovLoginService **/
	@Resource(name = "loginService")
	private EgovLoginService loginService;

	@RequestMapping("/index.do")
	public String index(ModelMap model) {
		return "egovframework/com/cmm/EgovUnitMain";
	}

	@RequestMapping("/EgovTop.do")
	public String top() {
		return "egovframework/com/cmm/EgovUnitTop";
	}

	@RequestMapping("/EgovBottom.do")
	public String bottom() {
		return "egovframework/com/cmm/EgovUnitBottom";
	}

	@RequestMapping("/EgovContent.do")
	public String setContent(ModelMap model) throws Exception {

		// ??????????????? ex) 180?????????????? ???180??
		String propertyExpirePwdDay = EgovProperties.getProperty("Globals.ExpirePwdDay");
		int expirePwdDay = 0;
		try {
			expirePwdDay = Integer.parseInt(propertyExpirePwdDay);
		} catch (NumberFormatException nfe) {
			LOGGER.debug("convert expirePwdDay Err : " + nfe.getMessage());
		}

		model.addAttribute("expirePwdDay", expirePwdDay);

		// ??????????????????? ???. ex) 3???????? ????3????
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
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

		return "egovframework/com/cmm/EgovUnitContent";
	}

	@RequestMapping("/EgovLeft.do")
	public String setLeftMenu(ModelMap model) {

		Map<Integer, IncludedCompInfoVO> map = new TreeMap<Integer, IncludedCompInfoVO>();
		RequestMapping rmAnnotation;
		IncludedInfo annotation;
		IncludedCompInfoVO zooVO;

		/*
		 * EgovLoginController AOP Proxy?? ????????? reflection?? ? ????
		 */
		try {
			Class<?> loginController = Class.forName("egovframework.com.uat.uia.web.EgovLoginController");
			Method[] methods = loginController.getMethods();
			for (int i = 0; i < methods.length; i++) {
				annotation = methods[i].getAnnotation(IncludedInfo.class);

				if (annotation != null) {
					LOGGER.debug("Found @IncludedInfo Method : {}", methods[i]);
					zooVO = new IncludedCompInfoVO();
					zooVO.setName(annotation.name());
					zooVO.setOrder(annotation.order());
					zooVO.setGid(annotation.gid());

					rmAnnotation = methods[i].getAnnotation(RequestMapping.class);
					if ("".equals(annotation.listUrl()) && rmAnnotation != null) {
						zooVO.setListUrl(rmAnnotation.value()[0]);
					} else {
						zooVO.setListUrl(annotation.listUrl());
					}
					map.put(zooVO.getOrder(), zooVO);
				}
			}
		} catch (ClassNotFoundException e) {
			LOGGER.error("No egovframework.com.uat.uia.web.EgovLoginController!!");
		}
		/* ???? AOP Proxy?? ??*/

		/* @Controller Annotation ????????? ???? */
		Map<String, Object> myZoos = applicationContext.getBeansWithAnnotation(Controller.class);
		LOGGER.debug("How many Controllers : ", myZoos.size());
		for (final Object myZoo : myZoos.values()) {
			Class<? extends Object> zooClass = myZoo.getClass();

			Method[] methods = zooClass.getMethods();
			LOGGER.debug("Controller Detected {}", zooClass);
			for (int i = 0; i < methods.length; i++) {
				annotation = methods[i].getAnnotation(IncludedInfo.class);

				if (annotation != null) {
					// LOG.debug("Found @IncludedInfo Method : " + methods[i] );
					zooVO = new IncludedCompInfoVO();
					zooVO.setName(annotation.name());
					zooVO.setOrder(annotation.order());
					zooVO.setGid(annotation.gid());
					/*
					 * ????? url ?? @IncludedInfo??@RequestMapping?? ???
					 */
					rmAnnotation = methods[i].getAnnotation(RequestMapping.class);
					if ("".equals(annotation.listUrl())) {
						zooVO.setListUrl(rmAnnotation.value()[0]);
					} else {
						zooVO.setListUrl(annotation.listUrl());
					}

					map.put(zooVO.getOrder(), zooVO);
				}
			}
		}

		model.addAttribute("resultList", map.values());

		LOGGER.debug("EgovComIndexController index is called ");

		return "egovframework/com/cmm/EgovUnitLeft";
	}

	// context-security.xml ??
	// csrf="true"????csrf Token?????????? ??
	// csrfAccessDeniedUrl="/egovCSRFAccessDenied.do"
	@RequestMapping("/egovCSRFAccessDenied.do")
	public String egovCSRFAccessDenied() {
		return "egovframework/com/cmm/error/csrfAccessDenied";
	}
}
