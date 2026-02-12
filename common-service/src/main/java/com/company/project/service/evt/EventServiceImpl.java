package com.company.project.service.evt;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.event.*;
import com.company.project.service.evt.dto.EventAttendanceDto;
import com.company.project.service.evt.dto.EventDto;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EventServiceImpl implements EventService {

    private final EventRepository eventRepository;
    private final EventAttendanceRepository eventAttendanceRepository;
    private final EgovIdGnrService egovEventManageIdGnrService;

    @Override
    public Page<EventDto> getEventList(String keyword, Pageable pageable) {
        if (keyword == null || keyword.isEmpty()) {
            return eventRepository.findAll(pageable).map(EventDto::from);
        }
        return eventRepository.findByEventNmContaining(keyword, pageable).map(EventDto::from);
    }

    @Override
    public EventDto getEvent(String eventId) {
        return eventRepository.findById(eventId)
                .map(EventDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public String createEvent(String userId, EventDto dto) {
        try {
            String id = egovEventManageIdGnrService.getNextStringId();
            Event entity = Event.builder()
                    .eventId(id)
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
                    .frstRegisterId(userId)
                    .build();
            eventRepository.save(entity);
            return id;
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate event ID", e);
        }
    }

    @Override
    @Transactional
    public void updateEvent(String eventId, String userId, EventDto dto) {
        Event entity = eventRepository.findById(eventId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getEventSe(), dto.getEventNm(), dto.getEventPurps(), dto.getEventBeginDe(),
                dto.getEventEndDe(), dto.getEventAuspcInsttNm(), dto.getEventMngtInsttNm(),
                dto.getEventPlace(), dto.getEventCn(), dto.getCtOccrrncAt(), dto.getPartcptCt(),
                dto.getPsncpa(), dto.getRefrnUrl(), dto.getRceptBeginDe(), dto.getRceptEndDe(),
                userId);
    }

    @Override
    @Transactional
    public void deleteEvent(String eventId) {
        if (!eventRepository.existsById(eventId)) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND);
        }
        eventRepository.deleteById(eventId);
    }

    @Override
    public Page<EventAttendanceDto> getAttendanceList(String eventId, Pageable pageable) {
        return eventAttendanceRepository.findByEventId(eventId, pageable).map(EventAttendanceDto::from);
    }

    @Override
    @Transactional
    public void applyAttendance(String userId, EventAttendanceDto dto) {
        EventAttendance entity = EventAttendance.builder()
                .applcntId(userId)
                .eventId(dto.getEventId())
                .reqstDe(dto.getReqstDe())
                .confmAt("R")
                .infrmlSanctnId(dto.getInfrmlSanctnId())
                .frstRegisterId(userId)
                .build();
        eventAttendanceRepository.save(entity);
    }

    @Override
    @Transactional
    public void approveAttendance(String eventId, String applcntId, String userId, String confmAt, String returnResn) {
        EventAttendance entity = eventAttendanceRepository
                .findById(new EventAttendance.EventAttendanceId(applcntId, eventId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.approve(userId, confmAt, returnResn, userId);
    }
}
