package egovframework.com.sym.sym.srv.web;
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
import egovframework.com.cmm.service.EgovCmmUseService;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.sym.sym.srv.service.EgovServerService;
import egovframework.com.sym.sym.srv.service.Server;
import egovframework.com.sym.sym.srv.service.ServerEqpmn;
import egovframework.com.sym.sym.srv.service.ServerEqpmnRelate;
import egovframework.com.sym.sym.srv.service.ServerEqpmnRelateVO;
import egovframework.com.sym.sym.srv.service.ServerEqpmnVO;
import egovframework.com.sym.sym.srv.service.ServerVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * <pre>
 * 媛쒖슂
 * - ?쒕쾭?뺣낫愿由ъ뿉 ???controller ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?쒕쾭?뺣낫愿由ъ뿉 ????깅줉, ?섏젙, ??젣, 議고쉶 ?깆쓽 湲곕뒫???쒓났?쒕떎.
 * - ?쒕쾭?뺣낫愿由ъ쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
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
 *   2025.07.25  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-FieldNamingConventions(蹂?섎챸??諛묒쨪 ?ъ슜)
 *
 *      </pre>
 */
@Controller
public class EgovServerController {

	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	@Resource(name = "egovServerService")
	private EgovServerService egovServerService;

	/** ID Generation */
	@Resource(name = "egovServerEqpmnIdGnrService")
	private EgovIdGnrService egovServerEqpmnIdGnrService;

	/** ID Generation */
	@Resource(name = "egovServerIdGnrService")
	private EgovIdGnrService egovServerIdGnrService;

	@Resource(name = "EgovCmmUseService")
	private EgovCmmUseService egovCmmUseService;

	/**
	 * ?쒕쾭?λ퉬愿由?紐⑸줉?붾㈃?쇰줈 ?대룞
	 * 
	 * @return String
	 */
	@RequestMapping(value = "/sym/sym/srv/selectServerEqpmnListView.do")
	public String selectServerEqpmnListView() throws Exception {
		return "egovframework/com/sym/sym/srv/EgovServerEqpmnList";
	}

	/**
	 * ?쒕쾭?λ퉬瑜?愿由ы븯湲??꾪빐 ?깅줉???쒕쾭?λ퉬紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param serverEqpmnVO - ?쒕쾭?λ퉬 Vo
	 * @return String - 由ы꽩 Url
	 *
	 * @param serverEqpmnVO
	 */
	@IncludedInfo(name = "?쒕쾭?뺣낫愿由?, order = 1170, gid = 60)
	@RequestMapping(value = "/sym/sym/srv/selectServerEqpmnList.do")
	public String selectServerEqpmnList(@ModelAttribute("serverEqpmnVO") ServerEqpmnVO serverEqpmnVO, ModelMap model)
			throws Exception {

		/** paging */
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(serverEqpmnVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(serverEqpmnVO.getPageUnit());
		paginationInfo.setPageSize(serverEqpmnVO.getPageSize());

		serverEqpmnVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		serverEqpmnVO.setLastIndex(paginationInfo.getLastRecordIndex());
		serverEqpmnVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		serverEqpmnVO.setServerEqpmnList(egovServerService.selectServerEqpmnList(serverEqpmnVO));

		model.addAttribute("serverEqpmnList", serverEqpmnVO.getServerEqpmnList());

		int totCnt = egovServerService.selectServerEqpmnListTotCnt(serverEqpmnVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		return "egovframework/com/sym/sym/srv/EgovServerEqpmnList";
	}

	/**
	 * ?깅줉???쒕쾭?λ퉬???곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * 
	 * @param serverEqpmnVO - ?쒕쾭?λ퉬 Vo
	 * @return String - 由ы꽩 Url
	 *
	 * @param serverEqpmnVO
	 */
	@RequestMapping(value = "/sym/sym/srv/getServerEqpmn.do")
	public String selectServerEqpmn(@RequestParam("serverEqpmnId") String serverEqpmnId,
			@ModelAttribute("serverEqpmnVO") ServerEqpmnVO serverEqpmnVO, Model model) throws Exception {
		serverEqpmnVO.setServerEqpmnId(serverEqpmnId);
		model.addAttribute("serverEqpmn", egovServerService.selectServerEqpmn(serverEqpmnVO));
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		return "egovframework/com/sym/sym/srv/EgovServerEqpmnDetail";
	}

	/**
	 * ?쒕쾭?λ퉬?뺣낫 ?깅줉 ?붾㈃?쇰줈 ?대룞?쒕떎.
	 * 
	 * @param serverEqpmnVO - ?쒕쾭?λ퉬 Vo
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/sym/sym/srv/addViewServerEqpmn.do")
	public String insertViewServerEqpmn(@ModelAttribute("serverEqpmnVO") ServerEqpmnVO serverEqpmnVO, ModelMap model)
			throws Exception {

		model.addAttribute("serverEqpmn", serverEqpmnVO);
		return "egovframework/com/sym/sym/srv/EgovServerEqpmnRegist";
	}

	/**
	 * ?쒕쾭?λ퉬?뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * 
	 * @param serverEqpmn - ?쒕쾭?λ퉬 model
	 * @return String - 由ы꽩 Url
	 *
	 * @param serverEqpmn
	 */
	@RequestMapping(value = "/sym/sym/srv/addServerEqpmn.do")
	public String insertServerEqpmn(@ModelAttribute("serverEqpmnVO") ServerEqpmnVO serverEqpmnVO,
			@ModelAttribute("serverEqpmn") ServerEqpmn serverEqpmn, BindingResult bindingResult, ModelMap model)
			throws Exception {

		if (bindingResult.hasErrors()) {
			model.addAttribute("serverEqpmnVO", serverEqpmnVO);
			return "egovframework/com/sym/sym/srv/EgovServerEqpmnRegist";
		} else {
			LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
			serverEqpmn.setFrstRegisterId(user == null ? "" : EgovStringUtil.isNullToString(user.getId()));
			serverEqpmn.setLastUpdusrId(user == null ? "" : EgovStringUtil.isNullToString(user.getId()));
			serverEqpmn.setServerEqpmnId(egovServerEqpmnIdGnrService.getNextStringId());
			model.addAttribute("serverEqpmn", egovServerService.insertServerEqpmn(serverEqpmn, serverEqpmnVO));
			model.addAttribute("message", egovMessageSource.getMessage("success.common.insert"));
			return "egovframework/com/sym/sym/srv/EgovServerEqpmnDetail";
		}
	}

	/**
	 * ?쒕쾭?λ퉬?뺣낫 ?섏젙 ?붾㈃?쇰줈 ?대룞?쒕떎.
	 * 
	 * @param serverEqpmnVO - ?쒕쾭?λ퉬 Vo
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/sym/sym/srv/updtViewServerEqpmn.do")
	public String updateViewServerEqpmn(@RequestParam("serverEqpmnId") String serverEqpmnId,
			@ModelAttribute("serverEqpmnVO") ServerEqpmnVO serverEqpmnVO, ModelMap model) throws Exception {

		serverEqpmnVO.setServerEqpmnId(serverEqpmnId);
		model.addAttribute("serverEqpmn", egovServerService.selectServerEqpmn(serverEqpmnVO));
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));
		return "egovframework/com/sym/sym/srv/EgovServerEqpmnUpdt";
	}

	/**
	 * 湲??깅줉???쒕쾭?λ퉬?뺣낫瑜??섏젙?쒕떎.
	 * 
	 * @param serverEqpmn - ?쒕쾭?λ퉬 model
	 * @return String - 由ы꽩 Url
	 *
	 * @param serverEqpmn
	 */
	@RequestMapping(value = "/sym/sym/srv/updtServerEqpmn.do")
	public String updateServerEqpmn(@ModelAttribute("serverEqpmn") ServerEqpmn serverEqpmn, BindingResult bindingResult,
			SessionStatus status, ModelMap model) throws Exception {

		if (bindingResult.hasErrors()) {
			model.addAttribute("serverEqpmnVO", serverEqpmn);
			return "egovframework/com/sym/sym/srv/EgovServerEqpmnUpdt";
		} else {
			LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
			serverEqpmn.setLastUpdusrId(user == null ? "" : EgovStringUtil.isNullToString(user.getId()));
			egovServerService.updateServerEqpmn(serverEqpmn);
			status.setComplete();
			model.addAttribute("message", egovMessageSource.getMessage("success.common.update"));
			return "forward:/sym/sym/srv/getServerEqpmn.do";
		}
	}

	/**
	 * 湲??깅줉???쒕쾭?λ퉬?뺣낫瑜???젣?쒕떎.
	 * 
	 * @param serverEqpmn - ?쒕쾭?λ퉬 model
	 * @return String - 由ы꽩 Url
	 *
	 * @param serverEqpmn
	 */
	@RequestMapping(value = "/sym/sym/srv/removeServerEqpmn.do")
	public String deleteServerEqpmn(@RequestParam("serverEqpmnId") String serverEqpmnId,
			@ModelAttribute("serverEqpmn") ServerEqpmn serverEqpmn, ModelMap model) throws Exception {
		serverEqpmn.setServerEqpmnId(serverEqpmnId);
		egovServerService.deleteServerEqpmn(serverEqpmn);
		model.addAttribute("message", egovMessageSource.getMessage("success.common.delete"));
		return "forward:/sym/sym/srv/selectServerEqpmnList.do";
	}

	/**
	 * ?쒕쾭?뺣낫愿由?紐⑸줉?붾㈃?쇰줈 ?대룞
	 * 
	 * @return String
	 */
	@RequestMapping(value = "/sym/sym/srv/selectServerListView.do")
	public String selectServerListView() throws Exception {
		return "egovframework/com/sym/sym/srv/EgovServerList";
	}

	/**
	 * ?쒕쾭?뺣낫瑜?愿由ы븯湲??꾪빐 ?깅줉???쒕쾭紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param serverVO - ?쒕쾭 Vo
	 * @return String - 由ы꽩 Url
	 *
	 * @param serverVO
	 */
	@IncludedInfo(name = "?쒕쾭(S/W)紐⑸줉", order = 1171, gid = 60)
	@RequestMapping(value = "/sym/sym/srv/selectServerList.do")
	public String selectServerList(@ModelAttribute("serverVO") ServerVO serverVO, ModelMap model) throws Exception {

		/** paging */
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(serverVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(serverVO.getPageUnit());
		paginationInfo.setPageSize(serverVO.getPageSize());

		serverVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		serverVO.setLastIndex(paginationInfo.getLastRecordIndex());
		serverVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		serverVO.setServerList(egovServerService.selectServerList(serverVO));

		model.addAttribute("serverList", serverVO.getServerList());

		int totCnt = egovServerService.selectServerListTotCnt(serverVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		return "egovframework/com/sym/sym/srv/EgovServerList";
	}

	/**
	 * ?깅줉???쒕쾭???곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * 
	 * @param serverVO - ?쒕쾭 Vo
	 * @return String - 由ы꽩 Url
	 *
	 * @param serverVO
	 */
	@RequestMapping(value = "/sym/sym/srv/getServer.do")
	public String selectServer(@RequestParam("serverId") String serverId, @ModelAttribute("serverVO") ServerVO serverVO,
			Model model) throws Exception {

		serverVO.setServerId(serverId);
		model.addAttribute("server", egovServerService.selectServer(serverVO));
		model.addAttribute("serverEqpmnRelateDetailList", egovServerService.selectServerEqpmnRelateDetail(serverVO));
		model.addAttribute("serverEqpmnRelateDetailCount",
				egovServerService.selectServerEqpmnRelateDetailTotCnt(serverVO));
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		return "egovframework/com/sym/sym/srv/EgovServerDetail";
	}

	/**
	 * ?쒕쾭?뺣낫 ?깅줉 ?붾㈃?쇰줈 ?대룞?쒕떎.
	 * 
	 * @param serverVO - ?쒕쾭 Vo
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/sym/sym/srv/addViewServer.do")
	public String insertViewServer(@ModelAttribute("serverVO") ServerVO serverVO, ModelMap model) throws Exception {

		model.addAttribute("cmmCodeDetailList", getCmmCodeDetailList(new ComDefaultCodeVO(), "COM064"));
		model.addAttribute("server", serverVO);
		return "egovframework/com/sym/sym/srv/EgovServerRegist";
	}

	/**
	 * ?쒕쾭?뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * 
	 * @param server - ?쒕쾭 model
	 * @return String - 由ы꽩 Url
	 *
	 * @param server
	 */
	@RequestMapping(value = "/sym/sym/srv/addServer.do")
	public String insertServer(@ModelAttribute("serverVO") ServerVO serverVO, @ModelAttribute("server") Server server,
			BindingResult bindingResult, ModelMap model) throws Exception {

		if (bindingResult.hasErrors()) {
			model.addAttribute("serverVO", serverVO);
			return "egovframework/com/sym/sym/srv/EgovServerRegist";
		} else {
			LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
			server.setFrstRegisterId(user == null ? "" : EgovStringUtil.isNullToString(user.getId()));
			server.setLastUpdusrId(user == null ? "" : EgovStringUtil.isNullToString(user.getId()));
			server.setServerId(egovServerIdGnrService.getNextStringId());
			model.addAttribute("server", egovServerService.insertServer(server, serverVO));
			model.addAttribute("message", egovMessageSource.getMessage("success.common.insert"));
			return "egovframework/com/sym/sym/srv/EgovServerDetail";
		}
	}

	/**
	 * ?쒕쾭?뺣낫 ?섏젙 ?붾㈃?쇰줈 ?대룞?쒕떎.
	 * 
	 * @param serverVO - ?쒕쾭 Vo
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/sym/sym/srv/updtViewServer.do")
	public String updateViewServer(@RequestParam("serverId") String serverId,
			@ModelAttribute("serverVO") ServerVO serverVO, ModelMap model) throws Exception {

		serverVO.setServerId(serverId);
		model.addAttribute("server", egovServerService.selectServer(serverVO));
		model.addAttribute("cmmCodeDetailList", getCmmCodeDetailList(new ComDefaultCodeVO(), "COM064"));
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));
		return "egovframework/com/sym/sym/srv/EgovServerUpdt";
	}

	/**
	 * 湲??깅줉???쒕쾭?뺣낫瑜??섏젙?쒕떎.
	 * 
	 * @param server - ?쒕쾭 model
	 * @return String - 由ы꽩 Url
	 *
	 * @param server
	 */
	@RequestMapping(value = "/sym/sym/srv/updtServer.do")
	public String updateServer(@ModelAttribute("server") Server server, BindingResult bindingResult,
			SessionStatus status, ModelMap model) throws Exception {

		if (bindingResult.hasErrors()) {
			model.addAttribute("serverVO", server);
			return "egovframework/com/sym/sym/srv/EgovServerUpdt";
		} else {
			LoginVO user = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
			server.setLastUpdusrId(user == null ? "" : EgovStringUtil.isNullToString(user.getId()));
			egovServerService.updateServer(server);
			status.setComplete();
			model.addAttribute("message", egovMessageSource.getMessage("success.common.update"));
			return "forward:/sym/sym/srv/getServer.do";
		}
	}

	/**
	 * 湲??깅줉???쒕쾭?뺣낫瑜???젣?쒕떎.
	 * 
	 * @param server - ?쒕쾭 model
	 * @return String - 由ы꽩 Url
	 *
	 * @param server
	 */
	@RequestMapping(value = "/sym/sym/srv/removeServer.do")
	public String deleteServer(@RequestParam("serverId") String serverId, @ModelAttribute("server") Server server,
			ModelMap model) throws Exception {

		server.setServerId(serverId);
		egovServerService.deleteServer(server);
		model.addAttribute("message", egovMessageSource.getMessage("success.common.delete"));
		return "forward:/sym/sym/srv/selectServerList.do";
	}

	/**
	 * ?쒕쾭?λ퉬愿怨꾩젙蹂대? 愿由ы븯湲??꾪빐 ????쒕쾭?λ퉬紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param serverEqpmnRelateVO - ?쒕쾭?λ퉬愿怨?Vo
	 * @return String - 由ы꽩 Url
	 *
	 * @param serverEqpmnRelateVO
	 */
	@RequestMapping(value = "/sym/sym/srv/selectServerEqpmnRelateList.do")
	public String selectServerEqpmnRelateList(@RequestParam("strServerId") String strServerId,
			@ModelAttribute("serverVO") ServerVO serverVO,
			@ModelAttribute("serverEqpmnRelateVO") ServerEqpmnRelateVO serverEqpmnRelateVO, ModelMap model)
			throws Exception {

		/** paging */
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(serverEqpmnRelateVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(serverEqpmnRelateVO.getPageUnit());
		paginationInfo.setPageSize(serverEqpmnRelateVO.getPageSize());

		serverEqpmnRelateVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		serverEqpmnRelateVO.setLastIndex(paginationInfo.getLastRecordIndex());
		serverEqpmnRelateVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		serverEqpmnRelateVO.setServerId(strServerId);
		serverVO.setServerId(strServerId);

		serverEqpmnRelateVO
				.setServerEqpmnRelateList(egovServerService.selectServerEqpmnRelateList(serverEqpmnRelateVO));

		model.addAttribute("serverEqpmnRelateList", serverEqpmnRelateVO.getServerEqpmnRelateList());
		model.addAttribute("server", egovServerService.selectServer(serverVO));

		int totCnt = egovServerService.selectServerEqpmnRelateListTotCnt(serverEqpmnRelateVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		return "egovframework/com/sym/sym/srv/EgovServerEqpmnRelateRegist";
	}

	/**
	 * ?쒕쾭?λ퉬愿怨꾩젙蹂대? ?깅줉 ?먮뒗 ??젣泥섎━?쒕떎.
	 * 
	 * @param serverEqpmnRelate - ?쒕쾭?λ퉬愿怨?model
	 * @return String - 由ы꽩 Url
	 *
	 * @param serverEqpmnRelate
	 */
	@RequestMapping(value = "/sym/sym/srv/saveServerEqpmnRelate.do")
	public String saveServerEqpmnRelate(@RequestParam("serverId") String serverId,
			@RequestParam("serverEqpmnIds") String serverEqpmnIds, @RequestParam("regYns") String regYns,
			@ModelAttribute("serverEqpmnRelate") ServerEqpmnRelate serverEqpmnRelate, SessionStatus status,
			ModelMap model) throws Exception {

		String[] strServerEqpmnIds = serverEqpmnIds.split(";");
		String[] strRegYns = regYns.split(";");

		serverEqpmnRelate.setServerId(serverId);

		for (int i = 0; i < strServerEqpmnIds.length; i++) {
			serverEqpmnRelate.setServerId(serverId);
			serverEqpmnRelate.setServerEqpmnId(strServerEqpmnIds[i]);
			if (strRegYns[i].equals("Y")) {
				egovServerService.insertServerEqpmnRelate(serverEqpmnRelate);
			} else {
				egovServerService.deleteServerEqpmnRelate(serverEqpmnRelate);
			}
		}

		status.setComplete();
		model.addAttribute("message", egovMessageSource.getMessage("success.common.insert"));
		return "forward:/sym/sym/srv/selectServerEqpmnRelateList.do";
	}

	/**
	 * 怨듯넻肄붾뱶 ?몄텧
	 * 
	 * @param comDefaultCodeVO ComDefaultCodeVO
	 * @param codeId           String
	 * @return List
	 * @exception Exception
	 */
	public List<?> getCmmCodeDetailList(ComDefaultCodeVO comDefaultCodeVO, String codeId) throws Exception {
		comDefaultCodeVO.setCodeId(codeId);
		return egovCmmUseService.selectCmmCodeDetail(comDefaultCodeVO);
	}
}
