package com.company.project.domain.event;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 행사참석자 Repository
 */
public interface EventAttendanceRepository extends JpaRepository<EventAttendance, EventAttendance.EventAttendanceId> {
    Page<EventAttendance> findByEventId(String eventId, Pageable pageable);

    Page<EventAttendance> findByApplcntId(String applcntId, Pageable pageable);

    java.util.Optional<EventAttendance> findByEventIdAndApplcntId(String eventId, String applcntId);
}
