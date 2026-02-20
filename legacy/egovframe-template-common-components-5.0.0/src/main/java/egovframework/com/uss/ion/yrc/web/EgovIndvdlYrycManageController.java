package egovframework.com.uss.ion.yrc.web;

import java.util.List;

import org.egovframe.rte.fdl.string.EgovDateUtil;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.uss.ion.yrc.service.EgovIndvdlYrycManageService;
import egovframework.com.uss.ion.yrc.service.IndvdlYrycManage;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * 媛쒖슂
 * - 媛쒖씤?곗감愿由ъ뿉 ???controller ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - 媛쒖씤?곗감愿由ъ뿉 ????깅줉, ?섏젙, ??젣, 議고쉶 湲곕뒫???쒓났?쒕떎.
 * @author ?쒖??꾨젅?꾩썙?ъ꽱??
 * @version 1.0
 * @created 2014.11.14
 * <pre>
 * &lt;&lt; 媛쒖젙?대젰(Modification Information) &gt;&gt;
 *
 *     ?섏젙??     	?섏젙??         ?섏젙?댁슜
 *  -----------    --------    ---------------------------
 *   2014.11.14		?닿린??         理쒖큹 ?앹꽦
 *
 * </pre>
 */
@Controller
public class EgovIndvdlYrycManageController {

    @Resource(name = "egovIndvdlYrycManageService")
    private EgovIndvdlYrycManageService egovIndvdlYrycManageService;

    /**
     * 媛쒖씤?곗감愿由ъ젙蹂대? 愿由ы븯湲??꾪빐 ?깅줉??媛쒖씤?곗감愿由?紐⑸줉??議고쉶?쒕떎.
     *
     * @param IndvdlYrycManage - 媛쒖씤?곗감愿由?VO
     * @return String - 由ы꽩 Url
     */
    @IncludedInfo(name = "媛쒖씤?곗감愿由?, order = 902, gid = 50)
    @RequestMapping(value = "/uss/ion/yrc/EgovIndvdlYrycManageList.do")
    public String selectIndvdlYrycManageList(IndvdlYrycManage indvdlYrycManage, ModelMap model) throws Exception {

        LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
        if (user == null) {
            return "redirect:/uat/uia/egovLoginUsr.do";
        }

        indvdlYrycManage.setMberId(user.getUniqId());

        List<IndvdlYrycManage> resultList = egovIndvdlYrycManageService.selectIndvdlYrycManageList(indvdlYrycManage);
        model.addAttribute("resultList", resultList);

        return "egovframework/com/uss/ion/yrc/EgovIndvdlYrycManageList";
    }

    /**
     * 媛쒖씤蹂꾩뿰李④?由??깅줉 ?붾㈃?쇰줈 ?대룞?쒕떎.
     *
     * @param indvdlYrycManage - ?곗감愿由?model
     * @return String - 由ы꽩 Url
     */
    @RequestMapping(value = "/uss/ion/yrc/EgovIndvdlYrycRegist.do", method = RequestMethod.GET)
    public String insertViewIndvdlYrycManage(@ModelAttribute IndvdlYrycManage indvdlYrycManage, ModelMap model) throws Exception {

        LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
        indvdlYrycManage.setMberId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));
        indvdlYrycManage.setMberNm(user == null ? "" : EgovStringUtil.isNullToString(user.getName()));

        List<IndvdlYrycManage> resultList = egovIndvdlYrycManageService.selectIndvdlYrycManageList(indvdlYrycManage);
        indvdlYrycManage.setOccrrncYear(EgovDateUtil.getCurrentYearAsString());

        int totCnt = egovIndvdlYrycManageService.selectIndvdlYrycManageListTotCnt(indvdlYrycManage);

        model.addAttribute("resultList", resultList);
        model.addAttribute("totCnt", totCnt);

        return "egovframework/com/uss/ion/yrc/EgovIndvdlYrycRegist";
    }

    /**
     * 媛쒖씤蹂꾩뿰李④?由??깅줉?쒕떎.
     *
     * @param indvdlYrycManage - ?곗감愿由?model
     * @return String - 由ы꽩 Url
     */
    @RequestMapping(value = "/uss/ion/yrc/EgovIndvdlYrycRegist.do", method = RequestMethod.POST)
    public String insertIndvdlYrycManage(
		@Valid @ModelAttribute IndvdlYrycManage indvdlYrycManage,
		BindingResult bindingResult, ModelMap model) throws Exception {

        if (bindingResult.hasErrors()) {
            model.addAttribute("indvdlYrycManage", indvdlYrycManage);
            return "egovframework/com/uss/ion/yrc/EgovIndvdlYrycRegist";
        } else {
            LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
            indvdlYrycManage.setMberId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());
            indvdlYrycManage.setRemndrYrycCo(indvdlYrycManage.getOccrncYrycCo() - indvdlYrycManage.getUseYrycCo());

            int totCnt = egovIndvdlYrycManageService.selectIndvdlYrycManageListTotCnt(indvdlYrycManage);

            if (totCnt >= 1) {
                egovIndvdlYrycManageService.updtIndvdlYrycManage(indvdlYrycManage);
            } else {
                egovIndvdlYrycManageService.insertIndvdlYrycManage(indvdlYrycManage);
            }

            List<IndvdlYrycManage> resultList = egovIndvdlYrycManageService.selectIndvdlYrycManageList(indvdlYrycManage);
            model.addAttribute("resultList", resultList);
            model.addAttribute("totCnt", totCnt);

            return "egovframework/com/uss/ion/yrc/EgovIndvdlYrycManageList";
        }
    }

	/**
	 * 媛쒖씤蹂꾩뿰李④?由???젣?쒕떎.
	 * @param indvdlYrycManage - ?곗감愿由?model
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/uss/ion/yrc/deleteIndvdlYryc.do", method=RequestMethod.POST)
	public String deleteIndvdlYrycManage(IndvdlYrycManage indvdlYrycManage) throws Exception {

		LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
		indvdlYrycManage.setMberId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());

		int totCnt = egovIndvdlYrycManageService.selectIndvdlYrycManageListTotCnt(indvdlYrycManage);

		if (totCnt >= 1) {
			egovIndvdlYrycManageService.deleteIndvdlYrycManage(indvdlYrycManage);
		}

		return "egovframework/com/uss/ion/yrc/EgovIndvdlYrycManageList";
	}

}
