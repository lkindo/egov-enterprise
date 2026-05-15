package nuri.business.service.schedule.dto;

import nuri.business.domain.schedule.LeaderSchedule;
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
@Schema(description = "리더 일정 정보")
public class LeaderScheduleDto {

    @Schema(description = "일정아이디")
    private String schdlId;

    @Schema(description = "일정구분")
    private String schdlSeCd;

    @Schema(description = "일정명")
    private String schdlTtl;

    @Schema(description = "일정내용")
    private String schdlCn;

    @Schema(description = "일정장소")
    private String schdlPlcNm;

    @Schema(description = "리더아이디")
    private String leaderId;

    @Schema(description = "리더명")
    private String leaderName;

    @Schema(description = "반복구분코드")
    private String reptitSeCd;

    @Schema(description = "일정중요도코드")
    private String schdlIpcrCd;

    @Schema(description = "시작일자")
    private String bgngYmd;

    @Schema(description = "종료일자")
    private String endYmd;

    @Schema(description = "담당자아이디")
    private String schdlPicId;

    @Schema(description = "담당자명")
    private String chargerName;

    @Schema(description = "생성자아이디")
    private String createdBy;

    @Schema(description = "생성일시")
    private LocalDateTime createdDate;

    // Aliases for legacy compatibility
    public String getRepeatYn() { return reptitSeCd; }
    public String getImportanceCode() { return schdlIpcrCd; }
    public String getScheduleType() { return schdlSeCd; }

    public static LeaderScheduleDto from(LeaderSchedule entity) {
        if (entity == null) return null;
        return LeaderScheduleDto.builder()
                .schdlId(entity.getSchdlId())
                .schdlSeCd(entity.getSchdlSeCd())
                .schdlTtl(entity.getSchdlTtl())
                .schdlCn(entity.getSchdlCn())
                .schdlPlcNm(entity.getSchdlPlcNm())
                .leaderId(entity.getLeaderId())
                .reptitSeCd(entity.getReptitSeCd())
                .schdlIpcrCd(entity.getSchdlIpcrCd())
                .bgngYmd(entity.getBgngYmd())
                .endYmd(entity.getEndYmd())
                .schdlPicId(entity.getSchdlPicId())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
