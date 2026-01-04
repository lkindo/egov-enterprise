package com.company.project.service.event.dto;

import com.company.project.domain.event.EventAttendance;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * 행사참석자 DTO
 */
@Getter
@Builder
public class EventAttendanceDto {
    private String applcntId;
    private String eventId;
    private String reqstDe;
    private String sanctnerId;
    private String confmAt;
    private LocalDateTime sanctnDt;
    private String returnResn;
    private String infrmlSanctnId;
    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;

    public static EventAttendanceDto from(EventAttendance entity) {
        if (entity == null)
            return null;
        return EventAttendanceDto.builder()
                .applcntId(entity.getApplcntId())
                .eventId(entity.getEventId())
                .reqstDe(entity.getReqstDe())
                .sanctnerId(entity.getSanctnerId())
                .confmAt(entity.getConfmAt())
                .sanctnDt(entity.getSanctnDt())
                .returnResn(entity.getReturnResn())
                .infrmlSanctnId(entity.getInfrmlSanctnId())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegisterPnttm(entity.getFrstRegisterPnttm())
                .build();
    }
}
