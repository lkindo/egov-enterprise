package egovframework.com.cop.smt.djm.web;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MultipartHttpServletRequest;

import egovframework.com.cmm.ComDefaultCodeVO;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.service.CmmnDetailCode;
import egovframework.com.cmm.service.EgovCmmUseService;
import egovframework.com.cmm.service.EgovFileMngService;
import egovframework.com.cmm.service.EgovFileMngUtil;
import egovframework.com.cmm.service.EgovProperties;
import egovframework.com.cmm.service.FileVO;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.cop.smt.djm.service.ChargerVO;
import egovframework.com.cop.smt.djm.service.DeptJob;
import egovframework.com.cop.smt.djm.service.DeptJobBx;
import egovframework.com.cop.smt.djm.service.DeptJobBxVO;
import egovframework.com.cop.smt.djm.service.DeptJobVO;
import egovframework.com.cop.smt.djm.service.DeptVO;
import egovframework.com.cop.smt.djm.service.EgovDeptJobService;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

/**
 * <pre>
 * 媛쒖슂
 * - 遺?쒖뾽臾댁뿉 ???controller ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - 遺?쒖뾽臾댁뿉 ????깅줉, ?섏젙, ??젣, 議고쉶湲곕뒫???쒓났?쒕떎.
 * - 遺?쒖뾽臾댁쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * </pre>
 * 
 * @author ?μ쿋??
 * @since 28-6-2010 ?ㅼ쟾 10:59:05
 * @version 1.0
 * @see
 * 
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.06.28  ?μ쿋??         理쒖큹 ?앹꽦
 *   2011.08.26  ?뺤쭊??         IncludedInfo annotation 異붽?
 *   2019.12.09  ?좎슜??         KISA 蹂댁븞?쎌젏 議곗튂 (?꾪뿕???뺤떇 ?뚯씪 ?낅줈??
 *   2020.10.27  ?좎슜??         ?뚯씪 ?낅줈???섏젙 (multiRequest.getFiles), ??null) 媛?泥댄겕
 *   2022.11.11  源?쒖?          ?쒗걧?댁퐫??泥섎━
 *   2025.06.10  ?대갚??         PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(吏??蹂??紐낅챸 洹쒖튃)
 *
 *      </pre>
 */
@Controller
public class EgovDeptJobController {

	@Resource(name = "EgovDeptJobService")
	protected EgovDeptJobService deptJobService;

	@Resource(name = "EgovCmmUseService")
	private EgovCmmUseService cmmUseService;

	@Resource(name = "propertiesService")
	protected EgovPropertyService propertyService;

	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

    // 泥⑤??뚯씪 愿??
	@Resource(name="EgovFileMngService")
	private EgovFileMngService fileMngService;

	@Resource(name = "EgovFileMngUtil")
	private EgovFileMngUtil fileUtil;

	// Logger log = Logger.getLogger(this.getClass());

	/**
	 * ?대떦???뺣낫??????앹뾽 紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param ChargerVO
	 * @return String
	 *
	 * @param chargerVO
	 */
	@RequestMapping("/cop/smt/djm/selectChargerListPopup.do")
	public String selectChargerListPopup(@ModelAttribute("searchVO") ChargerVO chargerVO, ModelMap model)
			throws Exception {
		return "egovframework/com/cop/smt/djm/EgovChargerListPopup";
	}

	/**
	 * ?대떦???뺣낫?????紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param ChargerVO
	 * @return String
	 *
	 * @param chargerVO
	 */
	@RequestMapping("/cop/smt/djm/selectChargerList.do")
	public String selectChargerList(@ModelAttribute("searchVO") ChargerVO chargerVO, ModelMap model) throws Exception {
		// LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();

		// chargerVO.setUniqId(user.getUniqId());

		chargerVO.setPageUnit(propertyService.getInt("pageUnit"));
		chargerVO.setPageSize(propertyService.getInt("pageSize"));

		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(chargerVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(chargerVO.getPageUnit());
		paginationInfo.setPageSize(chargerVO.getPageSize());

		chargerVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		chargerVO.setLastIndex(paginationInfo.getLastRecordIndex());
		chargerVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		Map<String, Object> map = deptJobService.selectChargerList(chargerVO);
		int totCnt = Integer.parseInt((String) map.get("resultCnt"));
		paginationInfo.setTotalRecordCount(totCnt);

		model.addAttribute("resultList", map.get("resultList"));
		model.addAttribute("resultCnt", map.get("resultCnt"));
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/cop/smt/djm/EgovChargerList";
	}

	/**
	 * 遺???뺣낫??????앹뾽 紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param DeptVO
	 * @return String
	 *
	 * @param deptVO
	 */
	@RequestMapping("/cop/smt/djm/selectDeptListPopup.do")
	public String selectDeptListPopup(@ModelAttribute("searchVO") DeptVO deptVO, ModelMap model) throws Exception {
		return "egovframework/com/cop/smt/djm/EgovDeptListPopup";
	}

	/**
	 * 遺???뺣낫?????紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param DeptVO
	 * @return String
	 *
	 * @param deptVO
	 */
	@RequestMapping("/cop/smt/djm/selectDeptList.do")
	public String selectDeptList(@ModelAttribute("searchVO") DeptVO deptVO, ModelMap model) throws Exception {
		// LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();

		deptVO.setPageUnit(propertyService.getInt("pageUnit"));
		deptVO.setPageSize(propertyService.getInt("pageSize"));

		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(deptVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(deptVO.getPageUnit());
		paginationInfo.setPageSize(deptVO.getPageSize());

		deptVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		deptVO.setLastIndex(paginationInfo.getLastRecordIndex());
		deptVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		Map<String, Object> map = deptJobService.selectDeptList(deptVO);
		int totCnt = Integer.parseInt((String) map.get("resultCnt"));
		paginationInfo.setTotalRecordCount(totCnt);

		model.addAttribute("resultList", map.get("resultList"));
		model.addAttribute("resultCnt", map.get("resultCnt"));
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/cop/smt/djm/EgovDeptList";
	}

	/**
	 * 遺?쒖뾽臾댄븿 ?뺣낫??????앹뾽 紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param DeptVO
	 * @return String
	 *
	 * @param deptVO
	 */
	@RequestMapping("/cop/smt/djm/selectDeptJobBxListPopup.do")
	public String selectDeptJobBxListPopup(@ModelAttribute("searchVO") DeptJobBxVO deptJobBxVO, ModelMap model)
			throws Exception {
		return "egovframework/com/cop/smt/djm/EgovDeptJobBxListPopup";
	}

	/**
	 * 遺?쒖뾽臾댄븿 ?뺣낫?????紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param DeptJobBxVO
	 * @return String
	 *
	 * @param deptJobBxVO
	 */
	@SuppressWarnings("unchecked")
	@IncludedInfo(name = "遺?쒖뾽臾댄븿愿由?, order = 400, gid = 40)
	@RequestMapping("/cop/smt/djm/selectDeptJobBxList.do")
	public String selectDeptJobBxList(@ModelAttribute("searchVO") DeptJobBxVO deptJobBxVO, ModelMap model)
			throws Exception {
		// LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();
		String sLocationUrl = "egovframework/com/cop/smt/djm/EgovDeptJobBxList";

		if (deptJobBxVO.getPopupCnd() != null && !deptJobBxVO.getPopupCnd().equals("")) {
			sLocationUrl = "egovframework/com/cop/smt/djm/EgovDeptJobBxListS";
		}

		deptJobBxVO.setPageUnit(propertyService.getInt("pageUnit"));
		deptJobBxVO.setPageSize(propertyService.getInt("pageSize"));

		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(deptJobBxVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(deptJobBxVO.getPageUnit());
		paginationInfo.setPageSize(deptJobBxVO.getPageSize());

		deptJobBxVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		deptJobBxVO.setLastIndex(paginationInfo.getLastRecordIndex());
		deptJobBxVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		Map<String, Object> map = deptJobService.selectDeptJobBxList(deptJobBxVO);
		int totCnt = Integer.parseInt((String) map.get("resultCnt"));
		paginationInfo.setTotalRecordCount(totCnt);

		List<DeptJobBxVO> list = (List<DeptJobBxVO>) map.get("resultList");

		model.addAttribute("resultList", map.get("resultList"));
		model.addAttribute("resultCnt", map.get("resultCnt"));
		// KISA 蹂댁븞?쎌젏 議곗튂 - ??null) 媛?泥댄겕
		if (list == null) {
			model.addAttribute("resultNum", 0);
		} else {
			model.addAttribute("resultNum", list.size());
		}
		model.addAttribute("paginationInfo", paginationInfo);

		return sLocationUrl;
	}

	/**
	 * 遺?쒖뾽臾댄븿 ?뺣낫瑜?議고쉶?쒕떎.
	 * 
	 * @param DeptJobBxVO
	 * @return String
	 *
	 * @param deptJobBxVO
	 */
//	@RequestMapping("/cop/smt/djm/selectDeptJobBx.do")
//	public String selectDeptJobBx(@ModelAttribute("searchVO") DeptJobBxVO deptJobBxVO, ModelMap model) throws Exception{
//
//		DeptJobBx deptJobBx = deptJobService.selectDeptJobBx(deptJobBxVO);
//        model.addAttribute("deptJobBx", deptJobBx);
//
//		return "egovframework/com/cop/smt/djm/EgovDeptJobBxDetail";
//	}

	/**
	 * 遺?쒖뾽臾댄븿 ?뺣낫???깅줉?붾㈃?쇰줈 ?대룞?쒕떎.
	 * 
	 * @param DeptJobBx
	 * @return String
	 *
	 * @param DeptJobBx
	 */
	@RequestMapping("/cop/smt/djm/addDeptJobBx.do")
	public String addDeptJobBx(@ModelAttribute("deptJobBxVO") DeptJobBxVO deptJobBxVO, ModelMap model)
			throws Exception {
		String sLocationUrl = "egovframework/com/cop/smt/djm/EgovDeptJobBxRegist";

		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		return sLocationUrl;
	}

	/**
	 * 遺?쒖뾽臾댄븿 ?깅줉???쒖떆?쒖꽌瑜?議고쉶?쒕떎.
	 * 
	 * @param DeptJobBx
	 * @return String
	 *
	 * @param DeptJobBx
	 */
	@RequestMapping("/cop/smt/djm/getDeptJobBxOrdr.do")
	public String getDeptJobBxOrdr(final HttpServletRequest request,
			@ModelAttribute("deptJobBxVO") DeptJobBxVO deptJobBxVO, ModelMap model) throws Exception {

		String sLocationUrl = "egovframework/com/cop/smt/djm/EgovDeptJobBxRegist";

		if (request.getHeader("Referer").indexOf("addDeptJobBx.do") < 0) {
			sLocationUrl = "egovframework/com/cop/smt/djm/EgovDeptJobBxUpdt";
		}

		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		model.addAttribute("indictOrdrValue", deptJobService.selectDeptJobBxOrdr(deptJobBxVO.getDeptId()) + 1);
		return sLocationUrl;
	}

	/**
	 * 遺?쒖뾽臾댄븿 ?뺣낫???섏젙?붾㈃?쇰줈 ?대룞?쒕떎.
	 * 
	 * @param DeptJobBx
	 * @return String
	 *
	 * @param DeptJobBx
	 */
	@RequestMapping("/cop/smt/djm/modifyDeptJobBx.do")
	public String modifyDeptJobBx(@ModelAttribute("deptJobBxVO") DeptJobBxVO deptJobBxVO, ModelMap model)
			throws Exception {
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		DeptJobBxVO resultVO = deptJobService.selectDeptJobBx(deptJobBxVO);
		resultVO.setSearchCnd(deptJobBxVO.getSearchCnd());
		resultVO.setSearchWrd(deptJobBxVO.getSearchWrd());
		resultVO.setPageIndex(deptJobBxVO.getPageIndex());

		model.addAttribute("indictOrdrValue", resultVO.getIndictOrdr());
		model.addAttribute("deptJobBxVO", resultVO);

		return "egovframework/com/cop/smt/djm/EgovDeptJobBxUpdt";
	}

	/**
	 * 遺?쒖뾽臾댄븿 ?뺣낫瑜??섏젙?쒕떎.
	 * 
	 * @param DeptJobBxVO
	 * @return String
	 *
	 * @param deptJobBxVO
	 */
	@RequestMapping("/cop/smt/djm/updateDeptJobBx.do")
	public String updateDeptJobBx(@Valid @ModelAttribute("deptJobBxVO") DeptJobBxVO deptJobBxVO, BindingResult bindingResult,
			ModelMap model) throws Exception {
		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (bindingResult.hasErrors()) {
			return "egovframework/com/cop/smt/djm/EgovDeptJobBxUpdt";
		}

		if (isAuthenticated) {
			deptJobBxVO.setLastUpdusrId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));
			deptJobService.updateDeptJobBx(deptJobBxVO);
		}

		return "forward:/cop/smt/djm/selectDeptJobBxList.do";
	}

	/**
	 * 遺?쒖뾽臾댄븿 ?뺣낫???쒖떆?쒖꽌瑜??섏젙?쒕떎.
	 * 
	 * @param DeptJobBx
	 * @return String
	 *
	 * @param deptJobBx
	 */
	@RequestMapping("/cop/smt/djm/updateDeptJobBxOrdr.do")
	public String updateDeptJobBxOrdr(@ModelAttribute("searchVO") DeptJobBxVO deptJobBxVO, ModelMap model)
			throws Exception {
		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		boolean changed = false;

		if (isAuthenticated) {
			deptJobBxVO.setLastUpdusrId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));
			changed = deptJobService.updateDeptJobBxOrdr(deptJobBxVO);
		}

		if (!changed) {
			model.addAttribute("indictOrdrChanged", "false");
		}

		return "forward:/cop/smt/djm/selectDeptJobBxList.do";
	}

	/**
	 * 遺?쒖뾽臾댄븿 ?뺣낫瑜??깅줉?쒕떎.
	 * 
	 * @param DeptJobBxVO
	 * @return String
	 *
	 * @param deptJobBxVO
	 */
	@RequestMapping("/cop/smt/djm/insertDeptJobBx.do")
	public String insertDeptJobBx(@Valid @ModelAttribute("deptJobBxVO") DeptJobBxVO deptJobBxVO, BindingResult bindingResult,
			ModelMap model) throws Exception {
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		String sLocationUrl = "egovframework/com/cop/smt/djm/EgovDeptJobBxRegist";

		if(bindingResult.hasErrors()){
			return sLocationUrl;
		}

		// ?꾩씠???ㅼ젙
		deptJobBxVO.setFrstRegisterId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
		deptJobBxVO.setLastUpdusrId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

		// 遺?쒕궡 遺?쒖뾽臾댄븿紐?以묐났泥댄겕
		if (deptJobService.selectDeptJobBxCheck(deptJobBxVO) > 0) {
			model.addAttribute("deptJobBxNmDuplicated", "true");
			sLocationUrl = "forward:/cop/smt/djm/addDeptJobBx.do";
		} else {
			deptJobService.insertDeptJobBx(deptJobBxVO);
			sLocationUrl = "forward:/cop/smt/djm/selectDeptJobBxList.do";
		}
		return sLocationUrl;
	}

	/**
	 * 遺?쒖뾽臾댄븿 ?뺣낫瑜???젣?쒕떎.
	 * 
	 * @param DeptJobBx
	 * @return String
	 *
	 * @param DeptJobBx
	 */
	@RequestMapping("/cop/smt/djm/deleteDeptJobBx.do")
	public String deleteDeptJobBx(@ModelAttribute("deptJobBxVO") DeptJobBx deptJobBx, ModelMap model) throws Exception {
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}
		deptJobService.deleteDeptJobBx(deptJobBx);
		return "forward:/cop/smt/djm/selectDeptJobBxList.do";
	}

	/**
	 * 遺?쒖뾽臾??뺣낫?????紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param DeptJobVO
	 * @return String
	 *
	 * @param deptJobVO
	 */
	@IncludedInfo(name = "遺?쒖뾽臾댁젙蹂?, order = 401, gid = 40)
	@RequestMapping("/cop/smt/djm/selectDeptJobList.do")
	public String selectDeptJobList(@ModelAttribute("searchVO") DeptJobVO deptJobVO, ModelMap model) throws Exception {
		// 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		// KISA 蹂댁븞痍⑥빟??議곗튂 (2018-12-10, ?좎슜??
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (!isAuthenticated) {
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		deptJobVO.setPageUnit(propertyService.getInt("pageUnit"));
		deptJobVO.setPageSize(propertyService.getInt("pageSize"));

		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(deptJobVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(deptJobVO.getPageUnit());
		paginationInfo.setPageSize(deptJobVO.getPageSize());

		deptJobVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		deptJobVO.setLastIndex(paginationInfo.getLastRecordIndex());
		deptJobVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		if (deptJobVO.getSearchDeptId() == null || deptJobVO.getSearchDeptId().equals("")) {
			deptJobVO.setSearchDeptId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getOrgnztId()));
		}

		Map<String, Object> map = deptJobService.selectDeptJobList(deptJobVO);
		int totCnt = Integer.parseInt((String) map.get("resultCnt"));
		paginationInfo.setTotalRecordCount(totCnt);

		model.addAttribute("resultBxList", deptJobService.selectDeptJobBxListAll());
		model.addAttribute("resultList", map.get("resultList"));
		model.addAttribute("resultCnt", map.get("resultCnt"));
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/cop/smt/djm/EgovDeptJobList";
	}

	/**
	 * 遺?쒖뾽臾??뺣낫???깅줉?붾㈃?쇰줈 ?대룞?쒕떎.
	 * 
	 * @param DeptJob
	 * @return String
	 *
	 * @param deptJob
	 */
	@RequestMapping("/cop/smt/djm/addDeptJob.do")
	public String addDeptJob(@ModelAttribute("deptJobVO") DeptJobVO deptJobVO, ModelMap model) throws Exception {
		String sLocationUrl = "egovframework/com/cop/smt/djm/EgovDeptJobRegist";

		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		deptJobVO.setDeptId(deptJobVO.getSearchDeptId());
		deptJobVO.setDeptNm(deptJobService.selectDept(deptJobVO.getSearchDeptId()));
		deptJobVO.setDeptJobBxId(deptJobVO.getSearchDeptJobBxId());

		// ?뚯씪?낅줈???쒗븳
		String whiteListFileUploadExtensions = EgovProperties.getProperty("Globals.fileUpload.Extensions");
		String fileUploadMaxSize = EgovProperties.getProperty("Globals.fileUpload.maxSize");

		model.addAttribute("fileUploadExtensions", whiteListFileUploadExtensions);
		model.addAttribute("fileUploadMaxSize", fileUploadMaxSize);

		return sLocationUrl;
	}

	/**
	 * 遺?쒖뾽臾??뺣낫???섏젙?붾㈃?쇰줈 ?대룞?쒕떎.
	 * 
	 * @param DeptJob
	 * @return String
	 *
	 * @param deptJob
	 */
	@RequestMapping("/cop/smt/djm/modifyDeptJob.do")
	public String modifyDeptJob(@ModelAttribute("deptJobVO") DeptJobVO deptJobVO, ModelMap model) throws Exception {
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		DeptJobVO resultVO = deptJobService.selectDeptJob(deptJobVO);
		resultVO.setSearchCnd(deptJobVO.getSearchCnd());
		resultVO.setSearchWrd(deptJobVO.getSearchWrd());
		resultVO.setSearchDeptId(deptJobVO.getSearchDeptId());
		resultVO.setSearchDeptJobBxId(deptJobVO.getSearchDeptJobBxId());
		resultVO.setPageIndex(deptJobVO.getPageIndex());
		model.addAttribute("deptJobVO", resultVO);

		return "egovframework/com/cop/smt/djm/EgovDeptJobUpdt";
	}

	/**
	 * 遺?쒖뾽臾??뺣낫瑜?議고쉶?쒕떎.
	 * 
	 * @param DeptJobVO
	 * @return String
	 *
	 * @param deptJobVO
	 */
	@RequestMapping("/cop/smt/djm/selectDeptJob.do")
	public String selectDeptJob(@ModelAttribute("deptJobVO") DeptJobVO deptJobVO, ModelMap model) throws Exception {
		DeptJob deptJob = deptJobService.selectDeptJob(deptJobVO);
		model.addAttribute("deptJob", deptJob);

		/*
		 * 怨듯넻肄붾뱶 ?곗꽑?쒖쐞 議고쉶
		 */
		ComDefaultCodeVO voComCode = new ComDefaultCodeVO();
		voComCode.setCodeId("COM059");
		List<CmmnDetailCode> listComCode = cmmUseService.selectCmmCodeDetail(voComCode);
		model.addAttribute("priort", listComCode);

		return "egovframework/com/cop/smt/djm/EgovDeptJobDetail";
	}

	/**
	 * 遺?쒖뾽臾??뺣낫瑜??섏젙?쒕떎.
	 * 
	 * @param DeptJob
	 * @return String
	 *
	 * @param deptJob
	 */
	@RequestMapping("/cop/smt/djm/updateDeptJob.do")
	public String updateDeptJob(final MultipartHttpServletRequest multiRequest,
			@RequestParam Map<String, Object> commandMap, @Valid @ModelAttribute("deptJobVO") DeptJobVO deptJobVO,
			BindingResult bindingResult, ModelMap model) throws Exception {
		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		// KISA 蹂댁븞痍⑥빟??議곗튂 (2018-12-10, ?좎슜??

		if (!isAuthenticated) {
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		if (bindingResult.hasErrors()) {
			DeptJob deptJob = deptJobService.selectDeptJob(deptJobVO);
			model.addAttribute("deptJob", deptJob);
			return "egovframework/com/cop/smt/djm/EgovDeptJobUpdt";
		}

		/*
		 * ***************************************************************** // 泥⑤??뚯씪 愿??
		 * ID ?앹꽦 start....
		 */
		// 2022.11.11 ?쒗걧?댁퐫??泥섎━
		String atchFileId = deptJobVO.getAtchFileId();

		// final Map<String, MultipartFile> files = multiRequest.getFileMap();
		final List<MultipartFile> files = multiRequest.getFiles("file_1");

		if (!files.isEmpty()) {
			String atchFileAt = commandMap.get("atchFileAt") == null ? "" : (String) commandMap.get("atchFileAt");
			if ("N".equals(atchFileAt)) {
				List<FileVO> fvoList = fileUtil.parseFileInf(files, "DSCH_", 0, atchFileId, "");
				atchFileId = fileMngService.insertFileInfs(fvoList);
				// 泥⑤??뚯씪 ID ?뗮똿
				deptJobVO.setAtchFileId(atchFileId); // 泥⑤??뚯씪 ID

			} else {
				FileVO fvo = new FileVO();
				fvo.setAtchFileId(atchFileId);
				int fileKeyParam = fileMngService.getMaxFileSN(fvo);
				List<FileVO> fvoList = fileUtil.parseFileInf(files, "DSCH_", fileKeyParam, atchFileId, "");
				fileMngService.updateFileInfs(fvoList);
			}

			deptJobVO.setLastUpdusrId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));
			deptJobService.updateDeptJob(deptJobVO);
		}

		return "forward:/cop/smt/djm/selectDeptJobList.do";
	}

	/**
	 * 遺?쒖뾽臾??뺣낫瑜??깅줉?쒕떎.
	 * 
	 * @param DeptJob
	 * @return String
	 *
	 * @param deptJob
	 */
	@RequestMapping("/cop/smt/djm/insertDeptJob.do")
	public String insertDeptJob(final MultipartHttpServletRequest multiRequest,
			@Valid @ModelAttribute("deptJobVO") DeptJobVO deptJobVO, BindingResult bindingResult, ModelMap model)
			throws Exception {
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		String sLocationUrl = "egovframework/com/cop/smt/djm/EgovDeptJobRegist";

		if (bindingResult.hasErrors()) {

			// ?뚯씪?낅줈???쒗븳
			String whiteListFileUploadExtensions = EgovProperties.getProperty("Globals.fileUpload.Extensions");
			String fileUploadMaxSize = EgovProperties.getProperty("Globals.fileUpload.maxSize");

			model.addAttribute("fileUploadExtensions", whiteListFileUploadExtensions);
			model.addAttribute("fileUploadMaxSize", fileUploadMaxSize);

			return sLocationUrl;
		}

		// 泥⑤??뚯씪 愿??泥⑤??뚯씪ID ?앹꽦
		List<FileVO> fvoList = null;
		String atchFileId = "";

		// final Map<String, MultipartFile> files = multiRequest.getFileMap();
		final List<MultipartFile> files = multiRequest.getFiles("file_1");

		if (!files.isEmpty()) {
			fvoList = fileUtil.parseFileInf(files, "DSCH_", 0, "", "");
			atchFileId = fileMngService.insertFileInfs(fvoList); // ?뚯씪???앹꽦?섍퀬?섎㈃ ?앹꽦??泥⑤??뚯씪 ID瑜?由ы꽩?쒕떎.
		}

		// 由ы꽩諛쏆? 泥⑤??뚯씪ID瑜??뗮똿?쒕떎..
		deptJobVO.setAtchFileId(atchFileId); // 泥⑤??뚯씪 ID

		// ?꾩씠???ㅼ젙
		deptJobVO.setFrstRegisterId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
		deptJobVO.setLastUpdusrId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

		deptJobService.insertDeptJob(deptJobVO);
		sLocationUrl = "forward:/cop/smt/djm/selectDeptJobList.do";

		return sLocationUrl;
	}

	/**
	 * 遺?쒖뾽臾??뺣낫瑜???젣?쒕떎.
	 * 
	 * @param DeptJob
	 * @return String
	 *
	 * @param deptJob
	 */
	@RequestMapping("/cop/smt/djm/deleteDeptJob.do")
	public String deleteDeptJob(@ModelAttribute("deptJobVO") DeptJob deptJob, ModelMap model) throws Exception {
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// 泥⑤??뚯씪 ??젣瑜??꾪븳 ID ?앹꽦 start....
		String atchFileId = deptJob.getAtchFileId();

		// 泥⑤??뚯씪????젣?섍린 ?꾪븳 Vo
		FileVO fvo = new FileVO();
		fvo.setAtchFileId(atchFileId);

		fileMngService.deleteAllFileInf(fvo);
		// 泥⑤??뚯씪 ??젣 End.............

		deptJobService.deleteDeptJob(deptJob);
		return "forward:/cop/smt/djm/selectDeptJobList.do";
	}

}
