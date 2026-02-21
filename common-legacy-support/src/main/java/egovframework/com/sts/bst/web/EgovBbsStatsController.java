package egovframework.com.sts.bst.web;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;

import com.company.project.service.stats.EgovStatsService;
import com.company.project.service.stats.dto.StatsDto;
import com.company.project.web.adapter.StatsAdapter;

import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.sts.com.StatsVO;
import lombok.RequiredArgsConstructor;

/**
 * ??????Controller (JPA ?)
 **/
@Controller
@RequiredArgsConstructor
public class EgovBbsStatsController {

	private final EgovStatsService egovStatsService;

	/**
	 * ????????
	 **/
	@IncludedInfo(name = "Name", listUrl = "", order = 1, gid = 50)
	@RequestMapping(value = "/sts/bst/selectBbsStats.do")
	public String selectBbsStats(@ModelAttribute("statsVO") StatsVO statsVO, ModelMap model) throws Exception {

		// ?????
		if (statsVO.getFromDate() == null || statsVO.getFromDate().isEmpty()) {
			statsVO.setFromDate(java.time.LocalDate.now().minusMonths(1).toString());
		}
		if (statsVO.getToDate() == null || statsVO.getToDate().isEmpty()) {
			statsVO.setToDate(java.time.LocalDate.now().toString());
		}
		if (statsVO.getStatsKind() == null || statsVO.getStatsKind().isEmpty()) {
			statsVO.setStatsKind("day");
		}

		// JPA ?????
		List<StatsDto> dtoList = egovStatsService.getBoardStats(
				statsVO.getFromDate(),
				statsVO.getToDate(),
				statsVO.getStatsKind());

		List<StatsVO> bbsStatsList = dtoList.stream()
				.map(StatsAdapter::toVO)
				.collect(Collectors.toList());

		// ?? ????
		int maxStatsCo = bbsStatsList.stream()
				.mapToInt(StatsVO::getStatsCo)
				.max().orElse(0);

		for (StatsVO vo : bbsStatsList) {
			vo.setMaxStatsCo(maxStatsCo);
			if (maxStatsCo > 0) {
				vo.setMaxUnit((float) vo.getStatsCo() / maxStatsCo * 100);
			}
		}

		model.addAttribute("bbsStatsList", bbsStatsList);
		model.addAttribute("bbsMaxStatsList", bbsStatsList); // ?? ??????
		model.addAttribute("bbsMinStatsList", bbsStatsList);
		model.addAttribute("bbsMaxNtcrList", bbsStatsList);

		model.addAttribute("statsVO", statsVO);
		model.addAttribute("resultList", bbsStatsList);

		return "sts/EgovBbsStats";
	}
}
