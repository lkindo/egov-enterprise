/**
 * ????? ????controller ?????(JPA ?)
 **/

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
	 * ????? ???? ? ???
	 **/
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
	 * ????? ??????????????. (JPA ?)
	 **/
	@IncludedInfo(name = "Name", listUrl = "", order = 1, gid = 50)
	@RequestMapping("/sts/dst/selectDtaUseStatsList.do")
	public String selectDtaUseStatsList(@RequestParam(value = "pmFromDate", required = false) String pmFromDate,
			@RequestParam(value = "pmToDate", required = false) String pmToDate,
			@ModelAttribute("dtaUseStatsVO") DtaUseStatsVO dtaUseStatsVO,
			@ModelAttribute("comDefaultCodeVO") ComDefaultCodeVO comDefaultCodeVO,
			ModelMap model) throws Exception {

		// Set default values if parameters are null
		if (pmFromDate == null || pmFromDate.equals("")) {
			pmFromDate = EgovDateUtil.addMonth(EgovDateUtil.getToday(), -1);
			pmToDate = EgovDateUtil.getToday();
		}

		// paging
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(dtaUseStatsVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(5);
		paginationInfo.setPageSize(dtaUseStatsVO.getPageSize());

		dtaUseStatsVO.setPmFromDate(pmFromDate);
		dtaUseStatsVO.setPmToDate(pmToDate);

		// JPA ?????
		int pageIndex = dtaUseStatsVO.getPageIndex() > 0 ? dtaUseStatsVO.getPageIndex() - 1 : 0;
		Page<DtaUseStats> pageResult = reportStatsService.getDtaUseStatsList(
				pmFromDate, pmToDate, pageIndex, 5);

		// DtaUseStats -> DtaUseStatsVO ??
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

		// ???????
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

		model.addAttribute("dtaUseStatsVO", dtaUseStatsVO);
		model.addAttribute("pmDtaUseStats", dtaUseStatsVO);

		comDefaultCodeVO.setCodeId("COM042");
		model.addAttribute("cmmCode042List", egovCmmUseService.selectCmmCodeDetail(comDefaultCodeVO));

		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		return "egovframework/com/sts/dst/EgovDtaUseStatsList";
	}

	/**
	 * ????? ????????????.
	 **/
	@RequestMapping("/sts/dst/getDtaUseStats.do")
	public String selectDtaUseStats(@ModelAttribute("dtaUseStatsVO") DtaUseStatsVO dtaUseStatsVO,
			ModelMap model) throws Exception {

		// ? ??- ?????(????? ??
		PaginationInfo paginationInfo = new PaginationInfo();
		paginationInfo.setCurrentPageNo(dtaUseStatsVO.getPageIndex());
		paginationInfo.setRecordCountPerPage(dtaUseStatsVO.getPageUnit());
		paginationInfo.setPageSize(dtaUseStatsVO.getPageSize());

		model.addAttribute("dtaUseStatsList", new ArrayList<DtaUseStatsVO>());
		paginationInfo.setTotalRecordCount(0);
		model.addAttribute("paginationInfo", paginationInfo);

		model.addAttribute("dtaUseStats", dtaUseStatsVO);
		model.addAttribute("dtaUseStatsVO", dtaUseStatsVO);

		model.addAttribute("message", egovMessageSource.getMessage("success.common.select"));

		return "egovframework/com/sts/dst/EgovDtaUseStatsDetail";
	}
}
