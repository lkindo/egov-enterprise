package egovframework.let.sts.cst.service.impl;

import java.util.ArrayList;
import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.log.LoginLogRepository;
import com.company.project.domain.log.SysLogSummaryRepository;

import egovframework.let.sts.com.StatsVO;
import egovframework.let.sts.cst.service.EgovConectStatsService;
import lombok.RequiredArgsConstructor;

/**
 * 접속 통계 검색 비즈니스 구현 클래스
 * 
 * @author 공통서비스 개발팀 박지욱
 * @since 2009.03.12
 * @version 1.0
 */
@Service("conectStatsService")
@RequiredArgsConstructor
public class EgovConectStatsServiceImpl extends EgovAbstractServiceImpl implements EgovConectStatsService {

    private final SysLogSummaryRepository sysLogSummaryRepository;
    private final LoginLogRepository loginLogRepository;

    @Override
    @Transactional(readOnly = true)
    public List<?> selectConectStats(StatsVO vo) throws Exception {
        List<StatsVO> resultList = new ArrayList<>();

        String statsKind = vo.getStatsKind();
        String pdKind = vo.getPdKind();
        String fromDate = vo.getFromDate();
        String toDate = vo.getToDate();
        String detailStatsKind = vo.getDetailStatsKind();

        if ("SERVICE".equals(statsKind)) {
            List<Object[]> rawResults;
            if ("Y".equals(pdKind)) {
                rawResults = sysLogSummaryRepository.selectServiceStatsByYear(fromDate, toDate, detailStatsKind);
            } else if ("M".equals(pdKind)) {
                rawResults = sysLogSummaryRepository.selectServiceStatsByMonth(fromDate, toDate, detailStatsKind);
            } else { // D
                rawResults = sysLogSummaryRepository.selectServiceStatsByDay(fromDate, toDate, detailStatsKind);
            }
            for (Object[] row : rawResults) {
                StatsVO stat = new StatsVO();
                stat.setConectMethod((String) row[0]);
                stat.setCreatCo(convertToInt(row[1]));
                stat.setUpdtCo(convertToInt(row[2]));
                stat.setInqireCo(convertToInt(row[3]));
                stat.setDeleteCo(convertToInt(row[4]));
                stat.setOutptCo(convertToInt(row[5]));
                stat.setErrorCo(convertToInt(row[6]));
                stat.setStatsDate((String) row[7]);
                stat.setStatsCo(convertToInt(row[8]));
                resultList.add(stat);
            }
        } else if ("PRSONAL".equals(statsKind)) {
            // Personal stats query NLOGINLOG - uses existing LoginLogRepository
            // TODO: Implement personal stats query if needed
        }

        return resultList;
    }

    private int convertToInt(Object value) {
        if (value == null)
            return 0;
        if (value instanceof Number)
            return ((Number) value).intValue();
        return 0;
    }
}
