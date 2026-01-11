package com.company.project.domain.anniversary;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * 기념일관리 Repository
 */
public interface AnniversaryDomainRepository extends JpaRepository<Anniversary, String> {
    Page<Anniversary> findByAnnvrsryNmContaining(String annvrsryNm, Pageable pageable);

    List<Anniversary> findByUsid(String usid);

    int countByUsidAndAnnvrsryDeAndAnnvrsryNm(String usid, String annvrsryDe, String annvrsryNm);
}
