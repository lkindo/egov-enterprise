package egovframework.com.utl.sys.fsm.web;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;

import egovframework.com.cmm.ComDefaultCodeVO;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.EgovWebUtil;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import egovframework.com.utl.sys.fsm.service.EgovFileSysMntrngService;
import egovframework.com.utl.sys.fsm.service.FileSysMntrng;
import egovframework.com.utl.sys.fsm.service.FileSysMntrngLogVO;
import egovframework.com.utl.sys.fsm.service.FileSysMntrngVO;
import egovframework.com.utl.sys.fsm.service.FileSystemChecker;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * 媛쒖슂
 * - ?뚯씪?쒖뒪??紐⑤땲?곕쭅??곸뿉 ???controller ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?뚯씪?쒖뒪??紐⑤땲?곕쭅??곸뿉 ????깅줉, ?섏젙, ??젣, 議고쉶湲곕뒫???쒓났?쒕떎.
 * - ?뚯씪?쒖뒪??紐⑤땲?곕쭅??곸쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author ?μ쿋??
 * @version 1.0
 * @created 28-6-2010 ?ㅼ쟾 11:33:26
 *  <pre>
 * == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??      ?섏젙??          ?섏젙?댁슜
 *  -------     --------    ---------------------------
 *  2010.06.28	?μ쿋??	理쒖큹 ?앹꽦
 *  2011.08.26	?뺤쭊??	IncludedInfo annotation 異붽?
 *  2023.06.09	源?섏슜		NSR 蹂댁븞議곗튂 (?뚯씪?쒖뒪??蹂?섏뿉??媛쒗뻾臾몄옄 ?쒓굅)
 *  2024.05.02  源?섏슜        NSR 蹂댁븞議곗튂 (?뚯씪?쒖뒪?쒕챸?먯꽌 ?낆쓽?곸씤 臾몄옄???쒓굅)
 * </pre>
 */
@Controller
public class EgovFileSysMntrngController {

	@Resource(name = "EgovFileSysMntrngService")
	protected EgovFileSysMntrngService fileSysMntrngService;

	@Resource(name = "propertiesService")
	protected EgovPropertyService propertyService;

	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	/**
	 * ?뚯씪?쒖뒪??紐⑤땲?곕쭅????뺣낫?????紐⑸줉??議고쉶?쒕떎.
	 * @param FileSysMntrngVO
	 * @return  String
	 *
	 * @param fileSysMntrngVO
	 */
	@IncludedInfo(name = "?뚯씪?쒖뒪?쒕え?덊꽣留?, order = 2130, gid = 90)
	@RequestMapping("/utl/sys/fsm/selectFileSysMntrngList.do")
	public String selectFileSysMntrngList(@ModelAttribute("searchVO") FileSysMntrngVO fileSysMntrngVO, ModelMap model) throws Exception {
		//濡쒓렇??媛앹껜 ?좎뼵
		//LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		fileSysMntrngVO.setPageUnit(propertyService.getInt("pageUnit"));
		fileSysMntrngVO.setPageSize(propertyService.getInt("pageSize"));

		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(fileSysMntrngVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(fileSysMntrngVO.getPageUnit());
		paginationInfo.setPageSize(fileSysMntrngVO.getPageSize());

		fileSysMntrngVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		fileSysMntrngVO.setLastIndex(paginationInfo.getLastRecordIndex());
		fileSysMntrngVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		Map<String, Object> map = fileSysMntrngService.selectFileSysMntrngList(fileSysMntrngVO);
		int totCnt = Integer.parseInt((String) map.get("resultCnt"));
		paginationInfo.setTotalRecordCount(totCnt);

		model.addAttribute("resultList", map.get("resultList"));
		model.addAttribute("resultCnt", map.get("resultCnt"));
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/utl/sys/fsm/EgovFileSysMntrngList";
	}

	/**
	 * ?뚯씪?쒖뒪??紐⑤땲?곕쭅 ????뺣낫???깅줉?섏씠吏濡??대룞?쒕떎.
	 * @param FileSysMntrngVO - ?뚯씪?쒖뒪??紐⑤땲?곕쭅 VO
	 * @return  String - 由ы꽩 URL
	 *
	 * @param fileSysMntrngVO
	 */
	@RequestMapping("/utl/sys/fsm/addFileSysMntrng.do")
	public String addFileSysMntrng(@ModelAttribute("fileSysMntrngVO") FileSysMntrngVO fileSysMntrngVO, BindingResult bindingResult, ModelMap model) throws Exception {
		String sLocationUrl = "egovframework/com/utl/sys/fsm/EgovFileSysMntrngRegist";

		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		return sLocationUrl;
	}

	/**
	 * ?뚯씪?쒖뒪??紐⑤땲?곕쭅 ????뺣낫???섏젙?섏씠吏濡??대룞?쒕떎.
	 * @param FileSysMntrngVO - ?뚯씪?쒖뒪??紐⑤땲?곕쭅 VO
	 * @return  String - 由ы꽩 URL
	 *
	 * @param fileSysMntrngVO
	 */
	@RequestMapping("/utl/sys/fsm/modifyFileSysMntrng.do")
	public String modifyFileSysMntrng(@ModelAttribute("fileSysMntrngVO") FileSysMntrngVO fileSysMntrngVO, BindingResult bindingResult, ModelMap model) throws Exception {
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		FileSysMntrngVO resultVO = fileSysMntrngService.selectFileSysMntrng(fileSysMntrngVO);

		resultVO.setSearchCnd(fileSysMntrngVO.getSearchCnd());
		resultVO.setSearchWrd(fileSysMntrngVO.getSearchWrd());
		resultVO.setPageIndex(fileSysMntrngVO.getPageIndex());

		if (resultVO.getCreatDt() != null && !resultVO.getCreatDt().equals("")) {
			if (resultVO.getCreatDt().length() > 18) {
				resultVO.setCreatDt(resultVO.getCreatDt().substring(0, 19));
			}
		}

		model.addAttribute("fileSysMntrngVO", resultVO);

		return "egovframework/com/utl/sys/fsm/EgovFileSysMntrngUpdt";
	}

	/**
	 * ?뚯씪?쒖뒪??紐⑤땲?곕쭅????뺣낫瑜?議고쉶?쒕떎.
	 * @param FileSysMntrngVO
	 * @return  String
	 *
	 * @param fileSysMntrngVO
	 */
	@RequestMapping("/utl/sys/fsm/selectFileSysMntrng.do")
	public String selectFileSysMntrng(@ModelAttribute("ntwrkSvcMntrngVO") FileSysMntrngVO fileSysMntrngVO, ModelMap model) throws Exception {
		FileSysMntrng fileSysMntrng = fileSysMntrngService.selectFileSysMntrng(fileSysMntrngVO);

		if (fileSysMntrng.getCreatDt() != null && !fileSysMntrng.getCreatDt().equals("")) {
			if (fileSysMntrng.getCreatDt().length() > 18) {
				fileSysMntrng.setCreatDt(fileSysMntrng.getCreatDt().substring(0, 19));
			}
		}
		model.addAttribute("fileSysMntrngVO", fileSysMntrng);

		return "egovframework/com/utl/sys/fsm/EgovFileSysMntrngDetail";
	}

	/**
	 * ?뚯씪?쒖뒪??紐⑤땲?곕쭅????뺣낫瑜??섏젙?쒕떎.
	 * @param FileSysMntrng
	 * @return  String
	 *
	 * @param fileSysMntrng
	 */
	@RequestMapping("/utl/sys/fsm/updateFileSysMntrng.do")
	public String updateFileSysMntrng(
		@Valid @ModelAttribute("fileSysMntrngVO") FileSysMntrngVO fileSysMntrngVO,
		BindingResult bindingResult, ModelMap model) throws Exception {

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (bindingResult.hasErrors()) {
			FileSysMntrng fileSysMntrng = fileSysMntrngService.selectFileSysMntrng(fileSysMntrngVO);
			model.addAttribute("fileSysMntrng", fileSysMntrng);
			return "egovframework/com/utl/sys/fsm/EgovFileSysMntrngUpdt";
		}

		if (isAuthenticated) {
			fileSysMntrngVO.setLastUpdusrId(user == null ? "" : EgovStringUtil.isNullToString(user.getUniqId()));

			String fileSysNm = fileSysMntrngVO.getFileSysNm();
			String safeFileSysNm = EgovWebUtil.removeCRLF(fileSysNm).replaceAll("\\|", "").replaceAll("&", "");
			fileSysMntrngVO.setFileSysNm(safeFileSysNm);

			fileSysMntrngService.updateFileSysMntrng(fileSysMntrngVO);
		}

		return "forward:/utl/sys/fsm/selectFileSysMntrngList.do";
	}

	/**
	 * ?뚯씪?쒖뒪??紐⑤땲?곕쭅????뺣낫瑜??깅줉?쒕떎.
	 * @param FileSysMntrng
	 * @return  String
	 *
	 * @param fileSysMntrng
	 */
	@RequestMapping("/utl/sys/fsm/insertFileSysMntrng.do")
	public String insertFileSysMntrng(
		@Valid @ModelAttribute("fileSysMntrngVO") FileSysMntrngVO fileSysMntrngVO,
		BindingResult bindingResult, ModelMap model) throws Exception {

		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		//濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		String sLocationUrl = "egovframework/com/utl/sys/fsm/EgovFileSysMntrngRegist";

		if (bindingResult.hasErrors()) {
			return sLocationUrl;
		}

		//?꾩씠???ㅼ젙
		fileSysMntrngVO.setFrstRegisterId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
		fileSysMntrngVO.setLastUpdusrId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

		String fileSysNm = fileSysMntrngVO.getFileSysNm();
		String safeFileSysNm = EgovWebUtil.removeCRLF(fileSysNm).replaceAll("\\|", "").replaceAll("&", "");
		fileSysMntrngVO.setFileSysNm(safeFileSysNm);

		fileSysMntrngService.insertFileSysMntrng(fileSysMntrngVO);
		sLocationUrl = "forward:/utl/sys/fsm/selectFileSysMntrngList.do";

		return sLocationUrl;
	}

	/**
	 * ?뚯씪?쒖뒪??紐⑤땲?곕쭅????뺣낫瑜???젣?쒕떎.
	 * @param FileSysMntrng
	 * @return  String
	 *
	 * @param fileSysMntrng
	 */
	@RequestMapping("/utl/sys/fsm/deleteFileSysMntrng.do")
	public String deleteFileSysMntrng(@ModelAttribute("fileSysMntrngVO") FileSysMntrngVO fileSysMntrngVO, ModelMap model) throws Exception {
		// 0. Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}
		fileSysMntrngService.deleteFileSysMntrng(fileSysMntrngVO);
		return "forward:/utl/sys/fsm/selectFileSysMntrngList.do";
	}

	/**
	 * ?뚯씪?쒖뒪?쒖쓽 ?ш린瑜?議고쉶?쒕떎.
	 * @param FileSysMntrng
	 * @return  String
	 *
	 * @param fileSysMntrng
	 */
	@RequestMapping("/utl/sys/fsm/selectFileSysMg.do")
	public String selectFileSysMg(@ModelAttribute("fileSysMntrngVO") FileSysMntrngVO fileSysMntrngVO, ModelMap model) throws Exception {
		//System.out.println("FileSysNm" + fileSysMntrngVO.getFileSysNm());

		int totalSpaceFileSys = 0;
		try {
			totalSpaceFileSys = FileSystemChecker.totalSpaceGb(EgovWebUtil.removeCRLF(fileSysMntrngVO.getFileSysNm()));
		} catch (IOException e) {
			model.addAttribute("notApplicableFileSys", "true");
		}
		model.addAttribute("fileSysMgValue", totalSpaceFileSys);
		model.addAttribute("fileSysMntrngVO", fileSysMntrngVO);

		return "egovframework/com/utl/sys/fsm/EgovFileSysMntrngRegist";
	}

	/**
	 * ?뚯씪?쒖뒪??紐⑤땲?곕쭅濡쒓렇 ?뺣낫?????紐⑸줉??議고쉶?쒕떎.
	 * @param FileSysMntrngLogVO - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅濡쒓렇 VO
	 * @return  String - 由ы꽩 URL
	 *
	 * @param fileSysMntrngLogVO
	 */
	@RequestMapping("/utl/sys/fsm/selectFileSysMntrngLogList.do")
	public String selectFileSysMntrngLogList(@ModelAttribute("searchVO") FileSysMntrngLogVO fileSysMntrngLogVO, ModelMap model) throws Exception {
		//濡쒓렇??媛앹껜 ?좎뼵
		//LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		fileSysMntrngLogVO.setPageUnit(propertyService.getInt("pageUnit"));
		fileSysMntrngLogVO.setPageSize(propertyService.getInt("pageSize"));

		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(fileSysMntrngLogVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(fileSysMntrngLogVO.getPageUnit());
		paginationInfo.setPageSize(fileSysMntrngLogVO.getPageSize());

		fileSysMntrngLogVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		fileSysMntrngLogVO.setLastIndex(paginationInfo.getLastRecordIndex());
		fileSysMntrngLogVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		// 議고쉶湲곌컙?ㅼ젙
		if (fileSysMntrngLogVO.getSearchBgnDe() != null && fileSysMntrngLogVO.getSearchEndDe() != null) {
			if (!fileSysMntrngLogVO.getSearchBgnDe().equals("") && !fileSysMntrngLogVO.getSearchEndDe().equals("")) {
				fileSysMntrngLogVO.setSearchBgnDt(fileSysMntrngLogVO.getSearchBgnDe() + " " + fileSysMntrngLogVO.getSearchBgnHour());
				fileSysMntrngLogVO.setSearchEndDt(fileSysMntrngLogVO.getSearchEndDe() + " " + fileSysMntrngLogVO.getSearchEndHour());
			}
		}

		Map<String, Object> map = fileSysMntrngService.selectFileSysMntrngLogList(fileSysMntrngLogVO);
		int totCnt = Integer.parseInt((String) map.get("resultCnt"));
		paginationInfo.setTotalRecordCount(totCnt);

		@SuppressWarnings("unchecked")
		List<FileSysMntrngLogVO> list = (List<FileSysMntrngLogVO>) map.get("resultList");
		for (int k = 0; k < list.size(); k++) {
			FileSysMntrngLogVO logVO = list.get(k);

			if (logVO.getCreatDt() != null && !logVO.getCreatDt().equals("")) {
				if (logVO.getCreatDt().length() > 18) {
					logVO.setCreatDt(logVO.getCreatDt().substring(0, 19));
				}
			}

			list.set(k, logVO);
			//System.out.println(list.get(k).getCreatDt());
		}

		// 議고쉶?쒖옉??
		model.addAttribute("searchBgnHour", getTimeHH());
		// 議고쉶醫낅즺??
		model.addAttribute("searchEndHour", getTimeHH());

		model.addAttribute("resultList", list);
		model.addAttribute("resultCnt", map.get("resultCnt"));
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/utl/sys/fsm/EgovFileSysMntrngLogList";
	}

	/**
	 * ?뚯씪?쒖뒪??紐⑤땲?곕쭅濡쒓렇 ?뺣낫瑜?議고쉶?쒕떎.
	 * @param FileSysMntrngLogVO - ?ㅽ듃?뚰겕?쒕퉬??紐⑤땲?곕쭅濡쒓렇 VO
	 * @return  String - 由ы꽩 URL
	 *
	 * @param fileSysMntrngLogVO
	 */
	@RequestMapping("/utl/sys/fsm/selectFileSysMntrngLog.do")
	public String selectFileSysMntrngLog(@ModelAttribute("fileSysMntrngLogVO") FileSysMntrngLogVO fileSysMntrngLogVO, ModelMap model) throws Exception {
		FileSysMntrngLogVO fileSysMntrngLog = fileSysMntrngService.selectFileSysMntrngLog(fileSysMntrngLogVO);

		if (fileSysMntrngLog.getCreatDt() != null && !fileSysMntrngLog.getCreatDt().equals("")) {
			if (fileSysMntrngLog.getCreatDt().length() > 18) {
				fileSysMntrngLog.setCreatDt(fileSysMntrngLog.getCreatDt().substring(0, 19));
			}
		}
		model.addAttribute("fileSysMntrngLog", fileSysMntrngLog);

		return "egovframework/com/utl/sys/fsm/EgovFileSysMntrngLogDetail";
	}

	/**
	 * ?쒓컙??LIST瑜?諛섑솚?쒕떎.
	 * @return  List
	 * @throws
	 */
	private List<ComDefaultCodeVO> getTimeHH() {
		List<ComDefaultCodeVO> listHH = new ArrayList<>();
		//HashMap hmHHMM;
		for (int i = 0; i < 24; i++) {
			String sHH = "";
			String strI = String.valueOf(i);
			if (i < 10) {
				sHH = "0" + strI;
			} else {
				sHH = strI;
			}

			ComDefaultCodeVO codeVO = new ComDefaultCodeVO();
			codeVO.setCode(sHH);
			codeVO.setCodeNm(sHH + ":00");

			listHH.add(codeVO);
		}

		return listHH;
	}

}