package com.company.project.domain.site;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * SitePolicy 엔티티를 위한 JPA Repository
 */
public interface SitePolicyRepository extends JpaRepository<SitePolicy, String> {
}
