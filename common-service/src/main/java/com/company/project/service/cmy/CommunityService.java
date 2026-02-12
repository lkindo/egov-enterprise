package com.company.project.service.cmy;

import com.company.project.service.cmy.dto.CommunityDto;
import com.company.project.service.cmy.dto.CommunityUserDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface CommunityService {
    
    Page<CommunityDto> getCommunityList(String searchCnd, String searchWrd, Pageable pageable);
    
    CommunityDto getCommunity(String cmmntyId);
    
    CommunityDto createCommunity(String userId, CommunityDto dto);
    
    void updateCommunity(String userId, CommunityDto dto);
    
    void deleteCommunity(String cmmntyId, String userId);
    
    List<CommunityDto> getCommunityListPortlet();
}
