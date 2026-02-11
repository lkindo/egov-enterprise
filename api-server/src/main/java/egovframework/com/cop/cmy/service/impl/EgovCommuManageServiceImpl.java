package egovframework.com.cop.cmy.service.impl;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.community.CommunityUser;
import com.company.project.domain.community.CommunityUserRepository;
import com.company.project.web.adapter.CommunityAdapter;

import egovframework.com.cop.cmy.service.CommunityUserVO;
import egovframework.com.cop.cmy.service.CommunityVO;
import egovframework.com.cop.cmy.service.EgovCommuManageService;
import jakarta.annotation.Resource;

/**
 * 커뮤니티 사용자 관리를 위한 서비스 구현 클래스
 * Refactored to use JPA (CommunityUserRepository)
 */
@Service("EgovCommuManageService")
@Transactional(readOnly = true)
public class EgovCommuManageServiceImpl extends EgovAbstractServiceImpl implements EgovCommuManageService {

    @Resource
    private CommunityUserRepository communityUserRepository;

    @Resource(name = "EgovCommuMasterDAO")
    EgovCommuMasterDAO egovCommuMasterDao;

    @Resource(name = "EgovCommuManageDAO")
    private EgovCommuManageDAO egovCommuManageDAO;

    /**
     * 커뮤니티 사용자 상세 정보를 조회한다.
     */
    @Override
    public egovframework.com.cop.cmy.service.CommunityUser selectSingleCommuUserDetail(CommunityUserVO cmmntyUserVO)
            throws Exception {
        return communityUserRepository.findByCmmntyIdAndEmplyrId(cmmntyUserVO.getCmmntyId(), cmmntyUserVO.getEmplyrId())
                .map(CommunityAdapter::toVO)
                .orElse(null);
    }

    /**
     * 커뮤니티 관리자 목록을 조회한다.
     */
    @Override
    public List<egovframework.com.cop.cmy.service.CommunityUser> selectCommuManagerList(CommunityVO cmmntyVO)
            throws Exception {
        // Simple filter for managers
        return communityUserRepository.findByCmmntyIdAndUseAt(cmmntyVO.getCmmntyId(), "Y", Pageable.unpaged())
                .getContent().stream()
                .filter(u -> "Y".equals(u.getMngrAt()))
                .map(CommunityAdapter::toVO)
                .collect(Collectors.toList());
    }

    /**
     * 커뮤니티에 이미 등록된 사용자인지 확인한다.
     */
    @Override
    public int checkExistUser(CommunityUserVO cmmntyUserVO) throws Exception {
        return communityUserRepository.findByCmmntyIdAndEmplyrId(cmmntyUserVO.getCmmntyId(), cmmntyUserVO.getEmplyrId())
                .isPresent() ? 1 : 0;
    }

    /**
     * 커뮤니티 사용자를 등록 신청한다.
     */
    @Override
    @Transactional
    public void insertCommuUserRqst(CommunityUserVO cmmntyUserVO) throws Exception {
        CommunityUser entity = CommunityUser.builder()
                .cmmntyId(cmmntyUserVO.getCmmntyId())
                .emplyrId(cmmntyUserVO.getEmplyrId())
                .mngrAt(cmmntyUserVO.getMngrAt())
                .mberSttus(cmmntyUserVO.getMberSttus())
                .useAt(cmmntyUserVO.getUseAt())
                .frstRegisterId(cmmntyUserVO.getFrstRegisterId())
                .build();
        communityUserRepository.save(entity);
    }

    /**
     * 커뮤니티 사용자 목록을 조회한다.
     */
    @Override
    public Map<String, Object> selectCommuUserList(CommunityUserVO cmmntyUserVO) throws Exception {
        Pageable pageable = PageRequest.of(cmmntyUserVO.getFirstIndex() / cmmntyUserVO.getRecordCountPerPage(),
                cmmntyUserVO.getRecordCountPerPage());

        Page<CommunityUser> page = communityUserRepository.findByCmmntyIdAndUseAt(cmmntyUserVO.getCmmntyId(), "Y",
                pageable);

        Map<String, Object> map = new HashMap<>();
        map.put("resultList", page.getContent().stream().map(CommunityAdapter::toVO).collect(Collectors.toList()));
        map.put("resultCnt", Integer.toString((int) page.getTotalElements()));

        return map;
    }

    /**
     * 커뮤니티 사용자 목록 총 개수를 조회한다.
     */
    @Override
    public int selectCommuUserListCnt(CommunityUserVO cmmntyUserVO) throws Exception {
        return (int) communityUserRepository.findByCmmntyIdAndUseAt(cmmntyUserVO.getCmmntyId(), "Y", Pageable.unpaged())
                .getTotalElements();
    }

    /**
     * 커뮤니티 사용자를 승인 처리한다.
     */
    @Override
    @Transactional
    public void insertCommuUser(CommunityUserVO cmmntyUserVO) throws Exception {
        communityUserRepository.findByCmmntyIdAndEmplyrId(cmmntyUserVO.getCmmntyId(), cmmntyUserVO.getEmplyrId())
                .ifPresent(u -> {
                    u.updateStatus("P", cmmntyUserVO.getLastUpdusrId());
                });
    }

    /**
     * 커뮤니티 사용자를 탈퇴 처리한다.
     */
    @Override
    @Transactional
    public void deleteCommuUser(CommunityUserVO cmmntyUserVO) throws Exception {
        communityUserRepository.findByCmmntyIdAndEmplyrId(cmmntyUserVO.getCmmntyId(), cmmntyUserVO.getEmplyrId())
                .ifPresent(communityUserRepository::delete);
    }

    /**
     * 커뮤니티 사용자를 관리자로 등록한다.
     */
    @Override
    @Transactional
    public void insertCommuUserAdmin(CommunityUserVO cmmntyUserVO) throws Exception {
        communityUserRepository.findByCmmntyIdAndEmplyrId(cmmntyUserVO.getCmmntyId(), cmmntyUserVO.getEmplyrId())
                .ifPresent(u -> {
                    u.assignManager("Y", cmmntyUserVO.getLastUpdusrId());
                });
    }

    /**
     * 커뮤니티 사용자를 관리자에서 해제한다.
     */
    @Override
    @Transactional
    public void deleteCommuUserAdmin(CommunityUserVO cmmntyUserVO) throws Exception {
        communityUserRepository.findByCmmntyIdAndEmplyrId(cmmntyUserVO.getCmmntyId(), cmmntyUserVO.getEmplyrId())
                .ifPresent(u -> {
                    u.assignManager("N", cmmntyUserVO.getLastUpdusrId());
                });
    }

}
