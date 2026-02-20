package egovframework.com.ssi.syi.ist.web;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.ssi.syi.ist.service.CntcSttus;
import egovframework.com.ssi.syi.ist.service.CntcSttusVO;
import egovframework.com.ssi.syi.ist.service.EgovCntcSttusService;
import jakarta.annotation.Resource;

/**
 * ?곌퀎?꾪솴 愿由ъ뿉 愿???붿껌??諛쏆븘 ?쒕퉬???대옒?ㅻ줈 ?붿껌???꾨떖?섍퀬 ?쒕퉬?ㅽ겢?섏뒪?먯꽌 泥섎━??寃곌낵瑜????붾㈃?쇰줈 ?꾨떖???꾪븳
 * Controller瑜??뺤쓽?쒕떎
 * 
 * @author 怨듯넻?쒕퉬??媛쒕컻? ?댁쨷??
 * @since 2009.04.01
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.04.01  ?댁쨷??         理쒖큹 ?앹꽦
 *   2011.08.26  ?뺤쭊??         IncludedInfo annotation 異붽?
 *   2025.06.30  ?대갚??         而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-FormalParameterNamingConventions, LocalVariableNamingConventions
 *
 *      </pre>
 */
@Controller
public class EgovCntcSttusController {

	@Resource(name = "CntcSttusService")
	private EgovCntcSttusService cntcSttusService;

	/** EgovPropertyService */
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	/**
	 * ?곌퀎?꾪솴 ?곸꽭?댁뿭??議고쉶?쒕떎.
	 * 
	 * @param loginVO
	 * @param cntcSttus
	 * @param model
	 * @return "egovframework/com/cmm/sym/ccm/EgovCcmCntcSttusDetail"
	 * @throws Exception
	 */
	@RequestMapping(value = "/ssi/syi/ist/getCntcSttusDetail.do")
	public String selectCntcSttusLogDetail(CntcSttus cntcSttus, ModelMap model) throws Exception {
		CntcSttus vo = cntcSttusService.selectCntcSttusDetail(cntcSttus);
		model.addAttribute("result", vo);

		return "egovframework/com/ssi/syi/ist/EgovCntcSttusDetail";
	}

	/**
	 * ?곌퀎?꾪솴 紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param loginVO
	 * @param searchVO
	 * @param model
	 * @return "egovframework/com/cmm/sym/ccm/EgovCcmCntcSttusList"
	 * @throws Exception
	 */
	@IncludedInfo(name = "?곌퀎?꾪솴愿由?, listUrl = "/ssi/syi/ist/getCntcSttusList.do", order = 1220, gid = 70)
	@RequestMapping(value = "/ssi/syi/ist/getCntcSttusList.do")
	public String selectCntcSttusLogList(@ModelAttribute("searchVO") CntcSttusVO searchVO, ModelMap model)
			throws Exception {
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

		List<EgovMap> resultList = cntcSttusService.selectCntcSttusList(searchVO);
		model.addAttribute("resultList", resultList);

		int totCnt = cntcSttusService.selectCntcSttusListTotCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/ssi/syi/ist/EgovCntcSttusList";
	}

	/**
	 * Map ?댁슜???뺤씤?쒕떎.
	 * 
	 * @param commandMap
	 * @return
	 */
	public String printParameterMap(@RequestParam Map<?, ?> commandMap) {
		String ret = "";
		for (Object key : commandMap.keySet()) {
			Object value = commandMap.get(key);

			ret += "key:" + key.toString() + " value:" + value.toString();
		}
		return ret;
	}

}