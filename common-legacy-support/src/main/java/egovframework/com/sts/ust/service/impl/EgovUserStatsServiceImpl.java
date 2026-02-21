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
 * ??????????????? ? ?????
 * 
 * @author ???????? ???
 * @since 2009.03.12
 * @version 1.1
 **/
@Service("userStatsService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EgovUserStatsServiceImpl extends EgovAbstractServiceImpl implements EgovUserStatsService {

	private final UserSummaryRepository userSummaryRepository;

	/**
	 * ????????????
	 **/
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

	@Override
	public void summaryUserStats() throws Exception {
		// Implementation for daily user stats summary
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
