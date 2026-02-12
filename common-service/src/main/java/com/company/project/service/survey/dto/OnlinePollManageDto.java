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
@Schema(description = "온라인 투표 정보 DTO")
public class OnlinePollManageDto {

    @Schema(description = "투표 ID")
    private String pollId;

    @Schema(description = "투표 명")
    private String pollNm;

    @Schema(description = "시작 일자")
    private String pollBeginDe;

    @Schema(description = "종료 일자")
    private String pollEndDe;

    @Schema(description = "투표 종류 코드")
    private String pollKindCode;

    @Schema(description = "폐기 여부")
    private String pollDsuseYn;

    @Schema(description = "자동 폐기 여부")
    private String pollAutoDsuseYn;

    @Schema(description = "등록자 ID")
    private String createdBy;

    @Schema(description = "등록일시")
    private LocalDateTime createdDate;

    @Schema(description = "투표 항목 목록")
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
