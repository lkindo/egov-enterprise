package com.company.project.domain.meeting;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * ???벥??쇱굙??Repository
 */
public interface MeetingReservationRepository extends JpaRepository<MeetingReservation, String> {

    Page<MeetingReservation> findByMtgSjContaining(String mtgSj, Pageable pageable);

    Page<MeetingReservation> findByMtgPlaceId(String mtgPlaceId, Pageable pageable);

    @Query("SELECT COUNT(m) FROM MeetingReservation m " +
           "WHERE m.mtgPlaceId = :mtgPlaceId AND m.resveDe = :resveDe " +
           "AND (:excludeResveId IS NULL OR m.resveId <> :excludeResveId) " +
           "AND (m.resveBeginTm < :endTime AND m.resveEndTm > :startTime)")
    int countConflictingReservations(@Param("mtgPlaceId") String mtgPlaceId,
                                    @Param("resveDe") String resveDe,
                                    @Param("startTime") String startTime,
                                    @Param("endTime") String endTime,
                                    @Param("excludeResveId") String excludeResveId);
}
