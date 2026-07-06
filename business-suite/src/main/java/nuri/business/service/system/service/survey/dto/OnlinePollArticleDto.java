package nuri.business.service.system.service.survey.dto;

import jakarta.validation.constraints.*;

import nuri.business.domain.system.service.survey.OnlinePollArticle;
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
@Schema(description = "온라인 설문 항목 DTO (표준화)")
public class OnlinePollArticleDto {

    @Schema(description = "설문 항목 ID")
    @Size(max = 20)
    @NotBlank
    private String pollArtclId;

    @Schema(description = "설문 ID")
    @Size(max = 20)
    @NotBlank
    private String pollId;

    @Schema(description = "설문 항목 명")
    @Size(max = 100)
    @NotBlank
    private String pollArtclNm;

    @Schema(description = "투표 수")
    private Long pollIemCo;

    @Schema(description = "생성자 ID")
    private String frstRgtrId;

    @Schema(description = "생성 일시")
    private LocalDateTime crtDt;

    public static OnlinePollArticleDto from(OnlinePollArticle entity) {
        if (entity == null) return null;
        return OnlinePollArticleDto.builder()
                .pollArtclId(entity.getPollArtclId())
                .pollId(entity.getPollManage() != null ? entity.getPollManage().getPollId() : null)
                .pollArtclNm(entity.getPollArtclNm())
                .frstRgtrId(entity.getFrstRgtrId())
                .crtDt(entity.getCrtDt())
                .build();
    }
}
