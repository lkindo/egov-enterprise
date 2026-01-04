package com.company.project.domain.site;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 사이트정보 Repository
 */
public interface SiteRepository extends JpaRepository<Site, String> {
    Page<Site> findBySiteNmContaining(String siteNm, Pageable pageable);
}
