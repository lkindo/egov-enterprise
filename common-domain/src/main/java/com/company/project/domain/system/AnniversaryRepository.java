package com.company.project.domain.system;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository("systemAnniversaryRepository")
public interface AnniversaryRepository extends JpaRepository<Anniversary, String> {
    Page<Anniversary> findByAnnvrsryNmContaining(String annvrsryNm, Pageable pageable);
}
