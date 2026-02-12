package com.company.project.domain.anniversary;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 기념일 Repository
 */
public interface AnniversaryRepository extends JpaRepository<Anniversary, String> {
    Page<Anniversary> findByAnnvrsryNmContaining(String annvrsryNm, Pageable pageable);
    Page<Anniversary> findByUsid(String usid, Pageable pageable);
}
