package com.company.project.domain.batch;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

/**
 * 배치스케줄 Repository
 */
public interface BatchSchdulRepository extends JpaRepository<BatchSchdul, String> {

    Page<BatchSchdul> findByBatchOpertId(String batchOpertId, Pageable pageable);

    @Query("SELECT d FROM BatchSchdulDfk d WHERE d.batchSchdulId IN :ids")
    List<BatchSchdulDfk> findAllDfksByBatchSchdulIdIn(@Param("ids") Collection<String> ids);

    @Query("SELECT s FROM BatchSchdul s JOIN BatchJob j ON s.batchOpertId = j.batchOpertId "
            +
            "WHERE (:searchCondition = '0' AND j.batchOpertNm LIKE %:searchKeyword%) OR " +
            "      (:searchCondition = '1' AND j.batchProgrm LIKE %:searchKeyword%) OR " +
            "      (:searchCondition IS NULL OR :searchCondition = '')")
    Page<BatchSchdul> searchBatchSchduls(
            @Param("searchCondition") String searchCondition,
            @Param("searchKeyword") String searchKeyword,
            Pageable pageable);
}
