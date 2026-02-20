package egovframework.com.uss.ion.rmm.web;

import java.util.List;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.uss.ion.rmm.service.EgovRoughMapService;
import egovframework.com.uss.ion.rmm.service.RoughMapDefaultVO;
import egovframework.com.uss.ion.rmm.service.RoughMapVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * <pre>
 * 媛쒖슂
 * -  ?쎈룄 愿由ъ뿉 ???Controller瑜??뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * -  ?쎈룄??????깅줉, ?섏젙, ??젣, 議고쉶, ?곸꽭議고쉶 ?붿껌 ?ы빆??Service? 留ㅽ븨 泥섎━?쒕떎.
 * </pre>
 *
 * @author ?μ갔??
 * @since 2014.08.27
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2014.08.27  ?μ갔??         理쒖큹 ?앹꽦
 *   2022.11.11  源?쒖?          ?쒗걧?댁퐫??泥섎━
 *   2024.10.29  沅뚰깭??         ?곸꽭 ?섏씠吏?먯꽌 紐⑸줉?쇰줈 ?대룞 ??寃??寃곌낵濡??대룞?섍린 ?꾪븳 ?몄옄 ?꾨떖
 *   2025.08.12  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-AvoidReassigningParameters(?섍꺼諛쏅뒗 硫붿냼??parameter 媛믪쓣 吏곸젒 蹂寃쏀븯??肄붾뱶 ?먯?)
 *
 *      </pre>
 */
@Controller
public class EgovRoughMapController {

	/** EgovRoughMapService */
	@Resource(name = "EgovRoughMapService")
	private EgovRoughMapService egovRoughMapService;

	/** EgovPropertyService */
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertyService;

	/**
	 * ?쎈룄 紐⑸줉 議고쉶 Service interface ?몄텧 諛?寃곌낵瑜?諛섑솚?쒕떎.
	 * 
	 * @param RoughMapDefaultVO
	 * @param model
	 * @return String ?쎈룄 紐⑸줉 議고쉶 ?붾㈃
	 * @throws Exception
	 */
	@IncludedInfo(name = "?쎈룄 愿由?, order = 943, gid = 50)
	@RequestMapping("/com/uss/ion/rmm/selectRoughMapList.do")
	public String selectRoughMapList(@ModelAttribute("searchVO") RoughMapDefaultVO searchVO, ModelMap model)
			throws Exception {

		// 沅뚰븳 泥댄겕
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (!isAuthenticated) {
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		searchVO.setPageUnit(propertyService.getInt("pageUnit"));
		searchVO.setPageSize(propertyService.getInt("pageSize"));

		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(searchVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());
		paginationInfo.setPageSize(searchVO.getPageSize());

		searchVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		searchVO.setLastIndex(paginationInfo.getLastRecordIndex());
		searchVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		List<EgovMap> roughMapList = egovRoughMapService.selectRoughMapList(searchVO);

		int totCnt = egovRoughMapService.selectRoughMapListTotCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);

		model.addAttribute("resultList", roughMapList);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/uss/ion/rmm/EgovRoughMapList";
	}

	/**
	 * ?쎈룄 ?곸꽭議고쉶 Service interface ?몄텧 諛?寃곌낵瑜?諛섑솚?쒕떎.
	 * 
	 * @param searchVO
	 * @param model
	 * @return String 嫄대Ъ ?꾩튂?뺣낫 ?곸꽭議고쉶 ?붾㈃
	 * @throws Exception
	 */
	@RequestMapping("/com/uss/ion/rmm/selectRoughMapDetail.do")
	public String selectRoughMap(RoughMapVO searchVO, ModelMap model) throws Exception {

		// 沅뚰븳 泥댄겕
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (!isAuthenticated) {
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		RoughMapVO roughMap = egovRoughMapService.selectRoughMapDetail(searchVO);
		model.addAttribute("roughMap", roughMap);

		return "egovframework/com/uss/ion/rmm/EgovRoughMapDetail";
	}

	/**
	 * ?쎈룄 ?깅줉 ?붾㈃?쇰줈 ?대룞?쒕떎.
	 * 
	 * @param RoughMapDefaultVO
	 * @param model
	 * @return String 嫄대Ъ ?꾩튂?뺣낫 ?깅줉 ?붾㈃
	 * @throws Exception
	 */
	@RequestMapping(value = "/com/uss/ion/rmm/registRoughMap.do")
	public String goRoughMapRegist(@ModelAttribute("roughMap") RoughMapVO roughMap, Model model) throws Exception {
		// 沅뚰븳 泥댄겕
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (!isAuthenticated) {
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		return "egovframework/com/uss/ion/rmm/EgovRoughMapRegist";
	}

	/**
	 * ?쎈룄 ?깅줉 Service interface ?몄텧 諛?寃곌낵瑜?諛섑솚?쒕떎.
	 * 
	 * @param RoughMapVO
	 * @return String 嫄대Ъ ?꾩튂?뺣낫 紐⑸줉 議고쉶 ?붾㈃
	 * @throws Exception
	 */
	@RequestMapping("/com/uss/ion/rmm/insertRoughMap.do")
	public String insertRoughMap(@ModelAttribute("roughMap") RoughMapVO roughMap, BindingResult bindingResult)
			throws Exception {

		// 沅뚰븳 泥댄겕
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (!isAuthenticated) {
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		if (bindingResult.hasErrors()) {
			return "egovframework/com/uss/ion/rmm/EgovRoughMapRegist";
		}

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		// 2022.11.11 ?쒗걧?댁퐫??泥섎━
		roughMap.setFrstRegisterId(user == null ? "" : EgovStringUtil.isNullToString(user.getId()));
		roughMap.setLastUpdusrId(user == null ? "" : EgovStringUtil.isNullToString(user.getId())); // 理쒖쥌?섏젙?륤D
		egovRoughMapService.insertRoughMap(roughMap);

		return "forward:/com/uss/ion/rmm/selectRoughMapList.do";
	}

	/**
	 * ?쎈룄 ?섏젙 ?붾㈃?쇰줈 ?대룞?쒕떎.
	 * 
	 * @param RoughMapDefaultVO
	 * @param model
	 * @return String 嫄대Ъ ?꾩튂?뺣낫 ?섏젙 ?붾㈃
	 * @throws Exception
	 */
	@RequestMapping(value = "/com/uss/ion/rmm/updateRoughMapView.do")
	public String goRoughMapUpdt(@ModelAttribute("roughMap") RoughMapVO roughMap, ModelMap model) throws Exception {

		// 沅뚰븳 泥댄겕
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (!isAuthenticated) {
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		RoughMapVO result = egovRoughMapService.selectRoughMapDetail(roughMap);

		model.addAttribute("result", result);
		model.addAttribute("roughMap", result);

		return "egovframework/com/uss/ion/rmm/EgovRoughMapUpdt";
	}

	/**
	 * ?쎈룄 ?섏젙 Service interface ?몄텧 諛?寃곌낵瑜?諛섑솚?쒕떎.
	 * 
	 * @param RoughMapVO
	 * @return String 嫄대Ъ ?꾩튂?뺣낫 紐⑸줉 議고쉶 ?붾㈃
	 * @throws Exception
	 */
	@RequestMapping(value = "/com/uss/ion/rmm/updateRoughMap.do")
	public String updateRoughMap(@ModelAttribute("roughMap") RoughMapVO roughMap, BindingResult bindingResult)
			throws Exception {

		// 沅뚰븳 泥댄겕
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (!isAuthenticated) {
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		if (bindingResult.hasErrors()) {
			return "egovframework/com/uss/ion/rmm/EgovRoughMapUpdt";
		}

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		// 2022.11.11 ?쒗걧?댁퐫??泥섎━
		roughMap.setLastUpdusrId(user == null ? "" : EgovStringUtil.isNullToString(user.getId()));
		egovRoughMapService.updateRoughMap(roughMap);

		return "forward:/com/uss/ion/rmm/selectRoughMapList.do";
	}

	/**
	 * ?쎈룄 ??젣 Service interface ?몄텧 諛?寃곌낵瑜?諛섑솚?쒕떎.
	 * 
	 * @param RoughMapVO
	 * @return String 嫄대Ъ ?꾩튂?뺣낫 紐⑸줉 議고쉶 ?붾㈃
	 * @throws Exception
	 */
	@RequestMapping(value = "/com/uss/ion/rmm/deleteRoughMap.do")
	public String deleteRoughMap(@ModelAttribute("roughMap") RoughMapVO roughMap) throws Exception {

		// 沅뚰븳 泥댄겕
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();

		if (!isAuthenticated) {
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		// ?ъ슜???몄쬆?щ? ?먮떒
		// 2022.11.11 ?쒗걧?댁퐫??泥섎━
		roughMap.setFrstRegisterId(user == null ? "" : EgovStringUtil.isNullToString(user.getId()));
		egovRoughMapService.deleteRoughMap(roughMap);

		return "forward:/com/uss/ion/rmm/selectRoughMapList.do";
	}

}