package egovframework.com.sym.tbm.tbr.web;
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
import egovframework.com.sym.tbm.tbr.service.EgovTroblReqstService;
import egovframework.com.sym.tbm.tbr.service.TroblReqst;
import egovframework.com.sym.tbm.tbr.service.TroblReqstVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * <pre>
 * 媛쒖슂
 * -?μ븷?좎껌?뺣낫?????controller ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?μ븷?좎껌?뺣낫??????깅줉, ?섏젙, ??젣, 議고쉶 ?깆쓽 湲곕뒫???쒓났?쒕떎.
 * - ?μ븷?좎껌?뺣낫??議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
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
 *   2025.07.28  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-FieldNamingConventions(蹂?섎챸??諛묒쨪 ?ъ슜)
 *
 *      </pre>
 */
@Controller
public class EgovTroblReqstController {

	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	@Resource(name = "egovTroblReqstService")
	private EgovTroblReqstService egovTroblReqstService;

	/** ID Generation */
	@Resource(name = "egovTroblIdGnrService")
	private EgovIdGnrService egovTroblIdGnrService;

	@Resource(name = "EgovCmmUseService")
	private EgovCmmUseService egovCmmUseService;

	/**
	 * ?μ븷?붿껌愿由?紐⑸줉?붾㈃?쇰줈 ?대룞
	 * 
	 * @return String
	 */
	@RequestMapping(value = "/sym/tbm/tbr/selectTroblReqstListView.do")
	public String selectTroblReqstListView() throws Exception {
		return "egovframework/com/sym/tbm/tbr/EgovTroblReqstList";
	}

	/**
	 * ?μ븷?붿껌??愿由ы븯湲??꾪빐 ?깅줉???μ븷?붿껌紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param troblReqstVO - ?μ븷?좎껌愿由?Vo
	 * @return String - 由ы꽩 Url
	 */
	@IncludedInfo(name = "?μ븷?좎껌愿由?, order = 1180, gid = 60)
	@RequestMapping(value = "/sym/tbm/tbr/selectTroblReqstList.do")
	public String selectTroblReqstList(@ModelAttribute("troblReqstVO") TroblReqstVO troblReqstVO, ModelMap model)
			throws Exception {

		/** paging */
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(troblReqstVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(troblReqstVO.getPageUnit());
		paginationInfo.setPageSize(troblReqstVO.getPageSize());

		troblReqstVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		troblReqstVO.setLastIndex(paginationInfo.getLastRecordIndex());
		troblReqstVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		if (troblReqstVO.getStrTroblKnd() == null) {
			troblReqstVO.setStrTroblKnd("00");
		}
		if (troblReqstVO.getStrProcessSttus() == null) {
			troblReqstVO.setStrProcessSttus("00");
		}

		troblReqstVO.setTroblReqstList(egovTroblReqstService.selectTroblReqstList(troblReqstVO));

		model.addAttribute("troblReqstList", troblReqstVO.getTroblReqstList());

		int totCnt = egovTroblReqstService.selectTroblReqstListTotCnt(troblReqstVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);
		model.addAttribute("cmmCodeDetailList1", getCmmCodeDetailList(new ComDefaultCodeVO(), "COM065"));
		model.addAttribute("cmmCodeDetailList2", getCmmCodeDetailList(new ComDefaultCodeVO(), "COM068"));
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		return "egovframework/com/sym/tbm/tbr/EgovTroblReqstList";
	}

	/**
	 * ?깅줉???μ븷?붿껌???곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * 
	 * @param troblReqstVO - ?μ븷?좎껌愿由?Vo
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/sym/tbm/tbr/getTroblReqst.do")
	public String selectTroblReqst(@RequestParam("troblId") String troblId,
			@ModelAttribute("troblReqstVO") TroblReqstVO troblReqstVO, Model model) throws Exception {

		troblReqstVO.setTroblId(troblId);
		model.addAttribute("troblReqst", egovTroblReqstService.selectTroblReqst(troblReqstVO));
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		return "egovframework/com/sym/tbm/tbr/EgovTroblReqstDetail";
	}

	/**
	 * ?μ븷?붿껌?뺣낫 ?깅줉 ?붾㈃?쇰줈 ?대룞?쒕떎.
	 * 
	 * @param troblReqstVO - ?μ븷?좎껌愿由?Vo
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/sym/tbm/tbr/addViewTroblReqst.do")
	public String insertViewTroblReqst(@ModelAttribute("troblReqstVO") TroblReqstVO troblReqstVO, ModelMap model)
			throws Exception {

		model.addAttribute("cmmCodeDetailList", getCmmCodeDetailList(new ComDefaultCodeVO(), "COM065"));
		model.addAttribute("troblReqst", troblReqstVO);
		return "egovframework/com/sym/tbm/tbr/EgovTroblReqstRegist";
	}

	/**
	 * ?μ븷?붿껌?뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * 
	 * @param troblReqst - ?μ븷?좎껌愿由?model
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/sym/tbm/tbr/addTroblReqst.do")
	public String insertTroblReqst(@ModelAttribute("troblReqstVO") TroblReqstVO troblReqstVO,
			@ModelAttribute("troblReqst") TroblReqst troblReqst, BindingResult bindingResult, ModelMap model)
			throws Exception {


		if (bindingResult.hasErrors()) {
			model.addAttribute("troblReqstVO", troblReqstVO);
			return "egovframework/com/sym/tbm/tbr/EgovTroblReqstRegist";
		} else {
			LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
			troblReqst.setTroblOccrrncTime(EgovStringUtil.removeMinusChar(troblReqst.getTroblOccrrncTime()));
			troblReqst.setTroblRequstTime(EgovStringUtil.removeMinusChar(troblReqst.getTroblRequstTime()));
			troblReqst.setFrstRegisterId(user == null ? "" : EgovStringUtil.isNullToString(user.getId()));
			troblReqst.setLastUpdusrId(user == null ? "" : EgovStringUtil.isNullToString(user.getId()));
			troblReqst.setProcessSttus("A");
			troblReqst.setTroblId(egovTroblIdGnrService.getNextStringId());

			model.addAttribute("troblReqst", egovTroblReqstService.insertTroblReqst(troblReqst, troblReqstVO));
			model.addAttribute("message", egovMessageSource.getMessage("success.common.insert"));
			return "egovframework/com/sym/tbm/tbr/EgovTroblReqstDetail";
		}
	}

	/**
	 * ?μ븷?붿껌?뺣낫 ?섏젙 ?붾㈃?쇰줈 ?대룞?쒕떎.
	 * 
	 * @param troblReqstVO - ?μ븷?좎껌愿由?Vo
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/sym/tbm/tbr/updtViewTroblReqst.do")
	public String updateViewTroblReqst(@RequestParam("troblId") String troblId,
			@ModelAttribute("troblReqstVO") TroblReqstVO troblReqstVO, Model model) throws Exception {

		troblReqstVO.setTroblId(troblId);
		model.addAttribute("troblReqst", egovTroblReqstService.selectTroblReqst(troblReqstVO));
		model.addAttribute("cmmCodeDetailList", getCmmCodeDetailList(new ComDefaultCodeVO(), "COM065"));
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));
		return "egovframework/com/sym/tbm/tbr/EgovTroblReqstUpdt";
	}

	/**
	 * 湲??깅줉???μ븷?붿껌?뺣낫瑜??섏젙?쒕떎.
	 * 
	 * @param troblReqst - ?μ븷?좎껌愿由?model
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/sym/tbm/tbr/updtTroblReqst.do")
	public String updateTroblReqst(@ModelAttribute("troblReqst") TroblReqst troblReqst, BindingResult bindingResult,
			SessionStatus status, ModelMap model) throws Exception {


		if (bindingResult.hasErrors()) {
			model.addAttribute("troblReqstVO", troblReqst);
			return "egovframework/com/sym/tbm/EgovTroblReqstUpdt";
		} else {
			LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
			troblReqst.setTroblOccrrncTime(EgovStringUtil.removeMinusChar(troblReqst.getTroblOccrrncTime()));
			troblReqst.setTroblRequstTime(EgovStringUtil.removeMinusChar(troblReqst.getTroblRequstTime()));
			troblReqst.setLastUpdusrId(user == null ? "" : EgovStringUtil.isNullToString(user.getId()));
			egovTroblReqstService.updateTroblReqst(troblReqst);
			status.setComplete();
			model.addAttribute("message", egovMessageSource.getMessage("success.common.update"));
			return "forward:/sym/tbm/tbr/getTroblReqst.do";
		}
	}

	/**
	 * 湲??깅줉???μ븷?붿껌?뺣낫瑜???젣?쒕떎.
	 * 
	 * @param troblReqst - ?μ븷?좎껌愿由?model
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/sym/tbm/tbr/removeTroblReqst.do")
	public String deleteTroblReqst(@RequestParam("troblId") String troblId,
			@ModelAttribute("troblReqst") TroblReqst troblReqst, ModelMap model) throws Exception {

		troblReqst.setTroblId(troblId);
		egovTroblReqstService.deleteTroblReqst(troblReqst);
		model.addAttribute("message", egovMessageSource.getMessage("success.common.delete"));
		return "forward:/sym/tbm/tbr/selectTroblReqstList.do";
	}

	/**
	 * ?μ븷泥섎━瑜??붿껌?쒕떎.
	 * 
	 * @param troblReqst - ?μ븷?좎껌愿由?model
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/sym/tbm/tbr/requstTroblReqst.do")
	public String requstTroblReqst(@RequestParam("troblId") String troblId,
			@ModelAttribute("troblReqst") TroblReqst troblReqst, SessionStatus status, ModelMap model)
			throws Exception {

		troblReqst.setTroblId(troblId);
		troblReqst.setProcessSttus("R");
		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		troblReqst.setLastUpdusrId(user == null ? "" : EgovStringUtil.isNullToString(user.getId()));
		egovTroblReqstService.requstTroblReqst(troblReqst);
		status.setComplete();
		model.addAttribute("message", egovMessageSource.getMessage("success.common.update"));
		return "forward:/sym/tbm/tbr/getTroblReqst.do";
	}

	/**
	 * ?μ븷泥섎━痍⑥냼瑜??붿껌?쒕떎.
	 * 
	 * @param troblReqst - ?μ븷?좎껌愿由?model
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/sym/tbm/tbr/requstTroblReqstCancl.do")
	public String requstTroblReqstCancl(@RequestParam("troblId") String troblId,
			@ModelAttribute("troblReqst") TroblReqst troblReqst, SessionStatus status, ModelMap model)
			throws Exception {

		troblReqst.setTroblId(troblId);
		troblReqst.setProcessSttus("A");
		LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		troblReqst.setLastUpdusrId(user == null ? "" : EgovStringUtil.isNullToString(user.getId()));
		egovTroblReqstService.requstTroblReqst(troblReqst);
		status.setComplete();
		model.addAttribute("message", egovMessageSource.getMessage("success.common.update"));
		return "forward:/sym/tbm/tbr/getTroblReqst.do";
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
