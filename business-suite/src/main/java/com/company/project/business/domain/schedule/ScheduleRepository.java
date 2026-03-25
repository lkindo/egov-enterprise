package com.company.project.business.domain.schedule;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface ScheduleRepository extends JpaRepository<Schedule, String> {

    @Query("SELECT s FROM Schedule s WHERE s.schdulSe = :schdulSe AND " +
            "((:schdulSe = '1' AND s.createdBy = :ownerId) OR (:schdulSe = '2' AND s.schdulDeptId = :ownerId))")
    Page<Schedule> findSchedules(@Param("schdulSe") String schdulSe, @Param("ownerId") String ownerId,
            Pageable pageable);

    @Query("SELECT s FROM Schedule s WHERE s.schdulSe = :schdulSe AND " +
            "((:schdulSe = '1' AND s.createdBy = :ownerId) OR (:schdulSe = '2' AND s.schdulDeptId = :ownerId)) AND "
            +
            "(s.schdulBgnde <= :endDate AND s.schdulEndde >= :startDate)")
    List<Schedule> findSchedulesByRange(@Param("schdulSe") String schdulSe, @Param("ownerId") String ownerId,
            @Param("startDate") String startDate, @Param("endDate") String endDate);

    // Legacy or global search
    @Query("SELECT s FROM Schedule s WHERE s.createdBy = :userId")
    Page<Schedule> findByFrstRegisterId(@Param("userId") String userId, Pageable pageable);

    @Query("SELECT s FROM Schedule s WHERE s.schdulBgnde BETWEEN :startDate AND :endDate")
    List<Schedule> findByDateRange(@Param("startDate") String startDate, @Param("endDate") String endDate);

    @Query("SELECT s FROM Schedule s WHERE s.schdulBgnde <= :endDate AND s.schdulEndde >= :startDate")
    List<Schedule> findOverlappingSchedules(@Param("startDate") String startDate, @Param("endDate") String endDate);
}
