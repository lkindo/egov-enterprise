package com.company.project.domain.batch;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 배치스케줄 Repository
 */
public interface BatchSchdulRepository extends JpaRepository<BatchSchdul, String> {

    Page<BatchSchdul> findByBatchOpertId(String batchOpertId, Pageable pageable);

    @org.springframework.data.jpa.repository.Query("SELECT s FROM BatchSchdul s JOIN BatchJob j ON s.batchOpertId = j.batchOpertId "
            +
            "WHERE (:searchCondition = '0' AND j.batchOpertNm LIKE %:searchKeyword%) OR " +
            "      (:searchCondition = '1' AND j.batchProgrm LIKE %:searchKeyword%) OR " +
            "      (:searchCondition IS NULL OR :searchCondition = '')")
    Page<BatchSchdul> searchBatchSchduls(
            @org.springframework.data.repository.query.Param("searchCondition") String searchCondition,
            @org.springframework.data.repository.query.Param("searchKeyword") String searchKeyword,
            Pageable pageable);
}
