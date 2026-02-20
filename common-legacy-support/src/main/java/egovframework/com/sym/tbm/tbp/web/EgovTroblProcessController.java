package egovframework.com.sym.tbm.tbp.web;

import java.util.List;

import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.support.SessionStatus;

import egovframework.com.cmm.ComDefaultCodeVO;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.service.CmmnDetailCode;
import egovframework.com.cmm.service.EgovCmmUseService;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.sym.tbm.tbp.service.EgovTroblProcessService;
import egovframework.com.sym.tbm.tbp.service.TroblProcess;
import egovframework.com.sym.tbm.tbp.service.TroblProcessVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;

/**
 * <pre>
 * ??
 * -????????controller ?????? ???.
 *
 * ???
 * - ?????????, ??, ???? ??? ???????.
 * - ???????? ?, ??????.
 * </pre>
 * 
 * @author ??
 * @since 2010.06.28
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == ?????Modification Information) ==
 *
 *   ????     ????          ????
 *  -------    --------    ---------------------------
 *   2010.06.28  ??          ????
 *   2011.08.26  ???         IncludedInfo annotation ??
 *   2025.07.26  ????         2025????????PMD???????? ????????-FieldNamingConventions(?????????
 *
 *      </pre>
 **/
@Controller
public class EgovTroblProcessController {

	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	@Resource(name = "egovTroblProcessService")
	private EgovTroblProcessService egovTroblProcessService;

	@Resource(name = "EgovCmmUseService")
	private EgovCmmUseService egovCmmUseService;

	/**
	 * ???????? ???
	 * 
	 * @return String
	 **/
	@RequestMapping(value = "/sym/tbm/tbp/selectTroblProcessListView.do")
	public String selectTroblProcessListView() throws Exception {
		return "egovframework/com/sym/tbm/tbp/EgovTroblProcessList";
	}

	/**
	 * ????????? ???????????.
	 * 
	 * @param troblManageVO - ?? Vo
	 * @return String - ? Url
	 **/
@IncludedInfo(name="Dummy", listUrl="", order=1, gid=50)
	@RequestMapping(value = "/sym/tbm/tbp/selectTroblProcessList.do")
	public String selectTroblProcessList(@ModelAttribute("troblProcessVO") TroblProcessVO troblProcessVO,
			ModelMap model) throws Exception {

		/** paging **/
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(troblProcessVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(troblProcessVO.getPageUnit());
		paginationInfo.setPageSize(troblProcessVO.getPageSize());

		troblProcessVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		troblProcessVO.setLastIndex(paginationInfo.getLastRecordIndex());
		troblProcessVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		if (troblProcessVO.getStrTroblKnd() == null) {
			troblProcessVO.setStrTroblKnd("00");
		}
		if (troblProcessVO.getStrProcessSttus() == null) {
			troblProcessVO.setStrProcessSttus("00");
		}

		troblProcessVO.setTroblProcessList(egovTroblProcessService.selectTroblProcessList(troblProcessVO));

		model.addAttribute("troblProcessList", troblProcessVO.getTroblProcessList());

		int totCnt = egovTroblProcessService.selectTroblProcessListTotCnt(troblProcessVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);
		model.addAttribute("cmmCodeDetailList1", getCmmCodeDetailList(new ComDefaultCodeVO(), "COM065"));
		model.addAttribute("cmmCodeDetailList2", getCmmCodeDetailList(new ComDefaultCodeVO(), "COM068"));
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		return "egovframework/com/sym/tbm/tbp/EgovTroblProcessList";
	}

	/**
	 * ??????????????.
	 * 
	 * @param troblManageVO - ????Vo
	 * @return String - ? Url
	 **/
	@RequestMapping(value = "/sym/tbm/tbp/getTroblProcess.do")
	public String selectTroblProcess(@RequestParam("troblId") String troblId,
			@ModelAttribute("troblProcessVO") TroblProcessVO troblProcessVO, ModelMap model) throws Exception {

		troblProcessVO.setTroblId(troblId);
		model.addAttribute("troblProcess", egovTroblProcessService.selectTroblProcess(troblProcessVO));
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		return "egovframework/com/sym/tbm/tbp/EgovTroblProcessRegist";
	}

	/**
	 * ??????????.
	 * 
	 * @param troblManage - ????model
	 * @return String - ? Url
	 **/
	@RequestMapping(value = "/sym/tbm/tbp/addTroblProcess.do")
	public String insertTroblProcess(@ModelAttribute("troblProcess") TroblProcess troblProcess,
			BindingResult bindingResult, SessionStatus status, ModelMap model) throws Exception {

		if (bindingResult.hasErrors()) {
			model.addAttribute("troblProcessVO", troblProcess);
			return "egovframework/com/sym/tbm/tbp/EgovTroblProcess";
		} else {
			LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
			troblProcess.setTroblProcessTime(EgovStringUtil.removeMinusChar(troblProcess.getTroblProcessTime()));
			troblProcess.setLastUpdusrId(user == null ? "" : EgovStringUtil.isNullToString(user.getId()));
			troblProcess.setProcessSttus("C");
			egovTroblProcessService.insertTroblProcess(troblProcess);
			status.setComplete();
			model.addAttribute("message", egovMessageSource.getMessage("success.common.insert"));
			return "forward:/sym/tbm/tbp/getTroblProcess.do";
		}
	}

	/**
	 * ??????????????.
	 * 
	 * @param troblManage - ????model
	 * @return String - ? Url
	 **/
	@RequestMapping(value = "/sym/tbm/tbp/removeTroblProcess.do")
	public String deleteTroblProcess(@RequestParam("troblId") String troblId,
			@ModelAttribute("troblProcess") TroblProcess troblProcess, ModelMap model) throws Exception {

		troblProcess.setTroblId(troblId);
		troblProcess.setProcessSttus("R");
		egovTroblProcessService.deleteTroblProcess(troblProcess);
		model.addAttribute("message", egovMessageSource.getMessage("success.common.delete"));
		return "forward:/sym/tbm/tbp/getTroblProcess.do";
	}

	/**
	 * ?? ?
	 * 
	 * @param comDefaultCodeVO ComDefaultCodeVO
	 * @param codeId           String
	 * @return List
	 * @exception Exception
	 **/
	public List<CmmnDetailCode> getCmmCodeDetailList(ComDefaultCodeVO comDefaultCodeVO, String codeId)
			throws Exception {
		comDefaultCodeVO.setCodeId(codeId);
		return egovCmmUseService.selectCmmCodeDetail(comDefaultCodeVO);
	}
}
