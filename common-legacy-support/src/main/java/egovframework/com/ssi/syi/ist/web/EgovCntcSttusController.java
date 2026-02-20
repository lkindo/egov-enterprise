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
 * ?? ?? ???????????????? ??????????????? ?????????? ????
 * Controller?????
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
 *   2025.06.30  ????         ??????PMD???????? ????????-FormalParameterNamingConventions, LocalVariableNamingConventions
 *
 *      </pre>
 **/
@Controller
public class EgovCntcSttusController {

	@Resource(name = "CntcSttusService")
	private EgovCntcSttusService cntcSttusService;

	/** EgovPropertyService **/
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	/**
	 * ?? ????????.
	 * 
	 * @param loginVO
	 * @param cntcSttus
	 * @param model
	 * @return "egovframework com/cmm/sym/ccm/EgovCcmCntcSttusDetail"   
	 * @throws Exception
	 */
	@RequestMapping(value = "/ssi/syi/ist/getCntcSttusDetail.do")
	public String selectCntcSttusLogDetail(CntcSttus cntcSttus, ModelMap model) throws Exception {
		CntcSttus vo = cntcSttusService.selectCntcSttusDetail(cntcSttus);
		model.addAttribute("result", vo);

		return "egovframework/com/ssi/syi/ist/EgovCntcSttusDetail";
	}

	/**
	 * ?? ?????.
	 * 
	 * @param loginVO
	 * @param searchVO
	 * @param model
	 * @return "egovframework com/cmm/sym/ccm/EgovCcmCntcSttusList"   
	 * @throws Exception
	 */
	@IncludedInfo(name = "Name", listUrl = "", order = 1, gid = 50)
	@RequestMapping(value = "/ssi/syi/ist/getCntcSttusList.do")
	public String selectCntcSttusLogList(@ModelAttribute("searchVO") CntcSttusVO searchVO, ModelMap model)
			throws Exception {
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

		List<EgovMap> resultList = cntcSttusService.selectCntcSttusList(searchVO);
		model.addAttribute("resultList", resultList);

		int totCnt = cntcSttusService.selectCntcSttusListTotCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/ssi/syi/ist/EgovCntcSttusList";
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
