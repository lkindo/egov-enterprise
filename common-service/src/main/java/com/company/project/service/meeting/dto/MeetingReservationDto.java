package com.company.project.service.meeting.dto;

import com.company.project.domain.meeting.MeetingReservation;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * 회의실예약 DTO
 */
@Getter
@Builder
public class MeetingReservationDto {
    private String resveId;
    private String mtgPlaceId;
    private String mtgSj;
    private String resveManId;
    private String resveDe;
    private String resveBeginTm;
    private String resveEndTm;
    private Integer atndncNmpr;
    private String mtgCn;
    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;

    public static MeetingReservationDto from(MeetingReservation entity) {
        if (entity == null)
            return null;
        return MeetingReservationDto.builder()
                .resveId(entity.getResveId())
                .mtgPlaceId(entity.getMtgPlaceId())
                .mtgSj(entity.getMtgSj())
                .resveManId(entity.getResveManId())
                .resveDe(entity.getResveDe())
                .resveBeginTm(entity.getResveBeginTm())
                .resveEndTm(entity.getResveEndTm())
                .atndncNmpr(entity.getAtndncNmpr())
                .mtgCn(entity.getMtgCn())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegisterPnttm(entity.getFrstRegisterPnttm())
                .build();
    }
}
