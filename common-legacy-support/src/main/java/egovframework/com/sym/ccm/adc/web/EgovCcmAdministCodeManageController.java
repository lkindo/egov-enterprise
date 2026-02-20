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
 * ????????????????????? ??????????????? ?????????? ???? Controller??
 * ???
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
 *   2024.10.29  ??         ? & ?????????? ??? method ??? validation ?
 *   2025.07.05  ????         2025????????PMD???????? ????????-LocalVariableNamingConventions(final??? ?? ??????????)
 *
 *      </pre>
 **/
@Controller
public class EgovCcmAdministCodeManageController {

	@Resource(name = "AdministCodeManageService")
	private EgovCcmAdministCodeManageService administCodeManageService;

	/** EgovPropertyService **/
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	/**
	 * ?????????.
	 * 
	 * @param loginVO
	 * @param administCode
	 * @param model
	 * @return "forward: sym/ccm/adc/EgovCcmAdministCodeList.do"   
	 * @throws Exception
	 */
	@RequestMapping(value = "/sym/ccm/adc/EgovCcmAdministCodeRemove.do")
	public String deleteAdministCode(@ModelAttribute("loginVO") LoginVO loginVO, AdministCode administCode,
			ModelMap model) throws Exception {
		administCodeManageService.deleteAdministCode(administCode);
		return "forward:/sym/ccm/adc/EgovCcmAdministCodeList.do";
	}

	/**
	 * ??????
	 * 
	 * @param loginVO
	 * @param administCode
	 * @param model
	 * @return "egovframework com/sym/ccm/adc/EgovCcmAdministCodeRegist"   
	 * @throws Exception
	 */
	@RequestMapping(value = "/sym/ccm/adc/EgovCcmAdministCodeRegistView.do")
	public String insertAdministCodeView(@ModelAttribute("loginVO") LoginVO loginVO,
			@ModelAttribute("administCode") AdministCode administCode, ModelMap model) throws Exception {

		return "egovframework/com/sym/ccm/adc/EgovCcmAdministCodeRegist";

	}

	/**
	 * ???????.
	 * 
	 * @param loginVO
	 * @param administCode
	 * @param bindingResult
	 * @param model
	 * @return
	 * @throws Exception
	 **/
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
			model.addAttribute("message", "??  ? ?         ????      ?         ?               ?          ???      ??");
			return "egovframework/com/sym/ccm/adc/EgovCcmAdministCodeRegist";
		}

		administCode.setFrstRegisterId(loginVO.getUniqId());
		administCodeManageService.insertAdministCode(administCode);

		return "redirect:/sym/ccm/adc/EgovCcmAdministCodeList.do";
	}

	/**
	 * ?????????????.
	 * 
	 * @param loginVO
	 * @param administCode
	 * @param model
	 * @return "egovframework com/sym/ccm/adc/EgovCcmAdministCodeDetail"   
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
	 * ?????????.
	 * 
	 * @param loginVO
	 * @param searchVO
	 * @param model
	 * @return "egovframework com/sym/ccm/adc/EgovCcmAdministCodeList"   
	 * @throws Exception
	 */
	@IncludedInfo(name = "Name", listUrl = "", order = 1, gid = 50)
	@RequestMapping(value = "/sym/ccm/adc/EgovCcmAdministCodeList.do")
	public String selectAdministCodeList(@ModelAttribute("loginVO") LoginVO loginVO,
			@ModelAttribute("searchVO") AdministCodeVO searchVO, ModelMap model) throws Exception {
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

		List<EgovMap> resultList = administCodeManageService.selectAdministCodeList(searchVO);
		model.addAttribute("resultList", resultList);

		int totCnt = administCodeManageService.selectAdministCodeListTotCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/sym/ccm/adc/EgovCcmAdministCodeList";
	}

	/**
	 * ???????? ?? ???.
	 * 
	 * @param model
	 * @return "egovframework com/sym/ccm/adc/EgovCcmAdministCodePopup"   
	 * @throws Exception
	 */
	@RequestMapping(value = "/sym/ccm/adc/EgovCcmAdministCodePopup.do")
	public String callAdministCodePopup(ModelMap model) throws Exception {
		return "egovframework/com/sym/ccm/adc/EgovCcmAdministCodePopup";
	}

	/**
	 * ?????? ?????.
	 * 
	 * @param loginVO
	 * @param searchVO
	 * @param model
	 * @return "egovframework com/sym/ccm/adc/EgovCcmAdministCode"   
	 * @throws Exception
	 */
	@RequestMapping(value = "/sym/ccm/adc/EgovCcmAdministCode.do")
	public String selectAdministCode(@ModelAttribute("loginVO") LoginVO loginVO,
			@ModelAttribute("searchVO") AdministCodeVO searchVO, ModelMap model) throws Exception {
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

		List<EgovMap> resultList = administCodeManageService.selectAdministCodeList(searchVO);
		model.addAttribute("resultList", resultList);

		int totCnt = administCodeManageService.selectAdministCodeListTotCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/sym/ccm/adc/EgovCcmAdministCode";
	}

	/**
	 * ???????
	 * 
	 * @param loginVO
	 * @param administCode
	 * @param model
	 * @return "egovframework com/sym/ccm/adc/EgovCcmAdministCodeModify"   
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
	 * ????????.
	 * 
	 * @param loginVO
	 * @param administCode
	 * @param bindingResult
	 * @param commandMap
	 * @param model
	 * @return
	 * @throws Exception
	 **/
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
	 * Map ???????.
	 * 
	 * @param commandMap
	 * @return
	 **/
	public String printParameterMap(@RequestParam Map<?, ?> commandMap) {
		String ret = "";
		for (Object key : commandMap.keySet()) {
			Object value = commandMap.get(key);

			ret += "key:" + key.toString() + " value:" + value.toString();
		}
		return ret;
	}

}
