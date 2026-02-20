package com.company.project.domain.integration;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * ?怨뚰?疫꿸퀗? Repository
 */
public interface IntegrationInstitutionRepository
        extends JpaRepository<IntegrationInstitution, String>, IntegrationInstitutionRepositoryCustom {

    Page<IntegrationInstitution> findByInsttNmContaining(String insttNm, Pageable pageable);
}
