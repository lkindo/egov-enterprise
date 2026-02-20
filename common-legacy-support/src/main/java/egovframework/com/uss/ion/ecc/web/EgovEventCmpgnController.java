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
 * ?? ??     ??   ?   ??                   ???       Controller Class ?            
 * 
 * @author ?      ???      ???      ??
 * @since 2009.03.20
 * @version 1.0
 * @see
 *
 *      <pre>
 *  ==          ???  ??Modification Information) ==
 *
 *   ??      ??     ??      ??          ??      ??      
 *  -------    --------    ---------------------------
 *   2009.03.20  ?      ??                  ????      
 *   2011.08.26  ?         ??         IncludedInfo annotation ?      ?
 *   2025.08.05  ??     ??         2025???      ?      ????PMD   ???      ?         ??            ??                ???     ???      ??      -LocalVariableNamingConventions(final???                  ??                   ????   ??????      )
 *
 *      </pre>
 */
@Controller
public class EgovEventCmpgnController {

	/** EgovMessageSource **/
	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	@Resource(name = "egovEventCmpgnService")
	private EgovEventCmpgnService egovEventCmpgnService;

	/** EgovPropertyService **/
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	@Resource(name = "EgovCmmUseService")
	private EgovCmmUseService cmmUseService;

	/**
	 * ?? ??     ??   ?   ???            ??         ???      .   
	 * 
	 * @param searchVO
	 * @param eventCmpgnVO
	 * @param model
	 * @return "egovframework/com/uss/ion/ecc/EgovEventCmpgnList
	 * @throws Exception
	 */
@IncludedInfo(name="Dummy", listUrl="", order=1, gid=50)
	@RequestMapping(value = "/uss/ion/ecc/selectEventCmpgnList.do")
	public String selectEventCmpgnList(@ModelAttribute("searchVO") EventCmpgnVO searchVO, ModelMap model)
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

		List<EventCmpgnVO> sampleList = egovEventCmpgnService.selectEventCmpgnList(searchVO);
		model.addAttribute("resultList", sampleList);

		int totCnt = egovEventCmpgnService.selectEventCmpgnListCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/uss/ion/ecc/EgovEventCmpgnList";

	}

	/**
	 * ?? ??     ??   ?   ???            ??         ???      .(Popup)   
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

		List<EventCmpgnVO> sampleList = egovEventCmpgnService.selectEventCmpgnList(searchVO);
		model.addAttribute("resultList", sampleList);

		int totCnt = egovEventCmpgnService.selectEventCmpgnListCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/uss/ion/ecc/EgovEventCmpgnListPopup";

	}

	/**
	 * ?? ??     ??   ?   ???            ???????         ?         ??         ???      .   
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
	 * ?? ??     ??   ?   ????         ????     ?   
	 * 
	 * @param searchVO
	 * @param model
	 * @return "/uss/ion/ecc/EgovEventCmpgnRegist"
	 * @throws Exception
	 */
	@RequestMapping("/uss/ion/ecc/insertEventCmpgnView.do")
	public String insertEventCmpgnView(@ModelAttribute("searchVO") EventCmpgnVO searchVO, Model model)
			throws Exception {

		// ??????? Vo
		ComDefaultCodeVO vo = new ComDefaultCodeVO();
		vo.setCodeId("COM035");

		List<CmmnDetailCode> eventTyCode = cmmUseService.selectCmmCodeDetail(vo);
		model.addAttribute("eventTyCode", eventTyCode);

		model.addAttribute("eventCmpgnVO", new EventCmpgnVO());

		return "egovframework/com/uss/ion/ecc/EgovEventCmpgnRegist";

	}

	/**
	 * ?? ??     ??   ?   ??          ?         ??      .   
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

		// ????? ?????? ??
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		String frstRegisterId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());

		eventCmpgnVO.setFrstRegisterId(frstRegisterId); // ???
		eventCmpgnVO.setLastUpdusrId(frstRegisterId); // ???

		egovEventCmpgnService.insertEventCmpgn(eventCmpgnVO);

		return "forward:/uss/ion/ecc/selectEventCmpgnList.do";
	}

	/**
	 * ?? ??     ??   ?   ??          ??      ??       ??         ??   
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

		// ??????? Vo
		ComDefaultCodeVO vo = new ComDefaultCodeVO();
		vo.setCodeId("COM035");

		List<CmmnDetailCode> eventTyCode = cmmUseService.selectCmmCodeDetail(vo);
		model.addAttribute("eventTyCode", eventTyCode);

		EventCmpgnVO eventCmpgnVO = new EventCmpgnVO();

		// Primary Key ??
		eventCmpgnVO.setEventId(eventId);
		model.addAttribute("eventCmpgnVO", egovEventCmpgnService.selectEventCmpgnDetail(eventCmpgnVO));

		return "egovframework/com/uss/ion/ecc/EgovEventCmpgnUpdt";
	}

	/**
	 * ?? ??     ??   ?   ??          ??               ???      .   
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

		// ????? ?????? ??
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		String lastUpdusrId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());
		eventCmpgnVO.setLastUpdusrId(lastUpdusrId); // ???

		egovEventCmpgnService.updateEventCmpgn(eventCmpgnVO);

		return "forward:/uss/ion/ecc/selectEventCmpgnList.do";

	}

	/**
	 * ?? ??     ??   ?   ??          ???      ?      ??      .   
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
	 * ???? ?????.
	 * 
	 * @param searchVO
	 * @param tnextrlHrVO
	 * @param model
	 * @return "egovframework com/uss/ion/ecc/EgovTnextrlHrList   
	 * @throws Exception
	 */
	@IncludedInfo(name = "Legacy Controller", order = 711, gid = 50)
	@RequestMapping(value = "/uss/ion/ecc/selectTnextrlHrList.do")
	public String selectTnextrlHrList(@ModelAttribute("searchVO") TnextrlHrVO searchVO, ModelMap model)
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

		List<TnextrlHrVO> sampleList = egovEventCmpgnService.selectTnextrlHrList(searchVO);
		model.addAttribute("resultList", sampleList);

		int totCnt = egovEventCmpgnService.selectTnextrlHrListCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/uss/ion/ecc/EgovTnextrlHrList";

	}

	/**
	 * ???? ?????????????.
	 * 
	 * @param tnextrlHrVO
	 * @param searchVO
	 * @param model
	 * @return " uss/ion/ecc/EgovTnextrlHrDetail"   
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
	 * ???? ??????
	 * 
	 * @param searchVO
	 * @param model
	 * @return " uss/ion/ecc/EgovTnextrlHrRegist"   
	 * @throws Exception
	 */
	@RequestMapping("/uss/ion/ecc/insertTnextrlHrView.do")
	public String insertTnextrlHrView(@ModelAttribute("searchVO") TnextrlHrVO searchVO, Model model) throws Exception {

		// ??????? Vo
		ComDefaultCodeVO vo = new ComDefaultCodeVO();
		vo.setCodeId("COM014"); // ??
		List<CmmnDetailCode> sexdstnCode = cmmUseService.selectCmmCodeDetail(vo);
		model.addAttribute("sexdstnCode", sexdstnCode);

		vo.setCodeId("COM034"); // 
		List<CmmnDetailCode> occpTyCode = cmmUseService.selectCmmCodeDetail(vo);
		model.addAttribute("occpTyCode", occpTyCode);

		model.addAttribute("tnextrlHrVO", new TnextrlHrVO());

		return "egovframework/com/uss/ion/ecc/EgovTnextrlHrRegist";

	}

	/**
	 * ?????????.
	 * 
	 * @param searchVO
	 * @param tnextrlHrVO
	 * @param bindingResult
	 * @return "forward: uss/ion/ecc/selectTnextrlHrList.do"   
	 * @throws Exception
	 */
	@RequestMapping("/uss/ion/ecc/insertTnextrlHr.do")
	public String insertTnextrlHr(@ModelAttribute("searchVO") TnextrlHrVO searchVO,
			@ModelAttribute("tnextrlHrVO") TnextrlHrVO tnextrlHrVO, BindingResult bindingResult) throws Exception {

		if (bindingResult.hasErrors()) {
			return "egovframework/com/uss/olh/ecc/EgovTnextrlHrRegist";
		}

		// ????? ?????? ??
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		String frstRegisterId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());

		tnextrlHrVO.setFrstRegisterId(frstRegisterId); // ???
		tnextrlHrVO.setLastUpdusrId(frstRegisterId); // ???

		egovEventCmpgnService.insertTnextrlHr(tnextrlHrVO);

		return "redirect:/uss/ion/ecc/selectTnextrlHrList.do";
	}

	/**
	 * ?????????? ????
	 * 
	 * @param extrlHrId
	 * @param searchVO
	 * @param model
	 * @return " uss/ion/ecc/EgovTnextrlHrUpdt"   
	 * @throws Exception
	 */
	@RequestMapping("/uss/ion/ecc/updateTnextrlHrView.do")
	public String updateTnextrlHrView(@RequestParam("extrlHrId") String extrlHrId,
			@ModelAttribute("searchVO") TnextrlHrVO searchVO, ModelMap model) throws Exception {

		// ??????? Vo
		ComDefaultCodeVO vo = new ComDefaultCodeVO();
		vo.setCodeId("COM014"); // ??
		List<CmmnDetailCode> sexdstnCode = cmmUseService.selectCmmCodeDetail(vo);
		model.addAttribute("sexdstnCode", sexdstnCode);

		vo.setCodeId("COM034"); // 
		List<CmmnDetailCode> occpTyCode = cmmUseService.selectCmmCodeDetail(vo);
		model.addAttribute("occpTyCode", occpTyCode);

		TnextrlHrVO tnextrlHrVO = new TnextrlHrVO();

		// Primary Key ??
		tnextrlHrVO.setExtrlHrId(extrlHrId);
		model.addAttribute("tnextrlHrVO", egovEventCmpgnService.selectTnextrlHrDetail(tnextrlHrVO));

		return "egovframework/com/uss/ion/ecc/EgovTnextrlHrUpdt";
	}

	/**
	 * ???????????.
	 * 
	 * @param searchVO
	 * @param tnextrlHrVO
	 * @param bindingResult
	 * @return "forward: uss/ion/ecc/selectTnextrlHrList.do"   
	 * @throws Exception
	 */
	@RequestMapping("/uss/ion/ecc/updateTnextrlHr.do")
	public String updateTnextrlHr(@ModelAttribute("searchVO") TnextrlHrVO searchVO,
			@ModelAttribute("tnextrlHrVO") TnextrlHrVO tnextrlHrVO, BindingResult bindingResult) throws Exception {

		if (bindingResult.hasErrors()) {
			return "egovframework/com/uss/olh/ecc/EgovTnextrlHrUpdt";
		}

		// ????? ?????? ??
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		String lastUpdusrId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());
		tnextrlHrVO.setLastUpdusrId(lastUpdusrId); // ???

		egovEventCmpgnService.updateTnextrlHr(tnextrlHrVO);

		return "forward:/uss/ion/ecc/selectTnextrlHrList.do";

	}

	/**
	 * ????????????.
	 * 
	 * @param tnextrlHrVO
	 * @param searchVO
	 * @return "forward: uss/ion/ecc/selectTnextrlHrList.do"   
	 * @throws Exception
	 */
	@RequestMapping("/uss/ion/ecc/deleteTnextrlHr.do")
	public String deleteTnextrlHr(TnextrlHrVO tnextrlHrVO, @ModelAttribute("searchVO") TnextrlHrVO searchVO)
			throws Exception {

		egovEventCmpgnService.deleteTnextrlHr(tnextrlHrVO);

		return "forward:/uss/ion/ecc/selectTnextrlHrList.do";
	}

}
