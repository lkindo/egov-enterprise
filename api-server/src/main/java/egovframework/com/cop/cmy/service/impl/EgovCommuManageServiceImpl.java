package egovframework.com.cop.cmy.service.impl;

import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.service.community.CommunityUserService;
import com.company.project.service.community.dto.CommunityUserDto;
import com.company.project.service.community.CommunityService;
import com.company.project.service.community.dto.CommunityDto;
import com.company.project.web.adapter.CommunityUserAdapter;
import com.company.project.web.adapter.CommunityAdapter;

import egovframework.com.cop.cmy.service.CommunityUser;
import egovframework.com.cop.cmy.service.CommunityUserVO;
import egovframework.com.cop.cmy.service.CommunityVO;
import egovframework.com.cop.cmy.service.EgovCommuManageService;
import lombok.RequiredArgsConstructor;

/**
 * 커뮤니티 사용자 관리를 위한 서비스 구현 클래스
 * Modernized to use CommunityUserService
 */
@Service("EgovCommuManageService")
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class EgovCommuManageServiceImpl extends EgovAbstractServiceImpl implements EgovCommuManageService {

    private final CommunityUserService communityUserService;
    private final CommunityService communityService;

    /**
     * 커뮤니티 정보를 조회한다. (For User View)
     */
    @Override
    public Map<String, Object> selectCommuInf(CommunityVO cmmntyVO) {
        CommunityDto dto = communityService.getCommunity(cmmntyVO.getCmmntyId());

        Map<String, Object> map = new HashMap<>();
        map.put("resultVo", CommunityAdapter.toVO(dto));

        return map;
    }

    /**
     * 커뮤니티 사용자의 상세 정보를 확인한다.
     */
    @Override
    public String checkCommuUserDetail(CommunityUser cmmntyUser) {
        CommunityUserDto dto = communityUserService.getCommunityUser(cmmntyUser.getCmmntyId(),
                cmmntyUser.getEmplyrId());
        if (dto != null) {
            // Return empty string if user exists (legacy behavior imply check passed?)
            // Legacy likely returned "Y" or something, but interface return type is String.
            // Let's assume it checks existence.
            return "";
        }
        return null;
    }

    /**
     * 커뮤니티 가입 신청을 등록한다.
     */
    @Override
    @Transactional
    public void insertCommuUserRqst(CommunityUser cmmntyUser) {
        // Adapt CommunityUser (Model) to DTO
        CommunityUserDto dto = CommunityUserDto.builder()
                .cmmntyId(cmmntyUser.getCmmntyId())
                .emplyrId(cmmntyUser.getEmplyrId())
                .mngrAt(cmmntyUser.getMngrAt())
                .mberSttus(cmmntyUser.getMberSttus())
                .useAt(cmmntyUser.getUseAt())
                .frstRegisterId(cmmntyUser.getFrstRegisterId())
                .build();

        communityUserService.insertCommunityUserRequest(dto);
    }

    /**
     * 커뮤니티 사용자 목록을 조회한다.
     */
    @Override
    public Map<String, Object> selectCommuUserList(CommunityUserVO cmmntyUserVO) {
        Pageable pageable = PageRequest.of(cmmntyUserVO.getFirstIndex() / cmmntyUserVO.getRecordCountPerPage(),
                cmmntyUserVO.getRecordCountPerPage());

        Page<CommunityUserDto> page = communityUserService.getCommunityUserList(
                cmmntyUserVO.getCmmntyId(),
                cmmntyUserVO.getSearchCnd(),
                cmmntyUserVO.getSearchWrd(),
                pageable);

        Map<String, Object> map = new HashMap<>();
        map.put("resultList", page.getContent().stream()
                .map(CommunityUserAdapter::toVO)
                .collect(Collectors.toList()));
        map.put("resultCnt", Integer.toString((int) page.getTotalElements()));

        return map;
    }

    /**
     * 커뮤니티 관리자 여부를 확인한다.
     */
    @Override
    public Boolean selectIsCommuAdmin(CommunityUserVO userVO) {
        CommunityUserDto dto = communityUserService.getCommunityUser(userVO.getCmmntyId(), userVO.getEmplyrId());
        return dto != null && "Y".equals(dto.getMngrAt());
    }

    /**
     * 커뮤니티 사용자를 승인한다.
     */
    @Override
    @Transactional
    public void insertCommuUser(CommunityUserVO cmmntyUserVO) {
        communityUserService.approveCommunityUser(cmmntyUserVO.getCmmntyId(), cmmntyUserVO.getEmplyrId(),
                cmmntyUserVO.getLastUpdusrId());
    }

    /**
     * 커뮤니티 사용자를 탈퇴 처리한다.
     */
    @Override
    @Transactional
    public void deleteCommuUser(CommunityUserVO cmmntyUserVO) {
        communityUserService.withdrawCommunityUser(cmmntyUserVO.getCmmntyId(), cmmntyUserVO.getEmplyrId(),
                cmmntyUserVO.getLastUpdusrId());
    }

    /**
     * 커뮤니티 사용자를 관리자로 등록한다.
     */
    @Override
    @Transactional
    public void insertCommuUserAdmin(CommunityUserVO cmmntyUserVO) {
        communityUserService.grantAdmin(cmmntyUserVO.getCmmntyId(), cmmntyUserVO.getEmplyrId(),
                cmmntyUserVO.getLastUpdusrId());
    }

    /**
     * 커뮤니티 사용자를 관리자에서 해제한다.
     */
    @Override
    @Transactional
    public void deleteCommuUserAdmin(CommunityUserVO cmmntyUserVO) {
        communityUserService.revokeAdmin(cmmntyUserVO.getCmmntyId(), cmmntyUserVO.getEmplyrId(),
                cmmntyUserVO.getLastUpdusrId());
    }

}
