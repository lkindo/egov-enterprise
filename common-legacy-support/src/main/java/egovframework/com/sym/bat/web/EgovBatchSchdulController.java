package egovframework.com.sym.bat.web;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;

import egovframework.com.cmm.ComDefaultCodeVO;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.service.CmmnDetailCode;
import egovframework.com.cmm.service.EgovCmmUseService;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.sym.bat.service.BatchSchdul;
import egovframework.com.sym.bat.service.BatchScheduler;
import egovframework.com.sym.bat.service.EgovBatchSchdulService;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * ?????? ????controller ?????
 *
 * @author ?
 * @since 2010.06.17
 * @version 1.0
 * @updated 17-6-2010 ?? 10:27:13
 * @see
 * <pre>
 * == ?????Modification Information) ==
 *
 *   ????      ????          ????
 *  -------     --------    ---------------------------
 *  2010.06.17   ?    ????
 *  2011.8.26	???		IncludedInfo annotation ??
 * </pre>
 **/

@Controller
public class EgovBatchSchdulController {

	/** egovBatchSchdulService **/
	@Resource(name = "egovBatchSchdulService")
	private EgovBatchSchdulService egovBatchSchdulService;

	/* Property ????*/
	@Resource(name = "propertiesService")
	private EgovPropertyService propertyService;

	/* ?? ????*/
	@Resource(name = "egovMessageSource")
	private EgovMessageSource egovMessageSource;

	/** ID Generation **/
	@Resource(name = "egovBatchSchdulIdGnrService")
	private EgovIdGnrService idgenService;

	/** cmmUseService **/
	@Resource(name = "EgovCmmUseService")
	private EgovCmmUseService cmmUseService;

	/** ??????????**/
	@Resource(name = "batchScheduler")
	private BatchScheduler batchScheduler;

	/** logger **/
	private static final Logger LOGGER = LoggerFactory.getLogger(EgovBatchSchdulController.class);

	/**
	 * ???????????.
	 * @return ?URL
	 *
	 * @param batchSchdul ???????????odel
	 * @param model		ModelMap
	 * @exception Exception Exception
	 **/
	@RequestMapping("/sym/bat/deleteBatchSchdul.do")
	public String deleteBatchSchdul(BatchSchdul batchSchdul, ModelMap model) throws Exception {
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		// ??????????????
		batchScheduler.deleteBatchSchdul(batchSchdul);

		egovBatchSchdulService.deleteBatchSchdul(batchSchdul);

		return "forward:/sym/bat/getBatchSchdulList.do";
	}

	/**
	 * ?????????.
	 * @return ?URL
	 *
	 * @param batchSchdul ?????????odel
	 * @param bindingResult	BindingResult
	 * @param model			ModelMap
	 * @exception Exception Exception
	 **/
	@RequestMapping("/sym/bat/addBatchSchdul.do")
	public String insertBatchSchdul(@Valid @ModelAttribute BatchSchdul batchSchdul, BindingResult bindingResult, ModelMap model) throws Exception {
		LOGGER.debug(" ?         ?????            ?: {}", batchSchdul);

		// 0. Spring Security ?????????
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}

		//?????
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		if (bindingResult.hasErrors()) {
			referenceData(model);
			return "egovframework/com/sym/bat/EgovBatchSchdulRegist";
		} else {
			batchSchdul.setBatchSchdulId(idgenService.getNextStringId());
			//?????
			batchSchdul.setLastUpdusrId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
			batchSchdul.setFrstRegisterId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));

			egovBatchSchdulService.insertBatchSchdul(batchSchdul);

			// ??????????????
			BatchSchdul target = egovBatchSchdulService.selectBatchSchdul(batchSchdul);
			batchScheduler.insertBatchSchdul(target);

			//Exception ?? ??????
			model.addAttribute("resultMsg", "success.common.insert");
		}
		return "forward:/sym/bat/getBatchSchdulList.do";
	}

	/**
	 * ?????? ????.
	 * @return ?URL
	 *
	 * @param batchSchdul ?????????odel
	 * @param model		ModelMap
	 * @exception Exception Exception
	 **/
	@RequestMapping("/sym/bat/getBatchSchdul.do")
	public String selectBatchSchdul(@ModelAttribute("searchVO") BatchSchdul batchSchdul, ModelMap model) throws Exception {
		LOGGER.debug("          ?   ?          : {}", batchSchdul);
		BatchSchdul result = egovBatchSchdulService.selectBatchSchdul(batchSchdul);
		model.addAttribute("resultInfo", result);
		LOGGER.debug("          ?      ?: {}", result);

		return "egovframework/com/sym/bat/EgovBatchSchdulDetail";
	}

	/**
	 * ????? ?????? ???.
	 * @return ?URL
	 *
	 * @param batchSchdul ?????????odel
	 * @param model		ModelMap
	 * @exception Exception Exception
	 **/
	@RequestMapping("/sym/bat/getBatchSchdulForRegist.do")
	public String selectBatchSchdulForRegist(@ModelAttribute("searchVO") BatchSchdul batchSchdul, ModelMap model) throws Exception {
		referenceData(model);

		model.addAttribute("batchSchdul", batchSchdul);

		return "egovframework/com/sym/bat/EgovBatchSchdulRegist";
	}

	/**
	 * ?????? ?????? ???.
	 * @return ?URL
	 *
	 * @param batchSchdul ?????????odel
	 * @param model		ModelMap
	 * @exception Exception Exception
	 **/
	@RequestMapping("/sym/bat/getBatchSchdulForUpdate.do")
	public String selectBatchSchdulForUpdate(@ModelAttribute("searchVO") BatchSchdul batchSchdul, ModelMap model) throws Exception {
		referenceData(model);

		LOGGER.debug("          ?   ?          : {}", batchSchdul);
		BatchSchdul result = egovBatchSchdulService.selectBatchSchdul(batchSchdul);
		model.addAttribute("batchSchdul", result);
		LOGGER.debug("          ?      ?: {}", result);

		return "egovframework/com/sym/bat/EgovBatchSchdulUpdt";
	}

	/**
	 * Reference Data ??????.
	 * @param model   ??ring Model?
	 * @throws Exception
	 **/
	private void referenceData(ModelMap model) throws Exception {
		ComDefaultCodeVO vo = new ComDefaultCodeVO();
		//DBMS??????????
		vo.setCodeId("COM047");
		List<CmmnDetailCode> executCycleList = cmmUseService.selectCmmCodeDetail(vo);
		model.addAttribute("executCycleList", executCycleList);
		//?????????????
		vo.setCodeId("COM074");
		List<CmmnDetailCode> executSchdulDfkSeList = cmmUseService.selectCmmCodeDetail(vo);
		model.addAttribute("executSchdulDfkSeList", executSchdulDfkSeList);

		// ???????? ?? ?????.
		Map<String, String> executSchdulHourList = new LinkedHashMap<>();
		for (int i = 0; i < 24; i++) {
			if (i < 10) {
				executSchdulHourList.put("0" + Integer.toString(i), "0" + Integer.toString(i));
			} else {
				executSchdulHourList.put(Integer.toString(i), Integer.toString(i));
			}
		}
		model.addAttribute("executSchdulHourList", executSchdulHourList);
		Map<String, String> executSchdulMntList = new LinkedHashMap<>();
		for (int i = 0; i < 60; i++) {
			if (i < 10) {
				executSchdulMntList.put("0" + Integer.toString(i), "0" + Integer.toString(i));
			} else {
				executSchdulMntList.put(Integer.toString(i), Integer.toString(i));
			}
		}
		model.addAttribute("executSchdulMntList", executSchdulMntList);
		Map<String, String> executSchdulSecndList = new LinkedHashMap<>();
		for (int i = 0; i < 60; i++) {
			if (i < 10) {
				executSchdulSecndList.put("0" + Integer.toString(i), "0" + Integer.toString(i));
			} else {
				executSchdulSecndList.put(Integer.toString(i), Integer.toString(i));
			}
		}
		model.addAttribute("executSchdulSecndList", executSchdulSecndList);
	}

	/**
	 * ??????????.
	 * @return ?URL
	 *
	 * @param searchVO ?O
	 * @param model		ModelMap
	 * @exception Exception Exception
	 **/
	@IncludedInfo(name = "Name", listUrl = "", order = 1, gid = 50)
	@RequestMapping("/sym/bat/getBatchSchdulList.do")
	public String selectBatchSchdulList(@ModelAttribute("searchVO") BatchSchdul searchVO, ModelMap model) throws Exception {
		searchVO.setPageUnit(propertyService.getInt("pageUnit"));
		searchVO.setPageSize(propertyService.getInt("pageSize"));

		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(searchVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(searchVO.getPageUnit());
		paginationInfo.setPageSize(searchVO.getPageSize());

		searchVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		searchVO.setLastIndex(paginationInfo.getLastRecordIndex());
		searchVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		List<BatchSchdul> resultList = egovBatchSchdulService.selectBatchSchdulList(searchVO);
		int totCnt = egovBatchSchdulService.selectBatchSchdulListCnt(searchVO);

		paginationInfo.setTotalRecordCount(totCnt);

		model.addAttribute("resultList", resultList);
		model.addAttribute("resultCnt", totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/sym/bat/EgovBatchSchdulList";
	}

	/**
	 * ??????????.
	 * @return ?URL
	 *
	 * @param batchSchdul ??????????odel
	 * @param bindingResult		BindingResult
	 * @param model				ModelMap
	 * @exception Exception Exception
	 **/
	@RequestMapping("/sym/bat/updateBatchSchdul.do")
	public String updateBatchSchdul(@Valid @ModelAttribute BatchSchdul batchSchdul, BindingResult bindingResult, ModelMap model) throws Exception {
		// 0. Spring Security ?????????
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			model.addAttribute("message", egovMessageSource.getMessage("fail.common.login"));
			return "redirect:/uat/uia/egovLoginUsr.do";
		}
		//?????
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		if (bindingResult.hasErrors()) {
			referenceData(model);
			model.addAttribute("batchSchdul", batchSchdul);
			return "egovframework/com/sym/bat/EgovBatchSchdulUpdt";
		}

		// ? ????
		batchSchdul.setLastUpdusrId(loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId()));
		egovBatchSchdulService.updateBatchSchdul(batchSchdul);

		// ??????????????
		BatchSchdul target = egovBatchSchdulService.selectBatchSchdul(batchSchdul);
		batchScheduler.updateBatchSchdul(target);

		return "forward:/sym/bat/getBatchSchdulList.do";

	}

}
