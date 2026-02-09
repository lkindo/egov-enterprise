package egovframework.com.uss.olp.opr.service.impl;

import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Service;

import com.company.project.domain.survey.OnlinePollManageRepository;
// import com.company.project.domain.survey.OnlinePollResult;
import com.company.project.domain.survey.OnlinePollResultRepository;

import egovframework.com.uss.olp.opr.service.EgovOnlinePollResultService;
import jakarta.annotation.Resource;

@Service("egovOnlinePollResultService")
public class EgovOnlinePollResultServiceImpl extends EgovAbstractServiceImpl implements EgovOnlinePollResultService {

    @Resource(name = "onlinePollManageRepository")
    private OnlinePollManageRepository onlinePollManageRepository;

    @Resource(name = "onlinePollResultRepository")
    private OnlinePollResultRepository onlinePollResultRepository;

    @Override
    public List<EgovMap> selectOnlinePollResultList(
            egovframework.com.uss.olp.opr.service.OnlinePollResult onlinePollResult) throws Exception {
        List<com.company.project.domain.survey.OnlinePollResult> results = onlinePollResultRepository
                .findByPollId(onlinePollResult.getPollId());
        return results.stream().map(this::toResultEgovMap).collect(Collectors.toList());
    }

    @Override
    public void deleteOnlinePollResult(egovframework.com.uss.olp.opr.service.OnlinePollResult onlinePollResult)
            throws Exception {
        if (onlinePollResult.getPollResultId() != null) {
            onlinePollResultRepository.deleteById(onlinePollResult.getPollResultId());
        }
    }

    private EgovMap toResultEgovMap(com.company.project.domain.survey.OnlinePollResult entity) {
        EgovMap map = new EgovMap();
        map.put("pollId", entity.getPollId());
        map.put("pollIemId", entity.getPollIemId());
        map.put("pollResultId", entity.getPollResultId());
        map.put("frstRegisterId", entity.getFrstRegisterId());
        map.put("frstRegisterPnttm", entity.getFrstRegisterPnttm());
        return map;
    }
}
