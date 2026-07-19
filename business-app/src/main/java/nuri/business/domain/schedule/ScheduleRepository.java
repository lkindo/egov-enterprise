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
    // [개인 축] 내가 담당자인 일정. 검색어(schdlNm 부분일치)는 비어 있으면 무시한다.
    @Query("SELECT s FROM Schedule s WHERE (:schdlSeCd IS NULL OR s.schdlSeCd = :schdlSeCd) AND (:userId IS NULL OR s.schdlPicId = :userId) "
            + "AND (:searchWrd IS NULL OR :searchWrd = '' OR LOWER(s.schdlNm) LIKE LOWER(CONCAT('%', :searchWrd, '%')))")
    Page<Schedule> searchSchedules(@Param("schdlSeCd") String schdlSeCd, @Param("userId") String userId,
                                   @Param("searchWrd") String searchWrd, Pageable pageable);

    // [부서 축] 같은 부서(schdlDeptId)의 일정을 함께 본다.
    //   종전에는 '부서 일정' 목록도 s.schdlPicId = 내 loginId 로 걸러 사실상 '내가 만든 일정'만 보였다.
    //   화면명(부서 일정 관리)·스키마(schdlSeCd '1'=부서, schdlDeptId)와 동작이 어긋나 있던 것을 바로잡는다.
    @Query("SELECT s FROM Schedule s WHERE (:schdlSeCd IS NULL OR s.schdlSeCd = :schdlSeCd) AND s.schdlDeptId = :deptId "
            + "AND (:searchWrd IS NULL OR :searchWrd = '' OR LOWER(s.schdlNm) LIKE LOWER(CONCAT('%', :searchWrd, '%')))")
    Page<Schedule> searchDeptSchedules(@Param("schdlSeCd") String schdlSeCd, @Param("deptId") String deptId,
                                       @Param("searchWrd") String searchWrd, Pageable pageable);

    // 기간 겹침(overlap) 조건: bgng <= 구간끝 AND end(없으면 bgng) >= 구간시작.
    // '시작 또는 종료가 구간 안'만 보던 기존 조건은 구간을 완전히 감싸는 장기 일정을 누락했다.
    // [범위] 캘린더는 '내 일정 + 우리 부서 일정'을 함께 보여준다. 내가 담당자인 건과, 부서 구분('1')이며
    //   내 부서인 건을 합집합으로 조회한다.
    @Query("SELECT s FROM Schedule s WHERE (s.schdlPicId = :userId OR (s.schdlSeCd = '1' AND s.schdlDeptId = :deptId)) "
            + "AND s.schdlBgngYmd <= CONCAT(:yearMonth, '31') AND COALESCE(s.schdlEndYmd, s.schdlBgngYmd) >= CONCAT(:yearMonth, '01')")
    List<Schedule> findMonthlySchedules(@Param("userId") String userId, @Param("deptId") String deptId,
                                        @Param("yearMonth") String yearMonth);

    @Query("SELECT s FROM Schedule s WHERE s.schdlPicId = :userId AND s.schdlBgngYmd <= :endDate AND COALESCE(s.schdlEndYmd, s.schdlBgngYmd) >= :startDate")
    List<Schedule> findSchedulesByDateRange(@Param("userId") String userId, @Param("startDate") String startDate, @Param("endDate") String endDate);

    @Query("SELECT s FROM Schedule s WHERE (:schdlSeCd IS NULL OR s.schdlSeCd = :schdlSeCd) AND s.schdlPicId = :ownerId AND s.schdlBgngYmd <= :endDate AND COALESCE(s.schdlEndYmd, s.schdlBgngYmd) >= :startDate")
    List<Schedule> findSchedulesByDateRange(@Param("schdlSeCd") String schdlSeCd, @Param("ownerId") String ownerId, @Param("startDate") String startDate, @Param("endDate") String endDate);
}
