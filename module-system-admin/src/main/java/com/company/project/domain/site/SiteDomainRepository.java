package com.company.project.domain.site;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * ????紐꾩젟癰?Repository
 */
public interface SiteDomainRepository extends JpaRepository<Site, String> {
    Page<Site> findBySiteNmContaining(String siteNm, Pageable pageable);
}
