package egovframework.com.sts.bst.web;

import javax.annotation.Resource;

import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;

import egovframework.com.sts.bst.service.EgovBbsStatsService;

import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.sts.com.StatsVO;
import lombok.RequiredArgsConstructor;

/**
 * 게시물 통계 Controller (JPA 전환)
 */
@Controller
@RequiredArgsConstructor
public class EgovBbsStatsController {

	@Resource(name = "egovBbsStatsService")
	private EgovBbsStatsService egovBbsStatsService;

	/**
	 * 게시물 통계 조회
	 */
	@IncludedInfo(name = "게시물통계", order = 210, gid = 30)
	@RequestMapping(value = "/sts/bst/selectBbsStats.do")
	public String selectBbsStats(@ModelAttribute("statsVO") StatsVO statsVO, ModelMap model) throws Exception {

		if (statsVO.getFromDate() == null || statsVO.getFromDate().isEmpty()) {
			statsVO.setFromDate(java.time.LocalDate.now().minusMonths(1).toString());
		}
		if (statsVO.getToDate() == null || statsVO.getToDate().isEmpty()) {
			statsVO.setToDate(java.time.LocalDate.now().toString());
		}
		if (statsVO.getStatsKind() == null || statsVO.getStatsKind().isEmpty()) {
			statsVO.setStatsKind("day");
		}

		// 1. 생성글수
		List<StatsVO> bbsStatsList = egovBbsStatsService.selectBbsCretCntStats(statsVO);
		// 2. 최고조회수
		List<StatsVO> bbsMaxStatsList = egovBbsStatsService.selectBbsMaxCntStats(statsVO);
		// 3. 최소조회수
		List<StatsVO> bbsMinStatsList = egovBbsStatsService.selectBbsMinCntStats(statsVO);
		// 4. 최고게시자
		List<StatsVO> bbsMaxNtcrList = egovBbsStatsService.selectBbsMaxUserStats(statsVO);

		// 그래프용 최대값 계산 (생성글수 기준)
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
		model.addAttribute("bbsMaxStatsList", bbsMaxStatsList);
		model.addAttribute("bbsMinStatsList", bbsMinStatsList);
		model.addAttribute("bbsMaxNtcrList", bbsMaxNtcrList);

		model.addAttribute("statsVO", statsVO);
		model.addAttribute("resultList", bbsStatsList); // 호환성을 위해 추가

		return "egovframework/com/sts/bst/EgovBbsStats";
	}
}