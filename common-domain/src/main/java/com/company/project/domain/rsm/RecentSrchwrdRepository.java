package com.company.project.domain.rsm;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
public interface RecentSrchwrdRepository extends JpaRepository<RecentSrchwrd, String> {

    @Query("""
            SELECT r FROM RecentSrchwrd r
            WHERE r.srchwrdManageId = :srchwrdManageId
              AND (:searchKeyword IS NULL OR r.recentSrchwrdNm LIKE %:searchKeyword%)
            ORDER BY r.createdDate DESC
            """)
    Page<RecentSrchwrd> searchResults(@Param("srchwrdManageId") String srchwrdManageId,
            @Param("searchKeyword") String searchKeyword,
            Pageable pageable);

    @Query("""
            SELECT r.recentSrchwrdNm as recentSrchwrdNm, COUNT(r.recentSrchwrdId) as recentSrchwrdCo
            FROM RecentSrchwrd r
            WHERE r.srchwrdManageId = :srchwrdManageId
              AND r.recentSrchwrdNm LIKE %:q%
            GROUP BY r.recentSrchwrdNm
            ORDER BY COUNT(r.recentSrchwrdId) DESC
            """)
    List<Map<String, Object>> selectRecentSrchwrdResultInquire(@Param("srchwrdManageId") String srchwrdManageId,
            @Param("q") String q);

    void deleteBySrchwrdManageId(String srchwrdManageId);
}
