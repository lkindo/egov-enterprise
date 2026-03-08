package com.company.project.service.survey.dto;

import com.company.project.domain.survey.OnlinePollManage;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Description")
public class OnlinePollManageDto {

    @Schema(description = "Description")
    private String pollId;

    @Schema(description = "Description")
    private String pollNm;

    @Schema(description = "Description")
    private String pollBeginDe;

    @Schema(description = "Description")
    private String pollEndDe;

    @Schema(description = "Description")
    private String pollKindCode;

    @Schema(description = "Description")
    private String pollDsuseYn;

    @Schema(description = "Description")
    private String pollAutoDsuseYn;

    @Schema(description = "Description")
    private String createdBy;

    @Schema(description = "Description")
    private LocalDateTime createdDate;

    @Schema(description = "Description")
    private List<OnlinePollItemDto> items;

    public static OnlinePollManageDto from(OnlinePollManage entity) {
        if (entity == null) return null;
        return OnlinePollManageDto.builder()
                .pollId(entity.getPollId())
                .pollNm(entity.getPollNm())
                .pollBeginDe(entity.getPollBeginDe())
                .pollEndDe(entity.getPollEndDe())
                .pollKindCode(entity.getPollKindCode())
                .pollDsuseYn(entity.getPollDsuseYn())
                .pollAutoDsuseYn(entity.getPollAutoDsuseYn())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
