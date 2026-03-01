package egovframework.com.uss.ion.tir.web;

import java.util.Date;
import java.util.HashMap;
import java.util.Map;

import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
//import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.util.WebUtils;
//import org.springmodules.validation.commons.DefaultBeanValidator;

import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.uss.ion.tir.service.EgovTwitterTrnsmitService;
import egovframework.com.uss.ion.tir.service.TwitterInfo;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import twitter4j.CreateTweetResponse;

/**
 * ?몄쐞???섏떊, ?≪떊瑜?泥섎━?섎뒗 Controller Class 援ы쁽
 * @author 怨듯넻?쒕퉬???λ룞??
 * @since 2010.10.04
 * @version 1.0
 * @see
 * <pre>
 * &lt;&lt; 媛쒖젙?대젰(Modification Information) &gt;&gt;
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.10.04  ?λ룞??         理쒖큹 ?앹꽦
 *   2011.8.26	?뺤쭊??		IncludedInfo annotation 異붽?
 *
 * </pre>
 */

@Controller
public class EgovTwitterController {

//	@Autowired
//
                     DefaultBeanValidator beanValidator;

	/** EgovMessageSource */
	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	/** EgovPropertyService */
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	/** ?몄쐞???≪떊(紐⑸줉) ?쒕퉬??*/
	@Resource(name = "egovTwitterTrnsmitService")
	private EgovTwitterTrnsmitService egovTwitterTrnsmitService;
	
	private static final Logger LOGGER = LoggerFactory.getLogger(EgovTwitterController.class);

	/**
	 * ?몄쐞?곕? 硫붿씤 ?몄쬆 ?섏씠吏議고쉶
	 * @param commandMap 	-Request  Variable
	 * @return String 		-由ы꽩 URL
	 * @throws Exception	-Exception Throws
	 */
	@IncludedInfo(name = "Twitter?곕룞", order = 830, gid = 50)
	@RequestMapping(value = "/uss/ion/tir/selectTwitterMain.do")
	public String EgovTwitterMain(@RequestParam Map<?, ?> commandMap, ModelMap model) throws Exception {
		return "egovframework/com/uss/ion/tir/EgovTwitterMain";
	}

	/**
	 * ?몄쐞?곕? ?몄쬆??愿由??섏씠吏瑜?議고쉶?쒕떎.
	 * @param model 		-Spring ?쒓났?섎뒗 ModelMap
	 * @return String 		-由ы꽩 URL
	 * @throws Exception	-Exception Throws
	 */
	@RequestMapping(value = "/uss/ion/tir/selectTwitterAccount.do", method = RequestMethod.GET)
	public String EgovTwitterAccountGet(ModelMap model) throws Exception {

		// Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		HashMap<String, String> hmPram = new HashMap<String, String>();
		hmPram.put("usid", loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

		Map<?, ?> mapResult = egovTwitterTrnsmitService.selectTwitterAccount(hmPram);

		//Consumer key/Consumer secret ??媛?議고쉶
		if (mapResult == null) {
			model.addAttribute("consumerKey", "");
			model.addAttribute("consumerSecret", "");
		} else {
			model.addAttribute("consumerKey", mapResult.get("CONSUMER_KEY"));
			model.addAttribute("consumerSecret", mapResult.get("CONSUMER_SECRET"));
		}

		return "egovframework/com/uss/ion/tir/EgovTwitterAccount";
	}

	/**
	 * ?몄쐞?곕? ?몄쬆??愿由??섏씠吏瑜? ?섏젙?쒕떎.
	 * @param model 		-Spring ?쒓났?섎뒗 ModelMap
	 * @return String 		-由ы꽩 URL
	 * @throws Exception	-Exception Throws
	 */
	@SuppressWarnings("unused")
	@RequestMapping(value = "/uss/ion/tir/selectTwitterAccount.do", method = RequestMethod.POST)
	public String EgovTwitterAccountPost(HttpServletRequest request, HttpServletResponse response, ModelMap model) throws Exception {

		// Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		String sConsumerKey = request.getParameter("ConsumerKey") == null ? "" : (String) request.getParameter("ConsumerKey");
		String sConsumerSecret = request.getParameter("ConsumerSecret") == null ? "" : (String) request.getParameter("ConsumerSecret");

		HashMap<String, String> hmPram = new HashMap<String, String>();
		hmPram.put("usid", loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

		Map<?, ?> mapResult = egovTwitterTrnsmitService.selectTwitterAccount(hmPram);

		hmPram.put("usid", loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
		hmPram.put("consumerKey", sConsumerKey);
		hmPram.put("consumerSecret", sConsumerSecret);
		hmPram.put("frstRegisterId", loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
		hmPram.put("lastUpdusrId", loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

		if (egovTwitterTrnsmitService.selectTwitterAccountCheck(hmPram) > 0) {
			egovTwitterTrnsmitService.updtTwitterAccount(hmPram);
		} else {
			egovTwitterTrnsmitService.insertTwitterAccount(hmPram);
		}

		//??λ맂????Attribute ?ㅼ젙
		model.addAttribute("consumerKey", sConsumerKey);
		model.addAttribute("consumerSecret", sConsumerSecret);

		//?몄쐞???몄뀡?뺣낫 ??젣
		WebUtils.setSessionAttribute(request, "sCONSUMER_KEY", null);
		WebUtils.setSessionAttribute(request, "sCONSUMER_SECRET", null);
		WebUtils.setSessionAttribute(request, "atoken", null);
		WebUtils.setSessionAttribute(request, "astoken", null);

		//??λ찓?몄? ?ㅼ젙
		String ReusltScript = "";

		ReusltScript += "<script type='text/javaScript' language='javascript'>";
		ReusltScript += "alert(' ?묒꽦?? ?몄쐞???몄쬆??ConsumerKey/ConsumerSecret)瑜?????섏??듬땲??  ');";
		ReusltScript += "</script>";

		model.addAttribute("reusltScript", ReusltScript);

		return "egovframework/com/uss/ion/tir/EgovTwitterAccount";
	}

	/**
	 * ?몄쐞?곕? ?몄쬆 ?섏씠吏瑜?議고쉶?쒕떎.
	 * @param model 		-Spring ?쒓났?섎뒗 ModelMap
	 * @return String 		-由ы꽩 URL
	 * @throws Exception	-Exception Throws
	 */
	@RequestMapping(value = "/uss/ion/tir/selectTwitterPopup.do")
	public String EgovTwitterPopupGet(ModelMap model) throws Exception {

		// Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		HashMap<String, String> hmPram = new HashMap<String, String>();
		hmPram.put("usid", loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

		Map<?, ?> mapResult = egovTwitterTrnsmitService.selectTwitterAccount(hmPram);

		//Consumer key/Consumer secret ??媛?議고쉶
		if (mapResult == null) {
			model.addAttribute("consumerKey", "");
			model.addAttribute("consumerSecret", "");
		} else {
			model.addAttribute("consumerKey", mapResult.get("CONSUMER_KEY"));
			model.addAttribute("consumerSecret", mapResult.get("CONSUMER_SECRET"));
		}

		return "egovframework/com/uss/ion/tir/EgovTwitterPopup";
	}

	/**
	 * ?몄쐞?곕? ?몄쬆 ?섏씠吏瑜?議고쉶?쒕떎.
	 * @param searchVO 		-?몄쐞??Model
	 * @param commandMap 	-Request  Variable
	 * @param twitterInfo 	-?몄쐞??Model
	 * @param model 		-Spring ?쒓났?섎뒗 ModelMap
	 * @return String 		-由ы꽩 URL
	 * @throws Exception	-Exception Throws
	 */
	@RequestMapping(value = "/uss/ion/tir/selectTwitterPopupActor.do")
	public String EgovTwitterPopupPost(@RequestParam Map<?, ?> commandMap, ModelMap model) throws Exception {

		String sCheckKey = commandMap.get("chkKey") == null ? "" : (String) commandMap.get("chkKey");

		String sConsumerKey = commandMap.get("ConsumerKey") == null ? "" : (String) commandMap.get("ConsumerKey");
		String sConsumerSecret = commandMap.get("ConsumerSecret") == null ? "" : (String) commandMap.get("ConsumerSecret");

		// Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		HashMap<String, String> hmPram = new HashMap<String, String>();
		hmPram.put("usid", loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
		hmPram.put("consumerKey", sConsumerKey);
		hmPram.put("consumerSecret", sConsumerSecret);
		hmPram.put("frstRegisterId", loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
		hmPram.put("lastUpdusrId", loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

		LOGGER.info("EgovTwitterPopupPost>");
		LOGGER.info("selectTwitterAccountCheck>" + egovTwitterTrnsmitService.selectTwitterAccountCheck(hmPram));

		//Consumer key/Consumer secret ??媛????泥댄겕??
		if (sCheckKey.equals("1")) {
			if (egovTwitterTrnsmitService.selectTwitterAccountCheck(hmPram) > 0) {
				egovTwitterTrnsmitService.updtTwitterAccount(hmPram);
			} else {
				egovTwitterTrnsmitService.insertTwitterAccount(hmPram);
			}

		} else {
			egovTwitterTrnsmitService.deleteTwitterAccount(hmPram);
		}

		return "egovframework/com/uss/ion/tir/EgovTwitterPopupActor";
	}

	/**
	 * ?몄쐞?곕? ?몄쬆 ?섏씠吏瑜?議고쉶?쒕떎.
	 * @param model 		-Spring ?쒓났?섎뒗 ModelMap
	 * @return String 		-由ы꽩 URL
	 * @throws Exception	-Exception Throws
	 */
	@RequestMapping(value = "/uss/ion/tir/selectTwitterPopupProcess.do")
	public String EgovTwitterPopupProcess(ModelMap model) throws Exception {
		return "egovframework/com/uss/ion/tir/EgovTwitterPopupProcess";
	}


	/**
	 * ?몄쐞?곕? ?≪떊 ?섏씠吏瑜?議고쉶 ?쒕떎.
	 * @param model 		-Spring ?쒓났?섎뒗 ModelMap
	 * @return String 		-由ы꽩 URL
	 * @throws Exception	-Exception Throws
	 */
	@RequestMapping(value = "/uss/ion/tir/registTwitterTrnsmit.do", method = RequestMethod.GET)
	public String EgovTwitterTrnsmitGet(ModelMap model, HttpServletRequest request) throws Exception {
		
		String sCONSUMER_KEY = (String) WebUtils.getSessionAttribute(request, "sCONSUMER_KEY");
		String sCONSUMER_SECRET = (String) WebUtils.getSessionAttribute(request, "sCONSUMER_SECRET");

		String atoken = (String) WebUtils.getSessionAttribute(request, "atoken");
		String astoken = (String) WebUtils.getSessionAttribute(request, "astoken");

		HashMap<String, Object> hmParam = new HashMap<String, Object>();
		// ?몄쬆?ㅺ컪 ?ㅼ젙
		hmParam.put("sCONSUMER_KEY", sCONSUMER_KEY);
		hmParam.put("sCONSUMER_SECRET", sCONSUMER_SECRET);
		hmParam.put("atoken", atoken);
		hmParam.put("astoken", astoken);

		Map<?, ?> userResult = egovTwitterTrnsmitService.twitterUserAccount(hmParam); // ?좎??뺣낫

		model.addAttribute("userID", userResult.get("userName"));
		model.addAttribute("userName", userResult.get("userScreenName"));
		model.addAttribute("twitterInfo", new TwitterInfo());

		return "egovframework/com/uss/ion/tir/EgovTwitterTrnsmit";
	}

	/**
	 * ?몄쐞?곕? ?≪떊???깅줉 泥섎━ ?쒕떎.
	 * @param searchVO 		-?몄쐞??Model
	 * @param commandMap 	-Request Variable
	 * @param twitterInfo 	-?몄쐞??Model
	 * @param request -HttpServletRequest 媛앹껜
	 * @param response -HttpServletResponse 媛앹껜
	 * @param model 		-Spring ?쒓났?섎뒗 ModelMap
	 * @return String 		-由ы꽩 URL
	 * @throws Exception	-Exception Throws
	 */
	@RequestMapping(value = "/uss/ion/tir/registTwitterTrnsmit.do", method = RequestMethod.POST)
	public String EgovTwitterTrnsmitPost(TwitterInfo twitterInfo, HttpServletRequest request,
			HttpServletResponse response, ModelMap model) throws Exception {

		String sCONSUMER_KEY = (String) WebUtils.getSessionAttribute(request, "sCONSUMER_KEY");
		String sCONSUMER_SECRET = (String) WebUtils.getSessionAttribute(request, "sCONSUMER_SECRET");

		String atoken = (String) WebUtils.getSessionAttribute(request, "atoken");
		String astoken = (String) WebUtils.getSessionAttribute(request, "astoken");

		HashMap<String, Object> hmParam = new HashMap<String, Object>();

		// ?몄쬆?ㅺ컪 ?ㅼ젙
		hmParam.put("sCONSUMER_KEY", sCONSUMER_KEY);
		hmParam.put("sCONSUMER_SECRET", sCONSUMER_SECRET);
		hmParam.put("atoken", atoken);
		hmParam.put("astoken", astoken);
		LOGGER.info("[Controller]===>>> atoken = " + atoken);
		LOGGER.info("[Controller]===>>> astoken = " + astoken);

		// ?몄쐞??湲 寃뚯떆
		CreateTweetResponse tweetResult = egovTwitterTrnsmitService.twitterTrnsmitRegist(hmParam,
				twitterInfo.getTwitterText());
		Map<?, ?> userResult = egovTwitterTrnsmitService.twitterUserAccount(hmParam); // ?좎??뺣낫

		twitterInfo.setTwitterTweetId(tweetResult.getId());
		twitterInfo.setTwitterText(tweetResult.getText());
		twitterInfo.setTwitterId((Long) userResult.get("userId"));
		twitterInfo.setTwitterScreenName(userResult.get("userScreenName").toString());
		twitterInfo.setTwitterNmae(userResult.get("userName").toString());
		twitterInfo.setTwitterCreatedAt((Date) userResult.get("userCreate_At"));
		twitterInfo.setTwitterProfileImageURL(userResult.get("userProfile_url").toString());

		model.addAttribute("twitterInfo", twitterInfo);

		return "egovframework/com/uss/ion/tir/EgovTwitterTrnsmitResult";
	}
	
	@RequestMapping(value = "/uss/ion/tir/twitterDelete.do")
	public String deleteTweet(@RequestParam("tweetID") String tID, HttpServletRequest request) throws Exception {

		tID = tID.replace("&quot;", "");
		LOGGER.info("?몄쐵 ?꾩씠??>>> " + tID);

		String sCONSUMER_KEY = (String) WebUtils.getSessionAttribute(request, "sCONSUMER_KEY");
		String sCONSUMER_SECRET = (String) WebUtils.getSessionAttribute(request, "sCONSUMER_SECRET");

		String atoken = (String) WebUtils.getSessionAttribute(request, "atoken");
		String astoken = (String) WebUtils.getSessionAttribute(request, "astoken");

		HashMap<String, Object> hmParam = new HashMap<String, Object>();

		// ?몄쬆?ㅺ컪 ?ㅼ젙
		hmParam.put("sCONSUMER_KEY", sCONSUMER_KEY);
		hmParam.put("sCONSUMER_SECRET", sCONSUMER_SECRET);
		hmParam.put("atoken", atoken);
		hmParam.put("astoken", astoken);
		
		boolean deleteResult = egovTwitterTrnsmitService.twitterDelete(hmParam, tID);

		LOGGER.info("?몄쐵 ??젣");
		LOGGER.info("DELETERESULT >>> " + deleteResult);
		
		return "egovframework/com/uss/ion/tir/EgovTwitterMain";

	}
}
