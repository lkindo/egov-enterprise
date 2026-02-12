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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.service.community.CommunityService;
import com.company.project.service.community.dto.CommunityDto;
import com.company.project.web.adapter.CommunityAdapter;

import egovframework.com.cop.cmy.service.Community;
import egovframework.com.cop.cmy.service.CommunityVO;
import egovframework.com.cop.cmy.service.EgovCommuMasterService;
import jakarta.annotation.Resource;
import lombok.RequiredArgsConstructor;

/**
 * 커뮤니티 정보 관리를 위한 서비스 구현 클래스
 * Modernized to use CommunityService
 */
@Service("EgovCommuMasterService")
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class EgovCommuMasterServiceImpl extends EgovAbstractServiceImpl implements EgovCommuMasterService {

    private final CommunityService communityService;

    @Resource(name = "egovCommunityIdGnrService")
    private EgovIdGnrService idgenService;

    /**
     * 커뮤니티 목록을 조회한다.
     */
    @Override
    public Map<String, Object> selectCommuMasterList(CommunityVO cmmntyVO) {
        Pageable pageable = PageRequest.of(cmmntyVO.getFirstIndex() / cmmntyVO.getRecordCountPerPage(),
                cmmntyVO.getRecordCountPerPage());

        // Adapting search conditions
        Page<CommunityDto> page = communityService.getCommunityList(
                cmmntyVO.getSearchCnd(),
                cmmntyVO.getSearchWrd(),
                pageable);

        Map<String, Object> map = new HashMap<>();
        map.put("resultList", page.getContent().stream()
                .map(CommunityAdapter::toVO)
                .collect(Collectors.toList()));
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
        community.setCmmntyId(id);

        // Convert to DTO
        CommunityDto dto = CommunityAdapter.toDto(community);

        communityService.createCommunity(dto);

        return id;
    }

    /**
     * 커뮤니티 정보를 조회한다.
     */
    @Override
    public CommunityVO selectCommuMaster(CommunityVO cmmntyVO) throws Exception {
        CommunityDto dto = communityService.getCommunity(cmmntyVO.getCmmntyId());
        return CommunityAdapter.toVO(dto);
    }

    /**
     * 커뮤니티 정보를 수정한다.
     */
    @Override
    @Transactional
    public void updateCommuMaster(Community community) {
        CommunityDto dto = CommunityAdapter.toDto(community);
        communityService.updateCommunity(dto);
    }

    /**
     * 커뮤니티 정보를 삭제한다.
     */
    @Override
    @Transactional
    public void deleteBBSMasterInf(Community community) {
        communityService.deleteCommunity(community.getCmmntyId(), community.getLastUpdusrId());
    }

    /**
     * 포틀릿을 위한 커뮤니티 목록을 조회한다.
     */
    @Override
    public List<CommunityVO> selectCommuMasterListPortlet(CommunityVO cmmntyVO) throws Exception {
        return communityService.getCommunityListPortlet().stream()
                .map(CommunityAdapter::toVO)
                .collect(Collectors.toList());
    }

}
