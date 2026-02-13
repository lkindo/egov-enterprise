package com.company.project.service.system.dto;

import com.company.project.domain.system.EventAttendee;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EventAttendeeDto {
    private String applcntId;
    private String eventId;
    private String reqstDe;
    private String sanctnerId;
    private String confmAt;
    private String sanctnDt;
    private String returnResn;
    private String infrmlSanctnId;
    private String createdBy;
    private LocalDateTime createdDate;

    public static EventAttendeeDto from(EventAttendee entity) {
        return EventAttendeeDto.builder()
                .applcntId(entity.getApplcntId())
                .eventId(entity.getEventId())
                .reqstDe(entity.getReqstDe())
                .sanctnerId(entity.getSanctnerId())
                .confmAt(entity.getConfmAt())
                .sanctnDt(entity.getSanctnDt())
                .returnResn(entity.getReturnResn())
                .infrmlSanctnId(entity.getInfrmlSanctnId())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
