/**
 * ?????controller ?????(JPA ?)
 **/

package egovframework.com.sts.rst.web;

import java.util.ArrayList;
import java.util.List;

import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import com.company.project.domain.stats.ReprtStats;
import com.company.project.service.stats.ReportStatsService;

import egovframework.com.cmm.ComDefaultCodeVO;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.service.EgovCmmUseService;
import egovframework.com.sts.rst.service.ReprtStatsVO;
import egovframework.com.utl.fcc.service.EgovDateUtil;
import jakarta.annotation.Resource;
import lombok.RequiredArgsConstructor;

@Controller
@RequiredArgsConstructor
public class EgovReprtStatsController {

	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	@Resource(name = "EgovCmmUseService")
	EgovCmmUseService egovCmmUseService;

	private final ReportStatsService reportStatsService;

	/**
	 * ???????? ???
	 **/
	@RequestMapping("/sts/rst/selectReprtStatsListView.do")
	public String selectReprtStatsListView(@ModelAttribute("comDefaultCodeVO") ComDefaultCodeVO comDefaultCodeVO,
			@ModelAttribute("pmReprtStats") ReprtStatsVO reprtStatsVO,
			ModelMap model) throws Exception {

		comDefaultCodeVO.setCodeId("COM040");
		model.addAttribute("cmmCode040List", egovCmmUseService.selectCmmCodeDetail(comDefaultCodeVO));
		comDefaultCodeVO.setCodeId("COM042");
		model.addAttribute("cmmCode042List", egovCmmUseService.selectCmmCodeDetail(comDefaultCodeVO));

		reprtStatsVO.setPmFromDate(EgovDateUtil.addMonth(EgovDateUtil.getToday(), -1));
		reprtStatsVO.setPmToDate(EgovDateUtil.getToday());
		model.addAttribute("pmReprtStats", reprtStatsVO);

		return "egovframework/com/sts/rst/EgovReprtStatsList";
	}

	/**
	 * ?????????????????. (JPA ?)
	 **/
	@IncludedInfo(name = "Name", listUrl = "", order = 1, gid = 50)
	@RequestMapping("/sts/rst/selectReprtStatsList.do")
	public String selectReprtStatsList(@RequestParam(value = "pmReprtTy", required = false) String pmReprtTy,
			@RequestParam(value = "pmDateTy", required = false) String pmDateTy,
			@RequestParam(value = "pmFromDate", required = false) String pmFromDate,
			@RequestParam(value = "pmToDate", required = false) String pmToDate,
			@ModelAttribute("comDefaultCodeVO") ComDefaultCodeVO comDefaultCodeVO,
			@ModelAttribute("reprtStatsVO") ReprtStatsVO reprtStatsVO,
			ModelMap model) throws Exception {

		// Set default values if parameters are null
		if (pmFromDate == null || pmFromDate.equals("")) {
			pmFromDate = EgovDateUtil.addMonth(EgovDateUtil.getToday(), -1);
			pmToDate = EgovDateUtil.getToday();
		}

		// paging
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(reprtStatsVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(5);
		paginationInfo.setPageSize(reprtStatsVO.getPageSize());

		reprtStatsVO.setPmReprtTy(pmReprtTy);
		reprtStatsVO.setPmDateTy(pmDateTy);
		reprtStatsVO.setPmFromDate(pmFromDate);
		reprtStatsVO.setPmToDate(pmToDate);

		// JPA ?????
		int pageIndex = reprtStatsVO.getPageIndex() > 0 ? reprtStatsVO.getPageIndex() - 1 : 0;
		Page<ReprtStats> pageResult = reportStatsService.getReprtStatsList(
				pmReprtTy, pmFromDate, pmToDate, pageIndex, 5);

		// ReprtStats -> ReprtStatsVO ??
		List<ReprtStatsVO> reprtStatsList = new ArrayList<>();
		for (ReprtStats rs : pageResult.getContent()) {
			ReprtStatsVO vo = new ReprtStatsVO();
			vo.setReprtId(rs.getReprtId());
			vo.setReprtNm(rs.getReprtNm());
			vo.setReprtTy(rs.getReprtTy());
			vo.setReprtSttus(rs.getReprtSttus());
			reprtStatsList.add(vo);
		}
		reprtStatsVO.setReprtStatsList(reprtStatsList);
		model.addAttribute("reprtStatsList", reprtStatsList);

		int totPageCnt = (int) pageResult.getTotalElements();
		paginationInfo.setTotalRecordCount(totPageCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		// ???????
		List<Object[]> barList = reportStatsService.getReprtStatsByDate(pmFromDate, pmToDate);
		List<ReprtStatsVO> reprtStatsBarList = new ArrayList<>();
		for (Object[] row : barList) {
			ReprtStatsVO vo = new ReprtStatsVO();
			vo.setGrpRegDate((String) row[0]);
			vo.setGrpCnt(String.valueOf(((Number) row[1]).intValue()));
			reprtStatsBarList.add(vo);
		}
		reprtStatsVO.setReprtStatsBarList(reprtStatsBarList);
		model.addAttribute("reprtStatsBarList", reprtStatsBarList);

		// ?????????
		List<Object[]> tyList = reportStatsService.getReprtStatsByType(pmFromDate, pmToDate);
		List<ReprtStatsVO> reprtStatsByReprtTyList = new ArrayList<>();
		for (Object[] row : tyList) {
			ReprtStatsVO vo = new ReprtStatsVO();
			vo.setGrpReprtTy((String) row[0]);
			vo.setGrpReprtTyCnt(String.valueOf(((Number) row[1]).intValue()));
			reprtStatsByReprtTyList.add(vo);
		}
		reprtStatsVO.setReprtStatsByReprtTyList(reprtStatsByReprtTyList);
		model.addAttribute("reprtStatsByReprtTyList", reprtStatsByReprtTyList);

		// ?????
		List<Object[]> sttusList = reportStatsService.getReprtStatsByStatus(pmFromDate, pmToDate);
		List<ReprtStatsVO> reprtStatsByReprtSttusList = new ArrayList<>();
		for (Object[] row : sttusList) {
			ReprtStatsVO vo = new ReprtStatsVO();
			vo.setGrpReprtSttus((String) row[0]);
			vo.setGrpReprtSttusCnt(String.valueOf(((Number) row[1]).intValue()));
			reprtStatsByReprtSttusList.add(vo);
		}
		reprtStatsVO.setReprtStatsByReprtSttusList(reprtStatsByReprtSttusList);
		model.addAttribute("reprtStatsByReprtSttusList", reprtStatsByReprtSttusList);

		comDefaultCodeVO.setCodeId("COM040");
		model.addAttribute("cmmCode040List", egovCmmUseService.selectCmmCodeDetail(comDefaultCodeVO));
		comDefaultCodeVO.setCodeId("COM042");
		model.addAttribute("cmmCode042List", egovCmmUseService.selectCmmCodeDetail(comDefaultCodeVO));

		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		return "egovframework/com/sts/rst/EgovReprtStatsList";
	}

	/**
	 * ????????????????.
	 * (? ??- ?? ? ????)
	 **/
	@RequestMapping("/sts/rst/getReprtStats.do")
	public String selectReprtStats(@ModelAttribute("reprtStatsVO") ReprtStatsVO reprtStatsVO,
			@RequestParam("reprtTy") String reprtTy,
			@RequestParam("reprtSttus") String reprtSttus,
			ModelMap model) throws Exception {

		reprtStatsVO.setReprtTy(reprtTy);
		reprtStatsVO.setReprtSttus(reprtSttus);

		// ? ??- ?????(????? ??
		model.addAttribute("reprtStats", new ArrayList<ReprtStatsVO>());
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		return "egovframework/com/sts/rst/EgovReprtStatsDetail";
	}

	/**
	 * ????????????? ????.
	 **/
	@RequestMapping("/sts/rst/addViewReprtStats.do")
	public String insertViewReprtStats(@ModelAttribute("reprtStatsVO") ReprtStatsVO reprtStatsVO,
			@ModelAttribute("comDefaultCodeVO") ComDefaultCodeVO comDefaultCodeVO,
			ModelMap model) throws Exception {

		comDefaultCodeVO.setCodeId("COM036");
		model.addAttribute("cmmCode036List", egovCmmUseService.selectCmmCodeDetail(comDefaultCodeVO));
		comDefaultCodeVO.setCodeId("COM040");
		model.addAttribute("cmmCode040List", egovCmmUseService.selectCmmCodeDetail(comDefaultCodeVO));

		return "egovframework/com/sts/rst/EgovReprtStatsRegis";
	}

	/**
	 * ????????????.
	 **/
	@RequestMapping("/sts/rst/addReprtStats.do")
	public String insertReprtStats(@ModelAttribute("reprtStatsVO") ReprtStatsVO reprtStatsVO,
			org.springframework.validation.BindingResult bindingResult,
			ModelMap model) throws Exception {

		// Server-side validation
		// beanValidator.validate(reprtStatsVO, bindingResult); (Optional)

		if (bindingResult.hasErrors()) {
			return "egovframework/com/sts/rst/EgovReprtStatsRegis";
		}

		// Login info
		egovframework.com.cmm.LoginVO loginVO = (egovframework.com.cmm.LoginVO) egovframework.com.cmm.util.EgovUserDetailsHelper
				.getAuthenticatedUser();
		String userId = (loginVO != null) ? loginVO.getUniqId() : "SYSTEM";

		ReprtStats reprtStats = ReprtStats.builder()
				.reprtNm(reprtStatsVO.getReprtNm())
				.reprtTy(reprtStatsVO.getReprtTy())
				.reprtSttus(reprtStatsVO.getReprtSttus())
				.frstRegisterId(userId)
				.build();

		reportStatsService.insertReprtStats(reprtStats);

		return "redirect:/sts/rst/selectReprtStatsListView.do";
	}
}
