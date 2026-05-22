package nuri.foundation.service.system.service.survey.dto;

import nuri.foundation.domain.system.service.survey.OnlinePollManage;
import com.fasterxml.jackson.annotation.JsonProperty;
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
@Schema(description = "온라인 설문 관리 DTO (표준화)")
public class OnlinePollManageDto {

    @JsonProperty("pollId")
    @Schema(description = "설문 ID")
    private String pollId;

    @JsonProperty("pollNm")
    @Schema(description = "설문 제목")
    private String pollNm;

    @JsonProperty("pollBeginDe")
    @Schema(description = "설문 시작일")
    private String pollBgngYmd;

    @JsonProperty("pollEndDe")
    @Schema(description = "설문 종료일")
    private String pollEndYmd;

    @JsonProperty("pollKindCode")
    @Schema(description = "설문 종류 코드")
    private String pollKndCd;

    @JsonProperty("pollDsuseYn")
    @Schema(description = "설문 폐기 여부")
    private String pollDsuseYn;

    @JsonProperty("pollAutoDsuseYn")
    @Schema(description = "설문 자동 폐기 여부")
    private String pollAtmcDsuseYn;

    @JsonProperty("createdBy")
    @Schema(description = "생성자 ID")
    private String createdBy;

    @JsonProperty("createdDate")
    @Schema(description = "생성 일시")
    private LocalDateTime createdDate;

    @JsonProperty("pollItems")
    @Schema(description = "설문 항목 목록")
    private List<OnlinePollArticleDto> pollArticles;

    public static OnlinePollManageDto from(OnlinePollManage entity) {
        if (entity == null) return null;
        return OnlinePollManageDto.builder()
                .pollId(entity.getPollId())
                .pollNm(entity.getPollNm())
                .pollBgngYmd(entity.getPollBgngYmd())
                .pollEndYmd(entity.getPollEndYmd())
                .pollKndCd(entity.getPollKndCd())
                .pollDsuseYn(entity.getPollDsuseYn())
                .pollAtmcDsuseYn(entity.getPollAtmcDsuseYn())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .pollArticles(entity.getPollArticles() != null ? 
                        entity.getPollArticles().stream().map(OnlinePollArticleDto::from).collect(Collectors.toList()) : 
                        Collections.emptyList())
                .build();
    }

    // legacy 호환성 수호
    @JsonProperty("pollTtl")
    public String getPollTtl() { return pollNm; }
}
