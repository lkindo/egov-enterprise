package egovframework.com.uss.olp.opp.service.impl;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.company.project.domain.survey.OnlinePollItemRepository;
import com.company.project.domain.survey.OnlinePollManageRepository;
import com.company.project.domain.survey.OnlinePollResultRepository;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.uss.olp.opp.service.EgovOnlinePollPartcptnService;
import egovframework.com.uss.olp.opp.service.OnlinePollPartcptn;
import jakarta.annotation.Resource;

@Service("egovOnlinePollPartcptnService")
public class EgovOnlinePollPartcptnServiceImpl extends EgovAbstractServiceImpl
        implements EgovOnlinePollPartcptnService {

    @Resource(name = "onlinePollManageRepository")
    private OnlinePollManageRepository onlinePollManageRepository;

    @Resource(name = "onlinePollItemRepository")
    private OnlinePollItemRepository onlinePollItemRepository;

    @Resource(name = "onlinePollResultRepository")
    private OnlinePollResultRepository onlinePollResultRepository;

    @Resource(name = "egovOnlinePollResultIdGnrService")
    private EgovIdGnrService idgenService;

    @Override
    public List<EgovMap> selectOnlinePollManageList(ComDefaultVO searchVO) throws Exception {
        Pageable pageable = PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getPageUnit(),
                Sort.by(Sort.Direction.DESC, "frstRegisterPnttm"));
        Page<com.company.project.domain.survey.OnlinePollManage> page = onlinePollManageRepository.findAll(pageable);
        return page.getContent().stream().map(this::toEgovMap).collect(Collectors.toList());
    }

    @Override
    public int selectOnlinePollManageListCnt(ComDefaultVO searchVO) throws Exception {
        return (int) onlinePollManageRepository.count();
    }

    @Override
    public List<EgovMap> selectOnlinePollManageDetail(OnlinePollPartcptn onlinePollPartcptn) throws Exception {
        return onlinePollManageRepository.findById(onlinePollPartcptn.getPollId())
                .map(e -> List.of(toEgovMap(e)))
                .orElse(Collections.emptyList());
    }

    @Override
    public List<EgovMap> selectOnlinePollItemDetail(OnlinePollPartcptn onlinePollPartcptn) throws Exception {
        List<com.company.project.domain.survey.OnlinePollItem> items = onlinePollItemRepository
                .findByPollId(onlinePollPartcptn.getPollId());
        return items.stream().map(this::toItemEgovMap).collect(Collectors.toList());
    }

    @Override
    public void insertOnlinePollResult(OnlinePollPartcptn onlinePollPartcptn) throws Exception {
        String id = idgenService.getNextStringId();
        com.company.project.domain.survey.OnlinePollResult entity = com.company.project.domain.survey.OnlinePollResult
                .builder()
                .pollResultId(id)
                .pollId(onlinePollPartcptn.getPollId())
                .pollIemId(onlinePollPartcptn.getPollIemId())
                .frstRegisterId(onlinePollPartcptn.getFrstRegisterId())
                .build();
        onlinePollResultRepository.save(entity);
    }

    @Override
    public List<EgovMap> selectOnlinePollManageStatistics(OnlinePollPartcptn onlinePollPartcptn) throws Exception {
        return Collections.emptyList();
    }

    @Override
    public int selectOnlinePollResult(OnlinePollPartcptn onlinePollPartcptn) throws Exception {
        return (int) onlinePollResultRepository.countByPollIdAndFrstRegisterId(onlinePollPartcptn.getPollId(),
                onlinePollPartcptn.getFrstRegisterId());
    }

    private EgovMap toEgovMap(com.company.project.domain.survey.OnlinePollManage entity) {
        EgovMap map = new EgovMap();
        map.put("pollId", entity.getPollId());
        map.put("pollNm", entity.getPollNm());
        map.put("pollBeginDe", entity.getPollBeginDe());
        map.put("pollEndDe", entity.getPollEndDe());
        map.put("pollKindCode", entity.getPollKindCode());
        map.put("frstRegisterId", entity.getFrstRegisterId());
        map.put("frstRegisterPnttm", entity.getFrstRegisterPnttm());
        return map;
    }

    private EgovMap toItemEgovMap(com.company.project.domain.survey.OnlinePollItem entity) {
        EgovMap map = new EgovMap();
        map.put("pollId", entity.getPollId());
        map.put("pollIemId", entity.getPollIemId());
        map.put("pollIemNm", entity.getPollIemNm());
        return map;
    }
}
