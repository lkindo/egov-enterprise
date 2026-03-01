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
@Schema(description = "?Œì˜???•ë³´")
public class MeetingPlaceDto {

    @Schema(description = "?Œì˜??ID")
    private String mtgPlaceId;

    @Schema(description = "?Œì˜??ëª…ì¹­")
    private String mtgPlaceNm;

    @Schema(description = "?¤í”ˆ ?œì‘ ?œê°„")
    private String opnBeginTm;

    @Schema(description = "?¤í”ˆ ì¢…ë£Œ ?œê°„")
    private String opnEndTm;

    @Schema(description = "?˜ìš© ê°€???¸ì›")
    private Integer aceptncPosblNmpr;

    @Schema(description = "?„ì¹˜ êµ¬ë¶„")
    private String lcSe;

    @Schema(description = "?„ì¹˜ ?ì„¸")
    private String lcDetail;

    @Schema(description = "ì²¨ë? ?Œì¼ ID")
    private String atchFileId;

    @Schema(description = "?ì„±??)
    private String createdBy;

    @Schema(description = "?ì„±??)
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
