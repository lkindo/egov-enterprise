package com.company.project.domain.holiday;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

/**
 * ??곸뵬 Repository
 */
public interface HolidayRepository extends JpaRepository<Holiday, Integer> {

    Page<Holiday> findByRestdeNmContaining(String restdeNm, Pageable pageable);

    @Query("SELECT h FROM Holiday h WHERE h.restdeDe LIKE :yearMonth%")
    List<Holiday> findByYearMonth(@Param("yearMonth") String yearMonth);

    @Query("SELECT h FROM Holiday h WHERE h.restdeDe BETWEEN :startDate AND :endDate")
    List<Holiday> findByDateRange(@Param("startDate") String startDate, @Param("endDate") String endDate);

    List<Holiday> findByRestdeSe(String restdeSe);
}
