package nuri.business.domain.schedule;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface ScheduleRepository extends JpaRepository<Schedule, String> {

    @Query("SELECT s FROM Schedule s WHERE s.schdlSeCd = :schdlSeCd AND " +
            "((:schdlSeCd = '1' AND s.createdBy = :ownerId) OR (:schdlSeCd = '2' AND s.schdlDeptId = :ownerId))")
    Page<Schedule> findSchedules(@Param("schdlSeCd") String schdlSeCd, @Param("ownerId") String ownerId,
            Pageable pageable);

    @Query("SELECT s FROM Schedule s WHERE s.schdlSeCd = :schdlSeCd AND " +
            "((:schdlSeCd = '1' AND s.createdBy = :ownerId) OR (:schdlSeCd = '2' AND s.schdlDeptId = :ownerId)) AND "
            +
            "(s.schdlBgngYmd <= :endDate AND s.schdlEndYmd >= :startDate)")
    List<Schedule> findSchedulesByRange(@Param("schdlSeCd") String schdlSeCd, @Param("ownerId") String ownerId,
            @Param("startDate") String startDate, @Param("endDate") String endDate);

    // Legacy or global search
    @Query("SELECT s FROM Schedule s WHERE s.createdBy = :userId")
    Page<Schedule> findByFrstRegisterId(@Param("userId") String userId, Pageable pageable);

    @Query("SELECT s FROM Schedule s WHERE s.schdlBgngYmd BETWEEN :startDate AND :endDate")
    List<Schedule> findByDateRange(@Param("startDate") String startDate, @Param("endDate") String endDate);

    @Query("SELECT s FROM Schedule s WHERE s.schdlBgngYmd <= :endDate AND s.schdlEndYmd >= :startDate")
    List<Schedule> findOverlappingSchedules(@Param("startDate") String startDate, @Param("endDate") String endDate);
}
