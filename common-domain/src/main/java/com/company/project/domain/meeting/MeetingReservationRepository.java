package com.company.project.domain.meeting;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 회의실예약 Repository
 */
public interface MeetingReservationRepository extends JpaRepository<MeetingReservation, String> {
    Page<MeetingReservation> findByMtgSjContaining(String mtgSj, Pageable pageable);

    Page<MeetingReservation> findByMtgPlaceId(String mtgPlaceId, Pageable pageable);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(m) FROM MeetingReservation m WHERE m.mtgPlaceId = :mtgPlaceId AND m.resveDe = :resveDe AND m.resveId <> :excludeResveId AND (m.resveBeginTm < :endTime AND m.resveEndTm > :startTime)")
    int countConflictingReservations(@org.springframework.data.repository.query.Param("mtgPlaceId") String mtgPlaceId,
            @org.springframework.data.repository.query.Param("resveDe") String resveDe,
            @org.springframework.data.repository.query.Param("startTime") String startTime,
            @org.springframework.data.repository.query.Param("endTime") String endTime,
            @org.springframework.data.repository.query.Param("excludeResveId") String excludeResveId);
}
