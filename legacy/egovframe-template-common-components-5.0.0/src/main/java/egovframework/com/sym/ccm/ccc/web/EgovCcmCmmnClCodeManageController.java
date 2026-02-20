package egovframework.com.sym.ccm.ccc.web;

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
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.sym.ccm.ccc.service.CmmnClCode;
import egovframework.com.sym.ccm.ccc.service.CmmnClCodeVO;
import egovframework.com.sym.ccm.ccc.service.EgovCcmCmmnClCodeManageService;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * 怨듯넻遺꾨쪟肄붾뱶??愿???붿껌??諛쏆븘 ?쒕퉬???대옒?ㅻ줈 ?붿껌???꾨떖?섍퀬 ?쒕퉬?ㅽ겢?섏뒪?먯꽌 泥섎━??寃곌낵瑜????붾㈃?쇰줈 ?꾨떖???꾪븳
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
 *   2009.04.01  ?댁쨷??         理쒖큹 ?앹꽦
 *   2011.08.26  ?뺤쭊??         IncludedInfo annotation 異붽?
 *   2017.06.08  ?댁젙?          ?쒖??꾨젅?꾩썙??v3.7 媛쒖꽑
 *   2025.07.07  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(final???꾨땶 蹂?섎뒗 諛묒쨪???ы븿?????놁쓬)
 *
 *      </pre>
 */
@Controller
public class EgovCcmCmmnClCodeManageController {
	@Resource(name = "CmmnClCodeManageService")
	private EgovCcmCmmnClCodeManageService cmmnClCodeManageService;

	/** EgovPropertyService */
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	/** EgovMessageSource */
	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	/**
	 * 怨듯넻遺꾨쪟肄붾뱶 紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param loginVO
	 * @param searchVO
	 * @param model
	 * @return "egovframework/com/sym/ccm/ccc/SelectCcmCmmnClCodeList"
	 * @throws Exception
	 */
	@IncludedInfo(name = "怨듯넻遺꾨쪟肄붾뱶", listUrl = "/sym/ccm/ccc/SelectCcmCmmnClCodeList.do", order = 960, gid = 60)
	@RequestMapping(value = "/sym/ccm/ccc/SelectCcmCmmnClCodeList.do")
	public String selectCmmnClCodeList(@ModelAttribute("searchVO") CmmnClCodeVO searchVO, ModelMap model)
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

		List<CmmnClCodeVO> resultList = cmmnClCodeManageService.selectCmmnClCodeList(searchVO);
		model.addAttribute("resultList", resultList);

		int totCnt = cmmnClCodeManageService.selectCmmnClCodeListTotCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/sym/ccm/ccc/EgovCcmCmmnClCodeList";
	}

	/**
	 * 怨듯넻遺꾨쪟肄붾뱶 ?곸꽭??ぉ??議고쉶?쒕떎.
	 * 
	 * @param loginVO
	 * @param cmmnClCode
	 * @param model
	 * @return "egovframework/com/sym/ccm/ccc/SelectCcmCmmnClCodeDetail.do"
	 * @throws Exception
	 */
	@RequestMapping(value = "/sym/ccm/ccc/SelectCcmCmmnClCodeDetail.do")
	public String selectCmmnClCodeDetail(@ModelAttribute("loginVO") LoginVO loginVO, CmmnClCodeVO cmmnClCodeVO,
			ModelMap model) throws Exception {

		CmmnClCode vo = cmmnClCodeManageService.selectCmmnClCodeDetail(cmmnClCodeVO);

		model.addAttribute("result", vo);

		return "egovframework/com/sym/ccm/ccc/EgovCcmCmmnClCodeDetail";
	}

	/**
	 * 怨듯넻遺꾨쪟肄붾뱶 ?깅줉???꾪븳 ?깅줉?섏씠吏濡??대룞?쒕떎.
	 * 
	 * @param cmmnClCodeVO
	 * @param model
	 * @return "egovframework/com/sym/ccm/ccc/EgovCcmCmmnClCodeRegist";
	 * @throws Exception
	 */
	@RequestMapping("/sym/ccm/ccc/RegistCcmCmmnClCodeView.do")
	public String insertCmmnClCodeView(@ModelAttribute("searchVO") CmmnClCodeVO cmmnClCodeVO, ModelMap model)
			throws Exception {
		model.addAttribute("cmmnClCodeVO", new CmmnClCodeVO());

		return "egovframework/com/sym/ccm/ccc/EgovCcmCmmnClCodeRegist";
	}

	/**
	 * 怨듯넻遺꾨쪟肄붾뱶瑜??깅줉?쒕떎.
	 * 
	 * @param CmmnClCodeVO
	 * @param CmmnClCodeVO
	 * @param status
	 * @param model
	 * @return /sym/ccm/ccc/SelectCcmCmmnClCodeList.do";
	 * @throws Exception
	 */
	@RequestMapping("/sym/ccm/ccc/RegistCcmCmmnClCode.do")
	public String insertCmmnClCode(@ModelAttribute("cmmnClCodeVO") CmmnClCodeVO cmmnClCodeVO,
			BindingResult bindingResult, ModelMap model) throws Exception {

		// 濡쒓렇?퇦O?먯꽌 ?ъ슜???뺣낫 媛?몄삤湲?
		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		if (bindingResult.hasErrors()) {
			return "egovframework/com/sym/ccm/ccc/EgovCcmCmmnClCodeRegist";
		}

		if (cmmnClCodeVO.getClCode() != null) {
			CmmnClCode vo = cmmnClCodeManageService.selectCmmnClCodeDetail(cmmnClCodeVO);
			if (vo != null) {
				model.addAttribute("message", egovMessageSource.getMessage("comSymCcmCcc.validate.codeCheck"));
				return "egovframework/com/sym/ccm/ccc/EgovCcmCmmnClCodeRegist";
			}
		}

		cmmnClCodeVO.setFrstRegisterId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());
		cmmnClCodeManageService.insertCmmnClCode(cmmnClCodeVO);

		return "forward:/sym/ccm/ccc/SelectCcmCmmnClCodeList.do";
	}

	/**
	 * 怨듯넻遺꾨쪟肄붾뱶瑜???젣?쒕떎.
	 * 
	 * @param cmmnClCodeVO
	 * @param status
	 * @param model
	 * @return /sym/ccm/ccc/SelectCcmCmmnClCodeList.do";
	 * @throws Exception
	 */
	@RequestMapping("/sym/ccm/ccc/RemoveCcmCmmnClCode.do")
	public String deleteCmmnClCode(@ModelAttribute("searchVO") CmmnClCodeVO cmmnClCode,
			@ModelAttribute("cmmnClCodeVO") CmmnClCodeVO cmmnClCodeVO, BindingResult bindingResult, ModelMap model)
			throws Exception {

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		cmmnClCodeVO.setLastUpdusrId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());
		cmmnClCodeManageService.deleteCmmnClCode(cmmnClCodeVO);

		return "forward:/sym/ccm/ccc/SelectCcmCmmnClCodeList.do";
	}

	/**
	 * 怨듯넻遺꾨쪟肄붾뱶 ?섏젙???꾪븳 ?섏젙?섏씠吏濡??대룞?쒕떎.
	 * 
	 * @param cmmnClCodeVO
	 * @param model
	 * @return "egovframework/com/sym/ccm/ccc/EgovCcmCmmnClCodeUpdt";
	 * @throws Exception
	 */
	@RequestMapping("/sym/ccm/ccc/UpdateCcmCmmnClCodeView.do")
	public String updateCmmnClCodeView(@ModelAttribute("searchVO") CmmnClCodeVO cmmnClCodeVO, ModelMap model)
			throws Exception {

		CmmnClCode result = cmmnClCodeManageService.selectCmmnClCodeDetail(cmmnClCodeVO);

		model.addAttribute("cmmnClCodeVO", result);

		return "egovframework/com/sym/ccm/ccc/EgovCcmCmmnClCodeUpdt";
	}

	/**
	 * 怨듯넻遺꾨쪟肄붾뱶瑜??섏젙?쒕떎.
	 * 
	 * @param cmmnClCodeVO
	 * @param status
	 * @param model
	 * @return /sym/ccm/ccc/SelectCcmCmmnClCodeList.do"
	 * @throws Exception
	 */
	@RequestMapping("/sym/ccm/ccc/UpdateCcmCmmnClCode.do")
	public String updateCmmnClCode(@ModelAttribute("searchVO") CmmnClCodeVO cmmnClCode,
			@ModelAttribute("cmmnClCodeVO") CmmnClCodeVO cmmnClCodeVO, BindingResult bindingResult, ModelMap model)
			throws Exception {

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		if (bindingResult.hasErrors()) {

			CmmnClCode result = cmmnClCodeManageService.selectCmmnClCodeDetail(cmmnClCode);
			model.addAttribute("cmmnClCodeVO", result);

			return "egovframework/com/sym/ccm/ccc/EgovCcmCmmnClCodeUpdt";
		}

		cmmnClCodeVO.setLastUpdusrId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());
		cmmnClCodeManageService.updateCmmnClCode(cmmnClCodeVO);

		return "forward:/sym/ccm/ccc/SelectCcmCmmnClCodeList.do";
	}

}