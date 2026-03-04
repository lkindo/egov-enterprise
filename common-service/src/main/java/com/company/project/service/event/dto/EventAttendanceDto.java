package com.company.project.service.event.dto;

import com.company.project.domain.event.EventAttendance;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EventAttendanceDto {
    private String eventId;
    private String applcntId;
    private String reqstDe;
    private String confmAt;
    private LocalDateTime sanctnDt;
    private String returnResn;
    private String infrmlSanctnId;
    private String frstRegisterId;
    private LocalDateTime frstRegistPnttm;

    public static EventAttendanceDto from(EventAttendance entity) {
        if (entity == null)
            return null;
        return EventAttendanceDto.builder()
                .eventId(entity.getEventId())
                .applcntId(entity.getApplcntId())
                .reqstDe(entity.getReqstDe())
                .confmAt(entity.getConfmAt())
                .sanctnDt(entity.getSanctnDt())
                .returnResn(entity.getReturnResn())
                .infrmlSanctnId(entity.getInfrmlSanctnId())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegistPnttm(entity.getFrstRegisterPnttm())
                .build();
    }
}