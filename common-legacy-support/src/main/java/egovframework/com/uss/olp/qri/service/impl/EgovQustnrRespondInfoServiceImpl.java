package egovframework.com.uss.olp.qri.service.impl;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.company.project.domain.survey.QustnrRespondInfo;
import com.company.project.domain.survey.QustnrRespondInfoRepository;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.uss.olp.qri.service.EgovQustnrRespondInfoService;
import egovframework.com.uss.olp.qri.service.QustnrRespondInfoVO;
import jakarta.annotation.Resource;

@Service("egovQustnrRespondInfoService")
public class EgovQustnrRespondInfoServiceImpl extends EgovAbstractServiceImpl implements EgovQustnrRespondInfoService {

    @Resource(name = "qustnrRespondInfoRepository")
    private QustnrRespondInfoRepository qustnrRespondInfoRepository;

    @Resource(name = "qustnrRespondInfoIdGnrService")
    private EgovIdGnrService idgenService;

    @Override
    public List<?> selectQustnrTmplatManage(Map<?, ?> map) throws Exception {
        return Collections.emptyList();
    }

    @Override
    public List<EgovMap> selectQustnrRespondInfoManageStatistics1(Map<?, ?> map) throws Exception {
        return Collections.emptyList();
    }

    @Override
    public List<EgovMap> selectQustnrRespondInfoManageStatistics2(Map<?, ?> map) throws Exception {
        return Collections.emptyList();
    }

    @Override
    public Map<?, ?> selectQustnrRespondInfoManageEmplyrinfo(Map<?, ?> map) throws Exception {
        return Collections.emptyMap();
    }

    @Override
    public List<EgovMap> selectQustnrRespondInfoManageComtnqestnrinfo(Map<?, ?> map) throws Exception {
        return Collections.emptyList();
    }

    @Override
    public List<EgovMap> selectQustnrRespondInfoManageComtnqustnrqesitm(Map<?, ?> map) throws Exception {
        return Collections.emptyList();
    }

    @Override
    public List<EgovMap> selectQustnrRespondInfoManageComtnqustnriem(Map<?, ?> map) throws Exception {
        return Collections.emptyList();
    }

    @Override
    public List<EgovMap> selectQustnrRespondInfoManageList(ComDefaultVO searchVO) {
        Pageable pageable = PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getPageUnit(),
                Sort.by(Sort.Direction.DESC, "frstRegisterPnttm"));
        Page<QustnrRespondInfo> page = qustnrRespondInfoRepository.findAll(pageable);
        return page.getContent().stream().map(this::toEgovMap).collect(Collectors.toList());
    }

    @Override
    public int selectQustnrRespondInfoManageListCnt(ComDefaultVO searchVO) throws Exception {
        return (int) qustnrRespondInfoRepository.count();
    }

    @Override
    public List<EgovMap> selectQustnrRespondInfoList(ComDefaultVO searchVO) throws Exception {
        Pageable pageable = PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getPageUnit(),
                Sort.by(Sort.Direction.DESC, "frstRegisterPnttm"));
        Page<QustnrRespondInfo> page = qustnrRespondInfoRepository.findAll(pageable);
        return page.getContent().stream().map(this::toEgovMap).collect(Collectors.toList());
    }

    @Override
    public List<EgovMap> selectQustnrRespondInfoDetail(QustnrRespondInfoVO qustnrRespondInfoVO) throws Exception {
        return qustnrRespondInfoRepository.findById(qustnrRespondInfoVO.getQestnrQesrspnsId())
                .map(this::toEgovMap)
                .map(Collections::singletonList)
                .orElse(Collections.emptyList());
    }

    @Override
    public int selectQustnrRespondInfoListCnt(ComDefaultVO searchVO) throws Exception {
        return (int) qustnrRespondInfoRepository.count();
    }

    @Override
    public void insertQustnrRespondInfo(QustnrRespondInfoVO qustnrRespondInfoVO) throws Exception {
        String sMakeId = idgenService.getNextStringId();
        qustnrRespondInfoVO.setQestnrQesrspnsId(sMakeId);
        qustnrRespondInfoRepository.save(toEntity(qustnrRespondInfoVO));
    }

    @Override
    public void updateQustnrRespondInfo(QustnrRespondInfoVO qustnrRespondInfoVO) throws Exception {
        qustnrRespondInfoRepository.findById(qustnrRespondInfoVO.getQestnrQesrspnsId()).ifPresent(entity -> {
            entity.setQestnrTmplatId(qustnrRespondInfoVO.getQestnrTmplatId());
            entity.setQestnrId(qustnrRespondInfoVO.getQestnrId());
            entity.setQestnrQesitmId(qustnrRespondInfoVO.getQestnrQesitmId());
            entity.setQustnrIemId(qustnrRespondInfoVO.getQustnrIemId());
            entity.setRespondAnswerCn(qustnrRespondInfoVO.getRespondAnswerCn());
            entity.setRespondNm(qustnrRespondInfoVO.getRespondNm());
            entity.setEtcAnswerCn(qustnrRespondInfoVO.getEtcAnswerCn());
            entity.setLastUpdusrId(qustnrRespondInfoVO.getLastUpdusrId());
            entity.setLastUpdtPnttm(java.time.LocalDateTime.now().toString());
            qustnrRespondInfoRepository.save(entity);
        });
    }

    @Override
    public void deleteQustnrRespondInfo(QustnrRespondInfoVO qustnrRespondInfoVO) throws Exception {
        qustnrRespondInfoRepository.deleteById(qustnrRespondInfoVO.getQestnrQesrspnsId());
    }

    @Override
    public List<EgovMap> selectQustnrTmplatWhiteList() throws Exception {
        return Collections.emptyList();
    }

    private QustnrRespondInfo toEntity(QustnrRespondInfoVO vo) {
        QustnrRespondInfo entity = new QustnrRespondInfo();
        entity.setQestnrQesrspnsId(vo.getQestnrQesrspnsId());
        entity.setQestnrTmplatId(vo.getQestnrTmplatId());
        entity.setQestnrId(vo.getQestnrId());
        entity.setQestnrQesitmId(vo.getQestnrQesitmId());
        entity.setQustnrIemId(vo.getQustnrIemId());
        entity.setRespondAnswerCn(vo.getRespondAnswerCn());
        entity.setRespondNm(vo.getRespondNm());
        entity.setEtcAnswerCn(vo.getEtcAnswerCn());
        entity.setFrstRegisterId(vo.getFrstRegisterId());
        entity.setFrstRegisterPnttm(java.time.LocalDateTime.now().toString());
        return entity;
    }

    private EgovMap toEgovMap(QustnrRespondInfo entity) {
        EgovMap map = new EgovMap();
        map.put("qestnrQesrspnsId", entity.getQestnrQesrspnsId());
        map.put("qestnrTmplatId", entity.getQestnrTmplatId());
        map.put("qestnrId", entity.getQestnrId());
        map.put("qestnrQesitmId", entity.getQestnrQesitmId());
        map.put("qustnrIemId", entity.getQustnrIemId());
        map.put("respondAnswerCn", entity.getRespondAnswerCn());
        map.put("respondNm", entity.getRespondNm());
        map.put("etcAnswerCn", entity.getEtcAnswerCn());
        map.put("frstRegisterId", entity.getFrstRegisterId());
        map.put("frstRegisterPnttm", entity.getFrstRegisterPnttm());
        return map;
    }
}
