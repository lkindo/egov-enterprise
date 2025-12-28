package egovframework.let.sts.ust.service.impl;

import com.company.project.domain.log.UserSummaryRepository;
import egovframework.let.sts.com.StatsVO;
import egovframework.let.sts.ust.service.EgovUserStatsService;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service("userStatsService")
@RequiredArgsConstructor
public class EgovUserStatsServiceImpl extends EgovAbstractServiceImpl implements EgovUserStatsService {

    private final UserSummaryRepository userSummaryRepository;

    @Override
    @Transactional(readOnly = true)
    public List<StatsVO> selectUserStats(StatsVO vo) throws Exception {
        List<Object[]> results = userSummaryRepository.selectUserStats(
                vo.getPdKind(), vo.getStatsKind(), vo.getDetailStatsKind(), vo.getFromDate(), vo.getToDate());

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
