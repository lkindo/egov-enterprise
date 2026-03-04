package com.company.project.service.system.dto;

import com.company.project.domain.system.EventCmpgn;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EventCmpgnDto {
    private String eventId;
    private String bsnsYear;
    private String bsnsCode;
    private String eventSvcBeginDe;
    private Integer svcUseNmprCo;
    private String chargerNm;
    private String eventCn;
    private String eventSvcEndDe;
    private String eventTyCode;
    private String prparetgCn;
    private String eventConfmAt;
    private String eventConfmDe;
    private String createdBy;
    private LocalDateTime createdDate;

    public static EventCmpgnDto from(EventCmpgn entity) {
        return EventCmpgnDto.builder()
                .eventId(entity.getEventId())
                .bsnsYear(entity.getBsnsYear())
                .bsnsCode(entity.getBsnsCode())
                .eventSvcBeginDe(entity.getEventSvcBeginDe())
                .svcUseNmprCo(entity.getSvcUseNmprCo())
                .chargerNm(entity.getChargerNm())
                .eventCn(entity.getEventCn())
                .eventSvcEndDe(entity.getEventSvcEndDe())
                .eventTyCode(entity.getEventTyCode())
                .prparetgCn(entity.getPrparetgCn())
                .eventConfmAt(entity.getEventConfmAt())
                .eventConfmDe(entity.getEventConfmDe())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}