/**
 * 媛쒖슂
 * - ?ъ슜?먮??ъ뿉 ???controller ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?ъ슜?먮??ъ뿉 ????깅줉, ?섏젙, ??젣, 議고쉶, 諛섏쁺?뺤씤 湲곕뒫???쒓났?쒕떎.
 * - ?ъ슜?먮??ъ쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author ?대Ц以
 * @version 1.0
 * @created 03-8-2009 ?ㅽ썑 2:09:35
 *  <pre>
 * &lt;&lt; 媛쒖젙?대젰(Modification Information) &gt;&gt;
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.8.03  ?대Ц以          理쒖큹 ?앹꽦
 *   2011.8.26	?뺤쭊??		IncludedInfo annotation 異붽?
 *
 * </pre>
 */

package egovframework.com.uss.ion.uas.web;

import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.uss.ion.uas.service.EgovUserAbsnceService;
import egovframework.com.uss.ion.uas.service.UserAbsnce;
import egovframework.com.uss.ion.uas.service.UserAbsnceVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

@Controller
public class EgovUserAbsnceController {

	@Resource(name="egovMessageSource")
    EgovMessageSource egovMessageSource;

    @Resource(name = "egovUserAbsnceService")
    private EgovUserAbsnceService egovUserAbsnceService;

    /**
	 * ?ъ슜?먮???紐⑸줉?붾㈃ ?대룞
	 * @return String
	 * @exception Exception
	 */
    @IncludedInfo(name="?ъ슜?먮??ш?由?, order = 790 ,gid = 50)
    @RequestMapping("/uss/ion/uas/selectUserAbsnceListView.do")
    public String selectUserAbsnceListView() throws Exception {

        return "egovframework/com/uss/ion/uas/EgovUserAbsnceList";
    }

	/**
	 * ?ъ슜?먮??ъ젙蹂대? 愿由ы븯湲??꾪빐 ?깅줉???ъ슜?먮???紐⑸줉??議고쉶?쒕떎.
	 * @param userAbsnceVO - ?ъ슜?먮???VO
	 * @return String - 由ы꽩 Url
	 */
    @RequestMapping("/uss/ion/uas/selectUserAbsnceList.do")
	public String selectUserAbsnceList(@RequestParam("selAbsnceAt") String selAbsnceAt,
			                           @ModelAttribute("userAbsnceVO") UserAbsnceVO userAbsnceVO,
			                            ModelMap model) throws Exception {

    	/** paging */
    	PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(userAbsnceVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(userAbsnceVO.getPageUnit());
		paginationInfo.setPageSize(userAbsnceVO.getPageSize());

		userAbsnceVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		userAbsnceVO.setLastIndex(paginationInfo.getLastRecordIndex());
		userAbsnceVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		userAbsnceVO.setSelAbsnceAt(selAbsnceAt);
		userAbsnceVO.setUserAbsnceList(egovUserAbsnceService.selectUserAbsnceList(userAbsnceVO));

		model.addAttribute("userAbsnceList", userAbsnceVO.getUserAbsnceList());

        int totCnt = egovUserAbsnceService.selectUserAbsnceListTotCnt(userAbsnceVO);
		paginationInfo.setTotalRecordCount(totCnt);
        model.addAttribute("paginationInfo", paginationInfo);

        model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

        return "egovframework/com/uss/ion/uas/EgovUserAbsnceList";
	}

	/**
	 * ?깅줉???ъ슜?먮????곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param userAbsnceVO - ?ъ슜?먮???VO
	 * @return String - 由ы꽩 Url
	 */
    @RequestMapping("/uss/ion/uas/getUserAbsnce.do")
	public String selectUserAbsnce(@RequestParam("userId") String userId,
			                       @ModelAttribute("userAbsnceVO") UserAbsnceVO userAbsnceVO,
			                       ModelMap model) throws Exception {

		userAbsnceVO.setUserId(userId);
		model.addAttribute("userAbsnce", egovUserAbsnceService.selectUserAbsnce(userAbsnceVO));
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		UserAbsnceVO vo = (UserAbsnceVO)model.get("userAbsnce");

		if(vo.getRegYn().equals("N")) {
			return "egovframework/com/uss/ion/uas/EgovUserAbsnceRegist";
		} else {
			return "egovframework/com/uss/ion/uas/EgovUserAbsnceUpdt";
		}
	}

	/**
	 * ?ъ슜?먮??ъ젙蹂대? ?좉퇋濡??깅줉?쒕떎.
	 * @param userAbsnce - ?ъ슜?먮???model
	 * @return String - 由ы꽩 Url
	 */
    @RequestMapping("/uss/ion/uas/addViewUserAbsnce.do")
	public String insertUserAbsnceView(@RequestParam("userId") String userId,
			                           @ModelAttribute("userAbsnceVO") UserAbsnceVO userAbsnceVO,
			                            ModelMap model) throws Exception {
    	userAbsnceVO.setUserId(userId);
    	model.addAttribute("userAbsnce", egovUserAbsnceService.selectUserAbsnce(userAbsnceVO));
    	model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

//		return "egovframework/com/uss/ion/uas/EgovUserAbsnceRegist";
		return "forward:/uss/ion/uas/selectUserAbsnceList.do";

	}

	/**
	 * ?ъ슜?먮??ъ젙蹂대? ?좉퇋濡??깅줉?쒕떎.
	 * @param userAbsnce - ?ъ슜?먮???model
	 * @return String - 由ы꽩 Url
	 */
    @RequestMapping("/uss/ion/uas/addUserAbsnce.do")
	public String insertUserAbsnce(@Valid @ModelAttribute("userAbsnce") UserAbsnce userAbsnce,
			                       @ModelAttribute("userAbsnceVO") UserAbsnceVO userAbsnceVO,
		                            BindingResult bindingResult,
			                        ModelMap model) throws Exception {

    	if (bindingResult.hasErrors()) {
    		model.addAttribute("userAbsnceVO", userAbsnceVO);
			return "egovframework/com/uss/ion/msi/EgovMainImageRegist";
		} else {
	   	    LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
	   	    userAbsnce.setLastUpdusrId(user == null ? "" : EgovStringUtil.isNullToString(user.getId()));

	   	    model.addAttribute("userAbsnce", egovUserAbsnceService.insertUserAbsnce(userAbsnce, userAbsnceVO));
			model.addAttribute("message", egovMessageSource.getMessage("success.common.insert"));

//			return "egovframework/com/uss/ion/uas/EgovUserAbsnceUpdt";
			return "forward:/uss/ion/uas/selectUserAbsnceList.do";
		}
	}

	/**
	 * 湲??깅줉???ъ슜?먮??ъ젙蹂대? ?섏젙?쒕떎.
	 * @param userAbsnce - ?ъ슜?먮???model
	 * @return String - 由ы꽩 Url
	 */
    @RequestMapping("/uss/ion/uas/updtUserAbsnce.do")
	public String updateUserAbsnce(@Valid @ModelAttribute("userAbsnce") UserAbsnce userAbsnce,
			                        BindingResult bindingResult,
			                        ModelMap model) throws Exception {

    	if (bindingResult.hasErrors()) {
    		model.addAttribute("userAbsnceVO", userAbsnce);
			return "egovframework/com/uss/ion/uas/EgovUserAbsnceUpdt";
		} else {

	    	LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
	   	    userAbsnce.setLastUpdusrId(user == null ? "" : EgovStringUtil.isNullToString(user.getId()));

	    	egovUserAbsnceService.updateUserAbsnce(userAbsnce);
//	    	return "forward:/uss/ion/uas/getUserAbsnce.do";
			return "forward:/uss/ion/uas/selectUserAbsnceList.do";
		}
	}

	/**
	 * 湲??깅줉???ъ슜?먮??ъ젙蹂대? ??젣?쒕떎.
	 * @param userAbsnce - ?ъ슜?먮???model
	 * @return String - 由ы꽩 Url
	 */
    @RequestMapping("/uss/ion/uas/removeUserAbsnce.do")
	public String deleteUserAbsnce(@ModelAttribute("userAbsnce") UserAbsnce userAbsnce,
                                    ModelMap model) throws Exception {

		egovUserAbsnceService.deleteUserAbsnce(userAbsnce);
    	model.addAttribute("message", egovMessageSource.getMessage("success.common.delete"));
		return "forward:/uss/ion/uas/selectUserAbsnceList.do";
	}

	/**
	 * 湲??깅줉???ъ슜?먮??ъ젙蹂대? ??젣?쒕떎.
	 * @param userAbsnce - ?ъ슜?먮???model
	 * @return String - 由ы꽩 Url
	 */
    @RequestMapping("/uss/ion/uas/removeUserAbsnceList.do")
	public String deleteUserAbsnceList(@RequestParam("userIds") String userIds ,
			                           @ModelAttribute("userAbsnce") UserAbsnce userAbsnce,
			                           ModelMap model) throws Exception {

    	String [] strUserIds = userIds.split(";");

    	for (String strUserId : strUserIds) {
    		userAbsnce.setUserId(strUserId);
    		egovUserAbsnceService.deleteUserAbsnce(userAbsnce);
    	}

    	model.addAttribute("message", egovMessageSource.getMessage("success.common.delete"));
		return "forward:/uss/ion/uas/selectUserAbsnceList.do";
	}

	/**
	 * MyPage???ъ슜?먮??ъ젙蹂대? ?쒓났?섍린 ?꾪빐 紐⑸줉??議고쉶?쒕떎.
	 * @param userAbsnceVO - ?ъ슜?먮???VO
	 * @return String - 由ы꽩 Url
	 */
    @RequestMapping("/uss/ion/uas/selectUserAbsnceMainList.do")
	public String selectUserAbsnceMainList(@ModelAttribute("userAbsnceVO") UserAbsnceVO userAbsnceVO,
			                                ModelMap model) throws Exception {

    	/** paging */
    	PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(userAbsnceVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(5);
		paginationInfo.setPageSize(userAbsnceVO.getPageSize());

		userAbsnceVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		userAbsnceVO.setLastIndex(paginationInfo.getLastRecordIndex());
		userAbsnceVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		userAbsnceVO.setSelAbsnceAt("A");
		userAbsnceVO.setUserAbsnceList(egovUserAbsnceService.selectUserAbsnceList(userAbsnceVO));

		model.addAttribute("userAbsnceList", userAbsnceVO.getUserAbsnceList());

        return "egovframework/com/uss/ion/uas/EgovUserAbsnceMainList";
	}
}
