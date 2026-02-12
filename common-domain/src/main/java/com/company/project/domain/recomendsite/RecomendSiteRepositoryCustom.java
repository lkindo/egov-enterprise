package com.company.project.domain.recomendsite;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * 추천사이트 Repository Custom 인터페이스
 */
public interface RecomendSiteRepositoryCustom {
    Page<RecomendSite> searchRecomendSites(String keyword, Pageable pageable);
}
