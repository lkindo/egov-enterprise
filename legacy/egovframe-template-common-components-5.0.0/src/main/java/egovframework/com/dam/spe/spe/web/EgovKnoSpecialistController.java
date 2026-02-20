package egovframework.com.dam.spe.spe.web;

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

import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.dam.map.mat.service.EgovMapMaterialService;
import egovframework.com.dam.map.mat.service.MapMaterial;
import egovframework.com.dam.map.mat.service.MapMaterialVO;
import egovframework.com.dam.map.tea.service.EgovMapTeamService;
import egovframework.com.dam.map.tea.service.MapTeamVO;
import egovframework.com.dam.spe.spe.service.EgovKnoSpecialistService;
import egovframework.com.dam.spe.spe.service.KnoSpecialist;
import egovframework.com.dam.spe.spe.service.KnoSpecialistVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * <pre>
 * 媛쒖슂
 * - 吏?앹쟾臾멸??????controller ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - 吏?앹쟾臾멸???????깅줉, ?섏젙, ??젣, 議고쉶 湲곕뒫???쒓났?쒕떎.
 * - 吏?앹쟾臾멸???議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * </pre>
 * 
 * @author 諛뺤쥌??
 * @since 2010.08.12
 * @version 1.0
 * @see
 * 
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.08.12  諛뺤쥌??         理쒖큹 ?앹꽦
 *   2011.08.26  ?뺤쭊??         IncludedInfo annotation 異붽?
 *   2025.06.19  ?대갚??         PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(吏??蹂??紐낅챸 洹쒖튃)
 *
 *      </pre>
 */
@Controller
public class EgovKnoSpecialistController {

	@Resource(name = "MapMaterialService")
	public EgovMapMaterialService mapMaterialService;

	@Resource(name = "MapTeamService")
	private EgovMapTeamService mapTeamService;

	@Resource(name = "KnoSpecialistService")
	private EgovKnoSpecialistService knoSpecialistService;

	/** EgovPropertyService */
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	/** EgovMessageSource */
	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	/**
	 * ?깅줉??吏?앹쟾臾멸? ?뺣낫瑜?議고쉶 ?쒕떎.
	 * 
	 * @param KnoSpecialistVO- 吏?앹쟾臾멸? VO
	 * @return String - 由ы꽩 Url
	 *
	 * @param KnoSpecialistVO
	 */
	@IncludedInfo(name = "吏?앹쟾臾멸?愿由?, listUrl = "/dam/spe/spe/EgovComDamSpecialistList.do", order = 1270, gid = 80)
	@RequestMapping(value = "/dam/spe/spe/EgovComDamSpecialistList.do")
	public String selectKnoSpecialistList(@ModelAttribute("loginVO") LoginVO loginVO,
			@ModelAttribute("searchVO") KnoSpecialistVO searchVO, ModelMap model) throws Exception {

		/** EgovPropertyService.mapMaterial */
		searchVO.setPageUnit(propertiesService.getInt("pageUnit"));
		searchVO.setPageSize(propertiesService.getInt("pageSize"));

		/** paging */
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(searchVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());
		paginationInfo.setPageSize(searchVO.getPageSize());

		searchVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		searchVO.setLastIndex(paginationInfo.getLastRecordIndex());
		searchVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		List<KnoSpecialistVO> resultList = knoSpecialistService.selectKnoSpecialistList(searchVO);
		model.addAttribute("resultList", resultList);

		int totCnt = knoSpecialistService.selectKnoSpecialistTotCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/dam/spe/spe/EgovComDamSpecialistList";
	}

	/**
	 * 吏?앹쟾臾멸? ?곸꽭 ?뺣낫瑜?議고쉶 ?쒕떎.
	 * 
	 * @param KonSpecialistVO - 吏?앹쟾臾멸? VO
	 * @return String - 由ы꽩 Url
	 *
	 * @param KonSpecialistVO
	 */
	@RequestMapping(value = "/dam/spe/spe/EgovComDamSpecialist.do")
	public String selectKnoSpecialist(@ModelAttribute("loginVO") LoginVO loginVO, KnoSpecialist knoSpecialist,
			ModelMap model, @RequestParam Map<?, ?> commandMap) throws Exception {
		KnoSpecialist vo = knoSpecialistService.selectKnoSpecialist(knoSpecialist);
		model.addAttribute("result", vo);
		return "egovframework/com/dam/spe/spe/EgovComDamSpecialistDetail";
	}

	/**
	 * 吏?앹쟾臾멸? ?뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * 
	 * @param speNm - 吏?앹쟾臾멸? model
	 * @return String - 由ы꽩 Url
	 *
	 * @param speNm
	 */
	@RequestMapping(value = "/dam/spe/spe/EgovComDamSpecialistRegist.do")
	public String insertKnoSpecialist(@Valid @ModelAttribute("knoSpecialist") KnoSpecialist knoSpecialist,
			@ModelAttribute("mapMaterial") MapMaterial mapMaterial, BindingResult bindingResult,
			@RequestParam Map<?, ?> commandMap, ModelMap model) throws Exception {

		// Spring Security ?ъ슜?먭텒??泥섎━
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");

		if (knoSpecialist.getSpeId() == null || knoSpecialist.getSpeId().equals("") || sCmd.equals("")) {

			MapTeamVO searchVO;
			searchVO = new MapTeamVO();
			searchVO.setRecordCountPerPage(999999);
			searchVO.setFirstIndex(0);
			searchVO.setSearchCondition("MaterialList");
			List<MapTeamVO> mapTeamList = mapTeamService.selectMapTeamList(searchVO);
			model.addAttribute("mapTeamList", mapTeamList);

			MapMaterialVO searchMatVO;
			searchMatVO = new MapMaterialVO();
			searchMatVO.setRecordCountPerPage(999999);
			searchMatVO.setFirstIndex(0);
			searchMatVO.setSearchCondition("orgnztId");
			searchMatVO.setSearchKeyword(mapMaterial.getOrgnztId());

			List<MapMaterialVO> mapMaterialList = mapMaterialService.selectMapMaterialList(searchMatVO);
			model.addAttribute("mapMaterialList", mapMaterialList);

			return "egovframework/com/dam/spe/spe/EgovComDamSpecialistRegist";

		} else if (sCmd.equals("Regist")) {

			if (bindingResult.hasErrors()) {

				MapTeamVO searchVO;
				searchVO = new MapTeamVO();
				searchVO.setRecordCountPerPage(999999);
				searchVO.setFirstIndex(0);
				List<MapTeamVO> mapTeamList = mapTeamService.selectMapTeamList(searchVO);
				model.addAttribute("mapTeamList", mapTeamList);

				MapMaterialVO searchMatVO;
				searchMatVO = new MapMaterialVO();
				searchMatVO.setRecordCountPerPage(999999);
				searchMatVO.setFirstIndex(0);
				searchMatVO.setSearchCondition("orgnztId");

				if (mapMaterial.getOrgnztId().equals("")) {
					MapTeamVO emp = mapTeamList.get(0);
					mapMaterial.setOrgnztId(emp.getOrgnztId());
				}
				searchMatVO.setSearchKeyword(mapMaterial.getOrgnztId());

				List<MapMaterialVO> mapMaterialList = mapMaterialService.selectMapMaterialList(searchMatVO);
				model.addAttribute("mapMaterialList", mapMaterialList);

				return "egovframework/com/dam/spe/spe/EgovComDamSpecialistRegist";
			}

			// ?꾩씠???ㅼ젙
			knoSpecialist.setFrstRegisterId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
			knoSpecialist.setLastUpdusrId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

			knoSpecialistService.insertKnoSpecialist(knoSpecialist);
			return "forward:/dam/spe/spe/EgovComDamSpecialistList.do";

		} else {
			return "forward:/dam/spe/spe/EgovComDamSpecialistList.do";
		}

	}

	/**
	 * 湲??깅줉 ??吏?앹쟾臾멸? ?뺣낫瑜??섏젙 ?쒕떎.
	 * 
	 * @param speNm - 吏?앹쟾臾멸? model
	 * @return String - 由ы꽩 Url
	 *
	 * @param speNm
	 */
	@RequestMapping(value = "/dam/spe/spe/EgovComDamSpecialistModify.do")
	public String updateKnoSpecialist(@Valid @ModelAttribute("speId") KnoSpecialist knoSpecialist, BindingResult bindingResult,
			@RequestParam Map<?, ?> commandMap, ModelMap model) throws Exception {

		// 濡쒓렇??媛앹껜 ?좎뼵
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");
		if (sCmd.equals("")) {
			KnoSpecialist vo = knoSpecialistService.selectKnoSpecialist(knoSpecialist);
			model.addAttribute("knoSpecialist", vo);
			return "egovframework/com/dam/spe/spe/EgovComDamSpecialistModify";
		} else if (sCmd.equals("Modify")) {
			if (bindingResult.hasErrors()) {
				KnoSpecialist vo = knoSpecialistService.selectKnoSpecialist(knoSpecialist);
				model.addAttribute("knoSpecialist", vo);
				return "egovframework/com/dam/spe/spe/EgovComDamSpecialistModify";
			}

			// ?꾩씠???ㅼ젙
			knoSpecialist.setFrstRegisterId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
			knoSpecialist.setLastUpdusrId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

			knoSpecialistService.updateKnoSpecialist(knoSpecialist);
			return "forward:/dam/spe/spe/EgovComDamSpecialistList.do";
		} else {
			return "forward:/dam/spe/spe/EgovComDamSpecialistList.do";
		}
	}

	/**
	 * 湲??깅줉??吏?앹쟾臾멸? ?뺣낫瑜???젣?쒕떎.
	 * 
	 * @param siteUrl - 吏?앹쟾臾멸? model
	 * @return String - 由ы꽩 Url
	 *
	 * @param speNm
	 */
	@RequestMapping(value = "/dam/spe/spe/EgovComDamSpecialistRemove.do")
	public String deleteKnoSpecialist(@ModelAttribute("loginVO") LoginVO loginVO, KnoSpecialist knoSpecialist,
			ModelMap model) throws Exception {
		knoSpecialistService.deleteKnoSpecialist(knoSpecialist);
		return "forward:/dam/spe/spe/EgovComDamSpecialistList.do";
	}

}