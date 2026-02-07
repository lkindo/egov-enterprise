package egovframework.com.sym.ccm.cca.web;

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
import com.company.project.web.adapter.CommonCodeAdapter;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.sym.ccm.cca.service.CmmnCode;
import egovframework.com.sym.ccm.cca.service.CmmnCodeVO;
import egovframework.com.sym.ccm.ccc.service.CmmnClCodeVO;
import jakarta.annotation.Resource;

/**
 * 공통코드에 관한 요청을 받아 서비스 클래스로 요청을 전달하고 서비스클래스에서 처리한 결과를 웹 화면으로 전달을 위한 Controller를
 * 정의한다
 * 
 * @author 공통서비스 개발팀 이중호
 * @since 2009.04.01
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 개정이력(Modification Information) ==
 *
 *   수정일      수정자           수정내용
 *  -------    --------    ---------------------------
 *   2009.04.01  이중호          최초 생성
 *   2011.08.26  정진오          IncludedInfo annotation 추가
 *   2017.08.16  이정은          표준프레임워크 v3.7 개선
 *   2025.07.07  이백행          2025년 컨트리뷰션 PMD로 소프트웨어 보안약점 진단하고 제거하기-LocalVariableNamingConventions(final이 아닌 변수는 밑줄을 포함할 수 없음)
 *
 *      </pre>
 */
// @Controller
public class EgovCcmCmmnCodeManageController {

	@Resource(name = "egovCommonCodeService")
	private EgovCommonCodeService egovCommonCodeService;

	/** EgovPropertyService */
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	/** EgovMessageSource */
	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	/**
	 * 공통분류코드 목록을 조회한다.
	 * 
	 * @param searchVO
	 * @param model
	 * @return "egovframework/com/sym/ccm/cca/EgovCcmCmmnCodeList"
	 * @throws Exception
	 */
	@IncludedInfo(name = "공통코드", listUrl = "/sym/ccm/cca/SelectCcmCmmnCodeList.do", order = 980, gid = 60)
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
	 * 공통코드 상세항목을 조회한다.
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

		CmmnCodeDto dto = CommonCodeAdapter.toDto(cmmnCodeVO);
		CmmnCodeDto resultDto = egovCommonCodeService.selectCmmnCodeDetail(dto);
		CmmnCodeVO vo = CommonCodeAdapter.toVO(resultDto);

		model.addAttribute("result", vo);

		return "egovframework/com/sym/ccm/cca/EgovCcmCmmnCodeDetail";
	}

	/**
	 * 공통코드 등록을 위한 등록페이지로 이동한다.
	 * 
	 * @param cmmnCodeVO
	 * @param model
	 * @return
	 * @throws Exception
	 */
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
	 * 공통코드를 등록한다.
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
	 * 공통코드를 삭제한다.
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

		CmmnCodeDto dto = CommonCodeAdapter.toDto(cmmnCodeVO);
		egovCommonCodeService.deleteCmmnCode(dto);

		return "forward:/sym/ccm/cca/SelectCcmCmmnCodeList.do";
	}

	/**
	 * 공통코드 수정을 위한 수정페이지로 이동한다.
	 * 
	 * @param cmmnCodeVO
	 * @param model
	 * @return "egovframework/com/sym/ccm/cca/EgovCcmCmmnCodeUpdt"
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
	 * 공통코드를 수정한다.
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