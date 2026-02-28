package com.company.project.service.event;

import com.company.project.service.event.dto.EventAttendanceDto;
import com.company.project.service.event.dto.EventDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EventService {
    Page<EventDto> getEventList(String keyword, Pageable pageable);

    EventDto getEvent(String eventId);

    String createEvent(String userId, EventDto dto);

    void updateEvent(String eventId, String userId, EventDto dto);

    void deleteEvent(String eventId);

    Page<EventAttendanceDto> getAttendanceList(String eventId, Pageable pageable);

    void applyAttendance(String userId, EventAttendanceDto dto);

    void approveAttendance(String eventId, String applcntId, String userId, String confmAt, String returnResn);
}
