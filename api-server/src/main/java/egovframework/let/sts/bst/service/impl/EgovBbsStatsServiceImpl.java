package egovframework.let.sts.bst.service.impl;

import com.company.project.domain.log.BbsSummaryRepository;
import egovframework.let.sts.bst.service.EgovBbsStatsService;
import egovframework.let.sts.com.StatsVO;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service("bbsStatsService")
@RequiredArgsConstructor
public class EgovBbsStatsServiceImpl extends EgovAbstractServiceImpl implements EgovBbsStatsService {

    private final BbsSummaryRepository bbsSummaryRepository;

    @Override
    @Transactional(readOnly = true)
    public List<StatsVO> selectBbsCretCntStats(StatsVO vo) throws Exception {
        List<Object[]> results = bbsSummaryRepository.selectBbsCretCntStats(
                vo.getPdKind(), vo.getStatsKind(), vo.getDetailStatsKind(), vo.getFromDate(), vo.getToDate());
        return mapToVO(results);
    }

    @Override
    @Transactional(readOnly = true)
    public List<StatsVO> selectBbsTotCntStats(StatsVO vo) throws Exception {
        List<Object[]> results = bbsSummaryRepository.selectBbsTotCntStats(
                vo.getPdKind(), vo.getStatsKind(), vo.getDetailStatsKind(), vo.getFromDate(), vo.getToDate());
        return mapToVO(results);
    }

    @Override
    @Transactional(readOnly = true)
    public List<StatsVO> selectBbsAvgCntStats(StatsVO vo) throws Exception {
        List<Object[]> results = bbsSummaryRepository.selectBbsAvgCntStats(
                vo.getPdKind(), vo.getStatsKind(), vo.getDetailStatsKind(), vo.getFromDate(), vo.getToDate());
        List<StatsVO> resultList = new ArrayList<>();
        for (Object[] row : results) {
            StatsVO statsVO = new StatsVO();
            statsVO.setAvrgInqireCo(row[0] != null ? ((Number) row[0]).floatValue() : 0.0f);
            statsVO.setStatsDate((String) row[1]);
            resultList.add(statsVO);
        }
        return resultList;
    }

    @Override
    @Transactional(readOnly = true)
    public List<StatsVO> selectBbsMaxCntStats(StatsVO vo) throws Exception {
        List<Object[]> results = bbsSummaryRepository.selectBbsMaxCntStats(
                vo.getStatsKind(), vo.getDetailStatsKind(), vo.getFromDate(), vo.getToDate());
        List<StatsVO> resultList = new ArrayList<>();
        for (Object[] row : results) {
            StatsVO statsVO = new StatsVO();
            statsVO.setStatsDate((String) row[0]);
            statsVO.setMxmmInqireBbsId((String) row[1]);
            statsVO.setMxmmInqireBbsNm((String) row[2]);
            statsVO.setMaxStatsCo(row[3] != null ? ((Number) row[3]).intValue() : 0);
            resultList.add(statsVO);
        }
        return resultList;
    }

    @Override
    @Transactional(readOnly = true)
    public List<StatsVO> selectBbsMinCntStats(StatsVO vo) throws Exception {
        List<Object[]> results = bbsSummaryRepository.selectBbsMinCntStats(
                vo.getStatsKind(), vo.getDetailStatsKind(), vo.getFromDate(), vo.getToDate());
        List<StatsVO> resultList = new ArrayList<>();
        for (Object[] row : results) {
            StatsVO statsVO = new StatsVO();
            statsVO.setStatsDate((String) row[0]);
            statsVO.setMummInqireBbsId((String) row[1]);
            statsVO.setMummInqireBbsNm((String) row[2]);
            statsVO.setMinStatsCo(row[3] != null ? ((Number) row[3]).intValue() : 0);
            resultList.add(statsVO);
        }
        return resultList;
    }

    @Override
    @Transactional(readOnly = true)
    public List<StatsVO> selectBbsMaxUserStats(StatsVO vo) throws Exception {
        List<Object[]> results = bbsSummaryRepository.selectBbsMaxUserStats(
                vo.getStatsKind(), vo.getDetailStatsKind(), vo.getFromDate(), vo.getToDate());
        List<StatsVO> resultList = new ArrayList<>();
        for (Object[] row : results) {
            StatsVO statsVO = new StatsVO();
            statsVO.setStatsDate((String) row[0]);
            statsVO.setTopNtcepersonId((String) row[1]);
            statsVO.setTopNtcepersonCo(row[2] != null ? ((Number) row[2]).intValue() : 0);
            resultList.add(statsVO);
        }
        return resultList;
    }

    private List<StatsVO> mapToVO(List<Object[]> results) {
        List<StatsVO> resultList = new ArrayList<>();
        for (Object[] row : results) {
            StatsVO statsVO = new StatsVO();
            statsVO.setStatsCo(row[0] != null ? ((Number) row[0]).intValue() : 0);
            statsVO.setStatsDate((String) row[1]);
            resultList.add(statsVO);
        }
        return resultList;
    }
}
