package com.company.project.service.event;

import com.company.project.service.event.dto.EventInfoDto;
import com.company.project.service.event.dto.ExternalHrDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EgovEventCmpgnService {
    Page<EventInfoDto> getEventList(String keyword, Pageable pageable);

    EventInfoDto getEvent(String eventId);

    void insertEvent(EventInfoDto dto);

    void updateEvent(EventInfoDto dto);

    void deleteEvent(String eventId);

    // ?�? ?몃젰 ?�??
    Page<ExternalHrDto> getExternalHrList(String eventId, String keyword, Pageable pageable);

    ExternalHrDto getExternalHr(String extrlHrId);

    void insertExternalHr(ExternalHrDto dto);

    void updateExternalHr(ExternalHrDto dto);

    void deleteExternalHr(String extrlHrId);
}
