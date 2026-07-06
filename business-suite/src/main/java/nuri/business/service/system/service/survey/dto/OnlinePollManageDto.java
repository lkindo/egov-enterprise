package nuri.business.service.system.service.survey.dto;

import jakarta.validation.constraints.*;

import nuri.business.domain.system.service.survey.OnlinePollManage;
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

    @Schema(description = "설문 ID")
    @Size(max = 20)
    @NotBlank
    private String pollId;

    @Schema(description = "설문 제목")
    @Size(max = 100)
    @NotBlank
    private String pollNm;

    @Schema(description = "설문 시작일")
    @Size(max = 8)
    private String pollBgngYmd;

    @Schema(description = "설문 종료일")
    @Size(max = 8)
    private String pollEndYmd;

    @Schema(description = "설문 종류 코드")
    @Size(max = 12)
    private String pollKndCd;

    @Schema(description = "설문 폐기 여부")
    private String pollDsuseYn;

    @Schema(description = "설문 자동 폐기 여부")
    private String pollAtmcDsuseYn;

    @Schema(description = "생성자 ID")
    private String frstRgtrId;

    @Schema(description = "생성 일시")
    private LocalDateTime crtDt;

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
                .frstRgtrId(entity.getFrstRgtrId())
                .crtDt(entity.getCrtDt())
                .pollArticles(entity.getPollArticles() != null ? 
                        entity.getPollArticles().stream().map(OnlinePollArticleDto::from).collect(Collectors.toList()) : 
                        Collections.emptyList())
                .build();
    }
}
