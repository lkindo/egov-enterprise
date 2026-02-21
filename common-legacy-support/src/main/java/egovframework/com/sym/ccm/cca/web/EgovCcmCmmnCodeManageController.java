package egovframework.com.sym.ccm.cca.web;

import java.util.List;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;

import com.company.project.service.code.EgovCommonCodeService;
import com.company.project.service.code.dto.CmmnClCodeDto;
import com.company.project.service.code.dto.CmmnCodeDto;
import com.company.project.web.adapter.CommonCodeAdapter;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.sym.ccm.cca.service.CmmnCodeVO;
import egovframework.com.sym.ccm.ccc.service.CmmnClCodeVO;
import jakarta.annotation.Resource;

/**
 * ???????????????????? ??????????????? ?????????? ???? Controller??
 * ???
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
 *   2009.04.01  ????         ????
 *   2011.08.26  ???         IncludedInfo annotation ??
 *   2017.08.16  ????          ???????v3.7 ?
 *   2025.07.07  ????         2025????????PMD???????? ????????-LocalVariableNamingConventions(final??? ?? ??????????)
 *
 *      </pre>
 **/
// @Controller
public class EgovCcmCmmnCodeManageController {

	@Resource(name = "egovCommonCodeService")
	private EgovCommonCodeService egovCommonCodeService;

	/** EgovPropertyService **/
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	/** EgovMessageSource **/
	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	/**
	 * ?????????.
	 * 
	 * @param searchVO
	 * @param model
	 * @return "egovframework com/sym/ccm/cca/EgovCcmCmmnCodeList"   
	 * @throws Exception
	 */
	@IncludedInfo(name = "Legacy Controller", listUrl = "/sym/ccm/cca/SelectCcmCmmnCodeList.do", order = 980, gid = 60)
	@RequestMapping(value = "/sym/ccm/cca/SelectCcmCmmnCodeList.do")
	public String selectCmmnCodeList(@ModelAttribute("searchVO") CmmnCodeVO searchVO, ModelMap model) throws Exception {
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

		// Cast searchVO to ComDefaultVO if needed, or create new ComDefaultVO and copy
		// properties
		// Legacy CmmnCodeVO extends CmmnCode, let's assume it has necessary fields or
		// use adapter
		ComDefaultVO commonSearchVO = new ComDefaultVO();
		commonSearchVO.setPageIndex(searchVO.getPageIndex());
		commonSearchVO.setPageUnit(searchVO.getPageUnit());
		commonSearchVO.setPageSize(searchVO.getPageSize());
		commonSearchVO.setSearchCondition(searchVO.getSearchCondition());
		commonSearchVO.setSearchKeyword(searchVO.getSearchKeyword());

		List<CmmnCodeDto> dtoList = egovCommonCodeService.selectCmmnCodeList(commonSearchVO);
		List<CmmnCodeVO> resultList = CommonCodeAdapter.toCodeVOList(dtoList);

		model.addAttribute("resultList", resultList);

		int totCnt = egovCommonCodeService.selectCmmnCodeListTotCnt(commonSearchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/sym/ccm/cca/EgovCcmCmmnCodeList";
	}

	/**
	 * ?? ?????????.
	 * 
	 * @param loginVO
	 * @param cmmnCodeVO
	 * @param model
	 * @return "egovframework com/sym/ccm/cca/EgovCcmCmmnCodeDetail"   
	 * @throws Exception
	 */
	@RequestMapping(value = "/sym/ccm/cca/SelectCcmCmmnCodeDetail.do")
	public String selectCmmnCodeDetail(@ModelAttribute("loginVO") LoginVO loginVO, CmmnCodeVO cmmnCodeVO,
			ModelMap model) throws Exception {

		CmmnCodeDto dto = CommonCodeAdapter.toDto(cmmnCodeVO);
		CmmnCodeDto resultDto = egovCommonCodeService.selectCmmnCodeDetail(dto);
		CmmnCodeVO vo = CommonCodeAdapter.toVO(resultDto);

		model.addAttribute("result", vo);

		return "egovframework/com/sym/ccm/cca/EgovCcmCmmnCodeDetail";
	}

	/**
	 * ?? ???? ????????.
	 * 
	 * @param cmmnCodeVO
	 * @param model
	 * @return
	 * @throws Exception
	 **/
	@RequestMapping("/sym/ccm/cca/RegistCcmCmmnCodeView.do")
	public String insertCmmnCodeView(@ModelAttribute("cmmnCodeVO") CmmnCodeVO cmmnCodeVO, ModelMap model)
			throws Exception {

		ComDefaultVO searchVO = new ComDefaultVO();
		searchVO.setFirstIndex(0);
		searchVO.setRecordCountPerPage(9999); // Fetch all or sufficiently large

		List<CmmnClCodeDto> clCodeDtoList = egovCommonCodeService.selectCmmnClCodeList(searchVO);
		List<CmmnClCodeVO> clCodeList = CommonCodeAdapter.toClCodeVOList(clCodeDtoList);

		model.addAttribute("clCodeList", clCodeList);

		return "egovframework/com/sym/ccm/cca/EgovCcmCmmnCodeRegist";
	}

	/**
	 * ???????.
	 * 
	 * @param CmmnCodeVO
	 * @param CmmnCodeVO
	 * @param status
	 * @param model
	 * @return
	 * @throws Exception
	 **/
	@RequestMapping("/sym/ccm/cca/RegistCcmCmmnCode.do")
	public String insertCmmnCode(@ModelAttribute("searchVO") CmmnCodeVO cmmnCode,
			@ModelAttribute("cmmnCodeVO") CmmnCodeVO cmmnCodeVO, BindingResult bindingResult, ModelMap model)
			throws Exception {

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		CmmnClCodeVO searchVO = new CmmnClCodeVO();
		searchVO.setFirstIndex(0);

		if (bindingResult.hasErrors()) {
			ComDefaultVO commonSearchVO = new ComDefaultVO();
			commonSearchVO.setFirstIndex(0);
			commonSearchVO.setRecordCountPerPage(9999);

			List<CmmnClCodeDto> clCodeDtoList = egovCommonCodeService.selectCmmnClCodeList(commonSearchVO);
			List<CmmnClCodeVO> clCodeList = CommonCodeAdapter.toClCodeVOList(clCodeDtoList);
			model.addAttribute("clCodeList", clCodeList);

			return "egovframework/com/sym/ccm/cca/EgovCcmCmmnCodeRegist";
		}

		if (cmmnCode.getCodeId() != null) {
			CmmnCodeDto dto = CommonCodeAdapter.toDto(cmmnCode);
			CmmnCodeDto resultDto = egovCommonCodeService.selectCmmnCodeDetail(dto);
			if (resultDto != null) {
				model.addAttribute("message", egovMessageSource.getMessage("comSymCcmCca.validate.codeCheck"));

				ComDefaultVO commonSearchVO = new ComDefaultVO();
				commonSearchVO.setFirstIndex(0);
				commonSearchVO.setRecordCountPerPage(9999);

				List<CmmnClCodeDto> clCodeDtoList = egovCommonCodeService.selectCmmnClCodeList(commonSearchVO);
				List<CmmnClCodeVO> clCodeList = CommonCodeAdapter.toClCodeVOList(clCodeDtoList);
				model.addAttribute("clCodeList", clCodeList);

				return "egovframework/com/sym/ccm/cca/EgovCcmCmmnCodeRegist";
			}
		}

		cmmnCodeVO.setFrstRegisterId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());

		CmmnCodeDto saveDto = CommonCodeAdapter.toDto(cmmnCodeVO);
		egovCommonCodeService.insertCmmnCode(saveDto);

		return "forward:/sym/ccm/cca/SelectCcmCmmnCodeList.do";
	}

	/**
	 * ?????????.
	 * 
	 * @param cmmnCodeVO
	 * @param status
	 * @param model
	 * @return
	 * @throws Exception
	 **/
	@RequestMapping("/sym/ccm/cca/RemoveCcmCmmnCode.do")
	public String deleteCmmnCode(@ModelAttribute("cmmnCodeVO") CmmnCodeVO cmmnCodeVO, BindingResult bindingResult,
			ModelMap model) throws Exception {

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		cmmnCodeVO.setLastUpdusrId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());

		CmmnCodeDto dto = CommonCodeAdapter.toDto(cmmnCodeVO);
		egovCommonCodeService.deleteCmmnCode(dto);

		return "forward:/sym/ccm/cca/SelectCcmCmmnCodeList.do";
	}

	/**
	 * ?? ????? ?????????.
	 * 
	 * @param cmmnCodeVO
	 * @param model
	 * @return "egovframework com/sym/ccm/cca/EgovCcmCmmnCodeUpdt"   
	 * @throws Exception
	 */
	@RequestMapping("/sym/ccm/cca/UpdateCcmCmmnCodeView.do")
	public String updateCmmnCodeView(@ModelAttribute("cmmnCodeVO") CmmnCodeVO cmmnCodeVO, ModelMap model)
			throws Exception {

		CmmnCodeDto dto = CommonCodeAdapter.toDto(cmmnCodeVO);
		CmmnCodeDto resultDto = egovCommonCodeService.selectCmmnCodeDetail(dto);

		if (resultDto == null) {
			// Handle error or redirect
			return "forward:/sym/ccm/cca/SelectCcmCmmnCodeList.do";
		}

		CmmnCodeVO resultVO = CommonCodeAdapter.toVO(resultDto);
		model.addAttribute("cmmnCodeVO", resultVO);

		return "egovframework/com/sym/ccm/cca/EgovCcmCmmnCodeUpdt";
	}

	/**
	 * ????????.
	 * 
	 * @param cmmnCodeVO
	 * @param status
	 * @param model
	 * @return
	 * @throws Exception
	 **/
	@RequestMapping("/sym/ccm/cca/UpdateCcmCmmnCode.do")
	public String updateCmmnCode(@ModelAttribute("searchVO") CmmnCodeVO cmmnCode,
			@ModelAttribute("cmmnCodeVO") CmmnCodeVO cmmnCodeVO, BindingResult bindingResult, ModelMap model)
			throws Exception {

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		if (bindingResult.hasErrors()) {

			CmmnCodeDto dto = CommonCodeAdapter.toDto(cmmnCode);
			CmmnCodeDto resultDto = egovCommonCodeService.selectCmmnCodeDetail(dto);
			CmmnCodeVO resultVO = CommonCodeAdapter.toVO(resultDto);
			model.addAttribute("cmmnCodeVO", resultVO);

			return "egovframework/com/sym/ccm/cca/EgovCcmCmmnCodeUpdt";
		}

		cmmnCodeVO.setLastUpdusrId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());

		CmmnCodeDto saveDto = CommonCodeAdapter.toDto(cmmnCodeVO);
		egovCommonCodeService.updateCmmnCode(saveDto);

		return "forward:/sym/ccm/cca/SelectCcmCmmnCodeList.do";
	}

}
