package com.company.project.domain.recomendsite;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 추천사이트 Repository
 */
public interface RecomendSiteRepository extends JpaRepository<RecomendSite, String>, RecomendSiteRepositoryCustom {
}
