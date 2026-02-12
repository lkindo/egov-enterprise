package com.company.project.service.bnr;

import com.company.project.service.bnr.dto.BannerDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface BannerService {
    Page<BannerDto> getBannerList(String keyword, Pageable pageable);
    
    List<BannerDto> getActiveBanners();
    
    BannerDto getBanner(String bannerId);
    
    String createBanner(String userId, BannerDto dto);
    
    void updateBanner(String bannerId, String userId, BannerDto dto);
    
    void deleteBanner(String bannerId);
}
