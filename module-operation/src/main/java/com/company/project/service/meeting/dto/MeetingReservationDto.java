package com.company.project.service.meeting.dto;

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
@Schema(description = "?의???약 ?보")
public class MeetingReservationDto {

    @Schema(description = "?약 ID")
    private String resveId;

    @Schema(description = "?의??ID")
    private String mtgPlaceId;

    @Schema(description = "?의??명칭")
    private String mtgPlaceNm;

    @Schema(description = "?의 ?목")
    private String mtgSj;

    @Schema(description = "?약??ID")
    private String resveManId;

    @Schema(description = "?약??명칭")
    private String resveManNm;

    @Schema(description = "?약 ?자")
    private String resveDe;

    @Schema(description = "?약 ?작 ?간")
    private String resveBeginTm;

    @Schema(description = "?약 종료 ?간")
    private String resveEndTm;

    @Schema(description = "참석 ?원")
    private Integer atndncNmpr;

    @Schema(description = "?의 ?용")
    private String mtgCn;

    @Schema(description = "?성??)")
    private String createdBy;

    @Schema(description = "?성??)")
    private LocalDateTime createdDate;

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
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
