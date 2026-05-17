package nuri.foundation.service.system.service.survey.dto;

import nuri.foundation.domain.system.service.survey.OnlinePollManage;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "온라인 설문 관리 DTO")
public class OnlinePollManageDto {

    @Schema(description = "설문 ID")
    private String pollId;

    @Schema(description = "설문 제목")
    private String pollNm;

    @Schema(description = "설문 시작일")
    private String pollBgngYmd;

    @Schema(description = "설문 종료일")
    private String pollEndYmd;

    @Schema(description = "설문 종류 코드")
    private String pollTypeCd;

    @Schema(description = "설문 폐기 여부")
    private String pollDsuseYn;

    @Schema(description = "설문 자동 폐기 여부")
    private String pollAutoDsuseYn;

    @Schema(description = "생성자 ID")
    private String createdBy;

    @Schema(description = "생성 일시")
    private LocalDateTime createdDate;

    @Schema(description = "설문 항목 목록")
    private List<OnlinePollItemDto> pollItems;

    public static OnlinePollManageDto from(OnlinePollManage entity) {
        if (entity == null) return null;
        return OnlinePollManageDto.builder()
                .pollId(entity.getPollId())
                .pollNm(entity.getPollNm())
                .pollBgngYmd(entity.getPollBgngYmd())
                .pollEndYmd(entity.getPollEndYmd())
                .pollTypeCd(entity.getPollTypeCd())
                .pollDsuseYn(entity.getPollDsuseYn())
                .pollAutoDsuseYn(entity.getPollAutoDsuseYn())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .pollItems(entity.getPollItems() != null ? 
                        entity.getPollItems().stream().map(OnlinePollItemDto::from).collect(Collectors.toList()) : 
                        Collections.emptyList())
                .build();
    }

    // legacy
    public String getPollTtl() { return pollNm; }
    public void setPollTtl(String v) { this.pollNm = v; }
}
