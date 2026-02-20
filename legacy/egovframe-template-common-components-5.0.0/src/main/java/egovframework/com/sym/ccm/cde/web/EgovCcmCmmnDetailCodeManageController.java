package egovframework.com.sym.ccm.cde.web;

import java.util.List;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;

import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.service.CmmnDetailCode;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.sym.ccm.cca.service.CmmnCodeVO;
import egovframework.com.sym.ccm.cca.service.EgovCcmCmmnCodeManageService;
import egovframework.com.sym.ccm.ccc.service.CmmnClCodeVO;
import egovframework.com.sym.ccm.ccc.service.EgovCcmCmmnClCodeManageService;
import egovframework.com.sym.ccm.cde.service.CmmnDetailCodeVO;
import egovframework.com.sym.ccm.cde.service.EgovCcmCmmnDetailCodeManageService;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * 怨듯넻?곸꽭肄붾뱶??愿???붿껌??諛쏆븘 ?쒕퉬???대옒?ㅻ줈 ?붿껌???꾨떖?섍퀬 ?쒕퉬?ㅽ겢?섏뒪?먯꽌 泥섎━??寃곌낵瑜????붾㈃?쇰줈 ?꾨떖???꾪븳
 * Controller瑜??뺤쓽?쒕떎
 * 
 * @author 怨듯넻?쒕퉬??媛쒕컻? ?댁쨷??
 * @since 2009.04.01
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.03.20  ?띻만??         理쒖큹 ?앹꽦
 *   2009.04.01  ?댁쨷??         理쒖큹 ?앹꽦
 *   2011.08.26  ?뺤쭊??         IncludedInfo annotation 異붽?
 *   2017.08.08  ?댁젙?          ?쒖??꾨젅?꾩썙??v3.7 媛쒖꽑
 *   2024.10.29  ?대갚??         寃?됱“嫄??좎?
 *   2025.07.08  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(final???꾨땶 蹂?섎뒗 諛묒쨪???ы븿?????놁쓬)
 *
 *      </pre>
 */
@Controller
public class EgovCcmCmmnDetailCodeManageController {

	@Resource(name = "CmmnDetailCodeManageService")
	private EgovCcmCmmnDetailCodeManageService cmmnDetailCodeManageService;

	@Resource(name = "CmmnClCodeManageService")
	private EgovCcmCmmnClCodeManageService cmmnClCodeManageService;

	@Resource(name = "CmmnCodeManageService")
	private EgovCcmCmmnCodeManageService cmmnCodeManageService;

	/** EgovPropertyService */
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	/** EgovMessageSource */
	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	/**
	 * 怨듯넻?곸꽭肄붾뱶 紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param loginVO
	 * @param searchVO
	 * @param model
	 * @return "egovframework/com/sym/ccm/cde/EgovCcmCmmnDetailCodeList"
	 * @throws Exception
	 */
	@IncludedInfo(name = "怨듯넻?곸꽭肄붾뱶", listUrl = "/sym/ccm/cde/SelectCcmCmmnDetailCodeList.do", order = 970, gid = 60)
	@RequestMapping(value = "/sym/ccm/cde/SelectCcmCmmnDetailCodeList.do")
	public String selectCmmnDetailCodeList(@ModelAttribute("loginVO") LoginVO loginVO,
			@ModelAttribute("searchVO") CmmnDetailCodeVO searchVO, ModelMap model) throws Exception {

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

		List<CmmnDetailCodeVO> resultList = cmmnDetailCodeManageService.selectCmmnDetailCodeList(searchVO);
		model.addAttribute("resultList", resultList);

		int totCnt = cmmnDetailCodeManageService.selectCmmnDetailCodeListTotCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/sym/ccm/cde/EgovCcmCmmnDetailCodeList";
	}

	/**
	 * 怨듯넻?곸꽭肄붾뱶 ?곸꽭??ぉ??議고쉶?쒕떎.
	 * 
	 * @param loginVO
	 * @param cmmnDetailCodeVO
	 * @param model
	 * @return "egovframework/com/sym/ccm/cde/EgovCcmCmmnDetailCodeDetail"
	 * @throws Exception
	 */
	@RequestMapping(value = "/sym/ccm/cde/SelectCcmCmmnDetailCodeDetail.do")
	public String selectCmmnDetailCodeDetail(@ModelAttribute("loginVO") LoginVO loginVO,
			CmmnDetailCodeVO cmmnDetailCodeVO, ModelMap model) throws Exception {
		CmmnDetailCode vo = cmmnDetailCodeManageService.selectCmmnDetailCodeDetail(cmmnDetailCodeVO);
		model.addAttribute("result", vo);

		return "egovframework/com/sym/ccm/cde/EgovCcmCmmnDetailCodeDetail";
	}

	/**
	 * 怨듯넻?곸꽭肄붾뱶瑜???젣?쒕떎.
	 * 
	 * @param loginVO
	 * @param cmmnDetailCodeVO
	 * @param model
	 * @return "forward:/sym/ccm/cde/EgovCcmCmmnDetailCodeList.do"
	 * @throws Exception
	 */
	@RequestMapping(value = "/sym/ccm/cde/RemoveCcmCmmnDetailCode.do")
	public String deleteCmmnDetailCode(@ModelAttribute("loginVO") LoginVO loginVO, CmmnDetailCodeVO cmmnDetailCodeVO,
			ModelMap model) throws Exception {
		cmmnDetailCodeManageService.deleteCmmnDetailCode(cmmnDetailCodeVO);

		model.addAttribute("searchCondition", cmmnDetailCodeVO.getSearchCondition());
		model.addAttribute("searchKeyword", cmmnDetailCodeVO.getSearchKeyword());
		model.addAttribute("pageIndex", cmmnDetailCodeVO.getPageIndex());

		return "redirect:/sym/ccm/cde/SelectCcmCmmnDetailCodeList.do";
	}

	/**
	 * 怨듯넻?곸꽭肄붾뱶 ?깅줉???꾪븳 ?깅줉?섏씠吏濡??대룞?쒕떎.
	 *
	 * @param cmmnDetailCodeVO
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping("/sym/ccm/cde/RegistCcmCmmnDetailCodeView.do")
	public String insertCmmnDetailCodeView(@ModelAttribute("loginVO") LoginVO loginVO,
			@ModelAttribute("cmmnCodeVO") CmmnCodeVO cmmnCodeVO,
			@ModelAttribute("cmmnDetailCodeVO") CmmnDetailCodeVO cmmnDetailCodeVO, ModelMap model) throws Exception {

		CmmnClCodeVO searchClCodeVO = new CmmnClCodeVO();
		searchClCodeVO.setFirstIndex(0);
		List<CmmnClCodeVO> clCodeList = cmmnClCodeManageService.selectCmmnClCodeList(searchClCodeVO);
		model.addAttribute("clCodeList", clCodeList);

		CmmnCodeVO clCode = new CmmnCodeVO();
		clCode.setClCode(cmmnCodeVO.getClCode());

		if (!cmmnCodeVO.getClCode().equals("")) {

			CmmnCodeVO searchCodeVO = new CmmnCodeVO();
			searchCodeVO.setRecordCountPerPage(999999);
			searchCodeVO.setFirstIndex(0);
			searchCodeVO.setSearchCondition("clCode");
			searchCodeVO.setSearchKeyword(cmmnCodeVO.getClCode());

			List<CmmnCodeVO> codeList = cmmnCodeManageService.selectCmmnCodeList(searchCodeVO);
			model.addAttribute("codeList", codeList);
		}

		return "egovframework/com/sym/ccm/cde/EgovCcmCmmnDetailCodeRegist";
	}

	/**
	 * 怨듯넻?곸꽭肄붾뱶瑜??깅줉?쒕떎.
	 *
	 * @param CmmnDetailCodeVO
	 * @param CmmnDetailCodeVO
	 * @param status
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping("/sym/ccm/cde/RegistCcmCmmnDetailCode.do")
	public String insertCmmnDetailCode(@ModelAttribute("cmmnDetailCodeVO") CmmnDetailCodeVO cmmnDetailCodeVO,
			BindingResult bindingResult, ModelMap model) throws Exception {

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		CmmnClCodeVO searchClCodeVO = new CmmnClCodeVO();
		searchClCodeVO.setFirstIndex(0);

		if (bindingResult.hasErrors()) {

			List<CmmnClCodeVO> clCodeList = cmmnClCodeManageService.selectCmmnClCodeList(searchClCodeVO);
			model.addAttribute("clCodeList", clCodeList);

			return "egovframework/com/sym/ccm/cde/EgovCcmCmmnDetailCodeRegist";
		}

		if (cmmnDetailCodeVO.getCodeId() != null) {

			CmmnDetailCode vo = cmmnDetailCodeManageService.selectCmmnDetailCodeDetail(cmmnDetailCodeVO);
			if (vo != null) {
				model.addAttribute("message", egovMessageSource.getMessage("comSymCcmCde.validate.codeCheck"));

				List<CmmnClCodeVO> clCodeList = cmmnClCodeManageService.selectCmmnClCodeList(searchClCodeVO);
				model.addAttribute("clCodeList", clCodeList);

				return "egovframework/com/sym/ccm/cde/EgovCcmCmmnDetailCodeRegist";
			}
		}

		cmmnDetailCodeVO.setFrstRegisterId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());
		cmmnDetailCodeManageService.insertCmmnDetailCode(cmmnDetailCodeVO);

		model.addAttribute("searchCondition", cmmnDetailCodeVO.getSearchCondition());
		model.addAttribute("searchKeyword", cmmnDetailCodeVO.getSearchKeyword());
		model.addAttribute("pageIndex", cmmnDetailCodeVO.getPageIndex());

		return "redirect:/sym/ccm/cde/SelectCcmCmmnDetailCodeList.do";
	}

	/**
	 * 怨듯넻?곸꽭肄붾뱶 ?섏젙???꾪븳 ?섏젙?섏씠吏濡??대룞?쒕떎.
	 *
	 * @param cmmnDetailCodeVO
	 * @param model
	 * @return "egovframework/com/sym/ccm/cde/EgovCcmCmmnDetailCodeUpdt"
	 * @throws Exception
	 */
	@RequestMapping("/sym/ccm/cde/UpdateCcmCmmnDetailCodeView.do")
	public String updateCmmnDetailCodeView(@ModelAttribute("loginVO") LoginVO loginVO,
			@ModelAttribute("cmmnDetailCodeVO") CmmnDetailCodeVO cmmnDetailCodeVO, ModelMap model) throws Exception {

		CmmnDetailCode result = cmmnDetailCodeManageService.selectCmmnDetailCodeDetail(cmmnDetailCodeVO);
		model.addAttribute("cmmnDetailCodeVO", result);

		return "egovframework/com/sym/ccm/cde/EgovCcmCmmnDetailCodeUpdt";
	}

	/**
	 * 怨듯넻?곸꽭肄붾뱶瑜??섏젙?쒕떎.
	 *
	 * @param cmmnDetailCodeVO
	 * @param model
	 * @return "egovframework/com/sym/ccm/cde/EgovCcmCmmnDetailCodeUpdt",
	 *         "/sym/ccm/cde/SelectCcmCmmnDetailCodeList.do"
	 * @throws Exception
	 */
	@RequestMapping("/sym/ccm/cde/UpdateCcmCmmnDetailCode.do")
	public String updateCmmnDetailCode(@ModelAttribute("cmmnDetailCodeVO") CmmnDetailCodeVO cmmnDetailCodeVO,
			ModelMap model, BindingResult bindingResult) throws Exception {

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		if (bindingResult.hasErrors()) {
			CmmnDetailCode result = cmmnDetailCodeManageService.selectCmmnDetailCodeDetail(cmmnDetailCodeVO);
			model.addAttribute("cmmnDetailCodeVO", result);

			return "egovframework/com/sym/ccm/cde/EgovCcmCmmnDetailCodeUpdt";
		}

		cmmnDetailCodeVO.setLastUpdusrId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());
		cmmnDetailCodeManageService.updateCmmnDetailCode(cmmnDetailCodeVO);

		model.addAttribute("searchCondition", cmmnDetailCodeVO.getSearchCondition());
		model.addAttribute("searchKeyword", cmmnDetailCodeVO.getSearchKeyword());
		model.addAttribute("pageIndex", cmmnDetailCodeVO.getPageIndex());

		return "redirect:/sym/ccm/cde/SelectCcmCmmnDetailCodeList.do";
	}

}
