package com.company.project.service.event;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.event.EventInfo;
import com.company.project.domain.event.EventInfoRepository;
import com.company.project.domain.event.ExternalHr;
import com.company.project.domain.event.ExternalHrRepository;
import com.company.project.service.event.dto.EventInfoDto;
import com.company.project.service.event.dto.ExternalHrDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EventCmpgnService implements EgovEventCmpgnService {

    private final EventInfoRepository eventInfoRepository;
    private final ExternalHrRepository externalHrRepository;

    @Override
    public Page<EventInfoDto> getEventList(String keyword, Pageable pageable) {
        if (keyword == null || keyword.isEmpty()) {
            return eventInfoRepository.findAll(pageable).map(EventInfoDto::from);
        }
        return eventInfoRepository.findByEventCnContaining(keyword, pageable).map(EventInfoDto::from);
    }

    @Override
    public EventInfoDto getEvent(String eventId) {
        return eventInfoRepository.findById(eventId)
                .map(EventInfoDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public void insertEvent(EventInfoDto dto) {
        String id = "EVENT_" + String.format("%013d", System.currentTimeMillis());
        EventInfo entity = EventInfo.builder()
                .eventId(id)
                .eventSvcBeginDe(dto.getEventSvcBeginDe())
                .eventSvcEndDe(dto.getEventSvcEndDe())
                .svcUseNmprCo(dto.getSvcUseNmprCo())
                .chargerNm(dto.getChargerNm())
                .eventCn(dto.getEventCn())
                .eventTyCode(dto.getEventTyCode())
                .prparetgCn(dto.getPrparetgCn())
                .eventConfmAt(dto.getEventConfmAt())
                .eventConfmDe(dto.getEventConfmDe())
                .build();
        eventInfoRepository.save(entity);
    }

    @Override
    @Transactional
    public void updateEvent(EventInfoDto dto) {
        EventInfo entity = eventInfoRepository.findById(dto.getEventId())
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getEventSvcBeginDe(), dto.getEventSvcEndDe(), dto.getSvcUseNmprCo(),
                dto.getChargerNm(), dto.getEventCn(), dto.getEventTyCode(), dto.getPrparetgCn(),
                dto.getEventConfmAt(), dto.getEventConfmDe());
    }

    @Override
    @Transactional
    public void deleteEvent(String eventId) {
        externalHrRepository.deleteByEventId(eventId);
        eventInfoRepository.deleteById(eventId);
    }

    @Override
    public Page<ExternalHrDto> getExternalHrList(String eventId, String keyword, Pageable pageable) {
        // Simplified search, could be enhanced
        return externalHrRepository.findByExtrlHrNmContaining(keyword, pageable).map(ExternalHrDto::from);
    }

    @Override
    public ExternalHrDto getExternalHr(String extrlHrId) {
        return externalHrRepository.findById(extrlHrId)
                .map(ExternalHrDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public void insertExternalHr(ExternalHrDto dto) {
        String id = "EXTHR_" + String.format("%013d", System.currentTimeMillis());
        ExternalHr entity = ExternalHr.builder()
                .extrlHrId(id)
                .eventId(dto.getEventId())
                .extrlHrNm(dto.getExtrlHrNm())
                .sexdstnCode(dto.getSexdstnCode())
                .areaNo(dto.getAreaNo())
                .middleTelno(dto.getMiddleTelno())
                .endTelno(dto.getEndTelno())
                .emailAdres(dto.getEmailAdres())
                .occpTyCode(dto.getOccpTyCode())
                .brth(dto.getBrth())
                .psitnInsttNm(dto.getPsitnInsttNm())
                .build();
        externalHrRepository.save(entity);
    }

    @Override
    @Transactional
    public void updateExternalHr(ExternalHrDto dto) {
        ExternalHr entity = externalHrRepository.findById(dto.getExtrlHrId())
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getExtrlHrNm(), dto.getSexdstnCode(), dto.getAreaNo(),
                dto.getMiddleTelno(), dto.getEndTelno(), dto.getEmailAdres(),
                dto.getOccpTyCode(), dto.getBrth(), dto.getPsitnInsttNm());
    }

    @Override
    @Transactional
    public void deleteExternalHr(String extrlHrId) {
        externalHrRepository.deleteById(extrlHrId);
    }
}
