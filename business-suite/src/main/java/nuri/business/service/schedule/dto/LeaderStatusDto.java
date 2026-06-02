package nuri.business.service.schedule.dto;

import jakarta.validation.constraints.*;

import nuri.business.domain.schedule.LeaderStatus;
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
@Schema(description = "간부 상태 정보 DTO")
public class LeaderStatusDto {

    @Schema(description = "간부아이디")
    @Size(max = 20)
    private String leaderId;

    @Schema(description = "간부명")
    private String leaderNm;

    @Schema(description = "조직명")
    private String orgnztNm;

    @Schema(description = "간부상태코드")
    @com.fasterxml.jackson.annotation.JsonProperty("leaderSttus")
    @Size(max = 12)
    private String leaderSttsCd;

    @Schema(description = "간부상태명")
    private String leaderSttusNm;

    @Schema(description = "등록일시")
    private LocalDateTime crtDt;

    // legacy with @JsonIgnore to prevent Lombok duplicate serialization
    @com.fasterxml.jackson.annotation.JsonIgnore
    public String getLeaderSttus() {
        return leaderSttsCd;
    }

    @com.fasterxml.jackson.annotation.JsonIgnore
    public void setLeaderSttus(String leaderSttus) {
        this.leaderSttsCd = leaderSttus;
    }

    public static LeaderStatusDto from(LeaderStatus entity) {
        if (entity == null) return null;
        return LeaderStatusDto.builder()
                .leaderId(entity.getLeaderId())
                .leaderSttsCd(entity.getLeaderSttsCd())
                .crtDt(entity.getCrtDt())
                .build();
    }
}
