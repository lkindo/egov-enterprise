package egovframework.com.sym.ccm.adc.web;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.sym.ccm.adc.service.AdministCode;
import egovframework.com.sym.ccm.adc.service.AdministCodeVO;
import egovframework.com.sym.ccm.adc.service.EgovCcmAdministCodeManageService;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * ?됱젙肄붾뱶??愿???붿껌??諛쏆븘 ?쒕퉬???대옒?ㅻ줈 ?붿껌???꾨떖?섍퀬 ?쒕퉬?ㅽ겢?섏뒪?먯꽌 泥섎━??寃곌낵瑜????붾㈃?쇰줈 ?꾨떖???꾪븳 Controller瑜?
 * ?뺤쓽?쒕떎
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
 *   2024.10.29  沅뚰깭??         ?깅줉 & ?섏젙???붾㈃怨??곗씠?곕? 泥섎━?섎뒗 method 遺꾨━, validation ?곸슜
 *   2025.07.05  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(final???꾨땶 蹂?섎뒗 諛묒쨪???ы븿?????놁쓬)
 *
 *      </pre>
 */
@Controller
public class EgovCcmAdministCodeManageController {

	@Resource(name = "AdministCodeManageService")
	private EgovCcmAdministCodeManageService administCodeManageService;

	/** EgovPropertyService */
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	/**
	 * ?됱젙肄붾뱶瑜???젣?쒕떎.
	 * 
	 * @param loginVO
	 * @param administCode
	 * @param model
	 * @return "forward:/sym/ccm/adc/EgovCcmAdministCodeList.do"
	 * @throws Exception
	 */
	@RequestMapping(value = "/sym/ccm/adc/EgovCcmAdministCodeRemove.do")
	public String deleteAdministCode(@ModelAttribute("loginVO") LoginVO loginVO, AdministCode administCode,
			ModelMap model) throws Exception {
		administCodeManageService.deleteAdministCode(administCode);
		return "forward:/sym/ccm/adc/EgovCcmAdministCodeList.do";
	}

	/**
	 * ?됱젙肄붾뱶瑜??깅줉?붾㈃
	 * 
	 * @param loginVO
	 * @param administCode
	 * @param model
	 * @return "egovframework/com/sym/ccm/adc/EgovCcmAdministCodeRegist"
	 * @throws Exception
	 */
	@RequestMapping(value = "/sym/ccm/adc/EgovCcmAdministCodeRegistView.do")
	public String insertAdministCodeView(@ModelAttribute("loginVO") LoginVO loginVO,
			@ModelAttribute("administCode") AdministCode administCode, ModelMap model) throws Exception {

		return "egovframework/com/sym/ccm/adc/EgovCcmAdministCodeRegist";

	}

	/**
	 * ?됱젙肄붾뱶瑜??깅줉?쒕떎.
	 * 
	 * @param loginVO
	 * @param administCode
	 * @param bindingResult
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping(value = "/sym/ccm/adc/EgovCcmAdministCodeRegist.do")
	public String insertAdministCode(@ModelAttribute("loginVO") LoginVO loginVO,
			@Valid @ModelAttribute("administCode") AdministCode administCode, BindingResult bindingResult, ModelMap model)
			throws Exception {

		if (bindingResult.hasErrors()) {
			return "egovframework/com/sym/ccm/adc/EgovCcmAdministCodeRegist";
		}

		AdministCode vo = administCodeManageService.selectAdministCodeDetail(administCode);
		if (vo != null) {
			administCode.setAdministZoneNm("");
			administCode.setAdministZoneCode("");
			model.addAttribute("message", "?대? ?깅줉???됱젙援ъ뿭肄붾뱶媛 議댁옱?⑸땲??");
			return "egovframework/com/sym/ccm/adc/EgovCcmAdministCodeRegist";
		}

		administCode.setFrstRegisterId(loginVO.getUniqId());
		administCodeManageService.insertAdministCode(administCode);

		return "redirect:/sym/ccm/adc/EgovCcmAdministCodeList.do";
	}

	/**
	 * ?됱젙肄붾뱶 ?곸꽭??ぉ??議고쉶?쒕떎.
	 * 
	 * @param loginVO
	 * @param administCode
	 * @param model
	 * @return "egovframework/com/sym/ccm/adc/EgovCcmAdministCodeDetail"
	 * @throws Exception
	 */
	@RequestMapping(value = "/sym/ccm/adc/EgovCcmAdministCodeDetail.do")
	public String selectAdministCodeDetail(@ModelAttribute("loginVO") LoginVO loginVO, AdministCode administCode,
			ModelMap model) throws Exception {
		AdministCode vo = administCodeManageService.selectAdministCodeDetail(administCode);
		model.addAttribute("result", vo);

		return "egovframework/com/sym/ccm/adc/EgovCcmAdministCodeDetail";
	}

	/**
	 * ?됱젙肄붾뱶 紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param loginVO
	 * @param searchVO
	 * @param model
	 * @return "egovframework/com/sym/ccm/adc/EgovCcmAdministCodeList"
	 * @throws Exception
	 */
	@IncludedInfo(name = "?됱젙肄붾뱶愿由?, order = 1010, gid = 60)
	@RequestMapping(value = "/sym/ccm/adc/EgovCcmAdministCodeList.do")
	public String selectAdministCodeList(@ModelAttribute("loginVO") LoginVO loginVO,
			@ModelAttribute("searchVO") AdministCodeVO searchVO, ModelMap model) throws Exception {
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

		List<EgovMap> resultList = administCodeManageService.selectAdministCodeList(searchVO);
		model.addAttribute("resultList", resultList);

		int totCnt = administCodeManageService.selectAdministCodeListTotCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/sym/ccm/adc/EgovCcmAdministCodeList";
	}

	/**
	 * ?쇰컲?щ젰 ?앹뾽 硫붿씤李쎌쓣 ?몄텧?쒕떎.
	 * 
	 * @param model
	 * @return "egovframework/com/sym/ccm/adc/EgovCcmAdministCodePopup"
	 * @throws Exception
	 */
	@RequestMapping(value = "/sym/ccm/adc/EgovCcmAdministCodePopup.do")
	public String callAdministCodePopup(ModelMap model) throws Exception {
		return "egovframework/com/sym/ccm/adc/EgovCcmAdministCodePopup";
	}

	/**
	 * ?됱젙肄붾뱶 ?앹뾽 紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param loginVO
	 * @param searchVO
	 * @param model
	 * @return "egovframework/com/sym/ccm/adc/EgovCcmAdministCode"
	 * @throws Exception
	 */
	@RequestMapping(value = "/sym/ccm/adc/EgovCcmAdministCode.do")
	public String selectAdministCode(@ModelAttribute("loginVO") LoginVO loginVO,
			@ModelAttribute("searchVO") AdministCodeVO searchVO, ModelMap model) throws Exception {
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

		List<EgovMap> resultList = administCodeManageService.selectAdministCodeList(searchVO);
		model.addAttribute("resultList", resultList);

		int totCnt = administCodeManageService.selectAdministCodeListTotCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/sym/ccm/adc/EgovCcmAdministCode";
	}

	/**
	 * ?됱젙肄붾뱶 ?섏젙?붾㈃
	 * 
	 * @param loginVO
	 * @param administCode
	 * @param model
	 * @return "egovframework/com/sym/ccm/adc/EgovCcmAdministCodeModify"
	 * @throws Exception
	 */
	@RequestMapping(value = "/sym/ccm/adc/EgovCcmAdministCodeModifyView.do")
	public String updateAdministCodeView(@ModelAttribute("loginVO") LoginVO loginVO,
			@ModelAttribute("administCode") AdministCode administCode, ModelMap model) throws Exception {
		AdministCode vo = administCodeManageService.selectAdministCodeDetail(administCode);
		if (vo != null) {
			model.addAttribute("administCode", vo);
			return "egovframework/com/sym/ccm/adc/EgovCcmAdministCodeModify";
		} else {
			return "redirect:/sym/ccm/adc/EgovCcmAdministCodeList.do";
		}
	}

	/**
	 * ?됱젙肄붾뱶瑜??섏젙?쒕떎.
	 * 
	 * @param loginVO
	 * @param administCode
	 * @param bindingResult
	 * @param commandMap
	 * @param model
	 * @return
	 * @throws Exception
	 */
	@RequestMapping(value = "/sym/ccm/adc/EgovCcmAdministCodeModify.do")
	public String updateAdministCode(@ModelAttribute("loginVO") LoginVO loginVO,
			@Valid @ModelAttribute("administCode") AdministCode administCode, BindingResult bindingResult,
			@RequestParam Map<?, ?> commandMap, ModelMap model) throws Exception {

		if (bindingResult.hasErrors()) {
			return "egovframework/com/sym/ccm/adc/EgovCcmAdministCodeModify";
		}

		AdministCode vo = administCodeManageService.selectAdministCodeDetail(administCode);
		if (vo != null) {
			model.addAttribute("administCode", vo);

			administCode.setLastUpdusrId(loginVO.getUniqId());
			administCodeManageService.updateAdministCode(administCode);
		}
		return "redirect:/sym/ccm/adc/EgovCcmAdministCodeList.do";
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