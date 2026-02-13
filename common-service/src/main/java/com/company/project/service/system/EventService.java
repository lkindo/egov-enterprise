package com.company.project.service.system;

import com.company.project.domain.system.*;
import com.company.project.service.system.dto.EventAttendeeDto;
import com.company.project.service.system.dto.EventDto;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class EventService extends EgovAbstractServiceImpl {

    private final EventRepository eventRepository;
    private final EventAttendeeRepository eventAttendeeRepository;

    @Transactional(readOnly = true)
    public Page<EventDto> getEventList(String eventNm, Pageable pageable) {
        Page<Event> page = eventRepository.findByEventNmContaining(eventNm == null ? "" : eventNm, pageable);
        return page.map(EventDto::from);
    }

    @Transactional(readOnly = true)
    public EventDto getEvent(String eventId) {
        Event entity = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Event not found"));
        return EventDto.from(entity);
    }

    @Transactional
    public void createEvent(EventDto dto) {
        Event entity = Event.builder()
                .eventId(dto.getEventId())
                .eventSe(dto.getEventSe())
                .eventNm(dto.getEventNm())
                .eventPurps(dto.getEventPurps())
                .eventBeginDe(dto.getEventBeginDe())
                .eventEndDe(dto.getEventEndDe())
                .eventAuspcInsttNm(dto.getEventAuspcInsttNm())
                .eventMngtInsttNm(dto.getEventMngtInsttNm())
                .eventPlace(dto.getEventPlace())
                .eventCn(dto.getEventCn())
                .ctOccrrncAt(dto.getCtOccrrncAt())
                .partcptCt(dto.getPartcptCt())
                .psncpa(dto.getPsncpa())
                .refrnUrl(dto.getRefrnUrl())
                .rceptBeginDe(dto.getRceptBeginDe())
                .rceptEndDe(dto.getRceptEndDe())
                .build();
        eventRepository.save(entity);
    }

    @Transactional
    public void updateEvent(EventDto dto) {
        Event entity = eventRepository.findById(dto.getEventId())
                .orElseThrow(() -> new RuntimeException("Event not found"));

        entity.setEventSe(dto.getEventSe());
        entity.setEventNm(dto.getEventNm());
        entity.setEventPurps(dto.getEventPurps());
        entity.setEventBeginDe(dto.getEventBeginDe());
        entity.setEventEndDe(dto.getEventEndDe());
        entity.setEventAuspcInsttNm(dto.getEventAuspcInsttNm());
        entity.setEventMngtInsttNm(dto.getEventMngtInsttNm());
        entity.setEventPlace(dto.getEventPlace());
        entity.setEventCn(dto.getEventCn());
        entity.setCtOccrrncAt(dto.getCtOccrrncAt());
        entity.setPartcptCt(dto.getPartcptCt());
        entity.setPsncpa(dto.getPsncpa());
        entity.setRefrnUrl(dto.getRefrnUrl());
        entity.setRceptBeginDe(dto.getRceptBeginDe());
        entity.setRceptEndDe(dto.getRceptEndDe());
    }

    @Transactional
    public void deleteEvent(String eventId) {
        eventRepository.deleteById(eventId);
    }

    // Attendance Methods
    @Transactional(readOnly = true)
    public Page<EventAttendeeDto> getEventAttendeeList(String eventId, Pageable pageable) {
        return eventAttendeeRepository.findByEventId(eventId, pageable).map(EventAttendeeDto::from);
    }

    @Transactional
    public void applyForEvent(EventAttendeeDto dto) {
        EventAttendee entity = EventAttendee.builder()
                .applcntId(dto.getApplcntId())
                .eventId(dto.getEventId())
                .reqstDe(dto.getReqstDe())
                .confmAt("N") // Default to pending
                .build();
        eventAttendeeRepository.save(entity);
    }

    @Transactional
    public void approveAttendance(String applcntId, String eventId, String sanctnerId) {
        EventAttendee entity = eventAttendeeRepository.findById(new EventAttendeeId(applcntId, eventId))
                .orElseThrow(() -> new RuntimeException("Attendance record not found"));
        entity.setConfmAt("Y");
        entity.setSanctnerId(sanctnerId);
        entity.setSanctnDt(LocalDateTime.now().toString());
    }
}
