package com.company.project.business.domain.knowledge;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * 筌왖?????Repository
 */
public interface KnowledgeRepository extends JpaRepository<Knowledge, String> {

    Page<Knowledge> findByKnoNmContaining(String knoNm, Pageable pageable);

    Page<Knowledge> findByKnoTypeCd(String knoTypeCd, Pageable pageable);

    Page<Knowledge> findByOrgnztId(String orgnztId, Pageable pageable);

    @Query("SELECT k FROM Knowledge k WHERE k.knoNm LIKE %:keyword% OR k.knoCn LIKE %:keyword%")
    Page<Knowledge> searchByKeyword(@Param("keyword") String keyword, Pageable pageable);

    @Query("SELECT k FROM Knowledge k WHERE k.othbcAt = 'Y'")
    Page<Knowledge> findPublicKnowledge(Pageable pageable);
}
