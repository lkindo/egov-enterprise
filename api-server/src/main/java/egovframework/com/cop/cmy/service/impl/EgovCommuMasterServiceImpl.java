package egovframework.com.cop.cmy.service.impl;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.cmmn.exception.FdlException;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.community.CommunityRepository;
import com.company.project.web.adapter.CommunityAdapter;

import egovframework.com.cop.cmy.service.Community;
import egovframework.com.cop.cmy.service.CommunityVO;
import egovframework.com.cop.cmy.service.EgovCommuMasterService;
import jakarta.annotation.Resource;

/**
 * 커뮤니티 정보 관리를 위한 서비스 구현 클래스
 * Refactored to use JPA (CommunityRepository)
 */
@Service("EgovCommuMasterService")
@Transactional(readOnly = true)
public class EgovCommuMasterServiceImpl extends EgovAbstractServiceImpl implements EgovCommuMasterService {

    @Resource
    private CommunityRepository communityRepository;

    @Resource(name = "EgovCommuMasterDAO")
    private EgovCommuMasterDAO egovCommuMasterDAO;

    @Resource(name = "egovCommunityIdGnrService")
    private EgovIdGnrService idgenService;

    /**
     * 커뮤니티 목록을 조회한다.
     */
    @Override
    public Map<String, Object> selectCommuMasterList(CommunityVO cmmntyVO) {
        Pageable pageable = PageRequest.of(cmmntyVO.getFirstIndex() / cmmntyVO.getRecordCountPerPage(),
                cmmntyVO.getRecordCountPerPage(), Sort.by(Sort.Direction.DESC, "createdDate"));

        Page<com.company.project.domain.community.Community> page = communityRepository
                .searchCommunities(cmmntyVO.getSearchWrd(), pageable);

        Map<String, Object> map = new HashMap<>();
        map.put("resultList", page.getContent().stream().map(CommunityAdapter::toVO).collect(Collectors.toList()));
        map.put("resultCnt", Integer.toString((int) page.getTotalElements()));

        return map;
    }

    /**
     * 커뮤니티 정보를 등록한다.
     */
    @Override
    @Transactional
    public String insertCommuMaster(Community community) throws FdlException {
        String id = idgenService.getNextStringId();

        com.company.project.domain.community.Community entity = com.company.project.domain.community.Community.builder()
                .id(id)
                .cmmntyNm(community.getCmmntyNm())
                .cmmntyIntrcn(community.getCmmntyIntrcn())
                .registSeCode(community.getRegistSeCode())
                .tmplatId(community.getTmplatId())
                .useAt(community.getUseAt())
                .frstRegisterId(community.getFrstRegisterId())
                .build();

        communityRepository.save(entity);
        return id;
    }

    /**
     * 커뮤니티 정보를 조회한다.
     */
    @Override
    public CommunityVO selectCommuMaster(CommunityVO cmmntyVO) throws Exception {
        return communityRepository.findById(cmmntyVO.getCmmntyId())
                .map(CommunityAdapter::toVO)
                .orElse(null);
    }

    /**
     * 커뮤니티 정보를 수정한다.
     */
    @Override
    @Transactional
    public void updateCommuMaster(Community community) {
        communityRepository.findById(community.getCmmntyId()).ifPresent(entity -> {
            entity.update(community.getCmmntyNm(), community.getCmmntyIntrcn(),
                    community.getTmplatId(), community.getLastUpdusrId());
        });
    }

    /**
     * 커뮤니티 정보를 삭제한다.
     */
    @Override
    @Transactional
    public void deleteCommuMaster(Community community) {
        communityRepository.findById(community.getCmmntyId()).ifPresent(entity -> {
            entity.delete(community.getLastUpdusrId());
        });
    }

    /**
     * 포틀릿을 위한 커뮤니티 목록을 조회한다.
     */
    @Override
    public List<CommunityVO> selectCommuMasterListPortlet(CommunityVO cmmntyVO) throws Exception {
        return communityRepository.searchCommunities("", PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "createdDate")))
                .getContent().stream()
                .map(CommunityAdapter::toVO)
                .collect(Collectors.toList());
    }

}
