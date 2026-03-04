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
@Schema(description = "Description")
public class OnlinePollItemDto {

    @Schema(description = "Description")
    private String pollIemId;

    @Schema(description = "Description")
    private String pollId;

    @Schema(description = "Description")
    private String pollIemNm;

    @Schema(description = "Description")
    private Long voteCount;

    @Schema(description = "Description")
    private String createdBy;

    @Schema(description = "Description")
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