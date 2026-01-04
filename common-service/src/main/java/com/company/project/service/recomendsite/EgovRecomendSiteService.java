package com.company.project.service.recomendsite;

import com.company.project.service.recomendsite.dto.RecomendSiteDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * 추천사이트정보 서비스 인터페이스
 */
public interface EgovRecomendSiteService {
    Page<RecomendSiteDto> getRecomendSiteList(String keyword, Pageable pageable);

    RecomendSiteDto getRecomendSite(String recomendSiteId);

    String createRecomendSite(String userId, RecomendSiteDto dto);

    void updateRecomendSite(String recomendSiteId, String userId, RecomendSiteDto dto);

    void deleteRecomendSite(String recomendSiteId);
}
