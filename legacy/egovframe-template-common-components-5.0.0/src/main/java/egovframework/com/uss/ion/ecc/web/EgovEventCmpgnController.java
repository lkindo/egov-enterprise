package egovframework.com.uss.ion.ecc.web;

import java.util.List;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import egovframework.com.cmm.ComDefaultCodeVO;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.service.CmmnDetailCode;
import egovframework.com.cmm.service.EgovCmmUseService;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.uss.ion.ecc.service.EgovEventCmpgnService;
import egovframework.com.uss.ion.ecc.service.EventCmpgnVO;
import egovframework.com.uss.ion.ecc.service.TnextrlHrVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;
/**
 * ?됱궗/?대깽??罹좏럹?몄쓣 泥섎━?섎뒗 Controller Class 援ы쁽
 * 
 * @author 怨듯넻?쒕퉬???λ룞??
 * @since 2009.03.20
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.03.20  ?λ룞??         理쒖큹 ?앹꽦
 *   2011.08.26  ?뺤쭊??         IncludedInfo annotation 異붽?
 *   2025.08.05  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(final???꾨땶 蹂?섎뒗 諛묒쨪???ы븿?????놁쓬)
 *
 *      </pre>
 */
@Controller
public class EgovEventCmpgnController {

	/** EgovMessageSource */
	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	@Resource(name = "EgovEventCmpgnService")
	private EgovEventCmpgnService egovEventCmpgnService;

	/** EgovPropertyService */
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	@Resource(name = "EgovCmmUseService")
	private EgovCmmUseService cmmUseService;

	/**
	 * ?됱궗/?대깽??罹좏럹??紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param searchVO
	 * @param eventCmpgnVO
	 * @param model
	 * @return "egovframework/com/uss/ion/ecc/EgovEventCmpgnList
	 * @throws Exception
	 */
	@IncludedInfo(name = "?됱궗/?대깽??罹좏럹??, order = 710, gid = 50)
	@RequestMapping(value = "/uss/ion/ecc/selectEventCmpgnList.do")
	public String selectEventCmpgnList(@ModelAttribute("searchVO") EventCmpgnVO searchVO, ModelMap model)
			throws Exception {

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

		List<EventCmpgnVO> sampleList = egovEventCmpgnService.selectEventCmpgnList(searchVO);
		model.addAttribute("resultList", sampleList);

		int totCnt = egovEventCmpgnService.selectEventCmpgnListCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/uss/ion/ecc/EgovEventCmpgnList";

	}

	/**
	 * ?됱궗/?대깽??罹좏럹??紐⑸줉??議고쉶?쒕떎.(Popup)
	 * 
	 * @param searchVO
	 * @param eventCmpgnVO
	 * @param model
	 * @return "egovframework/com/uss/ion/ecc/EgovEventCmpgnList
	 * @throws Exception
	 */
	@RequestMapping(value = "/uss/ion/ecc/selectEventCmpgnListPopup.do")
	public String selectEventCmpgnListPopup(@ModelAttribute("searchVO") EventCmpgnVO searchVO, ModelMap model)
			throws Exception {

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

		List<EventCmpgnVO> sampleList = egovEventCmpgnService.selectEventCmpgnList(searchVO);
		model.addAttribute("resultList", sampleList);

		int totCnt = egovEventCmpgnService.selectEventCmpgnListCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/uss/ion/ecc/EgovEventCmpgnListPopup";

	}

	/**
	 * ?됱궗/?대깽??罹좏럹??紐⑸줉??????곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * 
	 * @param eventCmpgnVO
	 * @param searchVO
	 * @param model
	 * @return "/uss/ion/ecc/EgovEventCmpgnDetail"
	 * @throws Exception
	 */
	@RequestMapping("/uss/ion/ecc/selectEventCmpgnDetail.do")
	public String selectEventCmpgnDetail(EventCmpgnVO eventCmpgnVO, @ModelAttribute("searchVO") EventCmpgnVO searchVO,
			ModelMap model) throws Exception {

		EventCmpgnVO vo = egovEventCmpgnService.selectEventCmpgnDetail(eventCmpgnVO);

		model.addAttribute("result", vo);

		return "egovframework/com/uss/ion/ecc/EgovEventCmpgnDetail";
	}

	/**
	 * ?됱궗/?대깽??罹좏럹???깅줉???④퀎
	 * 
	 * @param searchVO
	 * @param model
	 * @return "/uss/ion/ecc/EgovEventCmpgnRegist"
	 * @throws Exception
	 */
	@RequestMapping("/uss/ion/ecc/insertEventCmpgnView.do")
	public String insertEventCmpgnView(@ModelAttribute("searchVO") EventCmpgnVO searchVO, Model model)
			throws Exception {

		// 怨듯넻肄붾뱶瑜?媛?몄삤湲??꾪븳 Vo
		ComDefaultCodeVO vo = new ComDefaultCodeVO();
		vo.setCodeId("COM035");

		List<CmmnDetailCode> eventTyCode = cmmUseService.selectCmmCodeDetail(vo);
		model.addAttribute("eventTyCode", eventTyCode);

		model.addAttribute("eventCmpgnVO", new EventCmpgnVO());

		return "egovframework/com/uss/ion/ecc/EgovEventCmpgnRegist";

	}

	/**
	 * ?됱궗/?대깽??罹좏럹?몄쓣 ?깅줉?쒕떎.
	 * 
	 * @param searchVO
	 * @param eventCmpgnVO
	 * @param bindingResult
	 * @return "forward:/uss/ion/ecc/selectEventCmpgnList.do"
	 * @throws Exception
	 */
	@RequestMapping("/uss/ion/ecc/insertEventCmpgn.do")
	public String insertEventCmpgn(@Valid @ModelAttribute("searchVO") EventCmpgnVO searchVO,
			@ModelAttribute("eventCmpgnVO") EventCmpgnVO eventCmpgnVO, BindingResult bindingResult) throws Exception {

		if (bindingResult.hasErrors()) {
			return "egovframework/com/uss/olh/ecc/EgovEventCmpgnRegist";
		}

		// 濡쒓렇?퇦O?먯꽌 ?ъ슜???뺣낫 媛?몄삤湲?
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		String frstRegisterId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());

		eventCmpgnVO.setFrstRegisterId(frstRegisterId); // 理쒖큹?깅줉?륤D
		eventCmpgnVO.setLastUpdusrId(frstRegisterId); // 理쒖쥌?섏젙?륤D

		egovEventCmpgnService.insertEventCmpgn(eventCmpgnVO);

		return "forward:/uss/ion/ecc/selectEventCmpgnList.do";
	}

	/**
	 * ?됱궗/?대깽??罹좏럹?몄쓣 ?섏젙?섍린 ??泥섎━
	 * 
	 * @param eventId
	 * @param searchVO
	 * @param model
	 * @return "/uss/ion/ecc/EgovEventCmpgnUpdt"
	 * @throws Exception
	 */
	@RequestMapping("/uss/ion/ecc/updateEventCmpgnView.do")
	public String updateEventCmpgnView(@RequestParam("eventId") String eventId,
			@ModelAttribute("searchVO") EventCmpgnVO searchVO, ModelMap model) throws Exception {

		// 怨듯넻肄붾뱶瑜?媛?몄삤湲??꾪븳 Vo
		ComDefaultCodeVO vo = new ComDefaultCodeVO();
		vo.setCodeId("COM035");

		List<CmmnDetailCode> eventTyCode = cmmUseService.selectCmmCodeDetail(vo);
		model.addAttribute("eventTyCode", eventTyCode);

		EventCmpgnVO eventCmpgnVO = new EventCmpgnVO();

		// Primary Key 媛??명똿
		eventCmpgnVO.setEventId(eventId);
		model.addAttribute("eventCmpgnVO", egovEventCmpgnService.selectEventCmpgnDetail(eventCmpgnVO));

		return "egovframework/com/uss/ion/ecc/EgovEventCmpgnUpdt";
	}

	/**
	 * ?됱궗/?대깽??罹좏럹?몄쓣 ?섏젙泥섎━?쒕떎.
	 * 
	 * @param searchVO
	 * @param eventCmpgnVO
	 * @param bindingResult
	 * @return "forward:/uss/ion/ecc/selectEventCmpgnList.do"
	 * @throws Exception
	 */
	@RequestMapping("/uss/ion/ecc/updateEventCmpgn.do")
	public String updateEventCmpgn(@ModelAttribute("searchVO") EventCmpgnVO searchVO,
			@ModelAttribute("eventCmpgnVO") EventCmpgnVO eventCmpgnVO, BindingResult bindingResult) throws Exception {

		if (bindingResult.hasErrors()) {
			return "egovframework/com/uss/olh/ecc/EgovEventCmpgnUpdt";
		}

		// 濡쒓렇?퇦O?먯꽌 ?ъ슜???뺣낫 媛?몄삤湲?
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		String lastUpdusrId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());
		eventCmpgnVO.setLastUpdusrId(lastUpdusrId); // 理쒖쥌?섏젙?륤D

		egovEventCmpgnService.updateEventCmpgn(eventCmpgnVO);

		return "forward:/uss/ion/ecc/selectEventCmpgnList.do";

	}

	/**
	 * ?됱궗/?대깽??罹좏럹?몄쓣 ??젣泥섎━?쒕떎.
	 * 
	 * @param eventCmpgnVO
	 * @param searchVO
	 * @return "forward:/uss/ion/ecc/selectEventCmpgnList.do"
	 * @throws Exception
	 */
	@RequestMapping("/uss/ion/ecc/deleteEventCmpgn.do")
	public String deleteEventCmpgn(EventCmpgnVO eventCmpgnVO, @ModelAttribute("searchVO") EventCmpgnVO searchVO)
			throws Exception {

		egovEventCmpgnService.deleteEventCmpgn(eventCmpgnVO);

		return "forward:/uss/ion/ecc/selectEventCmpgnList.do";
	}

	/**
	 * ?몃??몄궗?뺣낫 紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param searchVO
	 * @param tnextrlHrVO
	 * @param model
	 * @return "egovframework/com/uss/ion/ecc/EgovTnextrlHrList
	 * @throws Exception
	 */
	@IncludedInfo(name = "?몃??몄궗?뺣낫", order = 711, gid = 50)
	@RequestMapping(value = "/uss/ion/ecc/selectTnextrlHrList.do")
	public String selectTnextrlHrList(@ModelAttribute("searchVO") TnextrlHrVO searchVO, ModelMap model)
			throws Exception {

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

		List<TnextrlHrVO> sampleList = egovEventCmpgnService.selectTnextrlHrList(searchVO);
		model.addAttribute("resultList", sampleList);

		int totCnt = egovEventCmpgnService.selectTnextrlHrListCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/uss/ion/ecc/EgovTnextrlHrList";

	}

	/**
	 * ?몃??몄궗?뺣낫 紐⑸줉??????곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * 
	 * @param tnextrlHrVO
	 * @param searchVO
	 * @param model
	 * @return "/uss/ion/ecc/EgovTnextrlHrDetail"
	 * @throws Exception
	 */
	@RequestMapping("/uss/ion/ecc/selectTnextrlHrDetail.do")
	public String selectTnextrlHrDetail(TnextrlHrVO tnextrlHrVO, @ModelAttribute("searchVO") TnextrlHrVO searchVO,
			ModelMap model) throws Exception {

		TnextrlHrVO vo = egovEventCmpgnService.selectTnextrlHrDetail(tnextrlHrVO);

		model.addAttribute("result", vo);

		return "egovframework/com/uss/ion/ecc/EgovTnextrlHrDetail";
	}

	/**
	 * ?몃??몄궗?뺣낫 ?깅줉???④퀎
	 * 
	 * @param searchVO
	 * @param model
	 * @return "/uss/ion/ecc/EgovTnextrlHrRegist"
	 * @throws Exception
	 */
	@RequestMapping("/uss/ion/ecc/insertTnextrlHrView.do")
	public String insertTnextrlHrView(@ModelAttribute("searchVO") TnextrlHrVO searchVO, Model model) throws Exception {

		// 怨듯넻肄붾뱶瑜?媛?몄삤湲??꾪븳 Vo
		ComDefaultCodeVO vo = new ComDefaultCodeVO();
		vo.setCodeId("COM014"); // ?깅퀎
		List<CmmnDetailCode> sexdstnCode = cmmUseService.selectCmmCodeDetail(vo);
		model.addAttribute("sexdstnCode", sexdstnCode);

		vo.setCodeId("COM034"); // 吏곸뾽肄붾뱶
		List<CmmnDetailCode> occpTyCode = cmmUseService.selectCmmCodeDetail(vo);
		model.addAttribute("occpTyCode", occpTyCode);

		model.addAttribute("tnextrlHrVO", new TnextrlHrVO());

		return "egovframework/com/uss/ion/ecc/EgovTnextrlHrRegist";

	}

	/**
	 * ?몃??몄궗?뺣낫瑜??깅줉?쒕떎.
	 * 
	 * @param searchVO
	 * @param tnextrlHrVO
	 * @param bindingResult
	 * @return "forward:/uss/ion/ecc/selectTnextrlHrList.do"
	 * @throws Exception
	 */
	@RequestMapping("/uss/ion/ecc/insertTnextrlHr.do")
	public String insertTnextrlHr(@ModelAttribute("searchVO") TnextrlHrVO searchVO,
			@ModelAttribute("tnextrlHrVO") TnextrlHrVO tnextrlHrVO, BindingResult bindingResult) throws Exception {

		if (bindingResult.hasErrors()) {
			return "egovframework/com/uss/olh/ecc/EgovTnextrlHrRegist";
		}

		// 濡쒓렇?퇦O?먯꽌 ?ъ슜???뺣낫 媛?몄삤湲?
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		String frstRegisterId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());

		tnextrlHrVO.setFrstRegisterId(frstRegisterId); // 理쒖큹?깅줉?륤D
		tnextrlHrVO.setLastUpdusrId(frstRegisterId); // 理쒖쥌?섏젙?륤D

		egovEventCmpgnService.insertTnextrlHr(tnextrlHrVO);

		return "redirect:/uss/ion/ecc/selectTnextrlHrList.do";
	}

	/**
	 * ?몃??몄궗?뺣낫瑜??섏젙?섍린 ??泥섎━
	 * 
	 * @param extrlHrId
	 * @param searchVO
	 * @param model
	 * @return "/uss/ion/ecc/EgovTnextrlHrUpdt"
	 * @throws Exception
	 */
	@RequestMapping("/uss/ion/ecc/updateTnextrlHrView.do")
	public String updateTnextrlHrView(@RequestParam("extrlHrId") String extrlHrId,
			@ModelAttribute("searchVO") TnextrlHrVO searchVO, ModelMap model) throws Exception {

		// 怨듯넻肄붾뱶瑜?媛?몄삤湲??꾪븳 Vo
		ComDefaultCodeVO vo = new ComDefaultCodeVO();
		vo.setCodeId("COM014"); // ?깅퀎
		List<CmmnDetailCode> sexdstnCode = cmmUseService.selectCmmCodeDetail(vo);
		model.addAttribute("sexdstnCode", sexdstnCode);

		vo.setCodeId("COM034"); // 吏곸뾽肄붾뱶
		List<CmmnDetailCode> occpTyCode = cmmUseService.selectCmmCodeDetail(vo);
		model.addAttribute("occpTyCode", occpTyCode);

		TnextrlHrVO tnextrlHrVO = new TnextrlHrVO();

		// Primary Key 媛??명똿
		tnextrlHrVO.setExtrlHrId(extrlHrId);
		model.addAttribute("tnextrlHrVO", egovEventCmpgnService.selectTnextrlHrDetail(tnextrlHrVO));

		return "egovframework/com/uss/ion/ecc/EgovTnextrlHrUpdt";
	}

	/**
	 * ?몃??몄궗?뺣낫瑜??섏젙泥섎━?쒕떎.
	 * 
	 * @param searchVO
	 * @param tnextrlHrVO
	 * @param bindingResult
	 * @return "forward:/uss/ion/ecc/selectTnextrlHrList.do"
	 * @throws Exception
	 */
	@RequestMapping("/uss/ion/ecc/updateTnextrlHr.do")
	public String updateTnextrlHr(@ModelAttribute("searchVO") TnextrlHrVO searchVO,
			@ModelAttribute("tnextrlHrVO") TnextrlHrVO tnextrlHrVO, BindingResult bindingResult) throws Exception {

		if (bindingResult.hasErrors()) {
			return "egovframework/com/uss/olh/ecc/EgovTnextrlHrUpdt";
		}

		// 濡쒓렇?퇦O?먯꽌 ?ъ슜???뺣낫 媛?몄삤湲?
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		String lastUpdusrId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());
		tnextrlHrVO.setLastUpdusrId(lastUpdusrId); // 理쒖쥌?섏젙?륤D

		egovEventCmpgnService.updateTnextrlHr(tnextrlHrVO);

		return "forward:/uss/ion/ecc/selectTnextrlHrList.do";

	}

	/**
	 * ?몃??몄궗?뺣낫瑜???젣泥섎━?쒕떎.
	 * 
	 * @param tnextrlHrVO
	 * @param searchVO
	 * @return "forward:/uss/ion/ecc/selectTnextrlHrList.do"
	 * @throws Exception
	 */
	@RequestMapping("/uss/ion/ecc/deleteTnextrlHr.do")
	public String deleteTnextrlHr(TnextrlHrVO tnextrlHrVO, @ModelAttribute("searchVO") TnextrlHrVO searchVO)
			throws Exception {

		egovEventCmpgnService.deleteTnextrlHr(tnextrlHrVO);

		return "forward:/uss/ion/ecc/selectTnextrlHrList.do";
	}

}
