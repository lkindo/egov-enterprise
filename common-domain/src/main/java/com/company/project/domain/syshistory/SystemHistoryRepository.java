package com.company.project.domain.syshistory;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * ??뽯뮞??????Repository
 */
public interface SystemHistoryRepository extends JpaRepository<SystemHistory, String> {

    /**
     * ??뽯뮞??뺤구??곗쨮 野꺜??
     */
    Page<SystemHistory> findBySysNmContaining(String sysNm, Pageable pageable);

    /**
     * ???경뤃??뉓굜遺얜굡嚥?野꺜??
     */
    Page<SystemHistory> findByHistSeCode(String histSeCode, Pageable pageable);

    /**
     * ?醫롮? 甕곕뗄??野꺜??
     */
    @Query("SELECT s FROM SystemHistory s WHERE s.frstRegisterPnttm BETWEEN :startDate AND :endDate")
    Page<SystemHistory> findByDateRange(@Param("startDate") java.time.LocalDateTime startDate,
            @Param("endDate") java.time.LocalDateTime endDate,
            Pageable pageable);

    /**
     * ??쇱뜖??野꺜??(??뽯뮞??뺤구 ?癒?뮉 ?????곸뒠)
     */
    @Query("SELECT s FROM SystemHistory s WHERE s.sysNm LIKE %:keyword% OR s.histCn LIKE %:keyword%")
    Page<SystemHistory> searchByKeyword(@Param("keyword") String keyword, Pageable pageable);
}