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
import jakarta.validation.Valid;

/**
 * <pre>
 * 媛쒖슂
 * - ?ㅽ듃?뚰겕愿由ъ뿉 ???controller ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?ㅽ듃?뚰겕愿由ъ뿉 ????깅줉, ?섏젙, ??젣, 議고쉶 湲곕뒫???쒓났?쒕떎.
 * - ?ㅽ듃?뚰겕愿由ъ쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
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
 *   2025.07.23  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-FieldNamingConventions(蹂?섎챸??諛묒쨪 ?ъ슜)
 *
 *      </pre>
 */
@Controller
public class EgovNtwrkController {

	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	@Resource(name = "egovNtwrkService")
	private EgovNtwrkService egovNtwrkService;

	/** Message ID Generation */
	@Resource(name = "egovNtwrkIdGnrService")
	private EgovIdGnrService egovNtwrkIdGnrService;

	@Resource(name = "EgovCmmUseService")
	private EgovCmmUseService egovCmmUseService;

	/**
	 * ?ㅽ듃?뚰겕愿由?紐⑸줉?붾㈃ ?대룞
	 * 
	 * @return String
	 */
	@RequestMapping(value = "/sym/sym/nwk/selectNtwrkListView.do")
	public String selectNtwrkListView(ModelMap model) throws Exception {
		model.addAttribute("cmmCodeDetailList", getCmmCodeDetailList(new ComDefaultCodeVO(), "COM067"));
		return "egovframework/com/sym/sym/nwk/EgovNtwrkList";
	}

	/**
	 * ?ㅽ듃?뚰겕?뺣낫瑜?愿由ы븯湲??꾪빐 ?깅줉???ㅽ듃?뚰겕紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param ntwrkVO - ?ㅽ듃?뚰겕 Vo
	 * @return String - 由ы꽩 Url
	 *
	 * @param ntwrkVO
	 */
	@IncludedInfo(name = "?ㅽ듃?뚰겕愿由?, order = 1160, gid = 60)
	@RequestMapping(value = "/sym/sym/nwk/selectNtwrkList.do")
	public String selectNtwrkList(@ModelAttribute("ntwrkVO") NtwrkVO ntwrkVO, ModelMap model) throws Exception {

		/** paging */
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
	 * ?깅줉???ㅽ듃?뚰겕???곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * 
	 * @param ntwrkVO - ?ㅽ듃?뚰겕 Vo
	 * @return String - 由ы꽩 Url
	 *
	 * @param ntwrkVO
	 */
	@RequestMapping(value = "/sym/sym/nwk/getNtwrk.do")
	public String selectNtwrk(@RequestParam("ntwrkId") String ntwrkId, @ModelAttribute("ntwrkVO") NtwrkVO ntwrkVO,
			Model model) throws Exception {

		ntwrkVO.setNtwrkId(ntwrkId);
		model.addAttribute("ntwrk", egovNtwrkService.selectNtwrk(ntwrkVO));
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		return "egovframework/com/sym/sym/nwk/EgovNtwrkDetail";
	}

	/**
	 * ?ㅽ듃?뚰겕?뺣낫 ?깅줉 ?붾㈃?쇰줈 ?대룞?쒕떎.
	 * 
	 * @param ntwrkVO - ?ㅽ듃?뚰겕 Vo
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/sym/sym/nwk/addViewNtwrk.do")
	public String insertViewNtwrk(@ModelAttribute("ntwrkVO") NtwrkVO ntwrkVO, ModelMap model) throws Exception {

		model.addAttribute("ntwrk", ntwrkVO);
		model.addAttribute("cmmCodeDetailList", getCmmCodeDetailList(new ComDefaultCodeVO(), "COM067"));
		return "egovframework/com/sym/sym/nwk/EgovNtwrkRegist";
	}

	/**
	 * ?ㅽ듃?뚰겕?뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * 
	 * @param ntwrk - ?ㅽ듃?뚰겕 model
	 * @return String - 由ы꽩 Url
	 *
	 * @param ntwrk
	 */
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
	 * ?ㅽ듃?뚰겕?뺣낫 ?섏젙 ?붾㈃?쇰줈 ?대룞?쒕떎.
	 * 
	 * @param ntwrkVO - ?ㅽ듃?뚰겕 Vo
	 * @return String - 由ы꽩 Url
	 */
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
	 * 湲??깅줉???ㅽ듃?뚰겕?뺣낫瑜??섏젙?쒕떎.
	 * 
	 * @param ntwrk - ?ㅽ듃?뚰겕 model
	 * @return String - 由ы꽩 Url
	 *
	 * @param ntwrk
	 */
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
	 * 湲??깅줉???ㅽ듃?뚰겕?뺣낫瑜???젣?쒕떎.
	 * 
	 * @param ntwrk - ?ㅽ듃?뚰겕 model
	 * @return String - 由ы꽩 Url
	 *
	 * @param ntwrk
	 */
	@RequestMapping(value = "/sym/sym/nwk/removeNtwrk.do")
	public String deleteNtwrk(@RequestParam("ntwrkId") String ntwrkId, @ModelAttribute("ntwrk") Ntwrk ntwrk,
			ModelMap model) throws Exception {
		ntwrk.setNtwrkId(ntwrkId);
		egovNtwrkService.deleteNtwrk(ntwrk);
		model.addAttribute("message", egovMessageSource.getMessage("success.common.delete"));
		return "forward:/sym/sym/nwk/selectNtwrkList.do";
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
