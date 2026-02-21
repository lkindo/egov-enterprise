package egovframework.com.sym.ccm.ccc.web;

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
import com.company.project.web.adapter.CommonCodeAdapter;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.sym.ccm.ccc.service.CmmnClCodeVO;
import jakarta.annotation.Resource;

/**
 * ????????????????????? ??????????????? ?????????? ????
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
 *   2009.04.01  ????         ????
 *   2011.08.26  ???         IncludedInfo annotation ??
 *   2017.06.08  ????          ???????v3.7 ?
 *   2025.07.07  ????         2025????????PMD???????? ????????-LocalVariableNamingConventions(final??? ?? ??????????)
 *
 *      </pre>
 **/
@Controller
public class EgovCcmCmmnClCodeManageController {

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
	 * @param loginVO
	 * @param searchVO
	 * @param model
	 * @return "egovframework com/sym/ccm/ccc/SelectCcmCmmnClCodeList"   
	 * @throws Exception
	 */
	@IncludedInfo(name = "Name", listUrl = "", order = 1, gid = 50)
	@RequestMapping(value = "/sym/ccm/ccc/SelectCcmCmmnClCodeList.do")
	public String selectCmmnClCodeList(@ModelAttribute("searchVO") CmmnClCodeVO searchVO, ModelMap model)
			throws Exception {

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

		// Use Adapter and Service
		ComDefaultVO commonSearchVO = new ComDefaultVO();
		commonSearchVO.setPageIndex(searchVO.getPageIndex());
		commonSearchVO.setPageUnit(searchVO.getPageUnit());
		commonSearchVO.setPageSize(searchVO.getPageSize());
		commonSearchVO.setSearchCondition(searchVO.getSearchCondition());
		commonSearchVO.setSearchKeyword(searchVO.getSearchKeyword());

		List<CmmnClCodeDto> dtoList = egovCommonCodeService.selectCmmnClCodeList(commonSearchVO);
		List<CmmnClCodeVO> resultList = CommonCodeAdapter.toClCodeVOList(dtoList);

		model.addAttribute("resultList", resultList);

		int totCnt = egovCommonCodeService.selectCmmnClCodeListTotCnt(commonSearchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/sym/ccm/ccc/EgovCcmCmmnClCodeList";
	}

	/**
	 * ?????????????.
	 * 
	 * @param loginVO
	 * @param cmmnClCode
	 * @param model
	 * @return "egovframework com/sym/ccm/ccc/SelectCcmCmmnClCodeDetail.do"   
	 * @throws Exception
	 */
	@RequestMapping(value = "/sym/ccm/ccc/SelectCcmCmmnClCodeDetail.do")
	public String selectCmmnClCodeDetail(@ModelAttribute("loginVO") LoginVO loginVO, CmmnClCodeVO cmmnClCodeVO,
			ModelMap model) throws Exception {

		CmmnClCodeDto dto = CommonCodeAdapter.toDto(cmmnClCodeVO);
		CmmnClCodeDto resultDto = egovCommonCodeService.selectCmmnClCodeDetail(dto);
		CmmnClCodeVO vo = CommonCodeAdapter.toVO(resultDto);

		model.addAttribute("result", vo);

		return "egovframework/com/sym/ccm/ccc/EgovCcmCmmnClCodeDetail";
	}

	/**
	 * ???????? ????????.
	 * 
	 * @param cmmnClCodeVO
	 * @param model
	 * @return "egovframework com/sym/ccm/ccc/EgovCcmCmmnClCodeRegist";   
	 * @throws Exception
	 */
	@RequestMapping("/sym/ccm/ccc/RegistCcmCmmnClCodeView.do")
	public String insertCmmnClCodeView(@ModelAttribute("searchVO") CmmnClCodeVO cmmnClCodeVO, ModelMap model)
			throws Exception {
		model.addAttribute("cmmnClCodeVO", new CmmnClCodeVO());

		return "egovframework/com/sym/ccm/ccc/EgovCcmCmmnClCodeRegist";
	}

	/**
	 * ???????.
	 * 
	 * @param CmmnClCodeVO
	 * @param CmmnClCodeVO
	 * @param status
	 * @param model
	 * @return  sym/ccm/ccc/SelectCcmCmmnClCodeList.do";   
	 * @throws Exception
	 */
	@RequestMapping("/sym/ccm/ccc/RegistCcmCmmnClCode.do")
	public String insertCmmnClCode(@ModelAttribute("cmmnClCodeVO") CmmnClCodeVO cmmnClCodeVO,
			BindingResult bindingResult, ModelMap model) throws Exception {

		// ????? ?????? ??
		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		if (bindingResult.hasErrors()) {
			return "egovframework/com/sym/ccm/ccc/EgovCcmCmmnClCodeRegist";
		}

		if (cmmnClCodeVO.getClCode() != null) {
			CmmnClCodeDto dto = CommonCodeAdapter.toDto(cmmnClCodeVO);
			// Check existence logic. Service insert checks existence, but here we check
			// before to show message.
			CmmnClCodeDto resultDto = egovCommonCodeService.selectCmmnClCodeDetail(dto);
			if (resultDto != null) {
				model.addAttribute("message", egovMessageSource.getMessage("comSymCcmCcc.validate.codeCheck"));
				return "egovframework/com/sym/ccm/ccc/EgovCcmCmmnClCodeRegist";
			}
		}

		cmmnClCodeVO.setFrstRegisterId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());

		CmmnClCodeDto saveDto = CommonCodeAdapter.toDto(cmmnClCodeVO);
		egovCommonCodeService.insertCmmnClCode(saveDto);

		return "forward:/sym/ccm/ccc/SelectCcmCmmnClCodeList.do";
	}

	/**
	 * ?????????.
	 * 
	 * @param cmmnClCodeVO
	 * @param status
	 * @param model
	 * @return  sym/ccm/ccc/SelectCcmCmmnClCodeList.do";   
	 * @throws Exception
	 */
	@RequestMapping("/sym/ccm/ccc/RemoveCcmCmmnClCode.do")
	public String deleteCmmnClCode(@ModelAttribute("searchVO") CmmnClCodeVO cmmnClCode,
			@ModelAttribute("cmmnClCodeVO") CmmnClCodeVO cmmnClCodeVO, BindingResult bindingResult, ModelMap model)
			throws Exception {

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		cmmnClCodeVO.setLastUpdusrId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());

		CmmnClCodeDto dto = CommonCodeAdapter.toDto(cmmnClCodeVO);
		egovCommonCodeService.deleteCmmnClCode(dto);

		return "forward:/sym/ccm/ccc/SelectCcmCmmnClCodeList.do";
	}

	/**
	 * ????????? ?????????.
	 * 
	 * @param cmmnClCodeVO
	 * @param model
	 * @return "egovframework com/sym/ccm/ccc/EgovCcmCmmnClCodeUpdt";   
	 * @throws Exception
	 */
	@RequestMapping("/sym/ccm/ccc/UpdateCcmCmmnClCodeView.do")
	public String updateCmmnClCodeView(@ModelAttribute("searchVO") CmmnClCodeVO cmmnClCodeVO, ModelMap model)
			throws Exception {

		CmmnClCodeDto dto = CommonCodeAdapter.toDto(cmmnClCodeVO);
		CmmnClCodeDto resultDto = egovCommonCodeService.selectCmmnClCodeDetail(dto);
		CmmnClCodeVO vo = CommonCodeAdapter.toVO(resultDto);

		model.addAttribute("cmmnClCodeVO", vo);

		return "egovframework/com/sym/ccm/ccc/EgovCcmCmmnClCodeUpdt";
	}

	/**
	 * ????????.
	 * 
	 * @param cmmnClCodeVO
	 * @param status
	 * @param model
	 * @return  sym/ccm/ccc/SelectCcmCmmnClCodeList.do"   
	 * @throws Exception
	 */
	@RequestMapping("/sym/ccm/ccc/UpdateCcmCmmnClCode.do")
	public String updateCmmnClCode(@ModelAttribute("searchVO") CmmnClCodeVO cmmnClCode,
			@ModelAttribute("cmmnClCodeVO") CmmnClCodeVO cmmnClCodeVO, BindingResult bindingResult, ModelMap model)
			throws Exception {

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		if (bindingResult.hasErrors()) {

			CmmnClCodeDto dto = CommonCodeAdapter.toDto(cmmnClCode);
			CmmnClCodeDto resultDto = egovCommonCodeService.selectCmmnClCodeDetail(dto);
			CmmnClCodeVO resultVO = CommonCodeAdapter.toVO(resultDto);
			model.addAttribute("cmmnClCodeVO", resultVO);

			return "egovframework/com/sym/ccm/ccc/EgovCcmCmmnClCodeUpdt";
		}

		cmmnClCodeVO.setLastUpdusrId((user == null || user.getUniqId() == null) ? "" : user.getUniqId());

		CmmnClCodeDto saveDto = CommonCodeAdapter.toDto(cmmnClCodeVO);
		egovCommonCodeService.updateCmmnClCode(saveDto);

		return "forward:/sym/ccm/ccc/SelectCcmCmmnClCodeList.do";
	}

}
