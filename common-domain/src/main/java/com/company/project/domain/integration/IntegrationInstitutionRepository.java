package com.company.project.domain.integration;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 연계 기관 Repository
 */
public interface IntegrationInstitutionRepository extends JpaRepository<IntegrationInstitution, String> {

    Page<IntegrationInstitution> findByInsttNmContaining(String insttNm, Pageable pageable);
}
