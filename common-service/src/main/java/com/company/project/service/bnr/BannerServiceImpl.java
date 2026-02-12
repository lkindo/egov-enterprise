package com.company.project.service.bnr;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.banner.Banner;
import com.company.project.domain.banner.BannerRepository;
import com.company.project.service.bnr.dto.BannerDto;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BannerServiceImpl implements BannerService {

    private final BannerRepository bannerRepository;
    private final EgovIdGnrService egovBannerIdGnrService;

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
        try {
            String bannerId = egovBannerIdGnrService.getNextStringId();
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
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate banner ID", e);
        }
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
