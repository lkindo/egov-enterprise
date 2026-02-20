package com.company.project.service.mtg.dto;

import com.company.project.domain.meeting.MeetingReservation;
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
public class MeetingReservationDto {

    @Schema(description = "Description")
    private String resveId;

    @Schema(description = "Description")
    private String mtgPlaceId;

    @Schema(description = "Description")
    private String mtgPlaceNm;

    @Schema(description = "Description")
    private String mtgSj;

    @Schema(description = "Description")
    private String resveManId;

    @Schema(description = "Description")
    private String resveManNm;

    @Schema(description = "Description")
    private String resveDe;

    @Schema(description = "Description")
    private String resveBeginTm;

    @Schema(description = "Description")
    private String resveEndTm;

    @Schema(description = "Description")
    private Integer atndncNmpr;

    @Schema(description = "Description")
    private String mtgCn;

    @Schema(description = "Description")
    private String createdBy;

    @Schema(description = "Description")
    private LocalDateTime createdDate;

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
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
