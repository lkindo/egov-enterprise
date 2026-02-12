package com.company.project.service.schedule.dto;

import com.company.project.domain.schedule.LeaderStatus;
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

    @Schema(description = "간부 ID")
    private String leaderId;

    @Schema(description = "간부 명")
    private String leaderNm;

    @Schema(description = "조직 명")
    private String orgnztNm;

    @Schema(description = "간부 상태")
    private String leaderSttus;

    @Schema(description = "간부 상태 명")
    private String leaderSttusNm;

    @Schema(description = "등록일시")
    private LocalDateTime createdDate;

    public static LeaderStatusDto from(LeaderStatus entity) {
        if (entity == null) return null;
        return LeaderStatusDto.builder()
                .leaderId(entity.getLeaderId())
                .leaderSttus(entity.getLeaderSttus())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
