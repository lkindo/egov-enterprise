package egovframework.com.cop.sms.web;

import java.util.Map;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.support.SessionStatus;

import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.cop.sms.service.EgovSmsInfoService;
import egovframework.com.cop.sms.service.Sms;
import egovframework.com.cop.sms.service.SmsVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * 臾몄옄硫붿떆吏 ?쒕퉬??而⑦듃濡ㅻ윭 ?대옒??
 * @author 怨듯넻而댄룷?뚰듃媛쒕컻? ?쒖꽦怨?
 * @since 2009.06.18
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.06.18 ?쒖꽦怨?         理쒖큹 ?앹꽦
 *   2011.8.26	?뺤쭊??		IncludedInfo annotation 異붽?
 *
 * </pre>
 */

@Controller
public class EgovSmsInfoController {

	@Resource(name = "EgovSmsInfoService")
	protected EgovSmsInfoService smsInfoService;

	@Resource(name = "propertiesService")
	protected EgovPropertyService propertyService;

	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	//private static final Logger LOGGER = LoggerFactory.getLogger(EgovSmsInfoController.class);

	/**
	 * 臾몄옄硫붿떆吏 紐⑸줉??議고쉶?쒕떎.
	 *
	 * @param smsVO
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@IncludedInfo(name = "臾몄옄硫붿떆吏", order = 310, gid = 40)
	@RequestMapping("/cop/sms/selectSmsList.do")
	public String selectSmsList(@ModelAttribute("searchVO") SmsVO smsVO, ModelMap model) throws Exception {
		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
   	 	// KISA 蹂댁븞痍⑥빟??議곗튂 (2018-12-10, ?좎슜??
        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

        if(!isAuthenticated) {
            return "redirect:/uat/uia/egovLoginUsr.do";
        }

		smsVO.setUniqId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));

		smsVO.setPageUnit(propertyService.getInt("pageUnit"));
		smsVO.setPageSize(propertyService.getInt("pageSize"));

		PaginationInfo paginationInfo = new PaginationInfo();

		paginationInfo.setCurrentPageNo(smsVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(smsVO.getPageUnit());
		paginationInfo.setPageSize(smsVO.getPageSize());

		smsVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		smsVO.setLastIndex(paginationInfo.getLastRecordIndex());
		smsVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		Map<String, Object> map = smsInfoService.selectSmsInfs(smsVO);
		int totCnt = Integer.parseInt((String) map.get("resultCnt"));

		paginationInfo.setTotalRecordCount(totCnt);

		model.addAttribute("resultList", map.get("resultList"));
		model.addAttribute("resultCnt", map.get("resultCnt"));
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/cop/sms/EgovSmsInfoList";
	}

	/**
	 * 臾몄옄硫붿떆吏 ?꾩넚(?깅줉)???꾪븳 ?꾩넚 ?섏씠吏濡??대룞?쒕떎.
	 *
	 * @param smsVO
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping("/cop/sms/addSms.do")
	public String addSms(@ModelAttribute("searchVO") SmsVO smsVO, ModelMap model) throws Exception {

		Sms sms = new Sms();

		model.addAttribute("sms", sms);

		return "egovframework/com/cop/sms/EgovSmsInfoRegist";
	}

	/**
	 * 臾몄옄硫붿떆吏 ?꾩넚???붿껌?쒕떎.
	 *
	 * @param smsVO
	 * @param sms
	 * @param bindingResult
	 * @param status
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping("/cop/sms/insertSms.do")
	public String insertSms(@ModelAttribute("searchVO") SmsVO smsVO, @Valid @ModelAttribute("sms") Sms sms, BindingResult bindingResult, SessionStatus status, ModelMap model)
			throws Exception {

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (bindingResult.hasErrors()) {
			return "egovframework/com/cop/sms/EgovSmsInfoRegist";
		}

		// ?쒕쾭 ?먭? 異붽?
		/*
		if (true) {
		    model.addAttribute("msg", "?쒕쾭????곌껐???뺤긽?곸씠吏 ?딆뒿?덈떎.");
		    return "egovframework/com/cop/sms/EgovSmsInfoRegist";
		}
		*/

		if (isAuthenticated) {
			sms.setFrstRegisterId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));

			smsInfoService.insertSmsInf(sms);
		}

		return "forward:/cop/sms/selectSmsList.do";
	}

	/**
	 * 臾몄옄硫붿떆吏??????곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 *
	 * @param smsVO
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping("/cop/sms/selectSms.do")
	public String selectSms(@ModelAttribute("searchVO") SmsVO smsVO, ModelMap model) throws Exception {
		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
   	 	// KISA 蹂댁븞痍⑥빟??議곗튂 (2018-12-10, ?좎슜??
        Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

        if(!isAuthenticated) {
            return "redirect:/uat/uia/egovLoginUsr.do";
        }

		SmsVO vo = smsInfoService.selectSmsInf(smsVO);

		model.addAttribute("sessionUniqId", user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));
		model.addAttribute("result", vo);

		return "egovframework/com/cop/sms/EgovSmsInfoDetail";
	}
}
