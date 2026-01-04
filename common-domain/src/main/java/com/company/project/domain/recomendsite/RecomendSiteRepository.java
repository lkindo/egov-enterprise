package com.company.project.domain.recomendsite;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 추천사이트정보 Repository
 */
public interface RecomendSiteRepository extends JpaRepository<RecomendSite, String> {
    Page<RecomendSite> findByRecomendSiteNmContaining(String recomendSiteNm, Pageable pageable);
}
