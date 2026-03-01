package com.company.project.service.meeting.dto;

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
@Schema(description = "?�의???�보")
public class MeetingPlaceDto {

    @Schema(description = "?�의??ID")
    private String mtgPlaceId;

    @Schema(description = "?�의??명칭")
    private String mtgPlaceNm;

    @Schema(description = "?�픈 ?�작 ?�간")
    private String opnBeginTm;

    @Schema(description = "?�픈 종료 ?�간")
    private String opnEndTm;

    @Schema(description = "?�용 가???�원")
    private Integer aceptncPosblNmpr;

    @Schema(description = "?�치 구분")
    private String lcSe;

    @Schema(description = "?�치 ?�세")
    private String lcDetail;

    @Schema(description = "첨�? ?�일 ID")
    private String atchFileId;

    @Schema(description = "?�성??)")
    private String createdBy;

    @Schema(description = "?�성??)")
    private LocalDateTime createdDate;

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
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
