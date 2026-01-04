package com.company.project.service.community;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.community.Community;
import com.company.project.domain.community.CommunityRepository;
import com.company.project.domain.community.CommunityUser;
import com.company.project.domain.community.CommunityUserId;
import com.company.project.domain.community.CommunityUserRepository;

import com.company.project.service.community.dto.CommunityDto;
import com.company.project.service.community.dto.CommunityUserDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service("egovCommunityService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CommunityService implements EgovCommunityService {

    private final CommunityRepository communityRepository;
    private final CommunityUserRepository communityUserRepository;
    // ID 생성 (기존 IdGen 서비스 대체 또는 UUID 사용 고려, 현재는 타임스탬프 기반 임시 생성)
    // 레거시는 CmmntyIdGnrService를 사용함.

    // ...

    // 생성자를 관리자로 자동 가입

    // ...

    // 권한 확인 (관리자만 가능)

    // ...

    // 이미 가입되었거나 가입 신청 상태임

    // ...

    // 승인 대기

    // ...

    // 관리자는 직접 탈퇴할 수 없음 (레거시 로직 준수)

    @Override
    public Page<CommunityDto> getCommunityList(String searchWrd, Pageable pageable) {
        return communityRepository.searchCommunities(searchWrd, pageable)
                .map(CommunityDto::from);
    }

    @Override
    public CommunityDto getCommunity(String cmmntyId) {
        return communityRepository.findById(cmmntyId)
                .map(CommunityDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public CommunityDto createCommunity(String userId, CommunityDto dto) {
        // ID 생성
        String cmmntyId = "CMMNTY_" + String.format("%013d", System.currentTimeMillis());

        Community community = Community.builder()
                .id(cmmntyId)
                .cmmntyNm(dto.getCmmntyNm())
                .cmmntyIntrcn(dto.getCmmntyIntrcn())
                .registSeCode(dto.getRegistSeCode())
                .tmplatId(dto.getTmplatId())
                .useAt("Y")
                .frstRegisterId(userId)
                .build();

        Community saved = communityRepository.save(community);

        // 생성자를 관리자로 자동 가입
        CommunityUser admin = CommunityUser.builder()
                .cmmntyId(cmmntyId)
                .emplyrId(userId)
                .mngrAt("Y")
                .mberSttus("A") // Approved
                .useAt("Y")
                .frstRegisterId(userId)
                .build();

        communityUserRepository.save(admin);

        return CommunityDto.from(saved);
    }

    @Override
    @Transactional
    public void updateCommunity(String cmmntyId, String userId, CommunityDto dto) {
        Community community = communityRepository.findById(cmmntyId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        // 권한 확인 (관리자만 가능)
        if (!isManager(cmmntyId, userId)) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED);
        }

        community.update(dto.getCmmntyNm(), dto.getCmmntyIntrcn(), dto.getTmplatId(), userId);
    }

    @Override
    public Page<CommunityUserDto> getCommunityUserList(String cmmntyId, Pageable pageable) {
        return communityUserRepository.findByCmmntyIdAndUseAt(cmmntyId, "Y", pageable)
                .map(CommunityUserDto::from);
    }

    @Override
    @Transactional
    public void joinCommunity(String cmmntyId, String userId) {
        if (communityUserRepository.existsById(new CommunityUserId(cmmntyId, userId))) {
            throw new BusinessException(ErrorCode.DUPLICATE_RESOURCE); // 이미 가입되었거나 신청됨
        }

        CommunityUser user = CommunityUser.builder()
                .cmmntyId(cmmntyId)
                .emplyrId(userId)
                .mngrAt("N")
                .mberSttus("P") // 승인 대기
                .useAt("Y")
                .frstRegisterId(userId)
                .build();

        communityUserRepository.save(user);
    }

    @Override
    @Transactional
    public void leaveCommunity(String cmmntyId, String userId) {
        CommunityUser user = communityUserRepository.findById(new CommunityUserId(cmmntyId, userId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        if ("Y".equals(user.getMngrAt())) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED); // 관리자는 탈퇴 불가 (레거시 정책)
        }

        user.leave(userId);
    }

    @Override
    public String checkCommunityUserStatus(String cmmntyId, String userId) {
        return communityUserRepository.findById(new CommunityUserId(cmmntyId, userId))
                .map(CommunityUser::getMberSttus)
                .orElse("NOT_MEMBER");
    }

    @Override
    public boolean isManager(String cmmntyId, String userId) {
        return communityUserRepository.existsByCmmntyIdAndEmplyrIdAndMngrAtAndUseAt(cmmntyId, userId, "Y", "Y");
    }

    @Override
    @Transactional
    public void approveCommunityUser(String cmmntyId, String userId, String adminId) {
        checkAdminPermission(cmmntyId, adminId);
        CommunityUser user = getCommunityUser(cmmntyId, userId);
        user.approve();
    }

    @Override
    @Transactional
    public void kickCommunityUser(String cmmntyId, String userId, String adminId) {
        checkAdminPermission(cmmntyId, adminId);
        CommunityUser user = getCommunityUser(cmmntyId, userId);
        user.leave(adminId);
    }

    @Override
    @Transactional
    public void grantManagerRole(String cmmntyId, String userId, String adminId) {
        checkAdminPermission(cmmntyId, adminId);
        CommunityUser user = getCommunityUser(cmmntyId, userId);
        user.promoteToManager();
    }

    @Override
    @Transactional
    public void revokeManagerRole(String cmmntyId, String userId, String adminId) {
        checkAdminPermission(cmmntyId, adminId);
        CommunityUser user = getCommunityUser(cmmntyId, userId);
        user.demoteFromManager();
    }

    private void checkAdminPermission(String cmmntyId, String adminId) {
        if (!isManager(cmmntyId, adminId)) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED);
        }
    }

    private CommunityUser getCommunityUser(String cmmntyId, String userId) {
        return communityUserRepository.findById(new CommunityUserId(cmmntyId, userId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }
}
