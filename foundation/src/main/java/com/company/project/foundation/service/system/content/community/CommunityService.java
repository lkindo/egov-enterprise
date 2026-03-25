package com.company.project.foundation.service.system.content.community;

import com.company.project.foundation.service.system.content.community.dto.CommunityDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;

public interface CommunityService {

    Page<CommunityDto> getCommunityList(String searchCnd, String searchWrd,
            @org.springframework.lang.NonNull Pageable pageable);

    CommunityDto getCommunity(String cmmntyId);

    CommunityDto createCommunity(String userId, CommunityDto dto);

    void updateCommunity(String userId, CommunityDto dto);

    void deleteCommunity(String cmmntyId, String userId);

    List<CommunityDto> getCommunityListPortlet();
}
