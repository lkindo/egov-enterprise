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
@Schema(description = "회의실 예약 정보")
public class MeetingReservationDto {

    @Schema(description = "예약 ID")
    private String resveId;

    @Schema(description = "회의실 ID")
    private String mtgPlaceId;

    @Schema(description = "회의실 명칭")
    private String mtgPlaceNm;

    @Schema(description = "회의 제목")
    private String mtgSj;

    @Schema(description = "예약자 ID")
    private String resveManId;

    @Schema(description = "예약자 명칭")
    private String resveManNm;

    @Schema(description = "예약 일자")
    private String resveDe;

    @Schema(description = "예약 시작 시간")
    private String resveBeginTm;

    @Schema(description = "예약 종료 시간")
    private String resveEndTm;

    @Schema(description = "참석 인원")
    private Integer atndncNmpr;

    @Schema(description = "회의 내용")
    private String mtgCn;

    @Schema(description = "생성자")
    private String createdBy;

    @Schema(description = "생성일")
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
