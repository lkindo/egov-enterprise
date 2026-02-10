package egovframework.com.sts.ust.service.impl;

import java.util.ArrayList;
import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.log.UserSummaryRepository;

import egovframework.com.sts.com.StatsVO;
import egovframework.com.sts.ust.service.EgovUserStatsService;
import lombok.RequiredArgsConstructor;

/**
 * 사용자 통계 검색 비즈니스 구현 클래스
 * 
 * @author 공통서비스 개발팀 박지욱
 * @since 2009.03.12
 * @version 1.1
 */
@Service("userStatsService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EgovUserStatsServiceImpl extends EgovAbstractServiceImpl implements EgovUserStatsService {

	private final UserSummaryRepository userSummaryRepository;

	/**
	 * 사용자 통계를 조회한다
	 */
	@Override
	public List<StatsVO> selectUserStats(StatsVO vo) throws Exception {
		List<Object[]> resultList = userSummaryRepository.selectUserStats(
				vo.getPdKind(),
				vo.getStatsKind(),
				vo.getDetailStatsKind(),
				vo.getFromDate(),
				vo.getToDate());

		return mapToStatsVO(resultList);
	}

	private List<StatsVO> mapToStatsVO(List<Object[]> resultList) {
		List<StatsVO> statsList = new ArrayList<>();
		if (resultList == null)
			return statsList;

		for (Object[] row : resultList) {
			StatsVO stats = new StatsVO();
			if (row.length >= 2) {
				stats.setStatsCo(((Number) row[0]).intValue());
				stats.setStatsDate((String) row[1]);
			}
			statsList.add(stats);
		}
		return statsList;
	}
}
