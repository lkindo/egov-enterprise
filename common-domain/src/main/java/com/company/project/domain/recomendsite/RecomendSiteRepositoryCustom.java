package com.company.project.domain.recomendsite;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * ?곕뗄荑?????Repository Custom ?紐낃숲??륁뵠??
 */
public interface RecomendSiteRepositoryCustom {
    Page<RecomendSite> searchRecomendSites(String keyword, Pageable pageable);
}
