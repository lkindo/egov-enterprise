package egovframework.com.uss.olh.awm.web;

import java.util.List;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import egovframework.com.cmm.ComDefaultCodeVO;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.service.EgovCmmUseService;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.uss.olh.awm.service.AdministrationWordVO;
import egovframework.com.uss.olh.awm.service.EgovAdministrationWordService;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * ?됱젙?꾨Ц?⑹뼱?ъ쟾愿由щ? 泥섎━?섎뒗 Controller Class 援ы쁽
 * 
 * @author 怨듯넻?쒕퉬???λ룞??
 * @since 2009.07.03
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.07.03  ?λ룞??         理쒖큹 ?앹꽦
 *   2011.08.26  ?뺤쭊??         IncludedInfo annotation 異붽?
 *   2011.09.19  ?쒖???         ??젣 ??由ъ뒪???곸꽭議고쉶???ㅼ떆 ??젣?섎뒗 臾몄젣 ?섏젙
 *   2016.08.10  源?고샇          ?쒖??꾨젅?꾩썙??3.6
 *   2025.08.20  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(final???꾨땶 蹂?섎뒗 諛묒쨪???ы븿?????놁쓬)
 *
 *      </pre>
 */
@Controller
public class EgovAdministrationWordController {

	/** EgovMessageSource */
	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	/** egovOnlinePollService */
	@Resource(name = "EgovAdministrationWordService")
	private EgovAdministrationWordService egovAdministrationWordService;

	@Resource(name = "EgovCmmUseService")
	private EgovCmmUseService cmmUseService;

	/** EgovPropertyService */
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	/**
	 * ?됱젙?꾨Ц?⑹뼱?ъ쟾 紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param searchVO
	 * @param administrationWord
	 * @param model
	 * @return "egovframework/com/uss/olh/awm/EgovAdministrationWordList"
	 * @throws Exception
	 */
	@IncludedInfo(name = "?됱젙?꾨Ц?⑹뼱?ъ쟾", order = 560, gid = 50)
	@RequestMapping(value = "/uss/olh/awm/selectAdministrationWordList.do")
	public String egovAdministrationWordList(@ModelAttribute("searchVO") AdministrationWordVO searchVO, ModelMap model)
			throws Exception {

		/** EgovPropertyService.sample */
		searchVO.setPageUnit(propertiesService.getInt("pageUnit"));
		searchVO.setPageSize(propertiesService.getInt("pageSize"));

		/** pageing */
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(searchVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());
		paginationInfo.setPageSize(searchVO.getPageSize());

		searchVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		searchVO.setLastIndex(paginationInfo.getLastRecordIndex());
		searchVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		List<AdministrationWordVO> resultList = egovAdministrationWordService.selectAdministrationWordList(searchVO);
		model.addAttribute("resultList", resultList);

		int totCnt = egovAdministrationWordService.selectAdministrationWordListCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/uss/olh/awm/EgovAdministrationWordList";
	}

	/**
	 * ?됱젙?꾨Ц?⑹뼱?ъ쟾 紐⑸줉???곸꽭議고쉶 議고쉶?쒕떎.
	 * 
	 * @param searchVO
	 * @param administrationWord
	 * @param commandMap
	 * @param model
	 * @return "/uss/olh/awm/EgovAdministrationWordDetail"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/olh/awm/selectAdministrationWordDetail.do")
	public String selectAdministrationWordDetail(@ModelAttribute("searchVO") AdministrationWordVO searchVO,
			AdministrationWordVO administrationWord, ModelMap model) throws Exception {

		AdministrationWordVO result = egovAdministrationWordService.selectAdministrationWordDetail(administrationWord);
		model.addAttribute("result", result);

		return "egovframework/com/uss/olh/awm/EgovAdministrationWordDetail";
	}

	/**
	 * ?됱젙?꾨Ц?⑹뼱?ъ쟾愿由?紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param searchVO
	 * @param model
	 * @return "egovframework/com/uss/olh/awm/EgovAdministrationWordManageList"
	 * @throws Exception
	 */
	@IncludedInfo(name = "?됱젙?꾨Ц?⑹뼱?ъ쟾愿由?, order = 561, gid = 50)
	@RequestMapping(value = "/uss/olh/awm/selectAdministrationWordManageList.do")
	public String egovAdministrationWordManageList(@ModelAttribute("searchVO") AdministrationWordVO searchVO,
			ModelMap model) throws Exception {

		searchVO.setPageUnit(propertiesService.getInt("pageUnit"));
		searchVO.setPageSize(propertiesService.getInt("pageSize"));

		/** pageing */
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(searchVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());
		paginationInfo.setPageSize(searchVO.getPageSize());

		searchVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		searchVO.setLastIndex(paginationInfo.getLastRecordIndex());
		searchVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		List<AdministrationWordVO> resultList = egovAdministrationWordService.selectAdministrationWordList(searchVO);
		model.addAttribute("resultList", resultList);

		int totCnt = egovAdministrationWordService.selectAdministrationWordListCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/uss/olh/awm/EgovAdministrationWordManageList";
	}

	/**
	 * ?됱젙?꾨Ц?⑹뼱?ъ쟾愿由?紐⑸줉???곸꽭議고쉶 議고쉶?쒕떎.
	 * 
	 * @param searchVO
	 * @param administrationWord
	 * @param commandMap
	 * @param model
	 * @return "/uss/olh/awm/EgovAdministrationWordDetail"
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/olh/awm/selectAdministrationWordManageDetail.do")
	public String selectAdministrationWordManageDetail(@ModelAttribute("searchVO") AdministrationWordVO searchVO,
			AdministrationWordVO administrationWord, ModelMap model) throws Exception {

		AdministrationWordVO result = egovAdministrationWordService.selectAdministrationWordDetail(administrationWord);
		model.addAttribute("result", result);

		return "egovframework/com/uss/olh/awm/EgovAdministrationWordManageDetail";
	}

	/**
	 * ?됱젙?꾨Ц?⑹뼱?ъ쟾???깅줉?섍린 ?꾪븳 ??泥섎━(怨듯넻肄붾뱶 泥섎━)
	 * 
	 * @param searchVO
	 * @param model
	 * @return "/uss/olh/awm/EgovAdministrationWordRegist"
	 * @throws Exception
	 */
	@RequestMapping("/uss/olh/awm/insertAdministrationWordView.do")
	public String insertAdministrationWordView(@ModelAttribute("searchVO") AdministrationWordVO searchVO, Model model)
			throws Exception {

		// 怨듯넻肄붾뱶瑜?媛?몄삤湲??꾪븳 Vo
		ComDefaultCodeVO vo = new ComDefaultCodeVO();
		vo.setCodeId("COM102");

		List<?> wordSeCode = cmmUseService.selectCmmCodeDetail(vo);
		model.addAttribute("wordSeCode", wordSeCode);

		model.addAttribute("administrationWordVO", new AdministrationWordVO());

		return "egovframework/com/uss/olh/awm/EgovAdministrationWordRegist";

	}

	/**
	 * ?됱젙?꾨Ц?⑹뼱?ъ쟾???깅줉?쒕떎.
	 * 
	 * @param searchVO
	 * @param administrationWordVO
	 * @param bindingResult
	 * @return "forward:/uss/olh/awm/selectAdministrationWordManageList.do"
	 * @throws Exception
	 */
	@RequestMapping("/uss/olh/awm/insertAdministrationWord.do")
	public String insertAdministrationWord(@ModelAttribute("searchVO") AdministrationWordVO searchVO,
			@ModelAttribute("administrationWordVO") AdministrationWordVO administrationWordVO,
			BindingResult bindingResult) throws Exception {

		if (bindingResult.hasErrors()) {
			return "egovframework/com/uss/olh/awm/EgovAdministrationWordRegist";
		}

		// 濡쒓렇?퇦O?먯꽌 ?ъ슜???뺣낫 媛?몄삤湲?
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		String frstRegisterId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());

		administrationWordVO.setFrstRegisterId(frstRegisterId); // 理쒖큹?깅줉?륤D
		administrationWordVO.setLastUpdusrId(frstRegisterId); // 理쒖쥌?섏젙?륤D

		egovAdministrationWordService.insertAdministrationWord(administrationWordVO);

		return "forward:/uss/olh/awm/selectAdministrationWordManageList.do";
	}

	/**
	 * ?됱젙?꾨Ц?⑹뼱?ъ쟾???섏젙?섍린 ?꾪븳 ??泥섎━(怨듯넻肄붾뱶 泥섎━)
	 * 
	 * @param administWordId
	 * @param searchVO
	 * @param model
	 * @return "/uss/olh/hpc/EgovAdministrationWordUpdt"
	 * @throws Exception
	 */
	@RequestMapping("/uss/olh/awm/updateAdministrationWordView.do")
	public String updateAdministrationWordView(@RequestParam("administWordId") String administWordId,
			@ModelAttribute("searchVO") AdministrationWordVO searchVO, ModelMap model) throws Exception {

		// 怨듯넻肄붾뱶瑜?媛?몄삤湲??꾪븳 Vo
		ComDefaultCodeVO vo = new ComDefaultCodeVO();
		vo.setCodeId("COM102");

		List<?> wordSeCode = cmmUseService.selectCmmCodeDetail(vo);
		model.addAttribute("wordSeCode", wordSeCode);

		AdministrationWordVO administrationWordVO = new AdministrationWordVO();
		administrationWordVO.setAdministWordId(administWordId);

		model.addAttribute("administrationWordVO",
				egovAdministrationWordService.selectAdministrationWordDetail(administrationWordVO));

		return "egovframework/com/uss/olh/awm/EgovAdministrationWordUpdt";
	}

	/**
	 * ?됱젙?꾨Ц?⑹뼱?ъ쟾???섏젙?쒕떎.
	 * 
	 * @param searchVO
	 * @param administrationWordVO
	 * @param bindingResult
	 * @return "forward:/uss/olh/awm/selectAdministrationWordManageList.do"
	 * @throws Exception
	 */
	@RequestMapping("/uss/olh/awm/updateAdministrationWord.do")
	public String updateAdministrationWord(@ModelAttribute("searchVO") AdministrationWordVO searchVO,
			@ModelAttribute("administrationWordVO") AdministrationWordVO administrationWordVO,
			BindingResult bindingResult) throws Exception {

		if (bindingResult.hasErrors()) {
			return "egovframework/com/uss/olh/awm/EgovAdministrationWordUpdt";
		}

		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		String lastUpdusrId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());

		administrationWordVO.setLastUpdusrId(lastUpdusrId); // 理쒖쥌?섏젙?륤D
		egovAdministrationWordService.updateAdministrationWord(administrationWordVO);

		return "forward:/uss/olh/awm/selectAdministrationWordManageList.do";

	}

	/**
	 * ?됱젙?꾨Ц?⑹뼱?ъ쟾????젣?쒕떎.
	 * 
	 * @param hpcmVO
	 * @param searchVO
	 * @return "forward:/uss/olh/awm/selectAdministrationWordManageList.do"
	 * @throws Exception
	 */
	@RequestMapping("/uss/olh/awm/deleteAdministrationWord.do")
	public String deleteAdministrationWord(AdministrationWordVO administrationWordVO,
			@ModelAttribute("searchVO") AdministrationWordVO searchVO) throws Exception {

		egovAdministrationWordService.deleteAdministrationWord(administrationWordVO);

		return "forward:/uss/olh/awm/selectAdministrationWordManageList.do";
	}

}
