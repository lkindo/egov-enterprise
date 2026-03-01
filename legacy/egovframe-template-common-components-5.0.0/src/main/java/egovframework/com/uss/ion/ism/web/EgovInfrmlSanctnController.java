package egovframework.com.uss.ion.ism.web;
import java.util.Map;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;

import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.uss.ion.ism.service.EgovInfrmlSanctnService;
import egovframework.com.uss.ion.ism.service.InfrmlSanctn;
import egovframework.com.uss.ion.ism.service.SanctnerVO;
import jakarta.annotation.Resource;

/**
 * 媛쒖슂
 * - ?쎌떇寃곗옱愿由ъ뿉 ???controller ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?쎌떇寃곗옱愿由ъ뿉 ????깅줉, ?뱀씤, 諛섎젮, ??젣湲곕뒫???쒓났?쒕떎.
 * - 寃곗옱?먯뿉 ???紐⑸줉議고쉶湲곕뒫???쒓났?쒕떎.
 * @author ?μ쿋??
 * @version 1.0
 * @created 28-6-2010 ?ㅼ쟾 11:29:25
 */

@Controller
public class EgovInfrmlSanctnController {

	@Resource(name="EgovInfrmlSanctnService")
    protected EgovInfrmlSanctnService infrmlSanctnService;

	@Resource(name="propertiesService")
    protected EgovPropertyService propertyService;

    @Resource(name="egovMessageSource")
    EgovMessageSource egovMessageSource;

	/**
	 * 寃곗옱???뺣낫??????앹뾽 紐⑸줉??議고쉶?쒕떎.
	 * @param SanctnerVO
	 * @return  String
	 *
	 * @param sanctnerVO
	 */
	@RequestMapping("/uss/ion/ism/selectSanctnerListPopup.do")
	public String selectSanctnerListPopup(@ModelAttribute("searchVO") SanctnerVO sanctnerVO, ModelMap model) throws Exception{
		return "egovframework/com/uss/ion/ism/EgovSanctnerListPopup";
	}

	/**
	 * 寃곗옱???뺣낫?????紐⑸줉??議고쉶?쒕떎.
	 * @param SanctnerVO
	 * @return  String
	 *
	 * @param sanctnerVO
	 */
	@RequestMapping("/uss/ion/ism/selectSanctnerList.do")
	public String selectSanctnerList(@ModelAttribute("searchVO") SanctnerVO sanctnerVO, ModelMap model) throws Exception{
		//LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();

		//sanctnerVO.setUniqId(user.getUniqId());

		sanctnerVO.setPageUnit(propertyService.getInt("pageUnit"));
		sanctnerVO.setPageSize(propertyService.getInt("pageSize"));

		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(sanctnerVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(sanctnerVO.getPageUnit());
		paginationInfo.setPageSize(sanctnerVO.getPageSize());

		sanctnerVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		sanctnerVO.setLastIndex(paginationInfo.getLastRecordIndex());
		sanctnerVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		Map<String, Object> map = infrmlSanctnService.selectSanctnerList(sanctnerVO);
		int totCnt = Integer.parseInt((String)map.get("resultCnt"));
		paginationInfo.setTotalRecordCount(totCnt);

		model.addAttribute("resultList", map.get("resultList"));
		model.addAttribute("resultCnt", map.get("resultCnt"));
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/uss/ion/ism/EgovSanctnerList";
	}

	/**
	 * 寃곗옱???뺣낫?????紐⑸줉??議고쉶?쒕떎. Old ??젣 ??諛섏쁺
	 * @param SanctnerVO
	 * @return  String
	 *
	 * @param sanctnerVO
	 */
	@RequestMapping("/uss/ion/ism/selectSanctnerListNew.do")
	public String selectSanctnerListNew(@ModelAttribute("searchVO") SanctnerVO sanctnerVO, ModelMap model) throws Exception{
		//LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();

		//sanctnerVO.setUniqId(user.getUniqId());

		sanctnerVO.setPageUnit(propertyService.getInt("pageUnit"));
		sanctnerVO.setPageSize(propertyService.getInt("pageSize"));

		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(sanctnerVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(sanctnerVO.getPageUnit());
		paginationInfo.setPageSize(sanctnerVO.getPageSize());

		sanctnerVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		sanctnerVO.setLastIndex(paginationInfo.getLastRecordIndex());
		sanctnerVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		Map<String, Object> map = infrmlSanctnService.selectSanctnerList(sanctnerVO);
		int totCnt = Integer.parseInt((String)map.get("resultCnt"));
		paginationInfo.setTotalRecordCount(totCnt);

		model.addAttribute("resultList", map.get("resultList"));
		model.addAttribute("resultCnt", map.get("resultCnt"));
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/uss/ion/ism/EgovSanctnerListNew";
	}

	/**
	 * ?쎌떇寃곗옱 ?뺣낫???곸꽭?붾㈃?쇰줈 ?대룞?쒕떎.
	 * @param InfrmlSanctn
	 * @return  String
	 *
	 * @param InfrmlSanctn
	 */
	@RequestMapping("/uss/ion/ism/selectInfrmlSanctn.do")
	public String selectInfrmlSanctn(
			@ModelAttribute("infrmlSanctn") InfrmlSanctn infrmlSanctn, ModelMap model) throws Exception{
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
    	Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
    	if(!isAuthenticated) {
    		model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
        	return "redirect:/uat/uia/egovLoginUsr.do";
    	}

    	if(infrmlSanctn.getInfrmlSanctnId() != null){
    		if(infrmlSanctn.getInfrmlSanctnId().indexOf(",") > 0){
    			infrmlSanctn.setInfrmlSanctnId(infrmlSanctn.getInfrmlSanctnId().substring(0, infrmlSanctn.getInfrmlSanctnId().indexOf(",")));
    		}
    	}

    	model.addAttribute("infrmlSanctnVO", infrmlSanctnService.selectInfrmlSanctn(infrmlSanctn));

		return "egovframework/com/uss/ion/ism/EgovInfrmlSanctnDetail";
	}

	/**
	 * ?쎌떇寃곗옱 諛섎젮泥섎━ ?붾㈃???몄텧?쒕떎.
	 * @param
	 * @return  String
	 *
	 * @param
	 */
	@RequestMapping("/uss/ion/ism/EgovReturnPopup.do")
	public String selectReturnPopup() throws Exception{
		return "egovframework/com/uss/ion/ism/EgovReturnPopup";
	}

	/**
	 * ?쎌떇寃곗옱 ?뱀씤泥섎━ ?붾㈃???몄텧?쒕떎.
	 * @param
	 * @return  String
	 *
	 * @param
	 */
	@RequestMapping("/uss/ion/ism/EgovConfmPopup.do")
	public String selectConfmPopup() throws Exception{
		return "egovframework/com/uss/ion/ism/EgovConfmPopup";
	}

	/**
	 * ?쎌떇寃곗옱 諛섎젮泥섎━ ?붾㈃???몄텧?쒕떎. Old ??젣 ??諛섏쁺
	 * @param
	 * @return  String
	 *
	 * @param
	 */
	@RequestMapping("/uss/ion/ism/EgovReturnPopupNew.do")
	public String selectReturnPopupNew() throws Exception{
		return "egovframework/com/uss/ion/ism/EgovReturnPopupNew";
	}

	/**
	 * ?쎌떇寃곗옱 ?뱀씤泥섎━ ?붾㈃???몄텧?쒕떎. Old ??젣 ??諛섏쁺
	 * @param
	 * @return  String
	 *
	 * @param
	 */
	@RequestMapping("/uss/ion/ism/EgovConfmPopupNew.do")
	public String selectConfmPopupNew() throws Exception{
		return "egovframework/com/uss/ion/ism/EgovConfmPopupNew";
	}

}
