package com.company.project.domain.help;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * ??깆젟??밸선 Repository
 */
public interface AdministrationWordRepository extends JpaRepository<AdministrationWord, String> {
    Page<AdministrationWord> findByAdministWordNmContaining(String administWordNm, Pageable pageable);
}
