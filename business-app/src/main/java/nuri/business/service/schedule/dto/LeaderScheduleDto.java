package nuri.business.service.schedule.dto;

import jakarta.validation.constraints.*;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "간부일정 정보")
public class LeaderScheduleDto {

    @Schema(description = "일정아이디")
    @Size(max = 20)
    private String schdlId;

    @Schema(description = "간부아이디")
    @Size(max = 20)
    private String leaderId;

    @Schema(description = "간부명")
    private String leaderNm;

    @Schema(description = "일정제목")
    @Size(max = 100)
    @NotBlank
    private String schdlNm;

    @Schema(description = "일정내용")
    @Size(max = 4000)
    private String schdlCn;

    @Schema(description = "일정시작일시")
    @Size(max = 8)
    private String schdlBgngYmd;

    @Schema(description = "일정종료일시")
    @Size(max = 8)
    private String schdlEndYmd;

    @Schema(description = "등록일시")
    private LocalDateTime crtDt;

    // Standardized new fields for synchronization with LeaderSchedule entity
    @com.fasterxml.jackson.annotation.JsonProperty("schdlSeCd")
    @Size(max = 12)
    private String schdlSeCd;

    @com.fasterxml.jackson.annotation.JsonProperty("schdlPlcNm")
    @Size(max = 100)
    private String schdlPlcNm;

    @Size(max = 12)
    private String reptSeCd;

    @Size(max = 12)
    private String schdlImprtCd;

    @com.fasterxml.jackson.annotation.JsonProperty("schdlPicId")
    @Size(max = 20)
    private String schdlPicId;

    public static LeaderScheduleDto from(nuri.business.domain.schedule.LeaderSchedule entity) {
        if (entity == null) return null;
        return LeaderScheduleDto.builder()
                .schdlId(entity.getSchdlId())
                .leaderId(entity.getLeaderId())
                .schdlNm(entity.getSchdlNm())
                .schdlCn(entity.getSchdlCn())
                .reptSeCd(entity.getReptSeCd())
                .schdlImprtCd(entity.getSchdlImprtCd())
                .schdlBgngYmd(entity.getSchdlBgngYmd())
                .schdlEndYmd(entity.getSchdlEndYmd())
                .schdlPicId(entity.getSchdlPicId())
                .schdlSeCd(entity.getSchdlSeCd())
                .schdlPlcNm(entity.getSchdlPlcNm())
                .crtDt(entity.getCrtDt())
                .build();
    }
}
