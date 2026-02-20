package egovframework.com.uss.olp.opm.service.impl;

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

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.uss.olp.opm.service.EgovOnlinePollManageService;
import egovframework.com.uss.olp.opm.service.OnlinePollItem;
import egovframework.com.uss.olp.opm.service.OnlinePollManage;
import jakarta.annotation.Resource;

@Service("egovOnlinePollManageService")
public class EgovOnlinePollManageServiceImpl extends EgovAbstractServiceImpl implements EgovOnlinePollManageService {

    @Resource(name = "onlinePollManageRepository")
    private OnlinePollManageRepository onlinePollManageRepository;

    @Resource(name = "onlinePollItemRepository")
    private OnlinePollItemRepository onlinePollItemRepository;

    @Resource(name = "egovOnlinePollManageIdGnrService")
    private EgovIdGnrService idgenService;

    @Override
    public List<EgovMap> selectOnlinePollManageList(ComDefaultVO searchVO) throws Exception {
        Pageable pageable = PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getPageUnit(),
                Sort.by(Sort.Direction.DESC, "frstRegisterPnttm"));
        Page<com.company.project.domain.survey.OnlinePollManage> page = onlinePollManageRepository.findAll(pageable);
        return page.getContent().stream().map(e -> {
            EgovMap map = new EgovMap();
            map.put("pollId", e.getPollId());
            map.put("pollNm", e.getPollNm());
            map.put("pollBeginDe", e.getPollBeginDe());
            map.put("pollEndDe", e.getPollEndDe());
            return map;
        }).collect(Collectors.toList());
    }

    @Override
    public int selectOnlinePollManageListCnt(ComDefaultVO searchVO) throws Exception {
        return (int) onlinePollManageRepository.count();
    }

    @Override
    public OnlinePollManage selectOnlinePollManageDetail(OnlinePollManage onlinePollManage) throws Exception {
        return onlinePollManageRepository.findById(onlinePollManage.getPollId())
                .map(this::toVO)
                .orElseThrow(() -> processException("info.nodata.msg"));
    }

    @Override
    public void insertOnlinePollManage(OnlinePollManage onlinePollManage) throws Exception {
        String id = idgenService.getNextStringId();
        com.company.project.domain.survey.OnlinePollManage entity = com.company.project.domain.survey.OnlinePollManage
                .builder()
                .pollId(id)
                .pollNm(onlinePollManage.getPollNm())
                .pollBeginDe(onlinePollManage.getPollBeginDe())
                .pollEndDe(onlinePollManage.getPollEndDe())
                .pollKindCode(onlinePollManage.getPollKindCode())
                .pollDsuseYn(onlinePollManage.getPollDsuseYn()) // Corrected field
                .pollAutoDsuseYn(onlinePollManage.getPollAutoDsuseYn()) // Corrected field
                .frstRegisterId(onlinePollManage.getFrstRegisterId())
                .build();
        onlinePollManageRepository.save(entity);
    }

    @Override
    public void updateOnlinePollManage(OnlinePollManage onlinePollManage) throws Exception {
        onlinePollManageRepository.findById(onlinePollManage.getPollId()).ifPresent(entity -> {
            entity.update(onlinePollManage.getPollNm(), onlinePollManage.getPollBeginDe(),
                    onlinePollManage.getPollEndDe(), onlinePollManage.getPollKindCode(),
                    onlinePollManage.getPollDsuseYn(), onlinePollManage.getPollAutoDsuseYn(),
                    onlinePollManage.getLastUpdusrId());
            onlinePollManageRepository.save(entity);
        });
    }

    @Override
    public void deleteOnlinePollManage(OnlinePollManage onlinePollManage) throws Exception {
        onlinePollManageRepository.deleteById(onlinePollManage.getPollId());
    }

    @Override
    public List<?> selectOnlinePollManageStatistics(OnlinePollManage onlinePollManage) throws Exception {
        return List.of();
    }

    @Override
    public List<EgovMap> selectOnlinePollItemList(OnlinePollItem onlinePollItem) throws Exception {
        return onlinePollItemRepository.findByPollId(onlinePollItem.getPollId()).stream()
                .map(e -> {
                    EgovMap map = new EgovMap();
                    map.put("pollId", e.getPollId());
                    map.put("pollIemId", e.getPollIemId());
                    map.put("pollIemNm", e.getPollIemNm());
                    return map;
                }).collect(Collectors.toList());
    }

    @Override
    public void insertOnlinePollItem(OnlinePollItem onlinePollItem) throws Exception {
    }

    @Override
    public void updateOnlinePollItem(OnlinePollItem onlinePollItem) throws Exception {
    }

    @Override
    public void deleteOnlinePollItem(OnlinePollItem onlinePollItem) throws Exception {
    }

    private OnlinePollManage toVO(com.company.project.domain.survey.OnlinePollManage entity) {
        OnlinePollManage vo = new OnlinePollManage();
        vo.setPollId(entity.getPollId());
        vo.setPollNm(entity.getPollNm());
        vo.setPollBeginDe(entity.getPollBeginDe());
        vo.setPollEndDe(entity.getPollEndDe());
        vo.setPollKindCode(entity.getPollKindCode());
        vo.setPollDsuseYn(entity.getPollDsuseYn());
        vo.setPollAutoDsuseYn(entity.getPollAutoDsuseYn());
        vo.setFrstRegisterId(entity.getFrstRegisterId());
        if (entity.getFrstRegisterPnttm() != null) {
            vo.setFrstRegisterPnttm(entity.getFrstRegisterPnttm().toString());
        }
        return vo;
    }
}
