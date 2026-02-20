package com.company.project.service.mtg.dto;

import com.company.project.domain.meeting.MeetingPlace;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Description")
public class MeetingPlaceDto {

    @Schema(description = "Description")
    private String mtgPlaceId;

    @Schema(description = "Description")
    private String mtgPlaceNm;

    @Schema(description = "Description")
    private String opnBeginTm;

    @Schema(description = "Description")
    private String opnEndTm;

    @Schema(description = "Description")
    private Integer aceptncPosblNmpr;

    @Schema(description = "Description")
    private String lcSe;

    @Schema(description = "Description")
    private String lcDetail;

    @Schema(description = "Description")
    private String atchFileId;

    @Schema(description = "Description")
    private String createdBy;

    @Schema(description = "Description")
    private LocalDateTime createdDate;

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
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
