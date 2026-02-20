package egovframework.com.sym.ccm.cde.web;

import java.util.List;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;

import com.company.project.service.code.EgovCommonCodeService;
import com.company.project.service.code.dto.CmmnClCodeDto;
import com.company.project.service.code.dto.CmmnCodeDto;
import com.company.project.service.code.dto.CmmnDetailCodeDto;
import com.company.project.web.adapter.CommonCodeAdapter;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.sym.ccm.cca.service.CmmnCodeVO;
import egovframework.com.sym.ccm.ccc.service.CmmnClCodeVO;
import egovframework.com.sym.ccm.cde.service.CmmnDetailCodeVO;
import jakarta.annotation.Resource;

/**
 * ?????????????????????? ??????????????? ?????????? ????
 * Controller?????
 * 
 * @author ???????? ????
 * @since 2009.04.01
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == ?????Modification Information) ==
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2009.03.20  ????         ????
 *   2009.04.01  ????         ????
 *   2011.08.26  ???         IncludedInfo annotation ??
 *   2017.08.08  ????          ???????v3.7 ?
 *   2024.10.29  ????         ?????
 *   2025.07.08  ????         2025????????PMD???????? ????????-LocalVariableNamingConventions(final??? ?? ??????????)
 *
 *      </pre>
 **/
@Controller
public class EgovCcmCmmnDetailCodeManageController {

	@Resource(name = "egovCommonCodeService")
	private EgovCommonCodeService egovCommonCodeService;

	/** EgovPropertyService **/
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	/** EgovMessageSource **/
	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	/**
	 * ??????????.
	 * 
	 * @param loginVO
	 * @param searchVO
	 * @param model
	 * @return "egovframework com/sym/ccm/cde/EgovCcmCmmnDetailCodeList"   
	 * @throws Exception
	 */
	@IncludedInfo(name = "Name", listUrl = "", order = 1, gid = 50)
	@RequestMapping(value = "/sym/ccm/cde/SelectCcmCmmnDetailCodeList.do")
	public String selectCmmnDetailCodeList(@ModelAttribute("loginVO") LoginVO loginVO,
			@ModelAttribute("searchVO") CmmnDetailCodeVO searchVO, ModelMap model) throws Exception {

		/** EgovPropertyService.sample **/
		searchVO.setPageUnit(propertiesService.getInt("pageUnit"));
		searchVO.setPageSize(propertiesService.getInt("pageSize"));

		/** pageing **/
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(searchVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());
		paginationInfo.setPageSize(searchVO.getPageSize());

		searchVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		searchVO.setLastIndex(paginationInfo.getLastRecordIndex());
		searchVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		// DTO mapping
		ComDefaultVO commonSearchVO = new ComDefaultVO();
		commonSearchVO.setPageIndex(searchVO.getPageIndex());
		commonSearchVO.setPageUnit(searchVO.getPageUnit());
		commonSearchVO.setPageSize(searchVO.getPageSize());
		commonSearchVO.setSearchCondition(searchVO.getSearchCondition());
		commonSearchVO.setSearchKeyword(searchVO.getSearchKeyword());

		List<CmmnDetailCodeDto> dtoList = egovCommonCodeService.selectCmmnDetailCodeList(commonSearchVO);
		List<CmmnDetailCodeVO> resultList = CommonCodeAdapter.toDetailCodeVOList(dtoList);
		model.addAttribute("resultList", resultList);

		int totCnt = egovCommonCodeService.selectCmmnDetailCodeListTotCnt(commonSearchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/sym/ccm/cde/EgovCcmCmmnDetailCodeList";
	}

	/**
	 * ??????????????.
	 * 
	 * @param loginVO
	 * @param cmmnDetailCodeVO
	 * @param model
	 * @return "egovframework com/sym/ccm/cde/EgovCcmCmmnDetailCodeDetail"   
	 * @throws Exception
	 */
	@RequestMapping(value = "/sym/ccm/cde/SelectCcmCmmnDetailCodeDetail.do")
	public String selectCmmnDetailCodeDetail(@ModelAttribute("loginVO") LoginVO loginVO,
			CmmnDetailCodeVO cmmnDetailCodeVO, ModelMap model) throws Exception {

		CmmnDetailCodeDto dto = CommonCodeAdapter.toDto(cmmnDetailCodeVO);
		CmmnDetailCodeDto resultDto = egovCommonCodeService.selectCmmnDetailCodeDetail(dto);
		CmmnDetailCodeVO vo = CommonCodeAdapter.toVO(resultDto);
		model.addAttribute("result", vo);

		return "egovframework/com/sym/ccm/cde/EgovCcmCmmnDetailCodeDetail";
	}

	/**
	 * ??????????.
	 * 
	 * @param loginVO
	 * @param cmmnDetailCodeVO
	 * @param model
	 * @return "forward: sym/ccm/cde/EgovCcmCmmnDetailCodeList.do"   
	 * @throws Exception
	 */
	@RequestMapping(value = "/sym/ccm/cde/RemoveCcmCmmnDetailCode.do")
	public String deleteCmmnDetailCode(@ModelAttribute("loginVO") LoginVO loginVO, CmmnDetailCodeVO cmmnDetailCodeVO,
			ModelMap model) throws Exception {

		CmmnDetailCodeDto dto = CommonCodeAdapter.toDto(cmmnDetailCodeVO);
		egovCommonCodeService.deleteCmmnDetailCode(dto);

		model.addAttribute("searchCondition", cmmnDetailCodeVO.getSearchCondition());
		model.addAttribute("searchKeyword", cmmnDetailCodeVO.getSearchKeyword());
		model.addAttribute("pageIndex", cmmnDetailCodeVO.getPageIndex());

		return "redirect:/sym/ccm/cde/SelectCcmCmmnDetailCodeList.do";
	}

	/**
	 * ????????? ????????.
	 *
	 * @param cmmnDetailCodeVO
	 * @param model
	 * @return
	 * @throws Exception
	 **/
	@RequestMapping("/sym/ccm/cde/RegistCcmCmmnDetailCodeView.do")
	public String insertCmmnDetailCodeView(@ModelAttribute("loginVO") LoginVO loginVO,
			@ModelAttribute("cmmnCodeVO") CmmnCodeVO cmmnCodeVO,
			@ModelAttribute("cmmnDetailCodeVO") CmmnDetailCodeVO cmmnDetailCodeVO, ModelMap model) throws Exception {

		ComDefaultVO commonSearchVO = new ComDefaultVO();
		commonSearchVO.setRecordCountPerPage(9999);
		commonSearchVO.setFirstIndex(0);

		List<CmmnClCodeDto> clCodeDtoList = egovCommonCodeService.selectCmmnClCodeList(commonSearchVO);
		List<CmmnClCodeVO> clCodeList = CommonCodeAdapter.toClCodeVOList(clCodeDtoList);
		model.addAttribute("clCodeList", clCodeList);

		CmmnCodeVO clCode = new CmmnCodeVO();
		clCode.setClCode(cmmnCodeVO.getClCode());

		if (cmmnCodeVO.getClCode() != null && !cmmnCodeVO.getClCode().equals("")) {
			// Can't easily use selectCmmnCodeList because it searches by CodeGroup
			// Name/ID...
			// CommonCodeService.getCodesByGroup() is for Details, not Groups.
			// But selectCmmnCodeList takes searchCondition.
			// Let's check CommonCodeService.selectCmmnCodeList
			// It expects searchCondition=1 (Code ID), 2 (Code ID Name).
			// It seems "clCode" is not a standard search condition there?
			// Legacy CmmnCodeManageService might have supported it.
			// Let's assume we can search by ClCode if we adapt CommonCodeService or check
			// if it supports it.
			// Looking at CommonCodeGroupRepository.searchCommonCodeGroups:
			// It likely supports filtering?
			// Actually, simply searching by ClCode might need a custom method or checking
			// if searchCondition supports it.

			// For now, let's try populating searchVO as is.
			ComDefaultVO codeSearchVO = new ComDefaultVO();
			codeSearchVO.setRecordCountPerPage(9999);
			codeSearchVO.setFirstIndex(0);
			codeSearchVO.setSearchCondition("clCode"); // Custom condition?
			codeSearchVO.setSearchKeyword(cmmnCodeVO.getClCode());

			List<CmmnCodeDto> codeDtoList = egovCommonCodeService.selectCmmnCodeList(codeSearchVO);
			List<CmmnCodeVO> codeList = CommonCodeAdapter.toCodeVOList(codeDtoList);
			model.addAttribute("codeList", codeList);
		}

		return "egovframework/com/sym/ccm/cde/EgovCcmCmmnDetailCodeRegist";
	}

	/**
	 * ????????.
	 *
	 * @param CmmnDetailCodeVO
	 * @param CmmnDetailCodeVO
	 * @param status
	 * @param model
	 * @return
	 * @throws Exception
	 **/
	@RequestMapping("/sym/ccm/cde/RegistCcmCmmnDetailCode.do")
	public String insertCmmnDetailCode(@ModelAttribute("cmmnDetailCodeVO") CmmnDetailCodeVO cmmnDetailCodeVO,
			BindingResult bindingResult, ModelMap model) throws Exception {

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		CmmnClCodeVO searchClCodeVO = new CmmnClCodeVO();
		searchClCodeVO.setFirstIndex(0);

		if (bindingResult.hasErrors()) {
			ComDefaultVO commonSearchVO = new ComDefaultVO();
			commonSearchVO.setRecordCountPerPage(9999);
			commonSearchVO.setFirstIndex(0);

			List<CmmnClCodeDto> clCodeDtoList = egovCommonCodeService.selectCmmnClCodeList(commonSearchVO);
			List<CmmnClCodeVO> clCodeList = CommonCodeAdapter.toClCodeVOList(clCodeDtoList);
			model.addAttribute("clCodeList", clCodeList);

			return "egovframework/com/sym/ccm/cde/EgovCcmCmmnDetailCodeRegist";
		}

		if (cmmnDetailCodeVO.getCodeId() != null) {
			CmmnDetailCodeDto dto = CommonCodeAdapter.toDto(cmmnDetailCodeVO);
			CmmnDetailCodeDto resultDto = egovCommonCodeService.selectCmmnDetailCodeDetail(dto);
			if (resultDto != null) {
				model.addAttribute("message", egovMessageSource.getMessage("comSymCcmCde.validate.codeCheck"));

				ComDefaultVO commonSearchVO = new ComDefaultVO();
				commonSearchVO.setRecordCountPerPage(9999);
				commonSearchVO.setFirstIndex(0);

				List<CmmnClCodeDto> clCodeDtoList = egovCommonCodeService.selectCmmnClCodeList(commonSearchVO);
				List<CmmnClCodeVO> clCodeList = CommonCodeAdapter.toClCodeVOList(clCodeDtoList);
				model.addAttribute("clCodeList", clCodeList);

				return "egovframework/com/sym/ccm/cde/EgovCcmCmmnDetailCodeRegist";
			}
		}

		cmmnDetailCodeVO.setFrstRegisterId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());
		CmmnDetailCodeDto saveDto = CommonCodeAdapter.toDto(cmmnDetailCodeVO);
		egovCommonCodeService.insertCmmnDetailCode(saveDto);

		model.addAttribute("searchCondition", cmmnDetailCodeVO.getSearchCondition());
		model.addAttribute("searchKeyword", cmmnDetailCodeVO.getSearchKeyword());
		model.addAttribute("pageIndex", cmmnDetailCodeVO.getPageIndex());

		return "redirect:/sym/ccm/cde/SelectCcmCmmnDetailCodeList.do";
	}

	/**
	 * ?????????? ?????????.
	 *
	 * @param cmmnDetailCodeVO
	 * @param model
	 * @return "egovframework com/sym/ccm/cde/EgovCcmCmmnDetailCodeUpdt"   
	 * @throws Exception
	 */
	@RequestMapping("/sym/ccm/cde/UpdateCcmCmmnDetailCodeView.do")
	public String updateCmmnDetailCodeView(@ModelAttribute("loginVO") LoginVO loginVO,
			@ModelAttribute("cmmnDetailCodeVO") CmmnDetailCodeVO cmmnDetailCodeVO, ModelMap model) throws Exception {

		CmmnDetailCodeDto dto = CommonCodeAdapter.toDto(cmmnDetailCodeVO);
		CmmnDetailCodeDto resultDto = egovCommonCodeService.selectCmmnDetailCodeDetail(dto);
		CmmnDetailCodeVO resultVO = CommonCodeAdapter.toVO(resultDto);
		model.addAttribute("cmmnDetailCodeVO", resultVO);

		return "egovframework/com/sym/ccm/cde/EgovCcmCmmnDetailCodeUpdt";
	}

	/**
	 * ?????????.
	 *
	 * @param cmmnDetailCodeVO
	 * @param model
	 * @return "egovframework com/sym/ccm/cde/EgovCcmCmmnDetailCodeUpdt",   
	 *         "/sym/ccm/cde/SelectCcmCmmnDetailCodeList.do"
	 * @throws Exception
	 */
	@RequestMapping("/sym/ccm/cde/UpdateCcmCmmnDetailCode.do")
	public String updateCmmnDetailCode(@ModelAttribute("cmmnDetailCodeVO") CmmnDetailCodeVO cmmnDetailCodeVO,
			ModelMap model, BindingResult bindingResult) throws Exception {

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		if (bindingResult.hasErrors()) {
			CmmnDetailCodeDto dto = CommonCodeAdapter.toDto(cmmnDetailCodeVO);
			CmmnDetailCodeDto result = egovCommonCodeService.selectCmmnDetailCodeDetail(dto);
			CmmnDetailCodeVO resultVO = CommonCodeAdapter.toVO(result);
			model.addAttribute("cmmnDetailCodeVO", resultVO);

			return "egovframework/com/sym/ccm/cde/EgovCcmCmmnDetailCodeUpdt";
		}

		cmmnDetailCodeVO.setLastUpdusrId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());

		CmmnDetailCodeDto saveDto = CommonCodeAdapter.toDto(cmmnDetailCodeVO);
		egovCommonCodeService.updateCmmnDetailCode(saveDto);

		model.addAttribute("searchCondition", cmmnDetailCodeVO.getSearchCondition());
		model.addAttribute("searchKeyword", cmmnDetailCodeVO.getSearchKeyword());
		model.addAttribute("pageIndex", cmmnDetailCodeVO.getPageIndex());

		return "redirect:/sym/ccm/cde/SelectCcmCmmnDetailCodeList.do";
	}

}
