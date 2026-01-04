package com.company.project.service.community;

import com.company.project.service.community.dto.CommunityDto;
import com.company.project.service.community.dto.CommunityUserDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EgovCommunityService {
    // Community Management
    Page<CommunityDto> getCommunityList(String searchWrd, Pageable pageable);

    CommunityDto getCommunity(String cmmntyId);

    CommunityDto createCommunity(String userId, CommunityDto dto);

    void updateCommunity(String cmmntyId, String userId, CommunityDto dto);

    // Member Management
    Page<CommunityUserDto> getCommunityUserList(String cmmntyId, Pageable pageable);

    void joinCommunity(String cmmntyId, String userId); // Self join

    void leaveCommunity(String cmmntyId, String userId); // Self leave

    String checkCommunityUserStatus(String cmmntyId, String userId);

    boolean isManager(String cmmntyId, String userId);

    // Admin features
    void approveCommunityUser(String cmmntyId, String userId, String adminId);

    void kickCommunityUser(String cmmntyId, String userId, String adminId);

    void grantManagerRole(String cmmntyId, String userId, String adminId);

    void revokeManagerRole(String cmmntyId, String userId, String adminId);
}
