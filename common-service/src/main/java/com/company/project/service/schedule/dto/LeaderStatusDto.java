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
@Schema(description = "Description")
public class LeaderStatusDto {

    @Schema(description = "Description")
    private String leaderId;

    @Schema(description = "Description")
    private String leaderNm;

    @Schema(description = "Description")
    private String orgnztNm;

    @Schema(description = "Description")
    private String leaderSttus;

    @Schema(description = "Description")
    private String leaderSttusNm;

    @Schema(description = "Description")
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