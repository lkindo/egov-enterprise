package egovframework.com.sym.ccm.cca.web;

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
import egovframework.com.sym.ccm.cca.service.CmmnCode;
import egovframework.com.sym.ccm.cca.service.CmmnCodeVO;
import egovframework.com.sym.ccm.cca.service.EgovCcmCmmnCodeManageService;
import egovframework.com.sym.ccm.ccc.service.CmmnClCodeVO;
import egovframework.com.sym.ccm.ccc.service.EgovCcmCmmnClCodeManageService;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * 怨듯넻肄붾뱶??愿???붿껌??諛쏆븘 ?쒕퉬???대옒?ㅻ줈 ?붿껌???꾨떖?섍퀬 ?쒕퉬?ㅽ겢?섏뒪?먯꽌 泥섎━??寃곌낵瑜????붾㈃?쇰줈 ?꾨떖???꾪븳 Controller瑜?
 * ?뺤쓽?쒕떎
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
 *   2017.08.16  ?댁젙?          ?쒖??꾨젅?꾩썙??v3.7 媛쒖꽑
 *   2025.07.07  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(final???꾨땶 蹂?섎뒗 諛묒쨪???ы븿?????놁쓬)
 *
 *      </pre>
 */
@Controller
public class EgovCcmCmmnCodeManageController {

	@Resource(name = "CmmnCodeManageService")
	private EgovCcmCmmnCodeManageService cmmnCodeManageService;

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
	 * @param searchVO
	 * @param model
	 * @return "egovframework/com/sym/ccm/cca/EgovCcmCmmnCodeList"
	 * @throws Exception
	 */
	@IncludedInfo(name = "怨듯넻肄붾뱶", listUrl = "/sym/ccm/cca/SelectCcmCmmnCodeList.do", order = 980, gid = 60)
	@RequestMapping(value = "/sym/ccm/cca/SelectCcmCmmnCodeList.do")
	public String selectCmmnCodeList(@ModelAttribute("searchVO") CmmnCodeVO searchVO, ModelMap model) throws Exception {
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

		List<CmmnCodeVO> resultList = cmmnCodeManageService.selectCmmnCodeList(searchVO);
		model.addAttribute("resultList", resultList);

		int totCnt = cmmnCodeManageService.selectCmmnCodeListTotCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/sym/ccm/cca/EgovCcmCmmnCodeList";
	}

	/**
	 * 怨듯넻肄붾뱶 ?곸꽭??ぉ??議고쉶?쒕떎.
	 * 
	 * @param loginVO
	 * @param cmmnCodeVO
	 * @param model
	 * @return "egovframework/com/sym/ccm/cca/EgovCcmCmmnCodeDetail"
	 * @throws Exception
	 */
	@RequestMapping(value = "/sym/ccm/cca/SelectCcmCmmnCodeDetail.do")
	public String selectCmmnCodeDetail(@ModelAttribute("loginVO") LoginVO loginVO, CmmnCodeVO cmmnCodeVO,
			ModelMap model) throws Exception {

		CmmnCodeVO vo = cmmnCodeManageService.selectCmmnCodeDetail(cmmnCodeVO);

		model.addAttribute("result", vo);

		return "egovframework/com/sym/ccm/cca/EgovCcmCmmnCodeDetail";
	}

	/**
	 * 怨듯넻肄붾뱶 ?깅줉???꾪븳 ?깅줉?섏씠吏濡??대룞?쒕떎.
	 * 
	 * @param cmmnCodeVO
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping("/sym/ccm/cca/RegistCcmCmmnCodeView.do")
	public String insertCmmnCodeView(@ModelAttribute("cmmnCodeVO") CmmnCodeVO cmmnCodeVO, ModelMap model)
			throws Exception {

		CmmnClCodeVO searchVO = new CmmnClCodeVO();
		searchVO.setFirstIndex(0);
		List<CmmnClCodeVO> clCodeList = cmmnClCodeManageService.selectCmmnClCodeList(searchVO);

		model.addAttribute("clCodeList", clCodeList);

		return "egovframework/com/sym/ccm/cca/EgovCcmCmmnCodeRegist";
	}

	/**
	 * 怨듯넻肄붾뱶瑜??깅줉?쒕떎.
	 * 
	 * @param CmmnCodeVO
	 * @param CmmnCodeVO
	 * @param status
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping("/sym/ccm/cca/RegistCcmCmmnCode.do")
	public String insertCmmnCode(@ModelAttribute("searchVO") CmmnCodeVO cmmnCode,
			@ModelAttribute("cmmnCodeVO") CmmnCodeVO cmmnCodeVO, BindingResult bindingResult, ModelMap model)
			throws Exception {

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		CmmnClCodeVO searchVO = new CmmnClCodeVO();
		searchVO.setFirstIndex(0);

		if (bindingResult.hasErrors()) {

			List<CmmnClCodeVO> clCodeList = cmmnClCodeManageService.selectCmmnClCodeList(searchVO);
			model.addAttribute("clCodeList", clCodeList);

			return "egovframework/com/sym/ccm/cca/EgovCcmCmmnCodeRegist";
		}

		if (cmmnCode.getCodeId() != null) {
			CmmnCode vo = cmmnCodeManageService.selectCmmnCodeDetail(cmmnCode);
			if (vo != null) {
				model.addAttribute("message", egovMessageSource.getMessage("comSymCcmCca.validate.codeCheck"));

				List<CmmnClCodeVO> clCodeList = cmmnClCodeManageService.selectCmmnClCodeList(searchVO);
				model.addAttribute("clCodeList", clCodeList);

				return "egovframework/com/sym/ccm/cca/EgovCcmCmmnCodeRegist";
			}
		}

		cmmnCodeVO.setFrstRegisterId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());
		cmmnCodeManageService.insertCmmnCode(cmmnCodeVO);

		return "forward:/sym/ccm/cca/SelectCcmCmmnCodeList.do";
	}

	/**
	 * 怨듯넻肄붾뱶瑜???젣?쒕떎.
	 * 
	 * @param cmmnCodeVO
	 * @param status
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping("/sym/ccm/cca/RemoveCcmCmmnCode.do")
	public String deleteCmmnCode(@ModelAttribute("cmmnCodeVO") CmmnCodeVO cmmnCodeVO, BindingResult bindingResult,
			ModelMap model) throws Exception {

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		cmmnCodeVO.setLastUpdusrId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());
		cmmnCodeManageService.deleteCmmnCode(cmmnCodeVO);

		return "forward:/sym/ccm/cca/SelectCcmCmmnCodeList.do";
	}

	/**
	 * 怨듯넻肄붾뱶 ?섏젙???꾪븳 ?섏젙?섏씠吏濡??대룞?쒕떎.
	 * 
	 * @param cmmnCodeVO
	 * @param model
	 * @return "egovframework/com/sym/ccm/cca/EgovCcmCmmnCodeUpdt"
	 * @throws Exception
	 */
	@RequestMapping("/sym/ccm/cca/UpdateCcmCmmnCodeView.do")
	public String updateCmmnCodeView(@ModelAttribute("cmmnCodeVO") CmmnCodeVO cmmnCodeVO, ModelMap model)
			throws Exception {

		CmmnCode result = cmmnCodeManageService.selectCmmnCodeDetail(cmmnCodeVO);

		model.addAttribute("cmmnCodeVO", result);

		return "egovframework/com/sym/ccm/cca/EgovCcmCmmnCodeUpdt";
	}

	/**
	 * 怨듯넻肄붾뱶瑜??섏젙?쒕떎.
	 * 
	 * @param cmmnCodeVO
	 * @param status
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping("/sym/ccm/cca/UpdateCcmCmmnCode.do")
	public String updateCmmnCode(@ModelAttribute("searchVO") CmmnCodeVO cmmnCode,
			@ModelAttribute("cmmnCodeVO") CmmnCodeVO cmmnCodeVO, BindingResult bindingResult, ModelMap model)
			throws Exception {

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		if (bindingResult.hasErrors()) {

			CmmnCode result = cmmnCodeManageService.selectCmmnCodeDetail(cmmnCode);
			model.addAttribute("cmmnCodeVO", result);

			return "egovframework/com/sym/ccm/cca/EgovCcmCmmnCodeUpdt";
		}

		cmmnCodeVO.setLastUpdusrId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());
		cmmnCodeManageService.updateCmmnCode(cmmnCodeVO);

		return "forward:/sym/ccm/cca/SelectCcmCmmnCodeList.do";
	}

}
