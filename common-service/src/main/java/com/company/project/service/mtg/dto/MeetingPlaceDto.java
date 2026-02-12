package com.company.project.service.mtg.dto;

import com.company.project.domain.meeting.MeetingPlace;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
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
    private LocalDateTime frstRegistPnttm;

    public static MeetingPlaceDto from(MeetingPlace entity) {
        if (entity == null) return null;
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
                .frstRegistPnttm(entity.getFrstRegisterPnttm())
                .build();
    }
}
