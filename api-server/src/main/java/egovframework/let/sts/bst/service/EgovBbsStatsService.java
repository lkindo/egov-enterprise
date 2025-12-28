package egovframework.let.sts.bst.service;

import egovframework.let.sts.com.StatsVO;
import java.util.List;

public interface EgovBbsStatsService {
    List<StatsVO> selectBbsCretCntStats(StatsVO vo) throws Exception;

    List<StatsVO> selectBbsTotCntStats(StatsVO vo) throws Exception;

    List<StatsVO> selectBbsAvgCntStats(StatsVO vo) throws Exception;

    List<StatsVO> selectBbsMaxCntStats(StatsVO vo) throws Exception;

    List<StatsVO> selectBbsMinCntStats(StatsVO vo) throws Exception;

    List<StatsVO> selectBbsMaxUserStats(StatsVO vo) throws Exception;
}
