package egovframework.com.uss.umt.web;

import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.ui.ModelMap;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.uss.umt.service.DeptManageVO;
import egovframework.com.uss.umt.service.EgovDeptManageService;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;

/**
 * 遺?쒓???泥섎━瑜? 鍮꾩??덉뒪 ?대옒?ㅻ줈 ?꾨떖?섍퀬 泥섎━?쒓껐怨쇰?  ?대떦   ???붾㈃?쇰줈 ?꾨떖?섎뒗  Controller瑜??뺤쓽?쒕떎
 * @author 怨듯넻?쒕퉬??媛쒕컻? 議곗옱??
 * @since 2009.00.00
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.02.01  lee.m.j     理쒖큹 ?앹꽦
 *   2015.06.16  議곗젙援?     ?쒕퉬???붾㈃ ?묎렐??議고쉶寃곌낵瑜??쒖떆?섎룄濡??섏젙
 *   2021.05.30  ?뺤쭊??     濡쒓렇?몄씤利앹젣??
 * </pre>
 */
@Controller
public class EgovDeptManageController {

	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	@Resource(name = "egovDeptManageService")
	private EgovDeptManageService egovDeptManageService;

	/** Message ID Generation */
	@Resource(name = "egovDeptManageIdGnrService")
	private EgovIdGnrService egovDeptManageIdGnrService;

	/**
	 * 遺??紐⑸줉?붾㈃ ?대룞
	 * @return String
	 * @exception Exception
	 */
	@IncludedInfo(name = "遺?쒓?由?, order = 461, gid = 50)
	@RequestMapping("/uss/umt/dpt/selectDeptManageListView.do")
	public String selectDeptManageListView() throws Exception {

		// 2021.05.30, ?뺤쭊?? 濡쒓렇?몄씤利앹젣??
		Boolean isAuthenticated = EgovUserDetailsHelper.isAuthenticated();
		if (!isAuthenticated) {
			return "index";
		}

		return "forward:/uss/umt/dpt/selectDeptManageList.do";
	}

	/**
	 * 遺?쒕? 愿由ы븯湲??꾪빐 ?깅줉??遺?쒕ぉ濡앹쓣 議고쉶?쒕떎.
	 * @param bannerVO - 諛곕꼫 VO
	 * @return String - 由ы꽩 URL
	 * @throws Exception
	 */

	@RequestMapping(value = "/uss/umt/dpt/selectDeptManageList.do")
	public String selectDeptManageList(@ModelAttribute("deptManageVO") DeptManageVO deptManageVO, ModelMap model) throws Exception {

		/** paging */
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(deptManageVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(deptManageVO.getPageUnit());
		paginationInfo.setPageSize(deptManageVO.getPageSize());

		deptManageVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
		deptManageVO.setLastIndex(paginationInfo.getLastRecordIndex());
		deptManageVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());

		model.addAttribute("deptManageList", egovDeptManageService.selectDeptManageList(deptManageVO));

		int totCnt = egovDeptManageService.selectDeptManageListTotCnt(deptManageVO);
		paginationInfo.setTotalRecordCount(totCnt);
		model.addAttribute("paginationInfo", paginationInfo);
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));
		return "egovframework/com/uss/umt/EgovDeptManageList";
	}

	/**
	 * ?깅줉??遺?쒖쓽 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param bannerVO - 遺??Vo
	 * @return String - 由ы꽩 Url
	 */

	@RequestMapping(value = "/uss/umt/dpt/getDeptManage.do")
	public String selectDeptManage(@RequestParam("orgnztId") String orgnztId, @ModelAttribute("deptManageVO") DeptManageVO deptManageVO, ModelMap model) throws Exception {

		deptManageVO.setOrgnztId(orgnztId);

		model.addAttribute("deptManage", egovDeptManageService.selectDeptManage(deptManageVO));
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));
		return "egovframework/com/uss/umt/EgovDeptManageUpdt";
	}

	/**
	 * 遺?쒕벑濡??붾㈃?쇰줈 ?대룞?쒕떎.
	 * @param banner - 遺??model
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/uss/umt/dpt/addViewDeptManage.do")
	public String insertViewDeptManage(@ModelAttribute("deptManageVO") DeptManageVO deptManageVO, ModelMap model) throws Exception {

		model.addAttribute("deptManage", deptManageVO);
		return "egovframework/com/uss/umt/EgovDeptManageInsert";
	}

	/**
	 * 遺?쒖젙蹂대? ?좉퇋濡??깅줉?쒕떎.
	 * @param banner - 遺??model
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/uss/umt/dpt/addDeptManage.do")
	public String insertDeptManage(
		@Valid @ModelAttribute("deptManageVO") DeptManageVO deptManageVO,
		BindingResult bindingResult,  ModelMap model) throws Exception {

		deptManageVO.setOrgnztId(egovDeptManageIdGnrService.getNextStringId());

		if (bindingResult.hasErrors()) {
			return "egovframework/com/uss/umt/EgovDeptManageInsert";
		} else {
			egovDeptManageService.insertDeptManage(deptManageVO);
			model.addAttribute("message", egovMessageSource.getMessage("success.common.insert"));
			return "forward:/uss/umt/dpt/selectDeptManageList.do";
		}
	}

	/**
	 * 湲??깅줉??遺?쒖젙蹂대? ?섏젙?쒕떎.
	 * @param banner - 遺??model
	 * @return String - 由ы꽩 Url
	 */
	@RequestMapping(value = "/uss/umt/dpt/updtDeptManage.do")
	public String updateDeptManage(
		@Valid @ModelAttribute("deptManageVO") DeptManageVO deptManageVO,
		BindingResult bindingResult, ModelMap model) throws Exception {

		if (bindingResult.hasErrors()) {
			return "egovframework/com/uss/umt/EgovDeptManageUpdt";
		} else {
			egovDeptManageService.updateDeptManage(deptManageVO);
			model.addAttribute("message", egovMessageSource.getMessage("success.common.insert"));
			return "forward:/uss/umt/dpt/selectDeptManageList.do";
		}
	}

	/**
	 * 湲??깅줉??遺?쒖젙蹂대? ??젣?쒕떎.
	 * @param banner Banner
	 * @return String
	 * @exception Exception
	 */
	@RequestMapping(value = "/uss/umt/dpt/removeDeptManage.do")
	public String deleteDeptManage(@ModelAttribute("deptManageVO") DeptManageVO deptManageVO, Model model) throws Exception {

		egovDeptManageService.deleteDeptManage(deptManageVO);
		model.addAttribute("message", egovMessageSource.getMessage("success.common.delete"));
		return "forward:/uss/umt/dpt/selectDeptManageList.do";
	}

	/**
	 * 湲??깅줉??遺?쒖젙蹂대ぉ濡앹쓣 ?쇨큵 ??젣?쒕떎.
	 * @param banners String
	 * @param banner Banner
	 * @return String
	 * @exception Exception
	 */
	@RequestMapping(value = "/uss/umt/dpt/removeDeptManageList.do")
	public String deleteDeptManageList(@RequestParam("deptManages") String deptManages, @ModelAttribute("deptManageVO") DeptManageVO deptManageVO, ModelMap model) throws Exception {

		String[] strDeptManages = deptManages.split(";");
		for (String strDeptManage : strDeptManages) {
			deptManageVO.setOrgnztId(strDeptManage);
			egovDeptManageService.deleteDeptManage(deptManageVO);
		}

		model.addAttribute("message", egovMessageSource.getMessage("success.common.delete"));
		return "forward:/uss/umt/dpt/selectDeptManageList.do";
	}

}
