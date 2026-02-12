package com.company.project.service.survey.dto;

import com.company.project.domain.survey.OnlinePollItem;
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
@Schema(description = "온라인 투표 항목 DTO")
public class OnlinePollItemDto {

    @Schema(description = "항목 ID")
    private String pollIemId;

    @Schema(description = "투표 ID")
    private String pollId;

    @Schema(description = "항목 명")
    private String pollIemNm;

    @Schema(description = "득표 수")
    private Long voteCount;

    @Schema(description = "등록자 ID")
    private String createdBy;

    @Schema(description = "등록일시")
    private LocalDateTime createdDate;

    public static OnlinePollItemDto from(OnlinePollItem entity) {
        if (entity == null) return null;
        return OnlinePollItemDto.builder()
                .pollIemId(entity.getPollIemId())
                .pollId(entity.getPollId())
                .pollIemNm(entity.getPollIemNm())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
