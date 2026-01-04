package com.company.project.service.banner;

import com.company.project.service.banner.dto.BannerDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

/**
 * 배너 서비스 인터페이스
 */
public interface EgovBannerService {

    Page<BannerDto> getBannerList(String keyword, Pageable pageable);

    List<BannerDto> getActiveBanners();

    BannerDto getBanner(String bannerId);

    String createBanner(String userId, BannerDto dto);

    void updateBanner(String bannerId, String userId, BannerDto dto);

    void deleteBanner(String bannerId);
}
