package com.company.project.service.system.dto;

import com.company.project.domain.system.Event;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
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
    private String createdBy;
    private LocalDateTime createdDate;

    public static EventDto from(Event entity) {
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
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
