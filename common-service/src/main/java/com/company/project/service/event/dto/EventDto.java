package com.company.project.service.event.dto;

import com.company.project.domain.event.Event;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * 행사관리 DTO
 */
@Getter
@Builder
public class EventDto {
    private String eventId;
    private String eventSe;
    private String eventNm;
    private String eventPurps;
    private String eventBeginDe;
    private String eventEndDe;
    private String eventAuspcInsttNm;
    private String eventMngtInsttNm;
    private String eventPlace;
    private String eventCn;
    private String ctOccrrncAt;
    private Integer partcptCt;
    private Integer psncpa;
    private String refrnUrl;
    private String rceptBeginDe;
    private String rceptEndDe;
    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;

    public static EventDto from(Event entity) {
        if (entity == null)
            return null;
        return EventDto.builder()
                .eventId(entity.getEventId())
                .eventSe(entity.getEventSe())
                .eventNm(entity.getEventNm())
                .eventPurps(entity.getEventPurps())
                .eventBeginDe(entity.getEventBeginDe())
                .eventEndDe(entity.getEventEndDe())
                .eventAuspcInsttNm(entity.getEventAuspcInsttNm())
                .eventMngtInsttNm(entity.getEventMngtInsttNm())
                .eventPlace(entity.getEventPlace())
                .eventCn(entity.getEventCn())
                .ctOccrrncAt(entity.getCtOccrrncAt())
                .partcptCt(entity.getPartcptCt())
                .psncpa(entity.getPsncpa())
                .refrnUrl(entity.getRefrnUrl())
                .rceptBeginDe(entity.getRceptBeginDe())
                .rceptEndDe(entity.getRceptEndDe())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegisterPnttm(entity.getFrstRegisterPnttm())
                .build();
    }
}
