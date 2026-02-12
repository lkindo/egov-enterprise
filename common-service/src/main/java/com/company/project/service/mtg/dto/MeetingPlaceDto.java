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
@Schema(description = "회의실 정보 DTO")
public class MeetingPlaceDto {

    @Schema(description = "회의실 ID")
    private String mtgPlaceId;

    @Schema(description = "회의실 명")
    private String mtgPlaceNm;

    @Schema(description = "개방 시작 시간")
    private String opnBeginTm;

    @Schema(description = "개방 종료 시간")
    private String opnEndTm;

    @Schema(description = "수용 가능 인원")
    private Integer aceptncPosblNmpr;

    @Schema(description = "위치 구분")
    private String lcSe;

    @Schema(description = "위치 상세")
    private String lcDetail;

    @Schema(description = "첨부파일 ID")
    private String atchFileId;

    @Schema(description = "등록자 ID")
    private String createdBy;

    @Schema(description = "등록일시")
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
