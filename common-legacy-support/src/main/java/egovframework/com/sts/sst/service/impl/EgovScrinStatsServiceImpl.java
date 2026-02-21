package egovframework.com.sts.sst.service.impl;

import java.util.ArrayList;
import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.log.WebLogSummaryRepository;

import egovframework.com.sts.com.StatsVO;
import egovframework.com.sts.sst.service.EgovScrinStatsService;
import lombok.RequiredArgsConstructor;

/**
 * ? ?????????? ? ?????
 * 
 * @author ???????? ???
 * @since 2009.03.12
 * @version 1.1
 **/
@Service("scrinStatsService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EgovScrinStatsServiceImpl extends EgovAbstractServiceImpl implements EgovScrinStatsService {

	private final WebLogSummaryRepository webLogSummaryRepository;

	/**
	 * ? ???????
	 **/
	@Override
	public List<StatsVO> selectScrinStats(StatsVO vo) throws Exception {
		List<Object[]> resultList = webLogSummaryRepository.selectScrinStats(
				vo.getPdKind(),
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
