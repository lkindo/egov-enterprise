package com.company.project.service.site;

import com.company.project.service.site.dto.SiteDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * 사이트정보 서비스 인터페이스
 */
public interface EgovSiteService {
    Page<SiteDto> getSiteList(String keyword, Pageable pageable);

    SiteDto getSite(String siteId);

    String createSite(String userId, SiteDto dto);

    void updateSite(String siteId, String userId, SiteDto dto);

    void deleteSite(String siteId);
}
