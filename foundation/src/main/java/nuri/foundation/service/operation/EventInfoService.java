package nuri.foundation.service.operation;
 
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.foundation.domain.operation.EventInfo;
import nuri.foundation.repository.operation.EventInfoRepository;
import nuri.foundation.service.operation.dto.EventInfoDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.Objects;
 
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EventInfoService {
 
    private final EventInfoRepository eventInfoRepository;
 
    public Page<EventInfoDto> getEventList(String searchWrd, Pageable pageable) {
        log.debug("Fetching event list with search: {}", searchWrd);
        if (searchWrd == null || searchWrd.trim().isEmpty()) {
            return eventInfoRepository.findAll(Objects.requireNonNull(pageable)).map(EventInfoDto::from);
        }
        return eventInfoRepository.findBySearchWrd(searchWrd, pageable).map(EventInfoDto::from);
    }
 
    public EventInfoDto getEvent(String eventId) {
        log.debug("Fetching event details for ID: {}", eventId);
        EventInfo eventInfo = eventInfoRepository.findById(Objects.requireNonNull(eventId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        return EventInfoDto.from(eventInfo);
    }
 
    @Transactional
    public String createEvent(String userId, EventInfoDto dto) {
        log.info("Creating new event by user: {}", userId);
        String eventId = "EVT_" + System.currentTimeMillis();
 
        EventInfo eventInfo = EventInfo.builder()
                .eventId(eventId)
                .bsnsYear(dto.getBsnsYear())
                .bsnsCode(dto.getBsnsCode())
                .eventCn(dto.getEventCn())
                .eventSvcBgnde(dto.getEventSvcBgnde() != null && !dto.getEventSvcBgnde().isEmpty() ? LocalDate.parse(dto.getEventSvcBgnde()) : null)
                .eventSvcEndde(dto.getEventSvcEndde() != null && !dto.getEventSvcEndde().isEmpty() ? LocalDate.parse(dto.getEventSvcEndde()) : null)
                .svcUseNmprCo(dto.getSvcUseNmprCo())
                .chargerNm(dto.getChargerNm())
                .prparetgCn(dto.getPrparetgCn())
                .eventTyCode(dto.getEventTyCode())
                .eventConfmAt(dto.getEventConfmAt())
                .eventConfmDe(dto.getEventConfmDe() != null && !dto.getEventConfmDe().isEmpty() ? LocalDate.parse(dto.getEventConfmDe()) : null)
                .createdBy(userId)
                .lastModifiedBy(userId)
                .build();
 
        EventInfo saved = eventInfoRepository.save(Objects.requireNonNull(eventInfo));
        log.info("Event created successfully: {}", saved.getEventId());
        return eventId;
    }
 
    @Transactional
    public void updateEvent(String eventId, String userId, EventInfoDto dto) {
        log.info("Updating event ID: {} by user: {}", eventId, userId);
        EventInfo eventInfo = eventInfoRepository.findById(Objects.requireNonNull(eventId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
 
        eventInfoRepository.save(EventInfo.builder()
                .eventId(eventId)
                .bsnsYear(dto.getBsnsYear())
                .bsnsCode(dto.getBsnsCode())
                .eventCn(dto.getEventCn())
                .eventSvcBgnde(dto.getEventSvcBgnde() != null && !dto.getEventSvcBgnde().isEmpty() ? LocalDate.parse(dto.getEventSvcBgnde()) : null)
                .eventSvcEndde(dto.getEventSvcEndde() != null && !dto.getEventSvcEndde().isEmpty() ? LocalDate.parse(dto.getEventSvcEndde()) : null)
                .svcUseNmprCo(dto.getSvcUseNmprCo())
                .chargerNm(dto.getChargerNm())
                .prparetgCn(dto.getPrparetgCn())
                .eventTyCode(dto.getEventTyCode())
                .eventConfmAt(dto.getEventConfmAt())
                .eventConfmDe(dto.getEventConfmDe() != null && !dto.getEventConfmDe().isEmpty() ? LocalDate.parse(dto.getEventConfmDe()) : null)
                .createdBy(eventInfo.getCreatedBy())
                .lastModifiedBy(userId)
                .build());
        log.info("Event updated successfully: {}", eventId);
    }
 
    @Transactional
    public void deleteEvent(String eventId) {
        log.warn("Deleting event ID: {}", eventId);
        EventInfo eventInfo = eventInfoRepository.findById(Objects.requireNonNull(eventId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        eventInfoRepository.delete(Objects.requireNonNull(eventInfo));
        log.info("Event deleted successfully: {}", eventId);
    }
}
