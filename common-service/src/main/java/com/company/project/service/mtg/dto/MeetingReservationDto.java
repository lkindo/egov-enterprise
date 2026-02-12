package com.company.project.service.mtg.dto;

import com.company.project.domain.meeting.MeetingReservation;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MeetingReservationDto {
    private String resveId;
    private String mtgPlaceId;
    private String mtgPlaceNm;
    private String mtgSj;
    private String resveManId;
    private String resveManNm;
    private String resveDe;
    private String resveBeginTm;
    private String resveEndTm;
    private Integer atndncNmpr;
    private String mtgCn;
    private String frstRegisterId;
    private LocalDateTime frstRegistPnttm;

    public static MeetingReservationDto from(MeetingReservation entity) {
        if (entity == null) return null;
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
                .frstRegistPnttm(entity.getFrstRegisterPnttm())
                .build();
    }
}
