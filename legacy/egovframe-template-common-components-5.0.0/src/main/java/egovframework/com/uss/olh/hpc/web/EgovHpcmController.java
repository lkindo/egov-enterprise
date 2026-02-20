package egovframework.com.uss.olh.hpc.web;

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
import egovframework.com.uss.olh.hpc.service.EgovHpcmService;
import egovframework.com.uss.olh.hpc.service.HpcmVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * ?꾩?留먯쓣 泥섎━?섎뒗 鍮꾩쫰?덉뒪 援ы쁽 ?대옒??
 * 
 * @author 怨듯넻?쒕퉬??媛쒕컻? 諛뺤젙洹?
 * @since 2009.04.01
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.04.01  諛뺤젙洹?         理쒖큹 ?앹꽦
 *   2011.08.26  ?뺤쭊??         IncludedInfo annotation 異붽?
 *   2011.09.28  ?쒖???         return媛??ㅻ쪟 ?섏젙
 *   2016.08.02  源?고샇          ?쒖??꾨젅?꾩썙??3.6 媛쒖꽑
 *   2025.08.21  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-LocalVariableNamingConventions(final???꾨땶 蹂?섎뒗 諛묒쨪???ы븿?????놁쓬)
 *
 *      </pre>
 */
@Controller
public class EgovHpcmController {

	@Resource(name = "EgovHpcmService")
	private EgovHpcmService egovHpcmService;

	/** EgovPropertyService */
	@Resource(name = "propertiesService")
	protected EgovPropertyService propertiesService;

	@Resource(name = "EgovCmmUseService")
	private EgovCmmUseService cmmUseService;

	/** EgovMessageSource */
	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	/**
	 * ?꾩?留먮궡??紐⑸줉??議고쉶?쒕떎. (pageing)
	 * 
	 * @param searchVO
	 * @param model
	 * @return "/uss/olh/hpc/EgovHpcmList"
	 * @throws Exception
	 */
	@IncludedInfo(name = "?꾩?留?, order = 520, gid = 50)
	@RequestMapping(value = "/uss/olh/hpc/selectHpcmList.do")
	public String selectHpcmList(@ModelAttribute("searchVO") HpcmVO searchVO, ModelMap model) throws Exception {

		/** EgovPropertyService.SiteList */
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

		List<HpcmVO> resultList = egovHpcmService.selectHpcmList(searchVO);
		model.addAttribute("resultList", resultList);

		int totCnt = egovHpcmService.selectHpcmListCnt(searchVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		return "egovframework/com/uss/olh/hpc/EgovHpcmList";
	}

	/**
	 * ?꾩?留먮궡??紐⑸줉??????곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * 
	 * @param hpcmManageVO
	 * @param searchVO
	 * @param model
	 * @return "/uss/olh/hpc/EgovHpcmDetailInqire"
	 * @throws Exception
	 */
	@RequestMapping("/uss/olh/hpc/selectHpcmDetail.do")
	public String selectHpcmDetail(HpcmVO hpcmManageVO, @ModelAttribute("searchVO") HpcmVO searchVO, ModelMap model)
			throws Exception {

		HpcmVO vo = egovHpcmService.selectHpcmDetail(hpcmManageVO);

		model.addAttribute("result", vo);

		return "egovframework/com/uss/olh/hpc/EgovHpcmDetail";
	}

	/**
	 * ?꾩?留먮궡?⑸? ?깅줉?섍린 ?꾪븳 ??泥섎━(怨듯넻肄붾뱶 泥섎━)
	 * 
	 * @param searchVO
	 * @param model
	 * @return "/uss/olh/hpc/EgovHpcmCnRegist"
	 * @throws Exception
	 */
	@RequestMapping("/uss/olh/hpc/insertHpcmView.do")
	public String insertHpcmView(@ModelAttribute("searchVO") HpcmVO searchVO, Model model) throws Exception {

		// 怨듯넻肄붾뱶瑜?媛?몄삤湲??꾪븳 Vo
		ComDefaultCodeVO vo = new ComDefaultCodeVO();
		vo.setCodeId("COM021");

		List<CmmnDetailCode> hpcmSeCode = cmmUseService.selectCmmCodeDetail(vo);
		model.addAttribute("hpcmSeCode", hpcmSeCode);

		model.addAttribute("hpcmVO", new HpcmVO());

		return "egovframework/com/uss/olh/hpc/EgovHpcmRegist";

	}

	/**
	 * ?꾩?留먮궡?⑸? ?깅줉?쒕떎.
	 * 
	 * @param searchVO
	 * @param hpcmVO
	 * @param bindingResult
	 * @return "forward:/uss/olh/hpc/selectHpcmList.do"
	 * @throws Exception
	 */
	@RequestMapping("/uss/olh/hpc/insertHpcm.do")
	public String insertHpcmCn(@ModelAttribute("searchVO") HpcmVO searchVO, @ModelAttribute("hpcmVO") HpcmVO hpcmVO,
			BindingResult bindingResult) throws Exception {

		if (bindingResult.hasErrors()) {
			return "egovframework/com/uss/olh/hpc/EgovHpcmRegist";
		}

		// 濡쒓렇?퇦O?먯꽌 ?ъ슜???뺣낫 媛?몄삤湲?
		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();

		String frstRegisterId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());

		hpcmVO.setFrstRegisterId(frstRegisterId); // 理쒖큹?깅줉?륤D
		hpcmVO.setLastUpdusrId(frstRegisterId); // 理쒖쥌?섏젙?륤D

		egovHpcmService.insertHpcm(hpcmVO);

		return "forward:/uss/olh/hpc/selectHpcmList.do";
	}

	/**
	 * ?꾩?留먮궡?⑸? ?섏젙?섍린 ?꾪븳 ??泥섎━(怨듯넻肄붾뱶 泥섎━)
	 * 
	 * @param hpcmId
	 * @param searchVO
	 * @param model
	 * @return "/uss/olh/hpc/EgovHpcmUpdt"
	 * @throws Exception
	 */
	@RequestMapping("/uss/olh/hpc/updateHpcmView.do")
	public String updateHpcmView(@RequestParam("hpcmId") String hpcmId, @ModelAttribute("searchVO") HpcmVO searchVO,
			ModelMap model) throws Exception {

		// 怨듯넻肄붾뱶瑜?媛?몄삤湲??꾪븳 Vo
		ComDefaultCodeVO vo = new ComDefaultCodeVO();
		vo.setCodeId("COM021");

		List<CmmnDetailCode> hpcmSeCode = cmmUseService.selectCmmCodeDetail(vo);
		model.addAttribute("hpcmSeCode", hpcmSeCode);

		HpcmVO hpcmVO = new HpcmVO();
		hpcmVO.setHpcmId(hpcmId);

		model.addAttribute("hpcmVO", egovHpcmService.selectHpcmDetail(hpcmVO));

		return "egovframework/com/uss/olh/hpc/EgovHpcmUpdt";
	}

	/**
	 * ?꾩?留먯쓣 ?섏젙?쒕떎.
	 * 
	 * @param searchVO
	 * @param hpcmVO
	 * @param bindingResult
	 * @return "forward:/uss/olh/hpc/selectHpcmList.do"
	 * @throws Exception
	 */
	@RequestMapping("/uss/olh/hpc/updateHpcm.do")
	public String updateHpcm(@ModelAttribute("searchVO") HpcmVO searchVO, @ModelAttribute("hpcmManageVO") HpcmVO hpcmVO,
			BindingResult bindingResult) throws Exception {

		if (bindingResult.hasErrors()) {
			return "egovframework/com/uss/olh/hpc/EgovHpcmUpdt";
		}

		LoginVO loginVO = (LoginVO) EgovUserDetailsHelper.getAuthenticatedUser();
		String lastUpdusrId = loginVO == null ? "" : EgovStringUtil.isNullToString(loginVO.getUniqId());

		hpcmVO.setLastUpdusrId(lastUpdusrId); // 理쒖쥌?섏젙?륤D
		egovHpcmService.updateHpcm(hpcmVO);

		return "forward:/uss/olh/hpc/selectHpcmList.do";

	}

	/**
	 * ?꾩?留먯쓣 ??젣?쒕떎.
	 * 
	 * @param hpcmVO
	 * @param searchVO
	 * @return "forward:/uss/olh/hpc/selectHpcmList.do"
	 * @throws Exception
	 */
	@RequestMapping("/uss/olh/hpc/deleteHpcm.do")
	public String deleteHpcmCn(HpcmVO hpcmVO, @ModelAttribute("searchVO") HpcmVO searchVO) throws Exception {

		egovHpcmService.deleteHpcmCn(hpcmVO);

		return "forward:/uss/olh/hpc/selectHpcmList.do";
	}

}
