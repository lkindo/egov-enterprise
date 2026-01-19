package com.company.project.domain.batch;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 배치결과 Repository
 */
public interface BatchResultRepository extends JpaRepository<BatchResult, String> {

    Page<BatchResult> findByBatchSchdulId(String batchSchdulId, Pageable pageable);

    Page<BatchResult> findByBatchOpertId(String batchOpertId, Pageable pageable);

    @org.springframework.data.jpa.repository.Query("SELECT r FROM BatchResult r JOIN BatchJob j ON r.batchOpertId = j.batchOpertId "
            +
            "WHERE (:sttus IS NULL OR :sttus = '00' OR r.sttus = :sttus) " +
            "AND (:searchKeywordFrom IS NULL OR :searchKeywordFrom = '' OR SUBSTRING(r.executBeginTime, 1, 8) >= :searchKeywordFrom) "
            +
            "AND (:searchKeywordTo IS NULL OR :searchKeywordTo = '' OR SUBSTRING(r.executBeginTime, 1, 8) <= :searchKeywordTo) "
            +
            "AND ((:searchCondition = '0' AND j.batchOpertNm LIKE %:searchKeyword%) OR " +
            "     (:searchCondition = '1' AND r.batchSchdulId LIKE %:searchKeyword%) OR " +
            "     (:searchCondition IS NULL OR :searchCondition = ''))")
    Page<BatchResult> searchBatchResults(
            @org.springframework.data.repository.query.Param("sttus") String sttus,
            @org.springframework.data.repository.query.Param("searchKeywordFrom") String searchKeywordFrom,
            @org.springframework.data.repository.query.Param("searchKeywordTo") String searchKeywordTo,
            @org.springframework.data.repository.query.Param("searchCondition") String searchCondition,
            @org.springframework.data.repository.query.Param("searchKeyword") String searchKeyword,
            Pageable pageable);
}
