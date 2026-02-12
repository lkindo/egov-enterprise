package com.company.project.service.banner;

import com.company.project.service.banner.dto.BannerDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface EgovBannerService {
    Page<BannerDto> getBannerList(String keyword, Pageable pageable);
    BannerDto getBanner(String bannerId);
    void insertBanner(BannerDto dto);
    void updateBanner(BannerDto dto);
    void deleteBanner(String bannerId);
    List<BannerDto> getReflectedBanners();
}
