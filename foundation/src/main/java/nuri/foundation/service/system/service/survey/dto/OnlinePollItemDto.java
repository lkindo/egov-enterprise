package nuri.foundation.service.system.service.survey.dto;

import nuri.foundation.domain.system.service.survey.OnlinePollItem;
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
@Schema(description = "온라인 설문 항목 DTO")
public class OnlinePollItemDto {

    @Schema(description = "설문 항목 ID")
    private String pollIemId;

    @Schema(description = "설문 ID")
    private String pollId;

    @Schema(description = "설문 항목 명")
    private String pollIemNm;

    @Schema(description = "투표 수")
    private Long pollIemCo;

    @Schema(description = "생성자 ID")
    private String createdBy;

    @Schema(description = "생성 일시")
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
