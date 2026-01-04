package com.company.project.domain.syshistory;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * 시스템 이력 Repository
 */
public interface SystemHistoryRepository extends JpaRepository<SystemHistory, String> {

    /**
     * 시스템명으로 검색
     */
    Page<SystemHistory> findBySysNmContaining(String sysNm, Pageable pageable);

    /**
     * 이력구분코드로 검색
     */
    Page<SystemHistory> findByHistSeCode(String histSeCode, Pageable pageable);

    /**
     * 날짜 범위 검색
     */
    @Query("SELECT s FROM SystemHistory s WHERE s.frstRegisterPnttm BETWEEN :startDate AND :endDate")
    Page<SystemHistory> findByDateRange(@Param("startDate") java.time.LocalDateTime startDate,
            @Param("endDate") java.time.LocalDateTime endDate,
            Pageable pageable);

    /**
     * 키워드 검색 (시스템명 또는 이력내용)
     */
    @Query("SELECT s FROM SystemHistory s WHERE s.sysNm LIKE %:keyword% OR s.histCn LIKE %:keyword%")
    Page<SystemHistory> searchByKeyword(@Param("keyword") String keyword, Pageable pageable);
}
