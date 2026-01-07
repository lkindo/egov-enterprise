/**
 * 보고서통계 controller 클래스 (JPA 전환)
 */

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
	 * 보고서 통계 목록화면 이동
	 */
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
	 * 보고서 통계정보의 대상목록을 조회한다. (JPA 전환)
	 */
	@IncludedInfo(name = "보고서통계", listUrl = "/sts/rst/selectReprtStatsListView.do", order = 160, gid = 30)
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

		// JPA 서비스 호출
		int pageIndex = reprtStatsVO.getPageIndex() > 0 ? reprtStatsVO.getPageIndex() - 1 : 0;
		Page<ReprtStats> pageResult = reportStatsService.getReprtStatsList(
				pmReprtTy, pmFromDate, pmToDate, pageIndex, 5);

		// ReprtStats -> ReprtStatsVO 변환
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

		// 등록일별 그래프
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

		// 보고서유형별 그래프
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

		// 진행상태별 그래프
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
	 * 보고서 통계정보의 상세정보를 조회한다.
	 * (상세 조회 - 추가 구현 필요시 확장)
	 */
	@RequestMapping("/sts/rst/getReprtStats.do")
	public String selectReprtStats(@ModelAttribute("reprtStatsVO") ReprtStatsVO reprtStatsVO,
			@RequestParam("reprtTy") String reprtTy,
			@RequestParam("reprtSttus") String reprtSttus,
			ModelMap model) throws Exception {

		reprtStatsVO.setReprtTy(reprtTy);
		reprtStatsVO.setReprtSttus(reprtSttus);

		// 상세 조회 - 빈 목록 반환 (추후 구현 가능)
		model.addAttribute("reprtStats", new ArrayList<ReprtStatsVO>());
		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		return "egovframework/com/sts/rst/EgovReprtStatsDetail";
	}

	/**
	 * 보고서 통계정보의 등록화면으로 이동한다.
	 */
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
}
