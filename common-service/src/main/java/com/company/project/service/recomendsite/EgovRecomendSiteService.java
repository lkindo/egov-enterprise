package com.company.project.service.recomendsite;

import com.company.project.service.recomendsite.dto.RecomendSiteDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * ?°ë¶¿ì¿????ëª„ì ™è¹???•í‰¬???ëª…ê½£??ì” ??
 */
public interface EgovRecomendSiteService {
    Page<RecomendSiteDto> getRecomendSiteList(String keyword, @org.springframework.lang.NonNull Pageable pageable);

    RecomendSiteDto getRecomendSite(String recomendSiteId);

    String createRecomendSite(String userId, RecomendSiteDto dto);

    void updateRecomendSite(String recomendSiteId, String userId, RecomendSiteDto dto);

    void deleteRecomendSite(String recomendSiteId);
}
