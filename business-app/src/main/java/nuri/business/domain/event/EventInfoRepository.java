package nuri.business.domain.event;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface EventInfoRepository extends JpaRepository<EventInfo, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from EventInfo e where e.evntSn = :evntSn")
    Optional<EventInfo> findByIdForUpdate(@Param("evntSn") Long evntSn);
    
    @Query("SELECT e FROM EventInfo e WHERE " +
           "(:searchWrd IS NULL OR e.evntCn LIKE %:searchWrd% OR e.evntNm LIKE %:searchWrd%)")
    Page<EventInfo> findBySearchWrd(@Param("searchWrd") String searchWrd, Pageable pageable);

    /**
     * [V2_152] 사용자 행사 목록 — 지금 신청을 받는 행사(담당자가 정한 신청 마감일이 오늘(yyyyMMdd)이거나 그 뒤)와, 마감이 지났어도
     * 내가 신청한 적이 있고 아직 끝나지 않은 행사다(마감 뒤에도 본인 취소·처리 결과 확인이 이어진다). 마감일이 없는 행사(기존 행사
     * 포함)는 신청을 받은 적이 없어 나오지 않는다. 날짜는 같은 형식의 문자열이라 사전순 비교가 날짜 비교와 같다. 정원 마감은 서비스가
     * 자리 수로 표시한다.
     */
    @Query("""
            select e from EventInfo e
            where e.aplyDdlnYmd is not null
              and (e.aplyDdlnYmd >= :today
                   or ((e.evntEndYmd is null or e.evntEndYmd >= :today)
                       and exists (select a.evntAplySn from EventApplication a
                                   where a.evntSn = e.evntSn and a.aplcntId = :applicant)))
            """)
    Page<EventInfo> findOpenForApplication(@Param("today") String today, @Param("applicant") String applicant,
                                           Pageable pageable);
}
