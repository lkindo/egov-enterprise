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
import jakarta.validation.Valid;

/**
 * <pre>
 * 媛쒖슂
 * -?μ븷愿由ъ젙蹂댁뿉 ???controller ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?μ븷愿由ъ젙蹂댁뿉 ????깅줉, ?섏젙, ??젣, 議고쉶 ?깆쓽 湲곕뒫???쒓났?쒕떎.
 * - ?μ븷愿由ъ젙蹂댁쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * </pre>
 * 
 * @author ?대Ц以
 * @since 2010.06.28
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.06.28  ?대Ц以          理쒖큹 ?앹꽦
 *   2011.08.26  ?뺤쭊??         IncludedInfo annotation 異붽?
 *   2025.07.26  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-FieldNamingConventions(蹂?섎챸??諛묒쨪 ?ъ슜)
 *
 *      </pre>
 */
@Controller
public class EgovTroblProcessController {

	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	@Resource(name = "egovTroblProcessService")
	private EgovTroblProcessService egovTroblProcessService;

	@Resource(name = "EgovCmmUseService")
	private EgovCmmUseService egovCmmUseService;

	/**
	 * ?μ븷泥섎━愿由?紐⑸줉?붾㈃?쇰줈 ?대룞
	 * 
	 * @return String
	 */
	@RequestMapping(value = "/sym/tbm/tbp/selectTroblProcessListView.do")
	public String selectTroblProcessListView() throws Exception {
		return "egovframework/com/sym/tbm/tbp/EgovTroblProcessList";
	}

	/**
	 * ?μ븷泥섎━?뺣낫瑜?愿由ы븯湲??꾪빐 ????μ븷泥섎━紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param troblManageVO - ?μ븷泥섎━ Vo
	 * @return String - 由ы꽩 Url
	 */
	@IncludedInfo(name = "?μ븷泥섎━寃곌낵愿由?, order = 1190, gid = 60)
	@RequestMapping(value = "/sym/tbm/tbp/selectTroblProcessList.do")
	public String selectTroblProcessList(@ModelAttribute("troblProcessVO") TroblProcessVO troblProcessVO,
			ModelMap model) throws Exception {

		/** paging */
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
	 * ?깅줉???μ븷泥섎━???곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * 
	 * @param troblManageVO - ?μ븷愿由?Vo
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/sym/tbm/tbp/getTroblProcess.do")
	public String selectTroblProcess(@RequestParam("troblId") String troblId,
			@ModelAttribute("troblProcessVO") TroblProcessVO troblProcessVO, ModelMap model) throws Exception {

		troblProcessVO.setTroblId(troblId);
		model.addAttribute("troblProcess", egovTroblProcessService.selectTroblProcess(troblProcessVO));
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		return "egovframework/com/sym/tbm/tbp/EgovTroblProcessRegist";
	}

	/**
	 * ?μ븷泥섎━?뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * 
	 * @param troblManage - ?μ븷愿由?model
	 * @return String - 由ы꽩 Url
	 */
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
	 * 湲??깅줉???μ븷泥섎━?뺣낫瑜???젣?쒕떎.
	 * 
	 * @param troblManage - ?μ븷愿由?model
	 * @return String - 由ы꽩 Url
	 */
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
	 * 怨듯넻肄붾뱶 ?몄텧
	 * 
	 * @param comDefaultCodeVO ComDefaultCodeVO
	 * @param codeId           String
	 * @return List
	 * @exception Exception
	 */
	public List<CmmnDetailCode> getCmmCodeDetailList(ComDefaultCodeVO comDefaultCodeVO, String codeId)
			throws Exception {
		comDefaultCodeVO.setCodeId(codeId);
		return egovCmmUseService.selectCmmCodeDetail(comDefaultCodeVO);
	}
}
