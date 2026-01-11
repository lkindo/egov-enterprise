package com.company.project.domain.recomendsite;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * 추천사이트정보 Repository
 */
@Repository("recomendSiteDomainRepository")
public interface RecomendSiteDomainRepository extends JpaRepository<RecomendSite, String> {
    Page<RecomendSite> findByRecomendSiteNmContaining(String recomendSiteNm, Pageable pageable);
}
