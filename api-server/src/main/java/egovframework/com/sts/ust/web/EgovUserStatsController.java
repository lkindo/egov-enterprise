package egovframework.com.sts.ust.web;

import javax.annotation.Resource;

import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;

import egovframework.com.sts.ust.service.EgovUserStatsService;

import egovframework.com.cmm.annotation.IncludedInfo;
import egovframework.com.sts.com.StatsVO;
import lombok.RequiredArgsConstructor;

/**
 * 사용자 통계 Controller (JPA 전환)
 */
@Controller
@RequiredArgsConstructor
public class EgovUserStatsController {

	@Resource(name = "egovUserStatsService")
	private EgovUserStatsService egovUserStatsService;

	/**
	 * 사용자 통계 조회
	 */
	@IncludedInfo(name = "사용자통계", order = 220, gid = 30)
	@RequestMapping(value = "/sts/ust/selectUserStats.do")
	public String selectUserStats(@ModelAttribute("statsVO") StatsVO statsVO, ModelMap model) throws Exception {

		if (statsVO.getFromDate() == null || statsVO.getFromDate().isEmpty()) {
			statsVO.setFromDate(java.time.LocalDate.now().minusMonths(1).toString());
		}
		if (statsVO.getToDate() == null || statsVO.getToDate().isEmpty()) {
			statsVO.setToDate(java.time.LocalDate.now().toString());
		}
		if (statsVO.getStatsKind() == null || statsVO.getStatsKind().isEmpty()) {
			statsVO.setStatsKind("day");
		}

		List<StatsVO> resultList = egovUserStatsService.selectUserStats(statsVO);

		int maxStatsCo = resultList.stream()
				.mapToInt(StatsVO::getStatsCo)
				.max().orElse(0);

		for (StatsVO vo : resultList) {
			vo.setMaxStatsCo(maxStatsCo);
			if (maxStatsCo > 0) {
				vo.setMaxUnit((float) vo.getStatsCo() / maxStatsCo * 100);
			}
		}

		model.addAttribute("resultList", resultList);
		model.addAttribute("statsVO", statsVO);

		return "egovframework/com/sts/ust/EgovUserStats";
	}
}