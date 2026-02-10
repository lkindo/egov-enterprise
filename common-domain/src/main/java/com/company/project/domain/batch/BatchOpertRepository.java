package com.company.project.domain.batch;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface BatchOpertRepository extends JpaRepository<BatchOpert, String> {

    @Query("""
            SELECT b FROM BatchOpert b
            WHERE b.useAt = 'Y'
              AND (:searchCondition = '0' AND b.batchOpertNm LIKE '%' || :searchKeyword || '%'
                   OR :searchCondition = '1' AND b.batchProgrm LIKE '%' || :searchKeyword || '%'
                   OR :searchKeyword IS NULL OR :searchKeyword = '')
            ORDER BY b.batchOpertId ASC
            """)
    Page<BatchOpert> selectBatchOpertList(@Param("searchCondition") String searchCondition,
            @Param("searchKeyword") String searchKeyword,
            Pageable pageable);
}
