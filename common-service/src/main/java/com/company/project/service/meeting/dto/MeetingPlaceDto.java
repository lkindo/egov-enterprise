package com.company.project.service.meeting.dto;

import com.company.project.domain.meeting.MeetingPlace;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * 회의실관리 DTO
 */
@Getter
@Builder
public class MeetingPlaceDto {
    private String mtgPlaceId;
    private String mtgPlaceNm;
    private String opnBeginTm;
    private String opnEndTm;
    private Integer aceptncPosblNmpr;
    private String lcSe;
    private String lcDetail;
    private String atchFileId;
    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;

    public static MeetingPlaceDto from(MeetingPlace entity) {
        if (entity == null)
            return null;
        return MeetingPlaceDto.builder()
                .mtgPlaceId(entity.getMtgPlaceId())
                .mtgPlaceNm(entity.getMtgPlaceNm())
                .opnBeginTm(entity.getOpnBeginTm())
                .opnEndTm(entity.getOpnEndTm())
                .aceptncPosblNmpr(entity.getAceptncPosblNmpr())
                .lcSe(entity.getLcSe())
                .lcDetail(entity.getLcDetail())
                .atchFileId(entity.getAtchFileId())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegisterPnttm(entity.getFrstRegisterPnttm())
                .build();
    }
}
