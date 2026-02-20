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
 * 而댄룷?뚰듃 ?ㅼ튂 ???ㅼ튂??而댄룷?뚰듃?ㅼ쓣 IncludedInfo annotation???듯빐 李얠븘????
 * ?붾㈃???쒖떆???뺣낫瑜?泥섎━?섎뒗 Controller ?대옒??
 * <Notice>
 * 		媛쒕컻??硫붾돱 援ъ“媛 ?≫엳湲??꾩뿉 諛고룷?뚯씪?ㅼ뿉 ?ы븿??怨듯넻 而댄룷?뚰듃?ㅼ쓽 紐⑸줉???붾㈃??
 * 		URL???쒓났?섏뿬 媛쒕컻?먭? ?명븯寃??쒖슜?섎룄濡??섍린 ?꾪빐 ?묒꽦??寃껋쑝濡?
 * 		?ㅼ젣 ?댁쁺?섎뒗 ?쒖뒪?쒖뿉?쒕뒗 ?곸슜?댁꽌??????
 *      ???댁쁺 ?쒖뿉????젣?댁꽌 諛고룷?대룄 醫뗭쓬
 * <Disclaimer>
 * 		?댁쁺?쒖뿉 蹂?而⑦듃濡ㅼ쓣 ?ъ슜?섏뿬 硫붾돱瑜?援ъ꽦?섎뒗 寃쎌슦 ?깅뒫 臾몄젣瑜??쇱쑝?ㅺ굅??
 * 		?ъ슜?먮퀎 硫붾돱 援ъ꽦???ㅻ쪟瑜?諛쒖깮?????덉쓬
 * </pre>
 * 
 * @author 怨듯넻而댄룷?뚰듃 ?뺤쭊??
 * @since 2011.08.26
 * @version 2.0.0
 * @see
 * 
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2011.08.26  ?뺤쭊??         理쒖큹 ?앹꽦
 *   2011.09.16  ?쒖???         而⑦뀗痢??섏씠吏 ?앹꽦
 *   2011.09.26  ?닿린??         header, footer ?섏씠吏 ?앹꽦
 *   2019.12.04  ?좎슜??         KISA 蹂댁븞肄붾뱶 ?먭? : Map<Integer, IncludedCompInfoVO> map瑜?吏????섎줈 ?섏젙
 *   2020.07.08  ?좎슜??         鍮꾨?踰덊샇瑜??섏젙?쒗썑 寃쎄낵???좎쭨 議고쉶
 *   2020.08.28  ?뺤쭊??         ?쒖??꾨젅?꾩썙??v3.10 媛쒖꽑
 *   2025.05.30  ?대갚??         PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(吏??蹂??紐낅챸 洹쒖튃)
 *
 *      </pre>
 */

@Controller
public class EgovComIndexController {

	@Autowired
	private ApplicationContext applicationContext;

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovComIndexController.class);

	/** EgovLoginService */
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

		// ?ㅼ젙??鍮꾨?踰덊샇 ?좏슚湲곌컙??媛?몄삩?? ex) 180?대㈃ 鍮꾨?踰덊샇 蹂寃쏀썑 留뚮즺?쇱씠 ?욎쑝濡?180??
		String propertyExpirePwdDay = EgovProperties.getProperty("Globals.ExpirePwdDay");
		int expirePwdDay = 0;
		try {
			expirePwdDay = Integer.parseInt(propertyExpirePwdDay);
		} catch (NumberFormatException nfe) {
			LOGGER.debug("convert expirePwdDay Err : " + nfe.getMessage());
		}

		model.addAttribute("expirePwdDay", expirePwdDay);

		// 鍮꾨?踰덊샇 ?ㅼ젙?쇰줈遺??紐뉗씪??吏?щ뒗吏 ?뺤씤?쒕떎. ex) 3?대㈃ 鍮꾨퉴踰덊샇 ?ㅼ젙??3??寃쎄낵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		model.addAttribute("loginVO", loginVO);
		int passedDayChangePWD = 0;
		if (loginVO != null) {
			LOGGER.debug("===>>> loginVO.getId() = " + loginVO.getId());
			LOGGER.debug("===>>> loginVO.getUniqId() = " + loginVO.getUniqId());
			LOGGER.debug("===>>> loginVO.getUserSe() = " + loginVO.getUserSe());
			// 鍮꾨?踰덊샇 蹂寃쏀썑 寃쎄낵???쇱닔
			passedDayChangePWD = loginService.selectPassedDayChangePWD(loginVO);
			LOGGER.debug("===>>> passedDayChangePWD = " + passedDayChangePWD);
			model.addAttribute("passedDay", passedDayChangePWD);
		}

		// 留뚮즺?쇱옄濡쒕???寃쎄낵???쇱닔 => ex)1?대㈃ 留뚮즺?쇱뿉??1??寃쎄낵
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
		 * EgovLoginController媛 AOP Proxy?섎뒗 諛붾엺???대옒?ㅻ? reflection?쇰줈 媛?몄삱 ???놁쓬
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
		/* ?ш린源뚯? AOP Proxy濡??명븳 肄붾뱶 */

		/* @Controller Annotation 泥섎━???대옒?ㅻ? 紐⑤몢 李얜뒗?? */
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
					 * 紐⑸줉??議고쉶瑜??꾪븳 url 留ㅽ븨? @IncludedInfo??@RequestMapping?먯꽌 媛?몄삩??
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

	// context-security.xml ?ㅼ젙
	// csrf="true"??寃쎌슦 csrf Token???녿뒗寃쎌슦 ?대룞?섎뒗 ?섏씠吏
	// csrfAccessDeniedUrl="/egovCSRFAccessDenied.do"
	@RequestMapping("/egovCSRFAccessDenied.do")
	public String egovCSRFAccessDenied() {
		return "egovframework/com/cmm/error/csrfAccessDenied";
	}
}
