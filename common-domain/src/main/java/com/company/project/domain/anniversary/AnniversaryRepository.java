package com.company.project.domain.anniversary;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 疫꿸퀡???Repository
 */
@org.springframework.stereotype.Repository("ansAnniversaryRepository")
public interface AnniversaryRepository extends JpaRepository<Anniversary, String> {
    Page<Anniversary> findByAnnvrsryNmContaining(String annvrsryNm, Pageable pageable);

    Page<Anniversary> findByUsid(String usid, Pageable pageable);

    long countByUsidAndAnnvrsryDeAndAnnvrsryNm(String usid, String annvrsryDe, String annvrsryNm);

    long countByUsidAndAnnvrsryDeAndAnnvrsryNmAndAnnIdNot(String usid, String annvrsryDe, String annvrsryNm,
            String annId);
}