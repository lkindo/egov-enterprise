package com.company.project.service.event;

import com.company.project.service.event.dto.EventAttendanceDto;
import com.company.project.service.event.dto.EventDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * 행사관리 서비스 인터페이스
 */
public interface EgovEventService {
    // 행사 관리
    Page<EventDto> getEventList(String keyword, Pageable pageable);

    EventDto getEvent(String eventId);

    String createEvent(String userId, EventDto dto);

    void updateEvent(String eventId, String userId, EventDto dto);

    void deleteEvent(String eventId);

    // 행사 참석
    Page<EventAttendanceDto> getAttendanceList(String eventId, Pageable pageable);

    void applyAttendance(String userId, EventAttendanceDto dto);

    void approveAttendance(String eventId, String applcntId, String userId, String confmAt, String returnResn);
}
