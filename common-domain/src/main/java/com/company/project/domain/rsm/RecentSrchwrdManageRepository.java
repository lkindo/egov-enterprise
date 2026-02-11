package com.company.project.domain.rsm;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface RecentSrchwrdManageRepository extends JpaRepository<RecentSrchwrdManage, String> {

    @Query("""
            SELECT m FROM RecentSrchwrdManage m
            WHERE (:searchCondition = 'SRCHWRD_MANAGE_NM' AND m.srchwrdManageNm LIKE %:searchKeyword%)
               OR (:searchCondition = 'SRCHWRD_CONECT_URL' AND m.srchwrdManageUrl LIKE %:searchKeyword%)
               OR (:searchKeyword IS NULL OR :searchKeyword = '')
            ORDER BY m.createdDate DESC
            """)
    Page<RecentSrchwrdManage> searchManages(@Param("searchCondition") String searchCondition,
            @Param("searchKeyword") String searchKeyword,
            Pageable pageable);
}
