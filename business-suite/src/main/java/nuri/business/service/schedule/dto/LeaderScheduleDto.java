package nuri.business.service.schedule.dto;

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
    private String schdlId;

    @Schema(description = "간부아이디")
    private String leaderId;

    @Schema(description = "간부명")
    private String leaderNm;

    @Schema(description = "일정제목")
    @com.fasterxml.jackson.annotation.JsonProperty("schdlTtl")
    private String schdlNm;

    @Schema(description = "일정내용")
    private String schdlCn;

    @Schema(description = "일정시작일시")
    private String schdlBgngYmd;

    @Schema(description = "일정종료일시")
    private String schdlEndYmd;

    @Schema(description = "등록일시")
    private LocalDateTime createdDate;

    // Standardized new fields for synchronization with LeaderSchedule entity
    @com.fasterxml.jackson.annotation.JsonProperty("schdlSeCd")
    private String schdlSeCd;

    @com.fasterxml.jackson.annotation.JsonProperty("schdlPlcNm")
    private String schdlPlcNm;

    @com.fasterxml.jackson.annotation.JsonProperty("reptitSeCd")
    private String reptSeCd;

    @com.fasterxml.jackson.annotation.JsonProperty("schdlIpcrCd")
    private String schdlImprtCd;

    @com.fasterxml.jackson.annotation.JsonProperty("schdlPicId")
    private String schdlPicId;

    // legacy with @JsonIgnore to prevent Lombok duplicate serialization
    @com.fasterxml.jackson.annotation.JsonIgnore
    public String getScheduleId() { return schdlId; }
    @com.fasterxml.jackson.annotation.JsonIgnore
    public void setScheduleId(String id) { this.schdlId = id; }
    @com.fasterxml.jackson.annotation.JsonIgnore
    public String getSchdulNm() { return schdlNm; }
    @com.fasterxml.jackson.annotation.JsonIgnore
    public String getSchdulCn() { return schdlCn; }
    
    @com.fasterxml.jackson.annotation.JsonIgnore
    public String getBgngYmd() { return schdlBgngYmd; }
    @com.fasterxml.jackson.annotation.JsonIgnore
    public String getEndYmd() { return schdlEndYmd; }

    @com.fasterxml.jackson.annotation.JsonIgnore
    public String getReptitSeCd() { return reptSeCd; }
    @com.fasterxml.jackson.annotation.JsonIgnore
    public String getSchdlIpcrCd() { return schdlImprtCd; }

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
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
