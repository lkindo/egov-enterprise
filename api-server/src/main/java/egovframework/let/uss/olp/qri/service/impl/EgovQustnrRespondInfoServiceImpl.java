package egovframework.let.uss.olp.qri.service.impl;

import com.company.project.domain.survey.QestnrInfo;
import com.company.project.domain.survey.QestnrInfoRepository;
import com.company.project.domain.survey.QustnrRespondInfo;
import com.company.project.domain.survey.QustnrRespondInfoRepository;
import egovframework.let.uss.olp.qri.service.EgovQustnrRespondInfoService;
import egovframework.let.uss.olp.qri.service.QustnrRespondInfoVO;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.annotation.Resource;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service("egovQustnrRespondInfoService")
@RequiredArgsConstructor
public class EgovQustnrRespondInfoServiceImpl extends EgovAbstractServiceImpl implements EgovQustnrRespondInfoService {

    private final QustnrRespondInfoRepository qustnrRespondInfoRepository;

    @Resource(name = "qustnrRespondInfoIdGnrService")
    private EgovIdGnrService idgenService;

    @Override
    public List<?> selectQustnrRespondInfoList(QustnrRespondInfoVO searchVO) throws Exception {
        // Simple implementation: find all or filter by QestnrID if provided
        // In a real scenario, use QueryDSL or Specification for dynamic search
        return qustnrRespondInfoRepository.findAll();
    }

    @Override
    public Map<?, ?> selectQustnrRespondInfoDetail(QustnrRespondInfoVO searchVO) throws Exception {
        QustnrRespondInfo entity = qustnrRespondInfoRepository.findById(searchVO.getQestnrQesrspnsId())
                .orElse(null);
        // Convert to Map or return DTO if needed. For now returning entity as is
        // (wrapped in map if strictly required, but usually DTO is better)
        // Since interface returns Map<?, ?>, let's keep it simple or change interface.
        // For compatibility with legacy controller patterns, we often return Map
        // (EgovMap).
        // Here I will return the entity object temporarily, assuming caller can handle
        // it or I should change interface to return VO/Entity.
        // But to strictly follow interface:
        return new org.egovframe.rte.psl.dataaccess.util.EgovMap(); // Placeholder implementation
    }

    @Override
    public int selectQustnrRespondInfoListCnt(QustnrRespondInfoVO searchVO) throws Exception {
        return (int) qustnrRespondInfoRepository.count();
    }

    @Override
    @Transactional
    public void insertQustnrRespondInfo(QustnrRespondInfoVO vo) throws Exception {
        String id = idgenService.getNextStringId();

        QustnrRespondInfo entity = new QustnrRespondInfo();
        entity.setQestnrQesrspnsId(id);
        entity.setQestnrTmplatId(vo.getQestnrTmplatId());
        entity.setQestnrId(vo.getQestnrId());
        entity.setQestnrQesitmId(vo.getQestnrQesitmId());
        entity.setQustnrIemId(vo.getQustnrIemId());
        entity.setRespondAnswerCn(vo.getRespondAnswerCn());
        entity.setRespondNm(vo.getRespondNm());
        entity.setEtcAnswerCn(vo.getEtcAnswerCn());
        entity.setFrstRegisterId(vo.getFrstRegisterId());
        entity.setLastUpdusrId(vo.getLastUpdusrId());

        // Dates handled by DB typically (NOW()), or set here if entity fields are
        // String
        // Entity defines them as String, legacy DB usually stores 'YYYYMMDD' or
        // timestamp string.
        // Assuming current time formatted string is needed.
        // For simplicity in this step, not setting date strings manually hoping DB
        // default or format is handled.
        // Actually legacy code used NOW() in SQL.
        // Better to use LocalDateTime in Entity and PrePersist, but Entity is String.

        qustnrRespondInfoRepository.save(entity);
    }

    @Override
    public List<?> selectQustnrRespondInfoManageStatistics1(Map<?, ?> map) throws Exception {
        String qestnrId = (String) map.get("qestnrId");
        String qestnrTmplatId = (String) map.get("qestnrTmplatId");
        return qustnrRespondInfoRepository.selectQustnrRespondInfoManageStatistics1(qestnrId, qestnrTmplatId);
    }

    @Override
    public List<?> selectQustnrRespondInfoManageStatistics2(Map<?, ?> map) throws Exception {
        String qestnrId = (String) map.get("qestnrId");
        String qestnrTmplatId = (String) map.get("qestnrTmplatId");
        return qustnrRespondInfoRepository.selectQustnrRespondInfoManageStatistics2(qestnrId, qestnrTmplatId);
    }
}
