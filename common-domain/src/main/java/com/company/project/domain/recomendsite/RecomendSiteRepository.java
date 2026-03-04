package com.company.project.domain.recomendsite;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * ?곕뗄荑?????Repository
 */
public interface RecomendSiteRepository extends JpaRepository<RecomendSite, String>, RecomendSiteRepositoryCustom {
}