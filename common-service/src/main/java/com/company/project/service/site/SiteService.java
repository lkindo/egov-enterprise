package com.company.project.service.site;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.site.Site;
import com.company.project.domain.site.SiteDomainRepository;
import com.company.project.service.site.dto.SiteDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Objects;

/**
 * ?ъ씠?몄젙蹂??쒕퉬??援ы쁽泥?
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SiteService implements EgovSiteService {

    private final SiteDomainRepository siteRepository;

    @Override
    public Page<SiteDto> getSiteList(String keyword, Pageable pageable) {
        Objects.requireNonNull(pageable);
        if (keyword == null || keyword.isEmpty()) {
            return siteRepository.findAll(pageable).map(SiteDto::from);
        }
        return siteRepository.findBySiteNmContaining(keyword, pageable).map(SiteDto::from);
    }

    @Override
    public SiteDto getSite(String siteId) {
        return siteRepository.findById(Objects.requireNonNull(siteId))
                .map(SiteDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public String createSite(String userId, SiteDto dto) {
        String siteId = "SITE_" + String.format("%015d", System.currentTimeMillis());
        Site site = Site.builder()
                .siteId(siteId)
                .siteUrl(dto.getSiteUrl())
                .siteNm(dto.getSiteNm())
                .siteDc(dto.getSiteDc())
                .siteThemaClCode(dto.getSiteThemaClCode())
                .actvtyAt(dto.getActvtyAt())
                .useAt(dto.getUseAt())
                .frstRegisterId(userId)
                .build();
        siteRepository.save(Objects.requireNonNull(site));
        return siteId;
    }

    @Override
    @Transactional
    public void updateSite(String siteId, String userId, SiteDto dto) {
        Site site = siteRepository.findById(Objects.requireNonNull(siteId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        site.update(dto.getSiteUrl(), dto.getSiteNm(), dto.getSiteDc(), dto.getSiteThemaClCode(),
                dto.getActvtyAt(), dto.getUseAt(), userId);
    }

    @Override
    @Transactional
    public void deleteSite(String siteId) {
        siteRepository.deleteById(Objects.requireNonNull(siteId));
    }
}
