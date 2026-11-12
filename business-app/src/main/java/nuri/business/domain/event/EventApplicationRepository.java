package nuri.business.domain.event;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

/** 행사 참가 신청(V2_152). 정원 판정은 서비스가 행사 행을 잠근 뒤 {@link #countSeats} 로 센다. */
public interface EventApplicationRepository extends JpaRepository<EventApplication, Long> {

    Optional<EventApplication> findByEvntSnAndAplcntId(Long evntSn, String aplcntId);

    Optional<EventApplication> findByEvntAplySnAndEvntSn(Long evntAplySn, Long evntSn);

    /** 자리를 차지한 신청 수 — 신청(APPLIED)·승인(APPROVED). */
    @Query("select count(a) from EventApplication a where a.evntSn = :evntSn and a.aplySttsCd in ('APPLIED', 'APPROVED')")
    long countSeats(@Param("evntSn") Long evntSn);

    /** 목록의 행사마다 자리를 차지한 신청 수. */
    @Query("select a.evntSn, count(a) from EventApplication a where a.evntSn in :evntSns"
            + " and a.aplySttsCd in ('APPLIED', 'APPROVED') group by a.evntSn")
    List<Object[]> countSeatsByEvent(@Param("evntSns") Collection<Long> evntSns);

    List<EventApplication> findByAplcntIdAndEvntSnIn(String aplcntId, Collection<Long> evntSns);

    Page<EventApplication> findByEvntSn(Long evntSn, Pageable pageable);

    Page<EventApplication> findByEvntSnAndAplySttsCd(Long evntSn, String aplySttsCd, Pageable pageable);
}
