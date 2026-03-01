package egovframework.com.dam.map.tea.web;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.dam.map.tea.service.EgovMapTeamService;
import egovframework.com.dam.map.tea.service.MapTeam;
import egovframework.com.dam.map.tea.service.MapTeamVO;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * <pre>
 * 媛쒖슂
 * - 吏?앸㏊(議곗쭅蹂??????controller ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - 吏?앸㏊(議곗쭅蹂???????깅줉, ?섏젙, ??젣, 議고쉶 湲곕뒫???쒓났?쒕떎.
 * - 吏?앸㏊(議곗쭅蹂???議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * </pre>
 * 
 * @author 諛뺤쥌??
 * @since 2010.07.22
 * @version 1.0
 * @see
 * 
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.07.22  諛뺤쥌??         理쒖큹 ?앹꽦
 *   2011.08.26  ?뺤쭊??         IncludedInfo annotation 異붽?
 *   2018.08.03  ?좎슜??         updateMapTeam method ?섏젙 ?딅릺??臾몄젣 泥섎━
 *   2025.06.16  ?대갚??         PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(吏??蹂??紐낅챸 洹쒖튃)
 *
 *      </pre>
 */

@Controller
public class EgovMapTeamController {

	@Resource(name = "MapTeamService")
	private EgovMapTeamService mapTeamService;

	/** EgovPropertyService */
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	/**
	 * ?깅줉??吏?앸㏊(議곗쭅蹂? ?뺣낫瑜?議고쉶 ?쒕떎.
	 * 
	 * @param mapTeamVO- 吏?앸㏊(議곗쭅蹂? VO
	 * @return String - 由ы꽩 Url
	 *
	 * @param MapTeamVO
	 */
	@IncludedInfo(name = "吏?앸㏊愿由?議곗쭅)", listUrl = "/dam/map/tea/EgovComDamMapTeamList.do", order = 1261, gid = 80)
	@RequestMapping(value = "/dam/map/tea/EgovComDamMapTeamList.do")
	public String selectMapTeamList(@ModelAttribute("loginVO") LoginVO loginVO,
			@ModelAttribute("searchVO") MapTeamVO searchVO, ModelMap model) throws Exception {
		/** EgovPropertyService.mapTeam */
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

		List<MapTeamVO> resultList = mapTeamService.selectMapTeamList(searchVO);
		model.addAttribute("resultList", resultList);

		int totCnt = mapTeamService.selectMapTeamTotCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);
		return "egovframework/com/dam/map/tea/EgovComDamMapTeamList";
	}

	/**
	 * 吏?앸㏊(議곗쭅蹂??곸꽭 ?뺣낫瑜?議고쉶 ?쒕떎.
	 * 
	 * @param MapTeamVO - 吏?앸㏊(議곗쭅蹂? VO
	 * @return String - 由ы꽩 Url
	 *
	 * @param MapTeamVO
	 */
	@RequestMapping(value = "/dam/map/tea/EgovComDamMapTeamDetail.do")
	public String selectMapTeamDetail(@ModelAttribute("loginVO") LoginVO loginVO, MapTeam mapTeam, ModelMap model)
			throws Exception {
		MapTeam vo = mapTeamService.selectMapTeamDetail(mapTeam);
		model.addAttribute("result", vo);
		return "egovframework/com/dam/map/tea/EgovComDamMapTeamDetail";
	}

	/**
	 * 吏?앸㏊(議곗쭅蹂? ?뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * 
	 * @param orgnztNm - 吏?앸㏊(議곗쭅蹂? model
	 * @return String - 由ы꽩 Url
	 *
	 * @param mapTeam
	 */
	@RequestMapping(value = "/dam/map/tea/EgovComDamMapTeamRegist.do")
	public String insertMapTeam(@ModelAttribute("loginVO") LoginVO loginVO, @Valid @ModelAttribute("mapTeam") MapTeam mapTeam,
			BindingResult bindingResult) throws Exception {
		if (mapTeam.getOrgnztNm() == null || mapTeam.getOrgnztNm().equals("")) {
			return "egovframework/com/dam/map/tea/EgovComDamMapTeamRegist";
		}

		if (bindingResult.hasErrors()) {
			return "egovframework/com/dam/map/tea/EgovComDamMapTeamRegist";
		}

		mapTeam.setFrstRegisterId(loginVO.getUniqId());
		try {
			mapTeamService.insertMapTeam(mapTeam);
			return "forward:/dam/map/tea/EgovComDamMapTeamList.do";
		} catch (DuplicateKeyException e) {
			bindingResult.rejectValue("orgnztId", "error.orgnztId", "?대? ?깅줉??議곗쭅ID?낅땲??");
			return "egovframework/com/dam/map/tea/EgovComDamMapTeamRegist";
		}
	}

	/**
	 * 湲??깅줉 ??吏?앸㏊(議곗쭅蹂?留??뺣낫瑜??섏젙 ?쒕떎.
	 * 
	 * @param orgnztNm - 吏?앸㏊(議곗쭅蹂? model
	 * @return String - 由ы꽩 Url
	 *
	 * @param mapTeam
	 */
	@RequestMapping(value = "/dam/map/tea/EgovComDamMapTeamModify.do")
	public String updateMapTeam(@ModelAttribute("loginVO") LoginVO loginVO, @Valid @ModelAttribute("mapTeam") MapTeam mapTeam,
			BindingResult bindingResult, @RequestParam Map<?, ?> commandMap, ModelMap model) throws Exception {
		String sCmd = commandMap.get("cmd") == null ? "" : (String) commandMap.get("cmd");
		if (sCmd.equals("")) {
			MapTeam vo = mapTeamService.selectMapTeamDetail(mapTeam);
			model.addAttribute("mapTeam", vo);
			return "egovframework/com/dam/map/tea/EgovComDamMapTeamModify";
		} else if (sCmd.equals("Modify")) {
			if (bindingResult.hasErrors()) {
				return "egovframework/com/dam/map/tea/EgovComDamMapTeamModify";
			}
			mapTeam.setFrstRegisterId(loginVO.getUniqId());
			mapTeamService.updateMapTeam(mapTeam);
			return "forward:/dam/map/tea/EgovComDamMapTeamList.do";
		} else {
			return "forward:/dam/map/tea/EgovComDamMapTeamList.do";
		}
	}

	/**
	 * 湲??깅줉??吏?앸㏊(議곗쭅蹂? ?뺣낫瑜???젣?쒕떎.
	 * 
	 * @param orgnztNm - 吏?앸㏊(議곗쭅蹂? model
	 * @return String - 由ы꽩 Url
	 *
	 * @param orgnztNm
	 */
	@RequestMapping(value = "/dam/map/tea/EgovComDamMapTeamRemove.do")
	public String deleteMapTeam(@ModelAttribute("loginVO") LoginVO loginVO, MapTeam mapTeam, ModelMap model)
			throws Exception {
		mapTeamService.deleteMapTeam(mapTeam);
		return "forward:/dam/map/tea/EgovComDamMapTeamList.do";
	}

}
