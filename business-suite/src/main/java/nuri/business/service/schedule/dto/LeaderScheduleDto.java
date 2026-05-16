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
    private String schdlTtl;

    @Schema(description = "일정내용")
    private String schdlCn;

    @Schema(description = "일정시작일시")
    private String schdlBgngYmd;

    @Schema(description = "일정종료일시")
    private String schdlEndYmd;

    @Schema(description = "등록일시")
    private LocalDateTime createdDate;

    // legacy
    public String getScheduleId() { return schdlId; }
    public void setScheduleId(String id) { this.schdlId = id; }
    public String getSchdulNm() { return schdlTtl; }
    public String getSchdulCn() { return schdlCn; }
    
    // missing in service
    public String getSchdlSeCd() { return ""; } 
    public String getSchdlPlcNm() { return ""; }
    public String getReptitSeCd() { return ""; }
    public String getSchdlIpcrCd() { return ""; }
    public String getBgngYmd() { return schdlBgngYmd; }
    public String getEndYmd() { return schdlEndYmd; }
    public String getSchdlPicId() { return leaderId; }

    public static LeaderScheduleDto from() { return new LeaderScheduleDto(); } // Placeholder
}
