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
@Schema(description = "?Œì˜???ˆì•½ ?•ë³´")
public class MeetingReservationDto {

    @Schema(description = "?ˆì•½ ID")
    private String resveId;

    @Schema(description = "?Œì˜??ID")
    private String mtgPlaceId;

    @Schema(description = "?Œì˜??ëª…ì¹­")
    private String mtgPlaceNm;

    @Schema(description = "?Œì˜ ?œëª©")
    private String mtgSj;

    @Schema(description = "?ˆì•½??ID")
    private String resveManId;

    @Schema(description = "?ˆì•½??ëª…ì¹­")
    private String resveManNm;

    @Schema(description = "?ˆì•½ ?¼ì")
    private String resveDe;

    @Schema(description = "?ˆì•½ ?œì‘ ?œê°„")
    private String resveBeginTm;

    @Schema(description = "?ˆì•½ ì¢…ë£Œ ?œê°„")
    private String resveEndTm;

    @Schema(description = "ì°¸ì„ ?¸ì›")
    private Integer atndncNmpr;

    @Schema(description = "?Œì˜ ?´ìš©")
    private String mtgCn;

    @Schema(description = "?ì„±??)
    private String createdBy;

    @Schema(description = "?ì„±??)
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
