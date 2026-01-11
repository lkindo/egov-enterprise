package egovframework.com.uss.ion.ulm.service.impl;

import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.company.project.domain.notification.UnityLink;
import com.company.project.domain.notification.UnityLinkRepository;

import jakarta.annotation.Resource;

@Service("egovUnityLinkService")
public class EgovUnityLinkServiceImpl extends EgovAbstractServiceImpl
        implements egovframework.com.uss.ion.ulm.service.EgovUnityLinkService {

    @Resource(name = "unityLinkRepository")
    private UnityLinkRepository unityLinkRepository;

    @Resource(name = "egovUnityLinkIdGnrService")
    private EgovIdGnrService idgenService;

    @Override
    public List<?> selectUnityLinkSample(egovframework.com.uss.ion.ulm.service.UnityLink unityLink) throws Exception {
        return unityLinkRepository.findAll().stream().map(this::toVO).collect(Collectors.toList());
    }

    @Override
    public List<?> selectUnityLinkList(egovframework.com.cmm.ComDefaultVO searchVO) throws Exception {
        Pageable pageable = PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getPageUnit(),
                Sort.by(Sort.Direction.DESC, "frstRegisterPnttm"));
        Page<com.company.project.domain.notification.UnityLink> page = unityLinkRepository.findAll(pageable);
        return page.getContent().stream().map(this::toVO).collect(Collectors.toList());
    }

    @Override
    public int selectUnityLinkListCnt(egovframework.com.cmm.ComDefaultVO searchVO) throws Exception {
        return (int) unityLinkRepository.count();
    }

    @Override
    public void insertUnityLink(egovframework.com.uss.ion.ulm.service.UnityLink searchVO) throws Exception {
        String id = idgenService.getNextStringId();
        searchVO.setUnityLinkId(id);

        com.company.project.domain.notification.UnityLink entity = com.company.project.domain.notification.UnityLink
                .builder()
                .unityLinkId(id)
                .unityLinkSeCode(searchVO.getUnityLinkSeCode())
                .unityLinkNm(searchVO.getUnityLinkNm())
                .unityLinkUrl(searchVO.getUnityLinkUrl())
                .unityLinkDc(searchVO.getUnityLinkDc())
                .frstRegisterId(searchVO.getFrstRegisterId())
                .build();

        unityLinkRepository.save(entity);
    }

    @Override
    public void updateUnityLink(egovframework.com.uss.ion.ulm.service.UnityLink searchVO) throws Exception {
        unityLinkRepository.findById(searchVO.getUnityLinkId()).ifPresent(entity -> {
            entity.update(searchVO.getUnityLinkSeCode(), searchVO.getUnityLinkNm(), searchVO.getUnityLinkUrl(),
                    searchVO.getUnityLinkDc(), searchVO.getLastUpdusrId());
            unityLinkRepository.save(entity);
        });
    }

    @Override
    public void deleteUnityLink(egovframework.com.uss.ion.ulm.service.UnityLink searchVO) throws Exception {
        unityLinkRepository.deleteById(searchVO.getUnityLinkId());
    }

    @Override
    public egovframework.com.uss.ion.ulm.service.UnityLink selectUnityLinkDetail(
            egovframework.com.uss.ion.ulm.service.UnityLink searchVO)
            throws Exception {
        return unityLinkRepository.findById(searchVO.getUnityLinkId())
                .map(this::toVO)
                .orElseThrow(() -> processException("info.nodata.msg"));
    }

    private egovframework.com.uss.ion.ulm.service.UnityLink toVO(
            com.company.project.domain.notification.UnityLink entity) {
        egovframework.com.uss.ion.ulm.service.UnityLink vo = new egovframework.com.uss.ion.ulm.service.UnityLink();
        vo.setUnityLinkId(entity.getUnityLinkId());
        vo.setUnityLinkSeCode(entity.getUnityLinkSeCode());
        vo.setUnityLinkNm(entity.getUnityLinkNm());
        vo.setUnityLinkUrl(entity.getUnityLinkUrl());
        vo.setUnityLinkDc(entity.getUnityLinkDc());
        vo.setFrstRegisterId(entity.getFrstRegisterId());
        return vo;
    }
}
