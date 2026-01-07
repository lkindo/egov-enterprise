/**
 * 자료이용현황 통계 controller 클래스 (JPA 전환)
 */

package egovframework.com.sts.dst.web;

import java.util.ArrayList;
import java.util.List;

import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import com.company.project.domain.stats.DtaUseStats;
import com.company.project.service.stats.ReportStatsService;

import egovframework.com.cmm.ComDefaultCodeVO;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.cmm.service.EgovCmmUseService;
import egovframework.com.sts.dst.service.DtaUseStatsVO;
import egovframework.com.utl.fcc.service.EgovDateUtil;
import jakarta.annotation.Resource;
import lombok.RequiredArgsConstructor;

@Controller
@RequiredArgsConstructor
public class EgovDtaUseStatsContoller {

	private final ReportStatsService reportStatsService;

	@Resource(name = "EgovCmmUseService")
	EgovCmmUseService egovCmmUseService;

	@Resource(name = "egovMessageSource")
	EgovMessageSource egovMessageSource;

	/**
	 * 자료이용현황 통계정보 목록화면 이동
	 */
	@RequestMapping("/sts/dst/selectDtaUseStatsListView.do")
	public String selectDtaUseStatsListView(@ModelAttribute("comDefaultCodeVO") ComDefaultCodeVO comDefaultCodeVO,
			@ModelAttribute("pmDtaUseStats") DtaUseStatsVO dtaUseStatsVO,
			ModelMap model) throws Exception {

		comDefaultCodeVO.setCodeId("COM042");
		model.addAttribute("cmmCode042List", egovCmmUseService.selectCmmCodeDetail(comDefaultCodeVO));

		dtaUseStatsVO.setPmFromDate(EgovDateUtil.addMonth(EgovDateUtil.getToday(), -1));
		dtaUseStatsVO.setPmToDate(EgovDateUtil.getToday());
		model.addAttribute("pmDtaUseStats", dtaUseStatsVO);

		return "egovframework/com/sts/dst/EgovDtaUseStatsList";
	}

	/**
	 * 자료이용현황 통계정보의 대상목록을 조회한다. (JPA 전환)
	 */
	@IncludedInfo(name = "자료이용현황통계", listUrl = "/sts/dst/selectDtaUseStatsListView.do", order = 161, gid = 30)
	@RequestMapping("/sts/dst/selectDtaUseStatsList.do")
	public String selectDtaUseStatsList(@RequestParam("pmFromDate") String pmFromDate,
			@RequestParam("pmToDate") String pmToDate,
			@ModelAttribute("dtaUseStatsVO") DtaUseStatsVO dtaUseStatsVO,
			@ModelAttribute("comDefaultCodeVO") ComDefaultCodeVO comDefaultCodeVO,
			ModelMap model) throws Exception {

		// paging
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(dtaUseStatsVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(5);
		paginationInfo.setPageSize(dtaUseStatsVO.getPageSize());

		dtaUseStatsVO.setPmFromDate(pmFromDate);
		dtaUseStatsVO.setPmToDate(pmToDate);

		// JPA 서비스 호출
		int pageIndex = dtaUseStatsVO.getPageIndex() > 0 ? dtaUseStatsVO.getPageIndex() - 1 : 0;
		Page<DtaUseStats> pageResult = reportStatsService.getDtaUseStatsList(
				pmFromDate, pmToDate, pageIndex, 5);

		// DtaUseStats -> DtaUseStatsVO 변환
		List<DtaUseStatsVO> dtaUseStatsList = new ArrayList<>();
		for (DtaUseStats ds : pageResult.getContent()) {
			DtaUseStatsVO vo = new DtaUseStatsVO();
			vo.setDtaUseStatsId(ds.getDtaUseStatsId());
			vo.setBbsId(ds.getBbsId());
			vo.setNttId(ds.getNttId() != null ? ds.getNttId().toString() : null);
			vo.setAtchFileId(ds.getAtchFileId());
			dtaUseStatsList.add(vo);
		}
		dtaUseStatsVO.setDtaUseStatsList(dtaUseStatsList);
		model.addAttribute("dtaUseStatsList", dtaUseStatsList);

		int totPageCnt = (int) pageResult.getTotalElements();
		paginationInfo.setTotalRecordCount(totPageCnt);
		model.addAttribute("paginationInfo", paginationInfo);

		// 등록일별 그래프
		List<Object[]> barList = reportStatsService.getDtaUseStatsByDate(pmFromDate, pmToDate);
		List<DtaUseStatsVO> dtaUseStatsBarList = new ArrayList<>();
		for (Object[] row : barList) {
			DtaUseStatsVO vo = new DtaUseStatsVO();
			vo.setGrpRegDate((String) row[0]);
			vo.setGrpCnt(String.valueOf(((Number) row[1]).intValue()));
			dtaUseStatsBarList.add(vo);
		}
		dtaUseStatsVO.setDtaUseStatsBarList(dtaUseStatsBarList);
		model.addAttribute("dtaUseStatsBarList", dtaUseStatsBarList);

		comDefaultCodeVO.setCodeId("COM042");
		model.addAttribute("cmmCode042List", egovCmmUseService.selectCmmCodeDetail(comDefaultCodeVO));

		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		return "egovframework/com/sts/dst/EgovDtaUseStatsList";
	}

	/**
	 * 자료이용현황 통계의 상세정보를 조회한다.
	 */
	@RequestMapping("/sts/dst/getDtaUseStats.do")
	public String selectDtaUseStats(@ModelAttribute("dtaUseStatsVO") DtaUseStatsVO dtaUseStatsVO,
			ModelMap model) throws Exception {

		// 상세 조회 - 빈 목록 반환 (추후 구현 가능)
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(dtaUseStatsVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(dtaUseStatsVO.getPageUnit());
		paginationInfo.setPageSize(dtaUseStatsVO.getPageSize());

		model.addAttribute("dtaUseStatsList", new ArrayList<DtaUseStatsVO>());
		paginationInfo.setTotalRecordCount(0);
		model.addAttribute("paginationInfo", paginationInfo);

		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		return "egovframework/com/sts/dst/EgovDtaUseStatsDetail";
	}
}
