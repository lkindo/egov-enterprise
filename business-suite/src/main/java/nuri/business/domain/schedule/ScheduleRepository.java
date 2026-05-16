package nuri.business.domain.schedule;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ScheduleRepository extends JpaRepository<Schedule, String> {
    @Query("SELECT s FROM Schedule s WHERE (:schdlSeCd IS NULL OR s.schdlSeCd = :schdlSeCd) AND (:userId IS NULL OR s.schdlPicId = :userId)")
    Page<Schedule> searchSchedules(@Param("schdlSeCd") String schdlSeCd, @Param("userId") String userId, Pageable pageable);

    @Query("SELECT s FROM Schedule s WHERE s.schdlPicId = :userId AND (s.schdlBgngYmd LIKE :yearMonth% OR s.schdlEndYmd LIKE :yearMonth%)")
    List<Schedule> findMonthlySchedules(@Param("userId") String userId, @Param("yearMonth") String yearMonth);

    @Query("SELECT s FROM Schedule s WHERE s.schdlPicId = :userId AND ((s.schdlBgngYmd BETWEEN :startDate AND :endDate) OR (s.schdlEndYmd BETWEEN :startDate AND :endDate))")
    List<Schedule> findSchedulesByDateRange(@Param("userId") String userId, @Param("startDate") String startDate, @Param("endDate") String endDate);

    @Query("SELECT s FROM Schedule s WHERE (:schdlSeCd IS NULL OR s.schdlSeCd = :schdlSeCd) AND s.schdlPicId = :ownerId AND ((s.schdlBgngYmd BETWEEN :startDate AND :endDate) OR (s.schdlEndYmd BETWEEN :startDate AND :endDate))")
    List<Schedule> findSchedulesByDateRange(@Param("schdlSeCd") String schdlSeCd, @Param("ownerId") String ownerId, @Param("startDate") String startDate, @Param("endDate") String endDate);
}
