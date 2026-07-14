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

    // 기간 겹침(overlap) 조건: bgng <= 구간끝 AND end(없으면 bgng) >= 구간시작.
    // '시작 또는 종료가 구간 안'만 보던 기존 조건은 구간을 완전히 감싸는 장기 일정을 누락했다.
    @Query("SELECT s FROM Schedule s WHERE s.schdlPicId = :userId AND s.schdlBgngYmd <= CONCAT(:yearMonth, '31') AND COALESCE(s.schdlEndYmd, s.schdlBgngYmd) >= CONCAT(:yearMonth, '01')")
    List<Schedule> findMonthlySchedules(@Param("userId") String userId, @Param("yearMonth") String yearMonth);

    @Query("SELECT s FROM Schedule s WHERE s.schdlPicId = :userId AND s.schdlBgngYmd <= :endDate AND COALESCE(s.schdlEndYmd, s.schdlBgngYmd) >= :startDate")
    List<Schedule> findSchedulesByDateRange(@Param("userId") String userId, @Param("startDate") String startDate, @Param("endDate") String endDate);

    @Query("SELECT s FROM Schedule s WHERE (:schdlSeCd IS NULL OR s.schdlSeCd = :schdlSeCd) AND s.schdlPicId = :ownerId AND s.schdlBgngYmd <= :endDate AND COALESCE(s.schdlEndYmd, s.schdlBgngYmd) >= :startDate")
    List<Schedule> findSchedulesByDateRange(@Param("schdlSeCd") String schdlSeCd, @Param("ownerId") String ownerId, @Param("startDate") String startDate, @Param("endDate") String endDate);
}
