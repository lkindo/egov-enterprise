package com.company.project.service.system;

import com.company.project.domain.system.EventCmpgn;
import com.company.project.domain.system.EventCmpgnRepository;
import com.company.project.service.system.dto.EventCmpgnDto;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service("systemEventCmpgnService")
public class EventCmpgnService extends EgovAbstractServiceImpl {

    private final EventCmpgnRepository eventCmpgnRepository;

    public EventCmpgnService(
            @org.springframework.beans.factory.annotation.Qualifier("systemEventCmpgnRepository") EventCmpgnRepository eventCmpgnRepository) {
        this.eventCmpgnRepository = eventCmpgnRepository;
    }

    @Transactional(readOnly = true)
    public Page<EventCmpgnDto> getEventCmpgnList(String eventCn, Pageable pageable) {
        Page<EventCmpgn> page = eventCmpgnRepository.findByEventCnContaining(eventCn == null ? "" : eventCn, pageable);
        return page.map(EventCmpgnDto::from);
    }

    @Transactional(readOnly = true)
    public EventCmpgnDto getEventCmpgn(String eventId) {
        EventCmpgn entity = eventCmpgnRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Event/Campaign not found"));
        return EventCmpgnDto.from(entity);
    }

    @Transactional
    public void createEventCmpgn(EventCmpgnDto dto) {
        EventCmpgn entity = EventCmpgn.builder()
                .eventId(dto.getEventId())
                .bsnsYear(dto.getBsnsYear())
                .bsnsCode(dto.getBsnsCode())
                .eventSvcBeginDe(dto.getEventSvcBeginDe())
                .svcUseNmprCo(dto.getSvcUseNmprCo())
                .chargerNm(dto.getChargerNm())
                .eventCn(dto.getEventCn())
                .eventSvcEndDe(dto.getEventSvcEndDe())
                .eventTyCode(dto.getEventTyCode())
                .prparetgCn(dto.getPrparetgCn())
                .eventConfmAt("N")
                .build();
        eventCmpgnRepository.save(entity);
    }

    @Transactional
    public void updateEventCmpgn(EventCmpgnDto dto) {
        EventCmpgn entity = eventCmpgnRepository.findById(dto.getEventId())
                .orElseThrow(() -> new RuntimeException("Event/Campaign not found"));

        entity.setBsnsYear(dto.getBsnsYear());
        entity.setBsnsCode(dto.getBsnsCode());
        entity.setEventSvcBeginDe(dto.getEventSvcBeginDe());
        entity.setSvcUseNmprCo(dto.getSvcUseNmprCo());
        entity.setChargerNm(dto.getChargerNm());
        entity.setEventCn(dto.getEventCn());
        entity.setEventSvcEndDe(dto.getEventSvcEndDe());
        entity.setEventTyCode(dto.getEventTyCode());
        entity.setPrparetgCn(dto.getPrparetgCn());
    }

    @Transactional
    public void deleteEventCmpgn(String eventId) {
        eventCmpgnRepository.deleteById(eventId);
    }
}
