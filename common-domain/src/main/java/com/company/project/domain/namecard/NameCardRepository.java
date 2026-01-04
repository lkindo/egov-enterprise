package com.company.project.domain.namecard;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * 명함 Repository
 */
public interface NameCardRepository extends JpaRepository<NameCard, String> {

    Page<NameCard> findByNcrdNmContaining(String ncrdNm, Pageable pageable);

    Page<NameCard> findByCmpnyNmContaining(String cmpnyNm, Pageable pageable);

    Page<NameCard> findByNcrdTrgterId(String ncrdTrgterId, Pageable pageable);

    @Query("SELECT n FROM NameCard n WHERE n.ncrdNm LIKE %:keyword% OR n.cmpnyNm LIKE %:keyword% OR n.emailAdres LIKE %:keyword%")
    Page<NameCard> searchByKeyword(@Param("keyword") String keyword, Pageable pageable);
}
