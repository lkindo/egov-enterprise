package egovframework.com.dam.map.mat.web;

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
import org.springframework.web.servlet.ModelAndView;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.dam.map.mat.service.EgovMapMaterialService;
import egovframework.com.dam.map.mat.service.MapMaterial;
import egovframework.com.dam.map.mat.service.MapMaterialVO;
import egovframework.com.dam.map.tea.service.EgovMapTeamService;
import egovframework.com.dam.map.tea.service.MapTeamVO;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * <pre>
 * 媛쒖슂
 * - 吏?앸㏊(吏?앹쑀???????controller ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - 吏?앸㏊(吏?앹쑀????????깅줉, ?섏젙, ??젣, 議고쉶 湲곕뒫???쒓났?쒕떎.
 * - 吏?앸㏊(吏?앹쑀????議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
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
 *   2025.06.14  ?대갚??         PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(吏??蹂??紐낅챸 洹쒖튃)
 *
 *      </pre>
 */

@Controller
public class EgovMapMaterialController {

	@Resource(name = "MapTeamService")
	private EgovMapTeamService mapTeamService;

	@Resource(name = "MapMaterialService")
	public EgovMapMaterialService mapMaterialService;

	/** EgovPropertyService */
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	/**
	 * ?깅줉??吏?앸㏊(吏?앹쑀?? ?뺣낫瑜?議고쉶 ?쒕떎.
	 * 
	 * @param mapMaterialVO- 吏?앸㏊(吏?앹쑀?? VO
	 * @return String - 由ы꽩 Url
	 *
	 * @param MapMaterialVO
	 */
	@IncludedInfo(name = "吏?앸㏊愿由??좏삎)", listUrl = "/dam/map/mat/EgovComDamMapMaterialList.do", order = 1260, gid = 80)
	@RequestMapping(value = "/dam/map/mat/EgovComDamMapMaterialList.do")
	public String selectMapMaterialList(@ModelAttribute("loginVO") LoginVO loginVO,
			@ModelAttribute("searchVO") MapMaterialVO searchVO, ModelMap model) throws Exception {

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

		List<MapMaterialVO> resultList = mapMaterialService.selectMapMaterialList(searchVO);
		model.addAttribute("resultList", resultList);

		int totCnt = mapMaterialService.selectMapMaterialTotCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/dam/map/mat/EgovComDamMapMaterialList";
	}

	/**
	 * 吏?앸㏊(吏?앹쑀???곸꽭 ?뺣낫瑜?議고쉶 ?쒕떎.
	 * 
	 * @param MapMaterialVO - 吏?앸㏊(吏?앹쑀?? VO
	 * @return String - 由ы꽩 Url
	 *
	 * @param MapMaterialVO
	 */
	@RequestMapping(value = "/dam/map/mat/EgovComDamMapMaterial.do")
	public String selectMapMaterial(@ModelAttribute("loginVO") LoginVO loginVO, MapMaterial mapMaterial, ModelMap model)
			throws Exception {
		MapMaterial vo = mapMaterialService.selectMapMaterial(mapMaterial);
		model.addAttribute("result", vo);
		return "egovframework/com/dam/map/mat/EgovComDamMapMaterialDetail";
	}

	/**
	 * 吏?앸㏊(吏?앹쑀?? ?뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * 
	 * @param konTypeNm - 吏?앸㏊(吏?앹쑀?? model
	 * @return String - 由ы꽩 Url
	 *
	 * @param MapMaterialVO
	 */
	@RequestMapping(value = "/dam/map/mat/EgovComDamMapMaterialRegist.do")
	public String insertMapMaterial(@ModelAttribute("loginVO") LoginVO loginVO,
			@Valid @ModelAttribute("mapMaterial") MapMaterial mapMaterial, BindingResult bindingResult, ModelMap model)
			throws Exception {
		if (mapMaterial.getKnoTypeCd() == null || mapMaterial.getKnoTypeCd().equals("")) {

			MapTeamVO searchVO;
			searchVO = new MapTeamVO();
			searchVO.setRecordCountPerPage(999999);
			searchVO.setFirstIndex(0);
			searchVO.setSearchCondition("MapTeamList");
			List<MapTeamVO> mapTeam = mapTeamService.selectMapTeamList(searchVO);
			model.addAttribute("mapTeam", mapTeam);

			return "egovframework/com/dam/map/mat/EgovComDamMapMaterialRegist";
		}

		if (bindingResult.hasErrors()) {

			MapTeamVO searchVO;
			searchVO = new MapTeamVO();
			searchVO.setRecordCountPerPage(999999);
			searchVO.setFirstIndex(0);
			searchVO.setSearchCondition("MapTeamList");
			List<MapTeamVO> mapTeam = mapTeamService.selectMapTeamList(searchVO);
			model.addAttribute("mapTeam", mapTeam);

			return "egovframework/com/dam/map/mat/EgovComDamMapMaterialRegist";
		}

		mapMaterial.setFrstRegisterId(loginVO.getUniqId());
		mapMaterialService.insertMapMaterial(mapMaterial);
		return "forward:/dam/map/mat/EgovComDamMapMaterialList.do";
	}

	/**
	 * 湲??깅줉 ??吏?앸㏊(吏?앹쑀??留??뺣낫瑜??섏젙 ?쒕떎.
	 * 
	 * @param konTypeNm - 吏?앸㏊(吏?앹쑀?? model
	 * @return String - 由ы꽩 Url
	 *
	 * @param MapMaterialVO
	 */
	@RequestMapping(value = "/dam/map/mat/EgovComDamMapMaterialModify.do")
	public String updateMapMaterial(@ModelAttribute("loginVO") LoginVO loginVO,
			@Valid @ModelAttribute("knoTypeCd") MapMaterial mapMaterial, BindingResult bindingResult,
			@RequestParam Map<?, ?> commandMap, ModelMap model) throws Exception {
		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");
		if (sCmd.equals("")) {
			MapMaterial vo = mapMaterialService.selectMapMaterial(mapMaterial);
			model.addAttribute("mapMaterial", vo);
			return "egovframework/com/dam/map/mat/EgovComDamMapMaterialModify";
		} else if (sCmd.equals("Modify")) {
			if (bindingResult.hasErrors()) {
				MapMaterial vo = mapMaterialService.selectMapMaterial(mapMaterial);
				model.addAttribute("mapMaterial", vo);
				return "egovframework/com/dam/map/mat/EgovComDamMapMaterialModify";
			}
			mapMaterial.setFrstRegisterId(loginVO.getUniqId());
			mapMaterialService.updateMapMaterial(mapMaterial);
			return "forward:/dam/map/mat/EgovComDamMapMaterialList.do";
		} else {
			return "forward:/dam/map/mat/EgovComDamMapMaterialList.do";
		}
	}

	/**
	 * 湲??깅줉??吏?앸㏊(吏?앹쑀?? ?뺣낫瑜???젣?쒕떎.
	 * 
	 * @param konTypeNm - 吏?앸㏊(吏?앹쑀?? model
	 * @return String - 由ы꽩 Url
	 *
	 * @param MapMaterialVO
	 */
	@RequestMapping(value = "/dam/map/mat/EgovComDamMapMaterialRemove.do")
	public String deleteMapMaterial(@ModelAttribute("loginVO") LoginVO loginVO, MapMaterial mapMaterial, ModelMap model)
			throws Exception {
		mapMaterialService.deleteMapMaterial(mapMaterial);
		return "forward:/dam/map/mat/EgovComDamMapMaterialList.do";
	}

	/**
	 * 吏?앹쑀?뺤퐫??以묐났 ?щ? 泥댄겕(?꾩튂 : 1260.吏?앸㏊愿由??좏삎) > ?깅줉)
	 * 
	 * @param commandMap
	 * @return
	 * @throws Exception
	 */
	@RequestMapping(value = "/dam/map/mat/EgovKnoTypeCdCheckAjax.do")
	public ModelAndView EgovKnoTypeCdCheckAjax(@RequestParam Map<String, Object> commandMap) throws Exception {
		ModelAndView modelAndView = new ModelAndView();
		modelAndView.setViewName("jsonView");

		String knoTypeCd = (String) commandMap.get("knoTypeCd");
		int checkCount = mapMaterialService.knoTypeCdCheck(knoTypeCd);
		modelAndView.addObject("checkCount", checkCount);

		return modelAndView;
	}
}