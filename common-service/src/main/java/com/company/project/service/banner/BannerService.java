package com.company.project.service.banner;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.banner.Banner;
import com.company.project.domain.banner.BannerRepository;
import com.company.project.service.banner.dto.BannerDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 배너 서비스 구현체
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BannerService implements EgovBannerService {

    private final BannerRepository bannerRepository;

    @Override
    public Page<BannerDto> getBannerList(String keyword, Pageable pageable) {
        if (keyword == null || keyword.isEmpty()) {
            return bannerRepository.findAll(pageable).map(BannerDto::from);
        }
        return bannerRepository.findByBannerNmContaining(keyword, pageable).map(BannerDto::from);
    }

    @Override
    public List<BannerDto> getActiveBanners() {
        return bannerRepository.findByReflctAtOrderBySortOrdrAsc("Y").stream()
                .map(BannerDto::from)
                .collect(Collectors.toList());
    }

    @Override
    public BannerDto getBanner(String bannerId) {
        Banner banner = bannerRepository.findById(bannerId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        return BannerDto.from(banner);
    }

    @Override
    @Transactional
    public String createBanner(String userId, BannerDto dto) {
        String bannerId = "BNR_" + String.format("%016d", System.currentTimeMillis());

        Banner banner = Banner.builder()
                .bannerId(bannerId)
                .bannerNm(dto.getBannerNm())
                .linkUrl(dto.getLinkUrl())
                .bannerImage(dto.getBannerImage())
                .bannerDc(dto.getBannerDc())
                .sortOrdr(dto.getSortOrdr())
                .reflctAt(dto.getReflctAt())
                .userId(userId)
                .build();

        bannerRepository.save(banner);
        return bannerId;
    }

    @Override
    @Transactional
    public void updateBanner(String bannerId, String userId, BannerDto dto) {
        Banner banner = bannerRepository.findById(bannerId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        banner.update(dto.getBannerNm(), dto.getLinkUrl(), dto.getBannerImage(),
                dto.getBannerDc(), dto.getSortOrdr(), dto.getReflctAt());
    }

    @Override
    @Transactional
    public void deleteBanner(String bannerId) {
        Banner banner = bannerRepository.findById(bannerId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        bannerRepository.delete(banner);
    }
}
