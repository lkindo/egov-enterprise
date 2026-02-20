package egovframework.com.sts.cst.service.impl;

import java.util.ArrayList;
import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.log.LoginLogRepository;
import com.company.project.domain.log.SysLogSummaryRepository;

import egovframework.com.sts.com.StatsVO;
import egovframework.com.sts.cst.service.EgovConectStatsService;
import lombok.RequiredArgsConstructor;

/**
 * ? ?????????? ? ?????
 * 
 * @author ???????? ???
 * @since 2009.03.12
 * @version 1.1
 **/
@Service("conectStatsService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EgovConectStatsServiceImpl extends EgovAbstractServiceImpl implements EgovConectStatsService {

	private final SysLogSummaryRepository sysLogSummaryRepository;
	private final LoginLogRepository loginLogRepository;

	/**
	 * ? ???????
	 **/
	@Override
	public List<StatsVO> selectConectStats(StatsVO vo) throws Exception {
		List<Object[]> resultList;

		if ("SERVICE".equals(vo.getStatsKind())) {
			if ("Y".equals(vo.getPdKind())) {
				resultList = sysLogSummaryRepository.selectServiceStatsByYear(vo.getFromDate(), vo.getToDate(),
						vo.getDetailStatsKind());
			} else if ("M".equals(vo.getPdKind())) {
				resultList = sysLogSummaryRepository.selectServiceStatsByMonth(vo.getFromDate(), vo.getToDate(),
						vo.getDetailStatsKind());
			} else {
				resultList = sysLogSummaryRepository.selectServiceStatsByDay(vo.getFromDate(), vo.getToDate(),
						vo.getDetailStatsKind());
			}
		} else { // PRSONAL
			if ("Y".equals(vo.getPdKind())) {
				resultList = loginLogRepository.selectPersonalStatsByYear(vo.getFromDate(), vo.getToDate(),
						vo.getDetailStatsKind());
			} else if ("M".equals(vo.getPdKind())) {
				resultList = loginLogRepository.selectPersonalStatsByMonth(vo.getFromDate(), vo.getToDate(),
						vo.getDetailStatsKind());
			} else {
				resultList = loginLogRepository.selectPersonalStatsByDay(vo.getFromDate(), vo.getToDate(),
						vo.getDetailStatsKind());
			}
		}

		return mapToStatsVO(resultList);
	}

	private List<StatsVO> mapToStatsVO(List<Object[]> resultList) {
		List<StatsVO> statsList = new ArrayList<>();
		if (resultList == null)
			return statsList;

		for (Object[] row : resultList) {
			StatsVO stats = new StatsVO();
			// index mapping based on repository query column order
			// SERVICE: conectMethod, creatCo, updtCo, inqireCo, deleteCo, outptCo, errorCo,
			// statsDate, statsCo
			// PRSONAL: statsCo, statsDate, conectMethod, creatCo, updtCo, inqireCo,
			// deleteCo, outptCo, errorCo

			if (row.length >= 9) {
				// Determine if it's Service or Personal based on known query structures
				// Since our queries are fixed in repositories, we can predict indices.
				// Assuming Service query order (conectMethod is 0, statsDate is 7)
				// Assuming Personal query order (statsCo is 0, statsDate is 1)

				// Let's try to detect based on whether row[0] is String (Service method) or
				// Number (Personal statsCo)
				if (row[0] instanceof String) {
					stats.setConectMethod((String) row[0]);
					stats.setCreatCo(((Number) row[1]).intValue());
					stats.setUpdtCo(((Number) row[2]).intValue());
					stats.setInqireCo(((Number) row[3]).intValue());
					stats.setDeleteCo(((Number) row[4]).intValue());
					stats.setOutptCo(((Number) row[5]).intValue());
					stats.setErrorCo(((Number) row[6]).intValue());
					stats.setStatsDate((String) row[7]);
					stats.setStatsCo(((Number) row[8]).intValue());
				} else {
					stats.setStatsCo(((Number) row[0]).intValue());
					stats.setStatsDate((String) row[1]);
					stats.setConectMethod((String) row[2]);
					stats.setCreatCo(((Number) row[3]).intValue());
					stats.setUpdtCo(((Number) row[4]).intValue());
					stats.setInqireCo(((Number) row[5]).intValue());
					stats.setDeleteCo(((Number) row[6]).intValue());
					stats.setOutptCo(((Number) row[7]).intValue());
					stats.setErrorCo(((Number) row[8]).intValue());
				}
			}
			statsList.add(stats);
		}
		return statsList;
	}
}
