package egovframework.com.sym.sym.nwk.web;

import java.util.List;

import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
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
import egovframework.com.sym.sym.nwk.service.EgovNtwrkService;
import egovframework.com.sym.sym.nwk.service.Ntwrk;
import egovframework.com.sym.sym.nwk.service.NtwrkVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;

/**
 * <pre>
 * ??
 * - ?????? ????controller ?????? ???.
 *
 * ???
 * - ?????? ?????, ??, ???? ?????????.
 * - ?????? ??? ?, ??????.
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
 *   2025.07.23  ????         2025????????PMD???????? ????????-FieldNamingConventions(?????????
 *
 *      </pre>
 **/
@Controller
public class EgovNtwrkController {

	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	@Resource(name = "egovNtwrkService")
	private EgovNtwrkService egovNtwrkService;

	/** Message ID Generation **/
	@Resource(name = "egovNtwrkIdGnrService")
	private EgovIdGnrService egovNtwrkIdGnrService;

	@Resource(name = "EgovCmmUseService")
	private EgovCmmUseService egovCmmUseService;

	/**
	 * ???????? ???
	 * 
	 * @return String
	 **/
	@RequestMapping(value = "/sym/sym/nwk/selectNtwrkListView.do")
	public String selectNtwrkListView(ModelMap model) throws Exception {
		model.addAttribute("cmmCodeDetailList", getCmmCodeDetailList(new ComDefaultCodeVO(), "COM067"));
		return "egovframework/com/sym/sym/nwk/EgovNtwrkList";
	}

	/**
	 * ??????????? ????????????.
	 * 
	 * @param ntwrkVO - ???? Vo
	 * @return String - ? Url
	 *
	 * @param ntwrkVO
	 **/
@IncludedInfo(name="Dummy", listUrl="", order=1, gid=50)
	@RequestMapping(value = "/sym/sym/nwk/selectNtwrkList.do")
	public String selectNtwrkList(@ModelAttribute("ntwrkVO") NtwrkVO ntwrkVO, ModelMap model) throws Exception {

		/** paging **/
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(ntwrkVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(ntwrkVO.getPageUnit());
		paginationInfo.setPageSize(ntwrkVO.getPageSize());

		ntwrkVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		ntwrkVO.setLastIndex(paginationInfo.getLastRecordIndex());
		ntwrkVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		if (ntwrkVO.getStrManageIem() == null) {
			ntwrkVO.setStrManageIem("00");
		}

		ntwrkVO.setNtwrkList(egovNtwrkService.selectNtwrkList(ntwrkVO));

		model.addAttribute("ntwrkList", ntwrkVO.getNtwrkList());

		int totCnt = egovNtwrkService.selectNtwrkListTotCnt(ntwrkVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);
		model.addAttribute("cmmCodeDetailList", getCmmCodeDetailList(new ComDefaultCodeVO(), "COM067"));
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		return "egovframework/com/sym/sym/nwk/EgovNtwrkList";
	}

	/**
	 * ????????????????.
	 * 
	 * @param ntwrkVO - ???? Vo
	 * @return String - ? Url
	 *
	 * @param ntwrkVO
	 **/
	@RequestMapping(value = "/sym/sym/nwk/getNtwrk.do")
	public String selectNtwrk(@RequestParam("ntwrkId") String ntwrkId, @ModelAttribute("ntwrkVO") NtwrkVO ntwrkVO,
			Model model) throws Exception {

		ntwrkVO.setNtwrkId(ntwrkId);
		model.addAttribute("ntwrk", egovNtwrkService.selectNtwrk(ntwrkVO));
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		return "egovframework/com/sym/sym/nwk/EgovNtwrkDetail";
	}

	/**
	 * ????? ? ??? ????.
	 * 
	 * @param ntwrkVO - ???? Vo
	 * @return String - ? Url
	 **/
	@RequestMapping(value = "/sym/sym/nwk/addViewNtwrk.do")
	public String insertViewNtwrk(@ModelAttribute("ntwrkVO") NtwrkVO ntwrkVO, ModelMap model) throws Exception {

		model.addAttribute("ntwrk", ntwrkVO);
		model.addAttribute("cmmCodeDetailList", getCmmCodeDetailList(new ComDefaultCodeVO(), "COM067"));
		return "egovframework/com/sym/sym/nwk/EgovNtwrkRegist";
	}

	/**
	 * ????????????.
	 * 
	 * @param ntwrk - ???? model
	 * @return String - ? Url
	 *
	 * @param ntwrk
	 **/
	@RequestMapping(value = "/sym/sym/nwk/addNtwrk.do")
	public String insertNtwrk(@ModelAttribute("ntwrkVO") NtwrkVO ntwrkVO, @ModelAttribute("ntwrk") Ntwrk ntwrk,
			BindingResult bindingResult, ModelMap model) throws Exception {

		if (bindingResult.hasErrors()) {
			model.addAttribute("ntwrkVO", ntwrkVO);
			return "egovframework/com/sym/sym/nwk/EgovNtwrkRegist";
		} else {
			LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
			ntwrk.setFrstRegisterId(user == null ? "" : EgovStringUtil.isNullToString(user.getId()));
			ntwrk.setLastUpdusrId(user == null ? "" : EgovStringUtil.isNullToString(user.getId()));
			ntwrk.setNtwrkId(egovNtwrkIdGnrService.getNextStringId());
			model.addAttribute("ntwrk", egovNtwrkService.insertNtwrk(ntwrk, ntwrkVO));
			model.addAttribute("message", egovMessageSource.getMessage("success.common.insert"));
			return "egovframework/com/sym/sym/nwk/EgovNtwrkDetail";
		}

	}

	/**
	 * ????? ?? ??? ????.
	 * 
	 * @param ntwrkVO - ???? Vo
	 * @return String - ? Url
	 **/
	@RequestMapping(value = "/sym/sym/nwk/updtViewNtwrk.do")
	public String updateViewNtwrk(@RequestParam("ntwrkId") String ntwrkId, @ModelAttribute("ntwrkVO") NtwrkVO ntwrkVO,
			ModelMap model) throws Exception {

		ntwrkVO.setNtwrkId(ntwrkId);
		model.addAttribute("ntwrk", egovNtwrkService.selectNtwrk(ntwrkVO));
		model.addAttribute("cmmCodeDetailList", getCmmCodeDetailList(new ComDefaultCodeVO(), "COM067"));
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));
		return "egovframework/com/sym/sym/nwk/EgovNtwrkUpdt";
	}

	/**
	 * ???????????????.
	 * 
	 * @param ntwrk - ???? model
	 * @return String - ? Url
	 *
	 * @param ntwrk
	 **/
	@RequestMapping(value = "/sym/sym/nwk/updtNtwrk.do")
	public String updateNtwrk(@ModelAttribute("ntwrk") Ntwrk ntwrk, BindingResult bindingResult, SessionStatus status,
			ModelMap model) throws Exception {

		if (bindingResult.hasErrors()) {
			model.addAttribute("ntwrkVO", ntwrk);
			return "egovframework/com/sym/sym/nwk/EgovNtwrkUpdt";
		} else {
			LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
			ntwrk.setLastUpdusrId(user == null ? "" : EgovStringUtil.isNullToString(user.getId()));
			egovNtwrkService.updateNtwrk(ntwrk);
			status.setComplete();
			model.addAttribute("message", egovMessageSource.getMessage("success.common.update"));
			return "forward:/sym/sym/nwk/getNtwrk.do";
		}
	}

	/**
	 * ????????????????.
	 * 
	 * @param ntwrk - ???? model
	 * @return String - ? Url
	 *
	 * @param ntwrk
	 **/
	@RequestMapping(value = "/sym/sym/nwk/removeNtwrk.do")
	public String deleteNtwrk(@RequestParam("ntwrkId") String ntwrkId, @ModelAttribute("ntwrk") Ntwrk ntwrk,
			ModelMap model) throws Exception {
		ntwrk.setNtwrkId(ntwrkId);
		egovNtwrkService.deleteNtwrk(ntwrk);
		model.addAttribute("message", egovMessageSource.getMessage("success.common.delete"));
		return "forward:/sym/sym/nwk/selectNtwrkList.do";
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
