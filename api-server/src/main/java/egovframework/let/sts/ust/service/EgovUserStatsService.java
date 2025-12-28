package egovframework.let.sts.ust.service;

import egovframework.let.sts.com.StatsVO;
import java.util.List;

public interface EgovUserStatsService {
    List<StatsVO> selectUserStats(StatsVO vo) throws Exception;
}
