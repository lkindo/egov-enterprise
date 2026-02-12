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
    public BannerDto getBanner(String bannerId) {
        return bannerRepository.findById(bannerId)
                .map(BannerDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public void insertBanner(BannerDto dto) {
        String id = "BANNER_" + String.format("%013d", System.currentTimeMillis());
        Banner entity = Banner.builder()
                .bannerId(id)
                .bannerNm(dto.getBannerNm())
                .linkUrl(dto.getLinkUrl())
                .bannerImage(dto.getBannerImage())
                .bannerDc(dto.getBannerDc())
                .sortOrdr(dto.getSortOrdr())
                .reflctAt(dto.getReflctAt())
                .bannerImageFile(dto.getBannerImageFile())
                .build();
        bannerRepository.save(entity);
    }

    @Override
    @Transactional
    public void updateBanner(BannerDto dto) {
        Banner entity = bannerRepository.findById(dto.getBannerId())
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getBannerNm(), dto.getLinkUrl(), dto.getBannerImage(),
                dto.getBannerDc(), dto.getSortOrdr(), dto.getReflctAt(), dto.getBannerImageFile());
    }

    @Override
    @Transactional
    public void deleteBanner(String bannerId) {
        bannerRepository.deleteById(bannerId);
    }

    @Override
    public List<BannerDto> getReflectedBanners() {
        return bannerRepository.findByReflctAtOrderBySortOrdrAsc("Y").stream()
                .map(BannerDto::from)
                .collect(Collectors.toList());
    }
}
